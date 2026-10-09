import json
from shapely.geometry import shape, mapping

entrada = "frontend/data/municipios.geojson"
salida = "frontend/data/municipios_ligero.geojson"

with open(entrada, "r", encoding="utf-8") as f:
    data = json.load(f)

nuevas_features = []

for feature in data["features"]:
    geometry = feature.get("geometry")

    if not geometry:
        continue

    geom = shape(geometry)

    # Simplificación de geometría
    geom_simplificada = geom.simplify(
        0.001,
        preserve_topology=True
    )

    nueva_feature = {
        "type": "Feature",
        "properties": feature.get("properties", {}),
        "geometry": mapping(geom_simplificada)
    }

    nuevas_features.append(nueva_feature)

resultado = {
    "type": "FeatureCollection",
    "features": nuevas_features
}

with open(salida, "w", encoding="utf-8") as f:
    json.dump(
        resultado,
        f,
        ensure_ascii=False,
        separators=(",", ":")
    )

import os

tamano = os.path.getsize(salida) / 1024 / 1024

print("====================================")
print("GeoJSON simplificado correctamente")
print(f"Municipios: {len(nuevas_features)}")
print(f"Tamaño: {tamano:.2f} MB")
print(f"Archivo: {salida}")
print("====================================")
