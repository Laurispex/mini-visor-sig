from pymongo import MongoClient
from urllib.request import urlopen
from urllib.parse import urlencode
import json
import time

MONGO_URI = "mongodb://127.0.0.1:27017"

URL = (
    "https://geoservicios.esri.co/arcgis/rest/services/"
    "DatosAbiertos/MGN_Municipios/MapServer/0/query"
)

client = MongoClient(MONGO_URI)
collection = client["mini_visor_sig"]["municipios"]

faltantes = list(
    collection.find(
        {"geometry": None},
        {"_id": 0, "codigo": 1}
    )
)

print(f"Municipios sin geometría: {len(faltantes)}")

actualizados = 0

for i, municipio in enumerate(faltantes, 1):

    codigo = municipio["codigo"]

    params = {
        "where": f"MPIO_CCDGO='{codigo[2:]}'",
        "outFields": "*",
        "returnGeometry": "true",
        "outSR": "4326",
        "f": "geojson"
    }

    url = URL + "?" + urlencode(params)

    try:
        with urlopen(url, timeout=30) as response:
            data = json.loads(
                response.read().decode("utf-8")
            )

        features = data.get("features", [])

        if features:

            geometry = features[0].get("geometry")

            if geometry:

                collection.update_one(
                    {"codigo": codigo},
                    {"$set": {"geometry": geometry}}
                )

                actualizados += 1

        print(
            f"{i}/{len(faltantes)} - "
            f"{codigo} - actualizados: {actualizados}"
        )

    except Exception as e:

        print(
            f"{i}/{len(faltantes)} - "
            f"{codigo} - ERROR: {e}"
        )

    time.sleep(0.2)

total = collection.count_documents({
    "geometry": {"$ne": None}
})

print("\n================================")
print("TERMINADO")
print("================================")
print(f"Geometrías actualizadas: {actualizados}")
print(f"Municipios con geometría: {total}")

client.close()
