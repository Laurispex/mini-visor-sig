from pymongo import MongoClient, UpdateOne
from urllib.request import Request, urlopen
from urllib.parse import urlencode
import json

MONGO_URI = "mongodb://127.0.0.1:27017"

URL_DANE = (
    "https://portalgis.dane.gov.co/mparcgis/rest/services/"
    "MARCO_INTEGRADO/"
    "Serv_DatosCNPV2018_Integrados_MGN2018/"
    "MapServer/800/query"
)

print("\n==============================================")
print("CARGA MUNICIPIOS DANE → MONGODB")
print("==============================================\n")

# --------------------------------------------------
# CONSULTAR DANE
# --------------------------------------------------

parametros = {
    "where": "1=1",
    "outFields": "DPTO_CCDGO,MPIO_CCDGO,MPIO_CDPMP,MPIO_CNMBR,STP27_PERS",
    "returnGeometry": "true",
    "outSR": "4326",
    "f": "geojson"
}

url = URL_DANE + "?" + urlencode(parametros)

print("Descargando municipios desde DANE...")

try:
    solicitud = Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0"
        }
    )

    with urlopen(solicitud, timeout=120) as respuesta:
        data = json.loads(
            respuesta.read().decode("utf-8")
        )

except Exception as error:
    print("\nERROR consultando DANE:")
    print(error)
    raise SystemExit(1)


features = data.get("features", [])

print(
    f"Municipios recibidos: {len(features)}"
)

if not features:
    print("No se recibieron municipios.")
    raise SystemExit(1)


# --------------------------------------------------
# CONECTAR MONGODB
# --------------------------------------------------

print("Conectando a MongoDB...")

client = MongoClient(
    MONGO_URI,
    serverSelectionTimeoutMS=5000
)

client.admin.command("ping")

db = client["mini_visor_sig"]
collection = db["municipios"]


# --------------------------------------------------
# PREPARAR DOCUMENTOS
# --------------------------------------------------

documentos = []

for feature in features:

    p = feature.get("properties", {})

    codigo = str(
        p.get("MPIO_CDPMP", "")
    ).zfill(5)

    codigo_departamento = str(
        p.get("DPTO_CCDGO", "")
    ).zfill(2)

    nombre = str(
        p.get("MPIO_CNMBR", "Sin nombre")
    ).strip()

    poblacion = int(
        p.get("STP27_PERS", 0) or 0
    )

    documento = {
        "codigo": codigo,
        "codigo_departamento": codigo_departamento,
        "nombre": nombre,
        "poblacion_2018": poblacion,
        "geometry": feature.get("geometry"),
        "fuente": "DANE - CNPV 2018",
        "ano_censo": 2018
    }

    documentos.append(documento)


# --------------------------------------------------
# GUARDAR EN MONGODB
# --------------------------------------------------

print(
    f"Guardando {len(documentos)} municipios..."
)

operaciones = [
    UpdateOne(
        {"codigo": documento["codigo"]},
        {"$set": documento},
        upsert=True
    )
    for documento in documentos
]

resultado = collection.bulk_write(
    operaciones,
    ordered=False
)


# --------------------------------------------------
# ÍNDICES
# --------------------------------------------------

collection.create_index(
    "codigo",
    unique=True
)

collection.create_index("nombre")

collection.create_index(
    "codigo_departamento"
)

collection.create_index(
    [("geometry", "2dsphere")]
)


# --------------------------------------------------
# VERIFICACIÓN
# --------------------------------------------------

total = collection.count_documents({})

print("\n==============================================")
print("RESULTADO")
print("==============================================")

print(
    f"Municipios almacenados: {total}"
)

print(
    f"Insertados: {resultado.upserted_count}"
)

print(
    f"Actualizados: {resultado.modified_count}"
)

ejemplo = collection.find_one(
    {},
    {
        "_id": 0,
        "codigo": 1,
        "nombre": 1,
        "poblacion_2018": 1
    }
)

print("\nEjemplo:")
print(
    json.dumps(
        ejemplo,
        ensure_ascii=False,
        indent=2
    )
)

print("\n==============================================")
print("MONGODB LISTO")
print("==============================================\n")

client.close()
