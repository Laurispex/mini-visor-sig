from pymongo import MongoClient
from urllib.request import urlopen
from urllib.parse import urlencode
import json
import time

MONGO_URI = "mongodb://127.0.0.1:27017"

URL = (
    "https://services5.arcgis.com/omnq4yUY2D8TpiDa/"
    "arcgis/rest/services/Municipios_de_Colombia_/"
    "FeatureServer/0/query"
)

client = MongoClient(MONGO_URI)
db = client["mini_visor_sig"]
collection = db["municipios"]

total_actualizadas = 0

for inicio in range(600, 1200, 100):

    print(f"Descargando bloque {inicio + 1} - {inicio + 200}...")

    params = {
        "where": "1=1",
        "outFields": "CODIGO",
        "returnGeometry": "true",
        "outSR": "4326",
        "f": "geojson",
        "resultOffset": inicio,
        "resultRecordCount": 200
    }

    url = URL + "?" + urlencode(params)

    try:
        with urlopen(url, timeout=60) as response:
            data = json.loads(
                response.read().decode("utf-8")
            )
    except Exception as e:
        print("Error:", e)
        continue

    features = data.get("features", [])

    if not features:
        break

    for feature in features:

        p = feature.get("properties", {})

        codigo = str(
            p.get("CODIGO", "")
        ).zfill(5)

        geometry = feature.get("geometry")

        if codigo and geometry:
            resultado = collection.update_one(
                {"codigo": codigo},
                {"$set": {"geometry": geometry}}
            )

            if resultado.modified_count:
                total_actualizadas += 1

    print(
        f"  Bloque listo: {len(features)} | "
        f"Geometrías actualizadas: {total_actualizadas}"
    )

    time.sleep(1)

print("\n================================")
print("PROCESO TERMINADO")
print("================================")

con_geometria = collection.count_documents({
    "geometry": {"$ne": None}
})

print(
    f"Municipios con geometría: {con_geometria}"
)

client.close()
