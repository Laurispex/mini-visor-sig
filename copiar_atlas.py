from pymongo import MongoClient
from getpass import getpass
import json

uri = getpass("Cadena Atlas: mongodb+srv://mini_visor_user:minivisor123@myatlasclusteredu.bfkl2.mongodb.net/?appName=myAtlasClusterEDU")

atlas = MongoClient(uri, serverSelectionTimeoutMS=10000)

atlas.admin.command("ping")

coleccion = atlas["mini_visor_sig"]["municipios"]

documentos = list(coleccion.find({}, {"_id": 0}))

print("Registros encontrados:", len(documentos))

with open("municipios_atlas.json", "w", encoding="utf-8") as archivo:
    json.dump(
        documentos,
        archivo,
        ensure_ascii=False,
        default=str
    )

print("JSON creado: municipios_atlas.json")

atlas.close()