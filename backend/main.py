# ============================================================
# MINI VISOR SIG - BACKEND
# FastAPI + Supabase/PostGIS
# ============================================================

import os
import secrets
import json
import sqlite3
import urllib.parse
import urllib.request
import urllib.error
from pathlib import Path
from typing import Optional

import psycopg
from pyproj import Geod, CRS, Transformer
from shapely import wkb
from shapely.geometry import shape, mapping
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel, Field
from backend.arcgis_routes import router as arcgis_router


# ============================================================
# CONFIGURACIÓN
# ============================================================

SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL")

if not SUPABASE_DB_URL:
    raise RuntimeError("No se encontró la variable de entorno SUPABASE_DB_URL")


# Tabla de referencias con nombres reales del esquema importado.
TABLA_MUNICIPIOS = 'public."municipios_atlas — municipios"'
CAPITALES_GEOJSON = Path(__file__).resolve().parents[1] / "data" / "capitales_departamentales.geojson"
MUNICIPIOS_GPKG = Path(__file__).resolve().parents[1] / "data" / "municipios_atlas.gpkg"
GEODESIC = Geod(ellps="GRS80")


def obtener_area_geodesica(geometry_blob: bytes) -> Optional[float]:
    """Calcula área en km² desde una geometría GeoPackage en EPSG:4326."""
    if not geometry_blob:
        return None

    flags = geometry_blob[3]
    envelope_type = (flags >> 1) & 7
    envelope_bytes = {0: 0, 1: 32, 2: 48, 3: 48, 4: 64}.get(envelope_type)
    if envelope_bytes is None:
        return None

    geometry = wkb.loads(geometry_blob[8 + envelope_bytes:])
    area_m2, _ = GEODESIC.geometry_area_perimeter(geometry)
    return abs(area_m2) / 1_000_000


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(
    title="INVERSIG API",
    description="API de Inteligencia Territorial",
    version="1.0.0",
)

# Integración ArcGIS REST independiente; conserva las rutas existentes.
app.include_router(arcgis_router)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://mini-visor-sig-frontend.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# CONEXIÓN A POSTGRESQL / SUPABASE
# ============================================================


def get_connection():
    return psycopg.connect(SUPABASE_DB_URL, connect_timeout=30)


def obtener_feature_collection(tabla: str, columnas: str) -> dict:
    """Convierte geometrías PostGIS reales a GeoJSON para Leaflet."""
    consulta = f"""
        SELECT {columnas}, ST_AsGeoJSON(geom)::json AS geometry
        FROM {tabla}
        WHERE geom IS NOT NULL
        ORDER BY id
    """

    with get_connection() as conexion:
        with conexion.cursor(row_factory=psycopg.rows.dict_row) as cursor:
            cursor.execute(consulta)
            filas = cursor.fetchall()

    return {
        "type": "FeatureCollection",
        "crs": {
            "type": "name",
            "properties": {"name": "EPSG:4326"},
        },
        "features": [
            {
                "type": "Feature",
                "properties": {
                    clave: valor
                    for clave, valor in fila.items()
                    if clave != "geometry"
                },
                "geometry": fila["geometry"],
            }
            for fila in filas
        ],
    }


# ============================================================
# RUTA PRINCIPAL
# ============================================================


@app.get("/")
def root():
    return {
        "proyecto": "INVERSIG",
        "descripcion": "Inteligencia territorial",
        "estado": "API funcionando",
        "base_datos": "Supabase PostgreSQL + PostGIS",
    }


# ============================================================
# HEALTH CHECK
# ============================================================


@app.get("/health")
def health():
    try:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute("SELECT version();")
                version = cursor.fetchone()[0]

        return {
            "status": "ok",
            "database": "connected",
            "postgresql": version,
        }
    except Exception as exc:  # pragma: no cover - depende del entorno
        return {
            "status": "error",
            "database": "disconnected",
            "error": str(exc),
        }


# ============================================================
# CAPAS DESDE POSTGIS / SUPABASE
# ============================================================


@app.get("/capitales-departamentales")
def obtener_capitales_departamentales():
    try:
        with CAPITALES_GEOJSON.open(encoding="utf-8") as archivo:
            return json.load(archivo)
    except FileNotFoundError as error:
        raise HTTPException(
            status_code=503,
            detail="No se encontró el GeoJSON local de capitales departamentales.",
        ) from error
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Error leyendo capitales departamentales: {str(error)}",
        ) from error


# ============================================================
# MUNICIPIOS
# ============================================================


@app.get("/municipios")
def obtener_municipios():
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    id,
                    codigo,
                    codigo_departamento,
                    nombre,
                    poblacion_2018,
                    area_km2,
                    fuente,
                    ano_censo,
                    fecha_actualizacion,
                    gis.ST_AsGeoJSON(
                        gis.ST_SimplifyPreserveTopology(geom, 0.0005),
                        5
                    )::json AS geometry
                FROM public.municipios
                WHERE geom IS NOT NULL
                ORDER BY nombre;
                """
            )
            filas = cursor.fetchall()

    municipios = []
    for fila in filas:
        municipios.append(
            {
                "id": fila[0],
                "codigo": fila[1],
                "codigo_departamento": fila[2],
                "nombre": fila[3],
                "poblacion_2018": fila[4],
                "area_km2": fila[5],
                "fuente": fila[6],
                "ano_censo": fila[7],
                "fecha_actualizacion": fila[8],
                "geometry": fila[9],
            }
        )

    return municipios


@app.get("/municipios/catalogo")
def obtener_catalogo_municipios():
    try:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT codigo, codigo_departamento, nombre,
                           poblacion_2018, fuente, ano_censo
                    FROM public.municipios
                    ORDER BY nombre;
                    """
                )
                filas = cursor.fetchall()
    except psycopg.Error:
        if not MUNICIPIOS_GPKG.exists():
            raise HTTPException(
                status_code=503,
                detail="No se pudo consultar Supabase y falta el GeoPackage local.",
            )
        with sqlite3.connect(MUNICIPIOS_GPKG) as conn:
            filas = conn.execute(
                """
                SELECT codigo, codigo_departamento, nombre,
                         poblacion_2018, fuente, ano_censo
                FROM municipios
                ORDER BY nombre COLLATE NOCASE;
                """
            ).fetchall()

    return [
        {
            "codigo": str(codigo).zfill(5),
            "codigo_departamento": str(codigo_departamento).zfill(2),
            "nombre": nombre,
            "poblacion_2018": poblacion,
            "fuente": fuente,
            "ano_censo": ano_censo,
        }
        for codigo, codigo_departamento, nombre, poblacion, fuente, ano_censo in filas
    ]


@app.get("/municipios/{codigo}")
def obtener_municipio(codigo: str):
    try:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT
                        id,
                        codigo,
                        codigo_departamento,
                        nombre,
                        departamento,
                        poblacion_2018,
                        area_km2,
                        fuente,
                        ano_censo,
                        fecha_actualizacion
                    FROM public.municipios
                    WHERE codigo = %s;
                    """,
                    (codigo,),
                )
                fila = cursor.fetchone()
    except psycopg.Error:
        if not MUNICIPIOS_GPKG.exists():
            raise HTTPException(
                status_code=503,
                detail="No fue posible consultar Supabase ni está disponible el GeoPackage local.",
            )
        with sqlite3.connect(MUNICIPIOS_GPKG) as conn:
            fila = conn.execute(
                """
                SELECT codigo, codigo_departamento, nombre,
                      poblacion_2018, fuente, ano_censo, geom
                FROM municipios
                WHERE codigo = ?;
                """,
                (codigo,),
            ).fetchone()
        if fila:
            area_km2 = obtener_area_geodesica(fila[6])
            return {
                "codigo": fila[0],
                "codigo_departamento": fila[1],
                "nombre": fila[2],
                "departamento": None,
                "poblacion_2018": fila[3],
                "area_km2": area_km2,
                "fuente": fila[4],
                "ano_censo": fila[5],
                "fecha_actualizacion": None,
                "fuente_respaldo": "GeoPackage municipal local",
            }

    if not fila:
        return {"error": "Municipio no encontrado"}

    return {
        "id": fila[0],
        "codigo": fila[1],
        "codigo_departamento": fila[2],
        "nombre": fila[3],
        "departamento": fila[4],
        "poblacion_2018": fila[5],
        "area_km2": fila[6],
        "fuente": fila[7],
        "ano_censo": fila[8],
        "fecha_actualizacion": fila[9],
    }


@app.get("/municipios/{codigo}/vias-resumen")
def obtener_resumen_vias_municipio(codigo: str):
    try:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT nombre
                    FROM public.municipios
                    WHERE codigo = %s
                      AND departamento ILIKE '%%Antioquia%%';
                    """,
                    (codigo,),
                )
                municipio = cursor.fetchone()

                if not municipio:
                    raise HTTPException(
                        status_code=404,
                        detail="El resumen vial está disponible solo para Antioquia.",
                    )

                cursor.execute(
                    """
                    SELECT
                        COALESCE(vias.clase, 'Sin clasificar') AS clase,
                        COUNT(DISTINCT vias.osm_id) AS total_tramos
                    FROM public.vias_osm AS vias
                    JOIN public.municipios AS municipio
                      ON municipio.codigo = %s
                     AND municipio.departamento ILIKE '%%Antioquia%%'
                     AND municipio.geom IS NOT NULL
                     AND gis.ST_Intersects(vias.geom, municipio.geom)
                    WHERE vias.geom IS NOT NULL
                    GROUP BY COALESCE(vias.clase, 'Sin clasificar')
                    ORDER BY total_tramos DESC, clase;
                    """,
                    (codigo,),
                )
                clases = cursor.fetchall()

                cursor.execute(
                    """
                    WITH municipio_seleccionado AS (
                        SELECT codigo, geom
                        FROM public.municipios
                        WHERE codigo = %s
                          AND departamento ILIKE '%%Antioquia%%'
                          AND geom IS NOT NULL
                    ),

                    tramos_municipales AS MATERIALIZED (
                        SELECT vias.osm_id, vias.geom
                        FROM public.vias_osm AS vias
                        JOIN municipio_seleccionado AS municipio
                          ON gis.ST_Intersects(vias.geom, municipio.geom)
                    )

                    SELECT
                        destino.codigo,
                        destino.nombre,
                        COUNT(DISTINCT tramo.osm_id) AS tramos_compartidos
                    FROM tramos_municipales AS tramo
                    JOIN public.municipios AS destino
                      ON destino.codigo <> %s
                     AND destino.departamento ILIKE '%%Antioquia%%'
                     AND destino.geom IS NOT NULL
                     AND gis.ST_Intersects(tramo.geom, destino.geom)
                    GROUP BY destino.codigo, destino.nombre
                    ORDER BY tramos_compartidos DESC, destino.nombre;
                    """,
                    (codigo, codigo),
                )
                conexiones = cursor.fetchall()
    except psycopg.errors.UndefinedTable as error:
        raise HTTPException(
            status_code=503,
            detail="La tabla public.vias_osm no está disponible.",
        ) from error
    except psycopg.Error as error:
        raise HTTPException(
            status_code=503,
            detail=(
                "Supabase rechazó la consulta de vías. Revisa la conexión "
                "del backend y vuelve a intentar."
            ),
        ) from error

    resumen_clases = [
        {"clase": clase, "total_tramos": total}
        for clase, total in clases
    ]
    municipios_conectados = [
        {
            "codigo": codigo_conectado,
            "municipio": nombre_conectado,
            "tramos_compartidos": total_compartidos,
        }
        for codigo_conectado, nombre_conectado, total_compartidos in conexiones
    ]

    return {
        "codigo_municipio": codigo,
        "municipio": municipio[0],
        "total_tramos": sum(total for _, total in clases),
        "desglose_clases": resumen_clases,
        "municipios_conectados": municipios_conectados,
        "metodo": (
            "Cuenta vías OSM que intersectan el polígono municipal. "
            "Una conexión indica que el mismo tramo OSM intersecta ambos municipios."
        ),
    }


# ============================================================
# MUNICIPIOS - VECTOR TILES MVT
# ============================================================


@app.get("/municipios/tiles/{z}/{x}/{y}.pbf")
def municipios_tile(z: int, x: int, y: int):
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                WITH bounds AS (
                    SELECT gis.ST_TileEnvelope(%s, %s, %s) AS geom
                ),

                municipios AS (
                    SELECT
                        id,
                        codigo,
                        nombre,
                        codigo_departamento,
                        geom
                    FROM public.municipios
                    WHERE geom IS NOT NULL
                )

                SELECT gis.ST_AsMVT(tile, 'municipios', 4096, 'geom')
                FROM (
                    SELECT
                        municipios.id,
                        municipios.codigo,
                        municipios.nombre,
                        municipios.codigo_departamento,
                        gis.ST_AsMVTGeom(
                            gis.ST_Transform(municipios.geom, 3857),
                            bounds.geom,
                            4096,
                            64,
                            true
                        ) AS geom
                    FROM municipios
                    CROSS JOIN bounds
                    WHERE gis.ST_Intersects(
                        gis.ST_Transform(municipios.geom, 3857),
                        bounds.geom
                    )
                ) AS tile;
                """,
                (z, x, y),
            )
            resultado = cursor.fetchone()[0]

    if resultado is None:
        resultado = b""

    return Response(
        content=bytes(resultado),
        media_type="application/vnd.mapbox-vector-tile",
    )


@app.get("/municipios/{codigo}/normativa")
def obtener_normativa_municipio(codigo: str):
    try:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                SELECT
                    id,
                    codigo_municipio,
                    tipo_instrumento,
                    titulo,
                    entidad_responsable,
                    acto_administrativo,
                    fecha_adopcion,
                    fecha_vigencia,
                    url_oficial,
                    estado_verificacion,
                    observaciones,
                    fecha_verificacion,
                    verificado_por,
                    fuente_verificacion
                FROM public.normativa_documentos
                WHERE codigo_municipio = %s
                ORDER BY tipo_instrumento, titulo;
                    """,
                    (codigo,),
                )
                filas = cursor.fetchall()
    except psycopg.Error as error:
        raise HTTPException(
            status_code=503,
            detail=(
                "Supabase rechazó la consulta de normativa. Revisa la conexión "
                "del backend y vuelve a intentar."
            ),
        ) from error

    documentos = []
    for fila in filas:
        documentos.append(
            {
                "id": fila[0],
                "codigo_municipio": fila[1],
                "tipo_instrumento": fila[2],
                "titulo": fila[3],
                "entidad_responsable": fila[4],
                "acto_administrativo": fila[5],
                "fecha_adopcion": fila[6],
                "fecha_vigencia": fila[7],
                "url_oficial": fila[8],
                "estado_verificacion": fila[9],
                "observaciones": fila[10],
                "fecha_verificacion": fila[11],
                "verificado_por": fila[12],
                "fuente_verificacion": fila[13],
            }
        )

    return {
        "codigo_municipio": codigo,
        "total_documentos": len(documentos),
        "documentos": documentos,
    }


# ============================================================
# INSTRUMENTOS DE ORDENAMIENTO REPORTADOS POR EL IGAC
# ============================================================


@app.get("/municipios/{codigo}/normativa/igac")
def obtener_instrumentos_igac(codigo: str):
    """Consulta los instrumentos reportados por el servicio del IGAC."""
    try:
        with get_connection() as conn:
            with conn.cursor() as cursor:
                cursor.execute(
                    """
                SELECT
                    objectid,
                    codigo_municipio,
                    municipio,
                    departamento,
                    id_ot,
                    id_instrumento,
                    tipo_instrumento,
                    num_acto_administrativo,
                    tipo_acto_administrativo,
                    estado_instrumento,
                    modificacion,
                    tipo_modificacion,
                    tipo_vigencia,
                    vigencia_instrumento,
                    estado_igac,
                    estado_cartografia,
                    fecha_adopcion,
                    fecha_actualizacion_igac,
                    fuente_igac
                FROM public.vw_igac_instrumentos_normativa
                WHERE codigo_municipio = %s
                ORDER BY fecha_adopcion DESC NULLS LAST, id_instrumento, objectid;
                    """,
                    (codigo,),
                )
                filas = cursor.fetchall()
    except psycopg.Error as error:
        raise HTTPException(
            status_code=503,
            detail=(
                "Supabase rechazó la consulta de instrumentos IGAC. "
                "Revisa la conexión del backend y vuelve a intentar."
            ),
        ) from error

    instrumentos = []
    for fila in filas:
        instrumentos.append(
            {
                "objectid": fila[0],
                "codigo_municipio": fila[1],
                "municipio": fila[2],
                "departamento": fila[3],
                "id_ot": fila[4],
                "id_instrumento": fila[5],
                "tipo_instrumento": fila[6],
                "acto_administrativo": fila[7],
                "tipo_acto_administrativo_codigo": fila[8],
                "estado_instrumento_codigo": fila[9],
                "modificacion": fila[10],
                "tipo_modificacion_codigo": fila[11],
                "tipo_vigencia_codigo": fila[12],
                "vigencia_instrumento_codigo": fila[13],
                "estado_igac_codigo": fila[14],
                "estado_cartografia_codigo": fila[15],
                "fecha_adopcion": fila[16],
                "fecha_actualizacion_igac": fila[17],
                "fuente_igac": fila[18],
                "estado_verificacion_documental": "pendiente",
            }
        )

    return {
        "codigo_municipio": codigo,
        "total_instrumentos_igac": len(instrumentos),
        "nota": (
            "Datos reportados por el IGAC. Los códigos de estado y acto "
            "se conservan como códigos de origen; no equivalen por sí solos "
            "a una verificación jurídica ni documental."
        ),
        "instrumentos": instrumentos,
    }


class ActualizacionVerificacion(BaseModel):
    estado_verificacion: str
    verificado_por: Optional[str] = None
    fuente_verificacion: Optional[str] = None
    observaciones: Optional[str] = None


@app.patch("/normativa/{documento_id}/verificacion")
def actualizar_verificacion_normativa(
    documento_id: int,
    datos: ActualizacionVerificacion,
    x_admin_token: Optional[str] = Header(default=None, alias="X-Admin-Token"),
):
    token_configurado = os.getenv("INVERSIG_ADMIN_TOKEN")

    if not token_configurado:
        raise HTTPException(
            status_code=503,
            detail="La clave administrativa no está configurada",
        )

    if not x_admin_token or not secrets.compare_digest(x_admin_token, token_configurado):
        raise HTTPException(status_code=401, detail="No autorizado")

    estados_permitidos = {"pendiente", "verificado", "desactualizado", "no_disponible"}
    estado = datos.estado_verificacion.strip().lower()

    if estado not in estados_permitidos:
        raise HTTPException(status_code=400, detail="Estado de verificación no válido")

    responsable = datos.verificado_por.strip() if datos.verificado_por else ""
    fuente = datos.fuente_verificacion.strip() if datos.fuente_verificacion else ""

    if estado != "pendiente" and (not responsable or not fuente):
        raise HTTPException(
            status_code=400,
            detail=(
                "Para cambiar el estado debes registrar "
                "el responsable y la fuente consultada"
            ),
        )

    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                UPDATE public.normativa_documentos
                SET
                    estado_verificacion = %s,
                    fecha_verificacion = CASE
                        WHEN %s = 'pendiente' THEN NULL
                        ELSE NOW()
                    END,
                    verificado_por = %s,
                    fuente_verificacion = %s,
                    observaciones = COALESCE(%s, observaciones),
                    fecha_actualizacion = NOW()
                WHERE id = %s
                RETURNING
                    id,
                    codigo_municipio,
                    estado_verificacion,
                    fecha_verificacion,
                    verificado_por,
                    fuente_verificacion,
                    observaciones;
                """,
                (
                    estado,
                    estado,
                    responsable or None,
                    fuente or None,
                    datos.observaciones,
                    documento_id,
                ),
            )
            fila = cursor.fetchone()

    if not fila:
        raise HTTPException(status_code=404, detail="Documento normativo no encontrado")

    return {
        "mensaje": "Verificación documental actualizada",
        "id": fila[0],
        "codigo_municipio": fila[1],
        "estado_verificacion": fila[2],
        "fecha_verificacion": fila[3],
        "verificado_por": fila[4],
        "fuente_verificacion": fila[5],
        "observaciones": fila[6],
    }



# ============================================================
# REPROYECCIÓN DE CAPAS GEOJSON
# ============================================================

class ReprojectionRequest(BaseModel):
    source_crs: str = Field(min_length=3, max_length=80)
    target_crs: str = Field(min_length=3, max_length=80)
    geojson: dict


def _normalizar_crs(valor: str) -> CRS:
    """Acepta códigos EPSG y nombres CRS reconocidos por PROJ."""
    valor = valor.strip()
    # Formatos antiguos de GeoJSON: urn:ogc:def:crs:EPSG::4326 o EPSG:4326
    match = __import__("re").search(r"EPSG(?::|::|/)(\d+)$", valor, flags=__import__("re").I)
    if match:
        valor = f"EPSG:{match.group(1)}"
    try:
        return CRS.from_user_input(valor)
    except Exception as exc:
        raise HTTPException(
            status_code=400,
            detail=f"No se reconoce el sistema de referencia '{valor}'. Usa un código EPSG válido."
        ) from exc


def _transformar_feature_collection(geojson: dict, transformer: Transformer) -> dict:
    if not isinstance(geojson, dict):
        raise HTTPException(status_code=400, detail="El archivo debe ser un GeoJSON válido.")
    if geojson.get("type") != "FeatureCollection" or not isinstance(geojson.get("features"), list):
        raise HTTPException(
            status_code=400,
            detail="Se requiere un GeoJSON FeatureCollection con una lista de entidades."
        )
    if len(geojson["features"]) > 100000:
        raise HTTPException(
            status_code=413,
            detail="La capa supera el límite de 100.000 entidades por operación."
        )

    features = []
    for index, feature in enumerate(geojson["features"]):
        if not isinstance(feature, dict) or feature.get("type") != "Feature":
            raise HTTPException(status_code=400, detail=f"La entidad {index + 1} no es un Feature GeoJSON.")
        geometry_data = feature.get("geometry")
        if geometry_data is None:
            new_geometry = None
        else:
            try:
                geometry = shape(geometry_data)
                transformed = __import__("shapely.ops", fromlist=["transform"]).transform(
                    transformer.transform, geometry
                )
                new_geometry = mapping(transformed)
            except Exception as exc:
                raise HTTPException(
                    status_code=400,
                    detail=f"No fue posible transformar la geometría de la entidad {index + 1}: {exc}"
                ) from exc

        features.append({
            "type": "Feature",
            "id": feature.get("id"),
            "properties": feature.get("properties") or {},
            "geometry": new_geometry,
        })

    return {"type": "FeatureCollection", "features": features}


@app.post("/reproject")
def reproyectar_capa(datos: ReprojectionRequest):
    """
    Transforma realmente las coordenadas source_crs -> target_crs.
    Devuelve geojson en el CRS de destino y display_geojson en EPSG:4326
    para que Leaflet pueda dibujarlo correctamente.
    """
    origen = _normalizar_crs(datos.source_crs)
    destino = _normalizar_crs(datos.target_crs)

    if origen == destino:
        raise HTTPException(status_code=400, detail="El CRS de origen y destino son iguales.")

    if datos.geojson.get("type") != "FeatureCollection":
        raise HTTPException(status_code=400, detail="El archivo debe ser una FeatureCollection GeoJSON.")

    try:
        transformer_destino = Transformer.from_crs(origen, destino, always_xy=True)
        transformer_visual = Transformer.from_crs(destino, CRS.from_epsg(4326), always_xy=True)
        geojson_reproyectado = _transformar_feature_collection(datos.geojson, transformer_destino)
        geojson_visualizacion = _transformar_feature_collection(geojson_reproyectado, transformer_visual)
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"No se pudo reproyectar la capa: {exc}") from exc

    epsg_destino = destino.to_authority()
    nombre_destino = f"{epsg_destino[0]}:{epsg_destino[1]}" if epsg_destino else destino.name
    geojson_reproyectado["crs"] = {
        "type": "name",
        "properties": {"name": nombre_destino}
    }

    return {
        "source_crs": origen.to_string(),
        "target_crs": nombre_destino,
        "feature_count": len(geojson_reproyectado["features"]),
        "geojson": geojson_reproyectado,
        "display_geojson": geojson_visualizacion,
        "message": "Reproyección completada mediante PyProj."
    }





@app.get("/municipios/{codigo}/geometria")
def obtener_geometria_municipio(codigo: str):
    """Devuelve el polígono municipal como GeoJSON para resaltarlo en el mapa."""
    with get_connection() as conn:
        with conn.cursor() as cursor:
            cursor.execute(
                """
                SELECT
                    codigo,
                    nombre,
                    gis.ST_AsGeoJSON(
                        gis.ST_SimplifyPreserveTopology(geom, 0.00005),
                        6
                    )::json AS geometry
                FROM public.municipios
                WHERE codigo = %s
                  AND geom IS NOT NULL;
                """,
                (codigo,),
            )
            fila = cursor.fetchone()

    if not fila:
        raise HTTPException(status_code=404, detail="No se encontró la geometría del municipio.")

    return {
        "type": "FeatureCollection",
        "features": [{
            "type": "Feature",
            "properties": {"codigo": fila[0], "nombre": fila[1]},
            "geometry": fila[2],
        }],
    }
# ============================================================
# FUENTE EXTERNA: VIXORA AI (solo lectura)
# ============================================================

VIXORA_API_BASE = "https://api.vixoraai.com/public/v1"
MUNICIPIOS_VIXORA_PRUEBA = {
    "rionegro", "la-ceja", "el-retiro", "guarne", "marinilla",
    "el-carmen-de-viboral", "el-santuario", "san-vicente-ferrer",
    "guatape", "el-penol", "san-rafael", "san-carlos", "sonson", "abejorral",
}


def consultar_vixora(params: dict) -> dict:
    """Consulta la API pública de VIXORA sin persistir anuncios en INVERSIG."""
    query = urllib.parse.urlencode({k: v for k, v in params.items() if v not in (None, "")})
    url = f"{VIXORA_API_BASE}/properties?{query}"
    request = urllib.request.Request(
        url,
        headers={"Accept": "application/json", "User-Agent": "INVERSIG/1.0"},
        method="GET",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            payload = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"VIXORA respondió HTTP {exc.code}.") from exc
    except (urllib.error.URLError, TimeoutError) as exc:
        raise HTTPException(status_code=502, detail="No fue posible conectar con VIXORA. Verifica la conexión del servidor.") from exc
    except (json.JSONDecodeError, UnicodeDecodeError) as exc:
        raise HTTPException(status_code=502, detail="VIXORA no devolvió una respuesta JSON válida.") from exc
    if not isinstance(payload, dict):
        raise HTTPException(status_code=502, detail="La respuesta de VIXORA tiene un formato inesperado.")
    return payload


@app.get("/fuentes/vixora/propiedades")
def buscar_propiedades_vixora(
    municipio: str = "",
    tipo: str = "ambos",
    area_min: Optional[float] = None,
    precio_max: Optional[int] = None,
    page: int = 1,
    page_size: int = 20,
):
    """Busca lotes/fincas publicados en los 14 municipios habilitados del Oriente antioqueño."""
    municipio = municipio.strip().lower()
    if municipio and municipio not in MUNICIPIOS_VIXORA_PRUEBA:
        raise HTTPException(status_code=400, detail="Municipio fuera del alcance de esta prueba.")
    if tipo not in {"lote", "finca", "ambos"}:
        raise HTTPException(status_code=400, detail="Tipo no válido. Usa lote, finca o ambos.")
    if area_min is not None and area_min < 0:
        raise HTTPException(status_code=400, detail="El área mínima no puede ser negativa.")
    if precio_max is not None and precio_max < 0:
        raise HTTPException(status_code=400, detail="El precio máximo no puede ser negativo.")
    page = max(1, page)
    page_size = min(max(1, page_size), 50)
    tipos = ["lote", "finca"] if tipo == "ambos" else [tipo]
    anuncios = []
    paginaciones = []
    for tipo_actual in tipos:
        params = {
            "type": tipo_actual,
            "operation": "venta",
            "municipality": municipio or None,
            "area_min": area_min,
            "price_max": precio_max,
            "page": page,
            "page_size": page_size,
        }
        respuesta = consultar_vixora(params)
        datos = respuesta.get("data", [])
        if isinstance(datos, list):
            anuncios.extend(datos)
        if isinstance(respuesta.get("pagination"), dict):
            paginaciones.append(respuesta["pagination"])
    # El código de VIXORA identifica cada anuncio; evita duplicados si la fuente repite alguno.
    unicos = {}
    for anuncio in anuncios:
        clave = anuncio.get("code") or anuncio.get("url") or json.dumps(anuncio, sort_keys=True)
        unicos[clave] = anuncio
    resultados = list(unicos.values())
    return {
        "source": "VIXORA AI",
        "source_url": "https://vixoraai.com",
        "query": {"municipio": municipio or "todos", "tipo": tipo, "operacion": "venta"},
        "data": resultados,
        "total_returned": len(resultados),
        "pagination": paginaciones,
        "notice": "Precios de oferta publicados por la fuente; no constituyen avalúos. Consulta la ficha original para confirmar disponibilidad.",
    }

# ============================================================
# FIN DEL BACKEND
# ============================================================
