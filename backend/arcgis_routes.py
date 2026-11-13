
"""Integración ArcGIS REST -> Supabase/PostGIS para INVERSIG.

Incluye descubrimiento de servicios/capas, inspección de metadatos e
importación selectiva por municipios. No modifica las tablas existentes.
"""
from __future__ import annotations

import json
import os
from typing import Optional
from urllib.parse import urlparse

import psycopg
import requests
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/integraciones/arcgis", tags=["ArcGIS REST"])
DATABASE_URL = os.getenv("SUPABASE_DB_URL") or os.getenv("DATABASE_URL")
REQUEST_TIMEOUT = int(os.getenv("ARCGIS_TIMEOUT_SECONDS", "45"))
MAX_RECORDS = int(os.getenv("ARCGIS_MAX_RECORDS_PER_IMPORT", "5000"))
BATCH_SIZE = 500

SOURCES = [
    {
        "name": "CORNARE - POMCAS",
        "region": "Oriente Antioqueño / jurisdicción CORNARE",
        "url": "https://mapas.cornare.gov.co/arcgis/rest/services/POMCAS",
        "service_type": "ServiceDirectory",
    }
]


def _db():
    if not DATABASE_URL:
        raise HTTPException(
            status_code=503,
            detail="Falta SUPABASE_DB_URL o DATABASE_URL en el entorno."
        )
    try:
        return psycopg.connect(DATABASE_URL, connect_timeout=15)
    except psycopg.Error as exc:
        raise HTTPException(
            status_code=503,
            detail=f"No fue posible conectar con Supabase: {exc}"
        ) from exc


def _https_url(url: str) -> str:
    parsed = urlparse(url.strip())
    if parsed.scheme != "https" or not parsed.netloc:
        raise HTTPException(
            status_code=400,
            detail="Se requiere una URL HTTPS válida de ArcGIS REST."
        )
    if "arcgis" not in parsed.path.lower() and "rest/services" not in parsed.path.lower():
        raise HTTPException(
            status_code=400,
            detail="La URL no parece corresponder a un endpoint ArcGIS REST."
        )
    return url.strip().rstrip("/")


def _get_json(url: str, params: Optional[dict] = None) -> dict:
    query = dict(params or {})
    query["f"] = query.get("f", "pjson")

    try:
        response = requests.get(
            url,
            params=query,
            timeout=REQUEST_TIMEOUT,
            headers={"User-Agent": "INVERSIG/1.0"}
        )
        response.raise_for_status()
        payload = response.json()
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=502,
            detail=f"Error consultando ArcGIS REST: {exc}"
        ) from exc
    except ValueError as exc:
        raise HTTPException(
            status_code=502,
            detail="ArcGIS REST no devolvió JSON válido."
        ) from exc

    if isinstance(payload, dict) and payload.get("error"):
        raise HTTPException(
            status_code=502,
            detail=f"ArcGIS REST: {payload['error']}"
        )

    return payload


def _object_id_field(meta: dict) -> Optional[str]:
    candidate = meta.get("objectIdField") or meta.get("objectIdFieldName")

    if candidate:
        return candidate

    for field in meta.get("fields", []):
        if field.get("type") == "esriFieldTypeOID":
            return field.get("name")

    return None


class InspectRequest(BaseModel):
    url: str


class DiscoverRequest(BaseModel):
    directory_url: str
    max_services: int = Field(default=100, ge=1, le=300)


class ImportRequest(BaseModel):
    url: str
    layer_name: str = Field(min_length=2, max_length=150)
    municipality_codes: list[str] = Field(default_factory=list, max_length=30)
    where: str = Field(default="1=1", max_length=500)
    out_fields: list[str] = Field(default_factory=list, max_length=100)
    max_records: int = Field(default=2000, ge=1, le=5000)
    source_name: str = Field(default="ArcGIS REST", max_length=150)


@router.get("/fuentes")
def listar_fuentes():
    return {
        "items": SOURCES,
        "nota": "Fuentes candidatas configuradas. Usa /descubrir para generar el catálogo de servicios y capas."
    }


@router.post("/descubrir")
def descubrir_servicios(req: DiscoverRequest):
    """Recorre un directorio ArcGIS y devuelve servicios y capas hoja con metadatos."""

    directory = _https_url(req.directory_url)
    listing = _get_json(directory)

    services = listing.get("services", [])
    folders = listing.get("folders", [])

    catalog = []
    errors = []

    # Obtener la raíz real de servicios ArcGIS.
    # Evita duplicar POMCAS cuando el directorio consultado
    # ya es /rest/services/POMCAS y el nombre recibido es POMCAS/Base_Pomcas.
    services_root = directory.split("/rest/services", 1)[0] + "/rest/services"

    for service in services[:req.max_services]:
        name = service.get("name")
        service_type = service.get("type")

        if not name or service_type not in {"MapServer", "FeatureServer"}:
            continue

        # CORRECCIÓN: construir la URL desde la raíz de servicios,
        # usando la ruta completa que devuelve ArcGIS.
        service_path = str(name).strip("/")
        service_url = f"{services_root}/{service_path}/{service_type}"

        try:
            service_meta = _get_json(service_url)

            layers = service_meta.get("layers", []) or []
            tables = service_meta.get("tables", []) or []

            parent_ids = {
                layer.get("parentLayerId")
                for layer in layers
                if layer.get("parentLayerId", -1) >= 0
            }

            leaf_layers = [
                layer for layer in layers
                if layer.get("id") not in parent_ids
                and not layer.get("subLayerIds")
            ]

            for layer in leaf_layers + tables:
                layer_id = layer.get("id")

                if layer_id is None:
                    continue

                layer_url = f"{service_url}/{layer_id}"

                try:
                    meta = _get_json(layer_url)

                    catalog.append({
                        "service": name,
                        "service_type": service_type,
                        "service_url": service_url,
                        "layer_id": layer_id,
                        "layer_name": meta.get("name") or layer.get("name"),
                        "layer_url": layer_url,
                        "geometry_type": meta.get("geometryType"),
                        "object_id_field": _object_id_field(meta),
                        "spatial_reference": (
                            meta.get("extent", {}).get("spatialReference")
                            or meta.get("sourceSpatialReference")
                        ),
                        "max_record_count": meta.get("maxRecordCount"),
                        "capabilities": meta.get("capabilities"),
                        "fields": meta.get("fields", []),
                    })

                except HTTPException as exc:
                    errors.append({
                        "url": layer_url,
                        "error": exc.detail
                    })

        except HTTPException as exc:
            errors.append({
                "url": service_url,
                "error": exc.detail
            })

    return {
        "directory_url": directory,
        "services_found": len(services),
        "folders_found": folders,
        "layers_cataloged": len(catalog),
        "catalog": catalog,
        "errors": errors,
        "note": "Catálogo de metadatos. No se descargaron ni almacenaron geometrías."
    }


@router.post("/inspeccionar")
def inspeccionar(req: InspectRequest):
    url = _https_url(req.url)
    meta = _get_json(url)

    return {
        "name": meta.get("name"),
        "serviceDescription": meta.get("serviceDescription"),
        "geometryType": meta.get("geometryType"),
        "spatialReference": (
            meta.get("spatialReference")
            or meta.get("extent", {}).get("spatialReference")
        ),
        "fields": meta.get("fields", []),
        "objectIdField": _object_id_field(meta),
        "maxRecordCount": meta.get("maxRecordCount"),
        "capabilities": meta.get("capabilities"),
        "subLayers": meta.get("layers", []),
        "url": url,
    }


def _municipality_geometry(codes: list[str]):
    if not codes:
        return None

    # El proyecto usa public.municipios(codigo, geom)
    # y PostGIS en esquema gis.
    with _db() as conn, conn.cursor() as cur:
        cur.execute(
            """
            SELECT gis.ST_AsGeoJSON(
                gis.ST_Transform(
                    gis.ST_UnaryUnion(gis.ST_Collect(geom)),
                    4326
                )
            )
            FROM public.municipios
            WHERE codigo = ANY(%s)
            AND geom IS NOT NULL
            """,
            (codes,),
        )

        row = cur.fetchone()

    if not row or not row[0]:
        raise HTTPException(
            status_code=400,
            detail="No se encontraron geometrías municipales para los códigos indicados en public.municipios.codigo."
        )

    return json.loads(row[0])


def _query_params(
    req: ImportRequest,
    fields: str,
    object_id: str,
    geometry: Optional[dict],
    ids: Optional[list] = None
):
    params = {
        "where": f"({req.where})",
        "outFields": fields,
        "returnGeometry": "true",
        "outSR": "4326",
        "f": "geojson",
    }

    if ids is not None:
        params["objectIds"] = ",".join(str(value) for value in ids)

    if geometry:
        params.update({
            "geometry": json.dumps(geometry, separators=(",", ":")),
            "geometryType": "esriGeometryPolygon",
            "inSR": "4326",
            "spatialRel": "esriSpatialRelIntersects",
        })

    return params


@router.post("/importar")
def importar(
    req: ImportRequest,
    x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token")
):
    """Importa una capa concreta en tabla aislada; nunca altera tablas públicas existentes."""

    configured_token = os.getenv("INVERSIG_ADMIN_TOKEN")

    if configured_token and (
        not x_admin_token or x_admin_token != configured_token
    ):
        raise HTTPException(
            status_code=401,
            detail="No autorizado para importar capas ArcGIS."
        )

    url = _https_url(req.url)
    meta = _get_json(url)

    geometry_type = meta.get("geometryType")

    supported = {
        "esriGeometryPolygon",
        "esriGeometryPolyline",
        "esriGeometryPoint",
        "esriGeometryMultipoint"
    }

    if geometry_type not in supported:
        raise HTTPException(
            status_code=400,
            detail=f"Geometría no soportada: {geometry_type}. Usa la URL de una capa concreta."
        )

    oid = _object_id_field(meta)

    if not oid:
        raise HTTPException(
            status_code=400,
            detail="No se encontró un campo ObjectID en los metadatos de la capa."
        )

    field_names = {
        field.get("name")
        for field in meta.get("fields", [])
        if field.get("name")
    }

    selected = req.out_fields or [
        field.get("name")
        for field in meta.get("fields", [])
        if field.get("type") not in {
            "esriFieldTypeBlob",
            "esriFieldTypeGeometry"
        }
    ]

    selected = [field for field in selected if field in field_names]

    if oid not in selected:
        selected.append(oid)

    out_fields = ",".join(selected)

    geometry_filter = _municipality_geometry(req.municipality_codes)
    query_url = f"{url}/query"

    id_params = {
        "where": f"({req.where})",
        "returnIdsOnly": "true",
        "returnGeometry": "false",
        "f": "json"
    }

    if geometry_filter:
        id_params.update({
            "geometry": json.dumps(
                geometry_filter,
                separators=(",", ":")
            ),
            "geometryType": "esriGeometryPolygon",
            "inSR": "4326",
            "spatialRel": "esriSpatialRelIntersects"
        })

    ids_payload = _get_json(query_url, id_params)
    object_ids = ids_payload.get("objectIds") or []

    if len(object_ids) > req.max_records:
        raise HTTPException(
            status_code=413,
            detail=f"La selección contiene {len(object_ids)} entidades y supera el máximo configurado ({req.max_records}). Reduce municipios o filtros."
        )

    features = []

    for start in range(0, len(object_ids), BATCH_SIZE):
        batch_ids = object_ids[start:start + BATCH_SIZE]

        params = _query_params(
            req,
            out_fields,
            oid,
            geometry_filter,
            batch_ids
        )

        payload = _get_json(query_url, params)

        if payload.get("exceededTransferLimit"):
            raise HTTPException(
                status_code=413,
                detail="ArcGIS indicó límite de transferencia. Reduce el ámbito de importación."
            )

        features.extend(payload.get("features", []))

    # La creación se realiza solo cuando el usuario ejecuta expresamente
    # la importación.
    with _db() as conn, conn.cursor() as cur:
        cur.execute("CREATE SCHEMA IF NOT EXISTS integraciones")

        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS integraciones.arcgis_features (
                id BIGSERIAL PRIMARY KEY,
                source_url TEXT NOT NULL,
                source_name TEXT NOT NULL,
                layer_name TEXT NOT NULL,
                source_object_id TEXT NOT NULL,
                attributes JSONB NOT NULL DEFAULT '{}'::jsonb,
                geom gis.geometry(Geometry, 4326),
                imported_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                UNIQUE (source_url, source_object_id)
            )
            """
        )

        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS arcgis_features_geom_gix
            ON integraciones.arcgis_features
            USING GIST (geom)
            """
        )

        cur.execute(
            """
            CREATE INDEX IF NOT EXISTS arcgis_features_attributes_gin
            ON integraciones.arcgis_features
            USING GIN (attributes)
            """
        )

        inserted = updated = skipped = 0

        for feature in features:
            props = (
                feature.get("properties")
                or feature.get("attributes")
                or {}
            )

            oid_value = props.get(oid)
            geom = feature.get("geometry")

            if oid_value is None or not geom:
                skipped += 1
                continue

            cur.execute(
                """
                INSERT INTO integraciones.arcgis_features
                (
                    source_url,
                    source_name,
                    layer_name,
                    source_object_id,
                    attributes,
                    geom
                )
                VALUES (
                    %s,
                    %s,
                    %s,
                    %s,
                    %s::jsonb,
                    gis.ST_SetSRID(
                        gis.ST_GeomFromGeoJSON(%s),
                        4326
                    )
                )
                ON CONFLICT (source_url, source_object_id)
                DO UPDATE SET
                    source_name = EXCLUDED.source_name,
                    layer_name = EXCLUDED.layer_name,
                    attributes = EXCLUDED.attributes,
                    geom = EXCLUDED.geom,
                    imported_at = now()
                RETURNING (xmax = 0) AS inserted
                """,
                (
                    url,
                    req.source_name,
                    req.layer_name,
                    str(oid_value),
                    json.dumps(props, ensure_ascii=False),
                    json.dumps(geom, ensure_ascii=False)
                )
            )

            if cur.fetchone()[0]:
                inserted += 1
            else:
                updated += 1

    return {
        "ok": True,
        "source": url,
        "layer": req.layer_name,
        "received": len(features),
        "inserted": inserted,
        "updated": updated,
        "skipped_without_id_or_geometry": skipped,
        "municipality_filter": req.municipality_codes,
        "storage": "integraciones.arcgis_features",
        "message": "Importación selectiva finalizada. Las tablas originales de INVERSIG no fueron modificadas."
    }
