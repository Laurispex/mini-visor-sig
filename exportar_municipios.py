from pymongo import MongoClient
import json

# Conexión a MongoDB local
client = MongoClient("mongodb://127.0.0.1:27017")

db = client["mini_visor_sig"]
coleccion = db["municipios"]

# Obtener municipios
municipios = list(
    coleccion.find(
        {},
        {"_id": 0}
    )
)

features = []

for municipio in municipios:

    geometry = municipio.get("geometry")

    if not geometry:
        continue

    codigo = str(municipio.get("codigo", "")).strip()
    nombre = municipio.get("nombre", "")
    poblacion = municipio.get("poblacion_2018", 0)

    # Departamento a partir de los dos primeros dígitos
    departamento = codigo[:2] if len(codigo) >= 2 else ""

    feature = {
        "type": "Feature",
        "properties": {
            "codigo": codigo,
            "nombre": nombre,
            "departamento": departamento,
            "poblacion_2018": poblacion
        },
        "geometry": geometry
    }

    features.append(feature)

geojson = {
    "type": "FeatureCollection",
    "features": features
}

# Crear carpeta si no existe
import os
os.makedirs("frontend/data", exist_ok=True)

ruta = "frontend/data/municipios.geojson"

with open(ruta, "w", encoding="utf-8") as archivo:
    json.dump(geojson, archivo, ensure_ascii=False)

print("====================================")
print("GeoJSON creado correctamente")
print(f"Municipios exportados: {len(features)}")
print(f"Archivo: {ruta}")
print("====================================")

client.close()
