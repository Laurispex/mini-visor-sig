# ============================================================
# MINI VISOR SIG - BACKEND
# FastAPI + Supabase/PostGIS
# ============================================================

import os
import secrets
from typing import Optional

import psycopg
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel


# ============================================================
# CONFIGURACIÓN
# ============================================================

SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL")

if not SUPABASE_DB_URL:
    raise RuntimeError("No se encontró la variable de entorno SUPABASE_DB_URL")


# Tabla de referencias con nombres reales del esquema importado.
TABLA_CAPITALES = 'public."capitales_departamentales — Capitales Departamentales"'
TABLA_CIUDADES = 'public."ciudades"'
TABLA_MUNICIPIOS = 'public."municipios_atlas — municipios"'


# ============================================================
# FASTAPI
# ============================================================

app = FastAPI(
    title="INVERSIG API",
    description="API de Inteligencia Territorial",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
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
        return obtener_feature_collection(TABLA_CAPITALES, "nombre, departamento")
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Error consultando capitales en PostGIS: {str(error)}",
        )


@app.get("/ciudades")
def obtener_ciudades():
    try:
        return obtener_feature_collection(TABLA_CIUDADES, "nombre, departamento, poblacion")
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(
            status_code=500,
            detail=f"Error consultando ciudades en PostGIS: {str(error)}",
        )


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
                    fuente,
                    ano_censo,
                    gis.ST_AsGeoJSON(geom)::json AS geometry
                FROM public.municipios
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
                "fuente": fila[5],
                "ano_censo": fila[6],
                "geometry": fila[7],
            }
        )

    return municipios


@app.get("/municipios/{codigo}")
def obtener_municipio(codigo: str):
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
                    fecha_actualizacion,
                    gis.ST_AsGeoJSON(geom)::json AS geometry
                FROM public.municipios
                WHERE codigo = %s;
                """,
                (codigo,),
            )
            fila = cursor.fetchone()

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
        "geometry": fila[10],
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
# FIN DEL BACKEND
# ============================================================
