# ==========================================
# MINI VISOR SIG - BACKEND
# ==========================================

from typing import Any, Dict
import math

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pyproj import Transformer


# ==========================================
# 1. CREAR APLICACIÓN
# ==========================================

app = FastAPI(
    title="Mini Visor SIG API",
    description="Backend para procesamiento de información geográfica",
    version="1.0.0"
)


# ==========================================
# 2. CORS
# ==========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# 3. MODELO DE SOLICITUD
# ==========================================

class ReprojectRequest(BaseModel):

    source_crs: str

    target_crs: str

    geojson: Dict[str, Any]


# ==========================================
# 4. TRANSFORMAR COORDENADAS
# ==========================================

def transformar_coordenadas(
    coordenadas,
    transformer
):

    # ------------------------------------------
    # Punto [x, y]
    # ------------------------------------------

    if (
        isinstance(coordenadas, list)
        and len(coordenadas) >= 2
        and isinstance(coordenadas[0], (int, float))
        and isinstance(coordenadas[1], (int, float))
    ):

        x = coordenadas[0]

        y = coordenadas[1]


        nuevo_x, nuevo_y = transformer.transform(
            x,
            y
        )


        # ------------------------------------------
        # Verificar números válidos
        # ------------------------------------------

        if not (
            math.isfinite(nuevo_x)
            and math.isfinite(nuevo_y)
        ):

            raise ValueError(
                f"Coordenadas inválidas generadas: "
                f"{nuevo_x}, {nuevo_y}"
            )


        # ------------------------------------------
        # Conservar Z si existe
        # ------------------------------------------

        if len(coordenadas) > 2:

            return [
                nuevo_x,
                nuevo_y,
                *coordenadas[2:]
            ]


        return [
            nuevo_x,
            nuevo_y
        ]


    # ------------------------------------------
    # Líneas, polígonos, etc.
    # ------------------------------------------

    return [
        transformar_coordenadas(
            coordenada,
            transformer
        )
        for coordenada in coordenadas
    ]


# ==========================================
# 5. REPROYECTAR GEOMETRÍA
# ==========================================

def reproyectar_geometria(
    geometria,
    transformer
):

    if geometria is None:

        return None


    nueva_geometria = {
        "type": geometria.get("type")
    }


    # ------------------------------------------
    # Geometría con coordenadas
    # ------------------------------------------

    if "coordinates" in geometria:

        nueva_geometria["coordinates"] = (
            transformar_coordenadas(
                geometria["coordinates"],
                transformer
            )
        )


    return nueva_geometria


# ==========================================
# 6. REPROYECTAR GEOJSON
# ==========================================

def reproyectar_geojson(
    geojson,
    source_crs,
    target_crs
):

    transformer = Transformer.from_crs(
        source_crs,
        target_crs,
        always_xy=True
    )


    resultado = {

        "type":
            geojson.get(
                "type",
                "FeatureCollection"
            ),

        "features":
            []

    }


    # ------------------------------------------
    # Procesar features
    # ------------------------------------------

    for feature in geojson.get(
        "features",
        []
    ):

        nueva_feature = {

            "type":
                feature.get(
                    "type",
                    "Feature"
                ),

            "properties":
                feature.get(
                    "properties",
                    {}
                ),

            "geometry":
                None

        }


        geometria =feature.get(
                "geometry"
            )


        if geometria is not None:

            nueva_feature["geometry"] = (
                reproyectar_geometria(
                    geometria,
                    transformer
                )
            )


        resultado["features"].append(
            nueva_feature
        )


    # ------------------------------------------
    # CRS
    # ------------------------------------------

    resultado["crs"] = {

        "type":
            "name",

        "properties": {

            "name":
                target_crs

        }

    }


    return resultado


# ==========================================
# 7. RUTA PRINCIPAL
# ==========================================

@app.get("/")
def inicio():

    return {

        "mensaje":
            "Mini Visor SIG API funcionando",

        "version":
            "1.0.0",

        "estado":
            "OK"

    }


# ==========================================
# 8. ENDPOINT REPROYECCIÓN
# ==========================================

@app.post("/reproject")
def reproyectar(
    request: ReprojectRequest
):

    try:

        # ==========================================
        # VALIDAR
        # ==========================================

        if (
            request.source_crs
            ==
            request.target_crs
        ):

            raise HTTPException(
                status_code=400,
                detail=(
                    "El CRS de origen y destino "
                    "deben ser diferentes."
                )
            )


        # ==========================================
        # REPROYECCIÓN REAL
        # ==========================================

        geojson_reproyectado = (
            reproyectar_geojson(
                request.geojson,
                request.source_crs,
                request.target_crs
            )
        )


        # ==========================================
        # TRANSFORMACIÓN PARA VISUALIZACIÓN
        #
        # EPSG destino → EPSG:4326
        # ==========================================

        geojson_visualizacion = (
            reproyectar_geojson(
                geojson_reproyectado,
                request.target_crs,
                "EPSG:4326"
            )
        )


        # ==========================================
        # RESPUESTA
        # ==========================================

        return {

            "success":
                True,

            "source_crs":
                request.source_crs,

            "target_crs":
                request.target_crs,

            "geojson":
                geojson_reproyectado,

            "display_geojson":
                geojson_visualizacion

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