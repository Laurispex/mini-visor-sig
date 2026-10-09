from pymongo import MongoClient
import json

URI = "mongodb+srv://mini_visor_user:minivisor123@myatlasclusteredu.bfkl2.mongodb.net/?appName=myAtlasClusterEDU"

client = MongoClient(URI)

db = client["mini_visor_sig"]
coleccion = db["municipios"]

documentos = list(coleccion.find({}, {"_id": 0}))

with open("municipios_atlas.json", "w", encoding="utf-8") as archivo:
    json.dump(documentos, archivo, ensure_ascii=False, default=str)

print(f"Exportados: {len(documentos)} documentos")
print("Archivo creado: municipios_atlas.json")

client.close()
