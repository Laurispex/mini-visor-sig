import os
import requests
import psycopg


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


def obtener_poblacion():

    print()
    print("========================================")
    print(" INVERSIG - POBLACIÓN CNPV 2018")
    print("========================================")
    print()

    parametros = {
        "where": "1=1",
        "outFields": "MPIO_CCDGO,MPIO_CNMBR,CL0_TT_PERSN",
        "returnGeometry": "false",
        "f": "json"
    }

    respuesta = requests.get(
        DANE_POBLACION_URL,
        params=parametros,
        timeout=120
    )

    print(
        "HTTP DANE:",
        respuesta.status_code
    )

    if respuesta.status_code != 200:
        print(respuesta.text[:2000])
        raise RuntimeError(
            "Error consultando población DANE"
        )

    datos = respuesta.json()

    if "error" in datos:
        print(datos["error"])
        raise RuntimeError(
            "DANE devolvió un error"
        )

    features = datos.get(
        "features",
        []
    )

    print(
        "Registros recibidos:",
        len(features)
    )

    if not features:
        raise RuntimeError(
            "DANE no devolvió registros de población"
        )

    return features


def actualizar_poblacion(features):

    actualizados = 0

    with psycopg.connect(
        DATABASE_URL
    ) as conn:

        with conn.cursor() as cursor:

            for feature in features:

                atributos = feature.get(
                    "attributes",
                    {}
                )

                codigo = atributos.get(
                    "MPIO_CCDGO"
                )

                poblacion = atributos.get(
                    "CL0_TT_PERSN"
                )

                if not codigo:
                    continue

                if poblacion is None:
                    continue

                cursor.execute(
                    """
                    UPDATE public.municipios
                    SET
                        poblacion_2018 = %s,
                        fecha_actualizacion = NOW()
                    WHERE codigo = %s;
                    """,
                    (
                        int(poblacion),
                        str(codigo)
                    )
                )

                if cursor.rowcount > 0:
                    actualizados += 1

        conn.commit()

    return actualizados


def main():

    features = obtener_poblacion()

    actualizados = actualizar_poblacion(
        features
    )

    print()
    print("========================================")
    print(" ACTUALIZACIÓN FINALIZADA")
    print("========================================")
    print(
        "Registros DANE:",
        len(features)
    )
    print(
        "Municipios actualizados:",
        actualizados
    )
    print("Fuente: DANE - CNPV 2018")
    print("========================================")


if __name__ == "__main__":
    main()