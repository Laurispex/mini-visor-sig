# ============================================================
# MINI VISOR SIG - BACKEND
# FastAPI + PyProj + Supabase/PostGIS
# ============================================================

from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pyproj import Transformer, CRS
import psycopg


# ============================================================
# 1. CONFIGURACIÓN DE SUPABASE / POSTGIS
# ============================================================

import os

SUPABASE_DB_URL = os.getenv("SUPABASE_DB_URL")

# Estos nombres se toman del esquema importado desde QGIS. Al contener
# espacios y un guion largo deben ir siempre entre comillas dobles en SQL.
TABLA_CAPITALES = 'public."capitales_departamentales — Capitales Departamentales"'
TABLA_CIUDADES = 'public."ciudades"'
TABLA_MUNICIPIOS = 'public."municipios_atlas — municipios"'


def obtener_conexion():
    if not SUPABASE_DB_URL:
        raise HTTPException(
            status_code=500,
            detail="Falta configurar SUPABASE_DB_URL en el backend."
        )

    # El Session Pooler puede tardar más en responder en redes domésticas.
    return psycopg.connect(SUPABASE_DB_URL, connect_timeout=30)


def obtener_feature_collection(tabla: str, columnas: str) -> dict:
    """Convierte geometrías PostGIS reales a GeoJSON para Leaflet."""
    consulta = f"""
        SELECT {columnas}, ST_AsGeoJSON(geom)::json AS geometry
        FROM {tabla}
        WHERE geom IS NOT NULL
        ORDER BY id
    """

    with obtener_conexion() as conexion:
        with conexion.cursor(row_factory=psycopg.rows.dict_row) as cursor:
            cursor.execute(consulta)
            filas = cursor.fetchall()

    return {
        "type": "FeatureCollection",
        "crs": {
            "type": "name",
            "properties": {"name": "EPSG:4326"}
        },
        "features": [
            {
                "type": "Feature",
                "properties": {
                    clave: valor
                    for clave, valor in fila.items()
                    if clave != "geometry"
                },
                "geometry": fila["geometry"]
            }
            for fila in filas
        ]
    }


# ============================================================
# 2. CREAR APLICACIÓN FASTAPI
# ============================================================

app = FastAPI(
    title="Mini Visor SIG API",
    description="Backend del Mini Visor SIG",
    version="1.0.0"
)


# ============================================================
# 3. CONFIGURACIÓN CORS
# ============================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================
# 4. MODELO DE SOLICITUD DE REPROYECCIÓN
# ============================================================

class ReprojectRequest(BaseModel):
    source_crs: str
    target_crs: str
    geojson: dict


# ============================================================
# 5. TRANSFORMAR COORDENADAS
# ============================================================

def transformar_coordenadas(
    coordenadas: Any,
    transformer: Transformer
) -> Any:

    # Caso: [x, y]
    if (
        isinstance(coordenadas, list)
        and len(coordenadas) >= 2
        and isinstance(coordenadas[0], (int, float))
        and isinstance(coordenadas[1], (int, float))
    ):
        x, y = transformer.transform(
            coordenadas[0],
            coordenadas[1]
        )

        return [
            float(x),
            float(y)
        ]

    # Caso: listas anidadas
    if isinstance(coordenadas, list):
        return [
            transformar_coordenadas(
                elemento,
                transformer
            )
            for elemento in coordenadas
        ]

    return coordenadas


# ============================================================
# 6. REPROYECTAR GEOMETRÍA
# ============================================================

def reproyectar_geometria(
    geometria: dict,
    transformer: Transformer
) -> dict:

    if not geometria:
        return geometria

    geometria_nueva = geometria.copy()

    # GeometryCollection
    if geometria.get("type") == "GeometryCollection":

        geometria_nueva["geometries"] = [
            reproyectar_geometria(
                geometry,
                transformer
            )
            for geometry in geometria.get(
                "geometries",
                []
            )
        ]

        return geometria_nueva

    # Geometrías normales
    if "coordinates" in geometria:

        geometria_nueva["coordinates"] = (
            transformar_coordenadas(
                geometria["coordinates"],
                transformer
            )
        )

    return geometria_nueva


# ============================================================
# 7. REPROYECTAR GEOJSON COMPLETO
# ============================================================

def reproyectar_geojson(
    geojson: dict,
    transformer: Transformer
) -> dict:

    resultado = geojson.copy()

    # --------------------------------------------------------
    # FeatureCollection
    # --------------------------------------------------------

    if geojson.get("type") == "FeatureCollection":

        resultado["features"] = []

        for feature in geojson.get("features", []):

            feature_nueva = feature.copy()

            if feature.get("geometry"):

                feature_nueva["geometry"] = (
                    reproyectar_geometria(
                        feature["geometry"],
                        transformer
                    )
                )

            resultado["features"].append(
                feature_nueva
            )

        return resultado

    # --------------------------------------------------------
    # Feature
    # --------------------------------------------------------

    if geojson.get("type") == "Feature":

        if geojson.get("geometry"):

            resultado["geometry"] = (
                reproyectar_geometria(
                    geojson["geometry"],
                    transformer
                )
            )

        return resultado

    # --------------------------------------------------------
    # Geometry
    # --------------------------------------------------------

    if "coordinates" in geojson:

        return reproyectar_geometria(
            geojson,
            transformer
        )

    return resultado


# ============================================================
# 8. ACTUALIZAR CRS DEL GEOJSON
# ============================================================

def actualizar_crs(
    geojson: dict,
    crs: str
) -> dict:

    resultado = geojson.copy()

    resultado["crs"] = {
        "type": "name",
        "properties": {
            "name": crs
        }
    }

    return resultado


# ============================================================
# 9. ENDPOINT PRINCIPAL
# ============================================================

@app.get("/")
def inicio():

    return {
        "success": True,
        "message": "Mini Visor SIG API funcionando",
        "version": "1.0.0"
    }


# ============================================================
# 10. ENDPOINT DE SALUD
# ============================================================

@app.get("/health")
def health():

    try:

        with obtener_conexion() as conexion:
            with conexion.cursor() as cursor:
                cursor.execute("SELECT 1")

        return {
            "success": True,
            "api": "online",
            "supabase_postgis": "online"
        }

    except Exception as error:

        return {
            "success": True,
            "api": "online",
            "supabase_postgis": "offline",
            "error": str(error)
        }


# ============================================================
# 11. OBTENER CAPAS DESDE SUPABASE / POSTGIS
# ============================================================

@app.get("/capitales-departamentales")
def obtener_capitales_departamentales():
    try:
        return obtener_feature_collection(TABLA_CAPITALES, "nombre, departamento")
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Error consultando capitales en PostGIS: {str(error)}")


@app.get("/ciudades")
def obtener_ciudades():
    try:
        return obtener_feature_collection(TABLA_CIUDADES, "nombre, departamento, poblacion")
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Error consultando ciudades en PostGIS: {str(error)}")

@app.get("/municipios")
def obtener_municipios():
    try:
        consulta = f"""
            SELECT codigo, nombre, codigo_departamento, poblacion_2018,
                   ST_AsGeoJSON(geom)::json AS geometry
            FROM {TABLA_MUNICIPIOS}
            WHERE geom IS NOT NULL
            ORDER BY codigo
        """

        # Un cursor del servidor transmite la respuesta gradualmente usando
        # una única conexión. Así se conservan las geometrías originales sin
        # abrir decenas de conexiones contra el Session Pooler.
        municipios = []
        with obtener_conexion() as conexion:
            with conexion.cursor(
                name="municipios_cursor",
                row_factory=psycopg.rows.dict_row
            ) as cursor:
                cursor.execute(consulta)

                while lote := cursor.fetchmany(5):
                    municipios.extend(lote)

        return {"success": True, "total": len(municipios), "municipios": municipios}
    except HTTPException:
        raise
    except Exception as error:
        raise HTTPException(status_code=500, detail=f"Error consultando municipios en PostGIS: {str(error)}")



# ============================================================
# 12. OBTENER UN MUNICIPIO POR CÓDIGO
# ============================================================

@app.get("/municipios/{codigo}")
def obtener_municipio(codigo: str):

    try:

        consulta = f"""
            SELECT codigo, nombre, codigo_departamento, poblacion_2018,
                   ST_AsGeoJSON(geom)::json AS geometry
            FROM {TABLA_MUNICIPIOS}
            WHERE codigo = %s
        """
        with obtener_conexion() as conexion:
            with conexion.cursor(row_factory=psycopg.rows.dict_row) as cursor:
                cursor.execute(consulta, (codigo,))
                municipio = cursor.fetchone()

        if not municipio:

            raise HTTPException(
                status_code=404,
                detail="Municipio no encontrado."
            )

        return {
            "success": True,
            "municipio": municipio
        }

    except HTTPException:

        raise

    except Exception as error:

        raise HTTPException(
            status_code=500,
            detail=f"Error consultando PostGIS: {str(error)}"
        )


# ============================================================
# 13. REPROYECCIÓN
# ============================================================

@app.post("/reproject")
def reproyectar(
    request: ReprojectRequest
):

    try:

        # ----------------------------------------------------
        # VALIDAR CRS
        # ----------------------------------------------------

        source_crs = CRS.from_user_input(
            request.source_crs
        )

        target_crs = CRS.from_user_input(
            request.target_crs
        )

        # ----------------------------------------------------
        # EVITAR MISMO CRS
        # ----------------------------------------------------

        if source_crs == target_crs:

            raise HTTPException(
                status_code=400,
                detail=(
                    "El CRS de destino debe ser "
                    "diferente al CRS de origen."
                )
            )

        # ----------------------------------------------------
        # TRANSFORMADOR
        # ----------------------------------------------------

        transformer = Transformer.from_crs(
            source_crs,
            target_crs,
            always_xy=True
        )

        # ----------------------------------------------------
        # GEOJSON REPROYECTADO REALMENTE
        # ----------------------------------------------------

        geojson_reproyectado = reproyectar_geojson(
            request.geojson,
            transformer
        )

        geojson_reproyectado = actualizar_crs(
            geojson_reproyectado,
            request.target_crs
        )

        # ----------------------------------------------------
        # GEOJSON PARA VISUALIZACIÓN EN LEAFLET
        #
        # Leaflet trabaja normalmente con coordenadas
        # geográficas WGS84 / EPSG:4326.
        # ----------------------------------------------------

        transformer_display = Transformer.from_crs(
            target_crs,
            CRS.from_epsg(4326),
            always_xy=True
        )

        display_geojson = reproyectar_geojson(
            geojson_reproyectado,
            transformer_display
        )

        display_geojson = actualizar_crs(
            display_geojson,
            "EPSG:4326"
        )

        # ----------------------------------------------------
        # RESPUESTA
        # ----------------------------------------------------

        return {
            "success": True,

            "source_crs": request.source_crs,

            "target_crs": request.target_crs,

            "geojson": geojson_reproyectado,

            "display_geojson": display_geojson
        }

    except HTTPException:

        raise

    except Exception as error:

        print(
            "ERROR EN REPROYECCIÓN:",
            error
        )

        raise HTTPException(
            status_code=500,
            detail=str(error)
        )
