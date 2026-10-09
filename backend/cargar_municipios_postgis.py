import os
import json
import requests
import psycopg
import time


DANE_MGN_URL = (
    "https://geoportal.dane.gov.co/mparcgis/rest/services/"
    "Hosted/Serv_Mpio_MGN_2025/FeatureServer/317/query"
)

DANE_POBLACION_URL = (
    "https://geoportal.dane.gov.co/mparcgis/rest/services/"
    "INDICADORES_DE_POBLACION/"
    "Serv_Mpios_DistribucionPoblacionTotalCen_2018/"
    "MapServer/4/query"
)

DATABASE_URL = os.getenv("SUPABASE_DB_URL")

if not DATABASE_URL:
    raise RuntimeError(
        "No se encontró la variable de entorno SUPABASE_DB_URL"
    )


def consultar(url, params):
    respuesta = requests.get(
        url,
        params=params,
        timeout=120
    )

    print("HTTP:", respuesta.status_code)

    if respuesta.status_code != 200:
        print(respuesta.text[:2000])
        raise RuntimeError(
            f"El servicio respondió HTTP {respuesta.status_code}"
        )

    datos = respuesta.json()

    if "error" in datos:
        print(datos["error"])
        raise RuntimeError(
            "El servicio DANE devolvió un error"
        )

    return datos


# =========================================================
# 1. OBTENER MUNICIPIOS DEL MGN 2025
# =========================================================

def obtener_object_ids():

    print()
    print("Obteniendo Object IDs del MGN 2025...")

    params = {
        "where": "1=1",
        "returnIdsOnly": "true",
        "f": "json"
    }

    datos = consultar(
        DANE_MGN_URL,
        params
    )

    object_ids = datos.get(
        "objectIds",
        []
    )

    if not object_ids:
        raise RuntimeError(
            "DANE no devolvió Object IDs"
        )

    print(
        f"Municipios encontrados: "
        f"{len(object_ids)}"
    )

    return object_ids


def obtener_municipios(ids):

    params = {
        "objectIds": ",".join(
            str(x) for x in ids
        ),
        "outFields": (
            "dpto_ccdgo,"
            "mpio_ccdgo,"
            "mpio_cdpmp,"
            "dpto_cnmbre,"
            "mpio_cnmbre,"
            "mpio_narea,"
            "mpio_nano"
        ),
        "returnGeometry": "true",
        "outSR": "4326",
        "f": "geojson"
    }

    return consultar(
        DANE_MGN_URL,
        params
    )


# =========================================================
# 2. OBTENER POBLACIÓN CNPV 2018
# =========================================================

def obtener_poblacion():

    print()
    print("Obteniendo población CNPV 2018...")

    params = {
        "where": "1=1",
        "outFields": "*",
        "returnGeometry": "false",
        "f": "json"
    }

    datos = consultar(
        DANE_POBLACION_URL,
        params
    )

    features = datos.get(
        "features",
        []
    )

    print(
        f"Registros de población recibidos: "
        f"{len(features)}"
    )

    poblacion = {}

    for feature in features:

        atributos = feature.get(
            "attributes",
            {}
        )

        codigo = (
            atributos.get("MPIO_CDPMP")
            or atributos.get("mpio_cdpmp")
            or atributos.get("CODIGO")
            or atributos.get("codigo")
        )

        if not codigo:
            continue

        poblacion[str(codigo)] = atributos

    return poblacion


# =========================================================
# 3. GUARDAR MUNICIPIOS
# =========================================================

def guardar_features(
    features,
    poblacion
):

    with psycopg.connect(
        DATABASE_URL
    ) as conn:

        with conn.cursor() as cursor:

            for feature in features:

                properties = feature.get(
                    "properties",
                    {}
                )

                geometry = feature.get(
                    "geometry"
                )

                if not geometry:
                    print(
                        "Advertencia: municipio "
                        "sin geometría. Se omite."
                    )
                    continue

                codigo = (
                    properties.get(
                        "mpio_cdpmp"
                    )
                    or properties.get(
                        "mpio_ccdgo"
                    )
                )

                codigo_departamento = (
                    properties.get(
                        "dpto_ccdgo"
                    )
                )

                nombre = (
                    properties.get(
                        "mpio_cnmbre"
                    )
                )

                departamento = (
                    properties.get(
                        "dpto_cnmbre"
                    )
                )

                area_km2 = (
                    properties.get(
                        "mpio_narea"
                    )
                )

                ano_mgn = (
                    properties.get(
                        "mpio_nano"
                    )
                )

                if not codigo or not nombre:
                    print(
                        "Advertencia: municipio "
                        "sin código o nombre."
                    )
                    continue

                # -----------------------------------------
                # POBLACIÓN
                # -----------------------------------------

                datos_poblacion = poblacion.get(
                    str(codigo),
                    {}
                )

                poblacion_2018 = None

                posibles_campos = [
                    "POBTOT",
                    "POBLACION",
                    "Poblacion",
                    "poblacion",
                    "TOTAL",
                    "Total",
                    "POB_TOTAL"
                ]

                for campo in posibles_campos:

                    if (
                        campo in datos_poblacion
                        and datos_poblacion[campo]
                        is not None
                    ):

                        poblacion_2018 = (
                            datos_poblacion[campo]
                        )

                        break

                geometry_json = json.dumps(
                    geometry,
                    ensure_ascii=False
                )

                cursor.execute(
                    """
                    INSERT INTO public.municipios (
                        codigo,
                        codigo_departamento,
                        nombre,
                        poblacion_2018,
                        fuente,
                        ano_censo,
                        geom,
                        area_km2,
                        departamento,
                        fecha_actualizacion
                    )
                    VALUES (
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        %s,
                        gis.ST_SetSRID(
                            gis.ST_GeomFromGeoJSON(
                                %s
                            ),
                            4326
                        ),
                        %s,
                        %s,
                        NOW()
                    )

                    ON CONFLICT (codigo)
                    DO UPDATE SET

                        codigo_departamento =
                            EXCLUDED.codigo_departamento,

                        nombre =
                            EXCLUDED.nombre,

                        poblacion_2018 =
                            EXCLUDED.poblacion_2018,

                        fuente =
                            EXCLUDED.fuente,

                        ano_censo =
                            EXCLUDED.ano_censo,

                        geom =
                            EXCLUDED.geom,

                        area_km2 =
                            EXCLUDED.area_km2,

                        departamento =
                            EXCLUDED.departamento,

                        fecha_actualizacion =
                            EXCLUDED.fecha_actualizacion;
                    """,
                    (
                        codigo,
                        codigo_departamento,
                        nombre,
                        poblacion_2018,
                        "DANE - MGN 2025 / CNPV 2018",
                        2018,
                        geometry_json,
                        area_km2,
                        departamento
                    )
                )

        conn.commit()


# =========================================================
# 4. PROCESO PRINCIPAL
# =========================================================

def main():

    print()
    print("========================================")
    print(" INVERSIG")
    print(" ACTUALIZACIÓN TERRITORIAL")
    print("========================================")
    print()

    # -----------------------------------------
    # MUNICIPIOS
    # -----------------------------------------

    ids = obtener_object_ids()

    # -----------------------------------------
    # POBLACIÓN
    # -----------------------------------------

    poblacion = obtener_poblacion()

    # -----------------------------------------
    # BLOQUES
    # -----------------------------------------

    bloque = 10

    total = len(ids)

    total_bloques = (
        (total + bloque - 1)
        // bloque
    )

    for inicio in range(
        0,
        total,
        bloque
    ):

        ids_bloque = ids[
            inicio:inicio + bloque
        ]

        numero = (
            inicio // bloque
        ) + 1

        print()
        print(
            f"Bloque {numero}/{total_bloques}"
        )

        datos = obtener_municipios(
            ids_bloque
        )

        features = datos.get(
            "features",
            []
        )

        print(
            f"Geometrías recibidas: "
            f"{len(features)}"
        )

        if features:

            guardar_features(
                features,
                poblacion
            )

            print(
                f"✓ Bloque {numero} "
                "actualizado."
            )

        else:

            print(
                f"⚠ Bloque {numero} "
                "sin datos."
            )

        time.sleep(0.3)

    print()
    print("========================================")
    print(" ACTUALIZACIÓN FINALIZADA")
    print("========================================")
    print(
        f"Municipios procesados: {total}"
    )
    print(
        "Datos: DANE MGN 2025"
    )
    print(
        "Población: CNPV 2018"
    )
    print(
        "Destino: Supabase + PostGIS"
    )
    print("========================================")


if __name__ == "__main__":
    main()