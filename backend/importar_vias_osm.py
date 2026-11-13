"""
Importa vías de OpenStreetMap desde un PBF a public.vias_osm,
filtrando espacialmente los municipios de Antioquia.

Requisitos:
    pip install osmium "psycopg[binary]"

Ejecución desde la raíz del proyecto:
    python backend/importar_vias_osm.py

Usa la variable de entorno SUPABASE_DB_URL ya utilizada por backend/main.py.
No modifica main.py ni crea tablas. Inserta/actualiza por osm_id.
"""

import os
import sys
from pathlib import Path

import osmium
import psycopg


ROOT = Path(__file__).resolve().parents[1]
PBF_PATH = ROOT / "frontend" / "data" / "colombia-261013.osm.pbf"
BATCH_SIZE = 1000

# Clases OSM que representan vías de circulación. Se conservan otras clases
# highway si están presentes, excepto elementos que no son vías lineales.
EXCLUDED_HIGHWAYS = {
    "construction", "proposed", "platform", "raceway",
    "services", "rest_area", "escape", "elevator",
}
ROAD_CLASSES = {
    "motorway", "motorway_link", "trunk", "trunk_link",
    "primary", "primary_link", "secondary", "secondary_link",
    "tertiary", "tertiary_link", "unclassified", "residential",
    "living_street", "service", "road", "track", "path",
    "footway", "cycleway", "bridleway", "pedestrian", "steps",
}


def get_connection():
    db_url = os.getenv("SUPABASE_DB_URL")
    if not db_url:
        raise RuntimeError(
            "No está configurada SUPABASE_DB_URL en esta terminal. "
            "El importador usa la misma variable que backend/main.py."
        )
    return psycopg.connect(db_url, connect_timeout=30)


def get_antioquia_bbox(conn):
    # Calcula los límites desde la geometría real de los municipios de Antioquia.
    with conn.cursor() as cur:
        cur.execute("""
            SELECT
                MIN(gis.ST_XMin(gis.ST_Envelope(geom))),
                MIN(gis.ST_YMin(gis.ST_Envelope(geom))),
                MAX(gis.ST_XMax(gis.ST_Envelope(geom))),
                MAX(gis.ST_YMax(gis.ST_Envelope(geom)))
            FROM public.municipios
            WHERE departamento ILIKE '%%Antioquia%%'
              AND geom IS NOT NULL;
        """)
        row = cur.fetchone()
    if not row or any(value is None for value in row):
        raise RuntimeError(
            "No pude obtener el límite de Antioquia desde public.municipios. "
            "Revisa que departamento y geom estén poblados."
        )
    return tuple(float(v) for v in row)


class AntioquiaRoadImporter(osmium.SimpleHandler):
    def __init__(self, conn, bbox):
        super().__init__()
        self.conn = conn
        self.min_lon, self.min_lat, self.max_lon, self.max_lat = bbox
        self.batch = []
        self.processed = 0
        self.inserted_candidates = 0
        self.skipped_no_location = 0
        self.skipped_outside_bbox = 0

    def way(self, way):
        highway = way.tags.get("highway")
        if not highway or highway in EXCLUDED_HIGHWAYS:
            return

        coords = []
        try:
            for node in way.nodes:
                if not node.location.valid():
                    self.skipped_no_location += 1
                    return
                coords.append((node.location.lon, node.location.lat))
        except Exception:
            self.skipped_no_location += 1
            return

        if len(coords) < 2:
            return

        # Descartar solo si toda la geometría está fuera del bbox. Se usa el
        # rango completo de coordenadas para no perder líneas que cruzan el borde.
        xs = [p[0] for p in coords]
        ys = [p[1] for p in coords]
        if (max(xs) < self.min_lon or min(xs) > self.max_lon or
                max(ys) < self.min_lat or min(ys) > self.max_lat):
            self.skipped_outside_bbox += 1
            return

        # WKT LINESTRING, con coordenadas lon/lat EPSG:4326.
        wkt = "LINESTRING(" + ",".join(
            f"{lon:.7f} {lat:.7f}" for lon, lat in coords
        ) + ")"

        tags = way.tags
        self.batch.append((
            str(way.id),
            tags.get("name"),
            tags.get("ref"),
            highway,
            tags.get("oneway"),
            tags.get("maxspeed"),
            tags.get("bridge"),
            tags.get("tunnel"),
            "OpenStreetMap / Geofabrik Colombia",
            wkt,
        ))
        self.processed += 1
        if len(self.batch) >= BATCH_SIZE:
            self.flush()

    def flush(self):
        if not self.batch:
            return

        # Se insertan únicamente vías que intersecten polígonos de municipios
        # de Antioquia. La tabla ya existe y el upsert evita duplicar osm_id.
        sql = """
            INSERT INTO public.vias_osm
                (osm_id, nombre, referencia, clase, sentido_unico,
                 velocidad_maxima, puente, tunel, fuente, geom)
            SELECT
                data.osm_id, data.nombre, data.referencia, data.clase,
                data.sentido_unico, data.velocidad_maxima, data.puente,
                data.tunel, data.fuente,
                gis.ST_Multi(gis.ST_SetSRID(gis.ST_GeomFromText(data.wkt), 4326))
            FROM (VALUES (
                %s::text, %s::text, %s::text, %s::text, %s::text,
                %s::text, %s::text, %s::text, %s::text, %s::text
            )) AS data(
                osm_id, nombre, referencia, clase, sentido_unico,
                velocidad_maxima, puente, tunel, fuente, wkt
            )
            WHERE EXISTS (
                SELECT 1
                FROM public.municipios m
                WHERE m.departamento ILIKE '%%Antioquia%%'
                  AND m.geom IS NOT NULL
                  AND gis.ST_Intersects(
                      m.geom,
                      gis.ST_Multi(gis.ST_SetSRID(gis.ST_GeomFromText(data.wkt), 4326))
                  )
            )
            ON CONFLICT (osm_id) DO UPDATE SET
                nombre = EXCLUDED.nombre,
                referencia = EXCLUDED.referencia,
                clase = EXCLUDED.clase,
                sentido_unico = EXCLUDED.sentido_unico,
                velocidad_maxima = EXCLUDED.velocidad_maxima,
                puente = EXCLUDED.puente,
                tunel = EXCLUDED.tunel,
                fuente = EXCLUDED.fuente,
                geom = EXCLUDED.geom,
                fecha_carga = NOW();
        """
        with self.conn.cursor() as cur:
            cur.executemany(sql, self.batch)
        self.conn.commit()
        self.inserted_candidates += len(self.batch)
        self.batch.clear()
        print(
            f"Procesadas {self.processed:,} vías candidatas; "
            f"último lote confirmado.",
            flush=True,
        )


def main():
    if not PBF_PATH.exists():
        raise FileNotFoundError(f"No se encontró el archivo PBF: {PBF_PATH}")

    print("Conectando con Supabase y consultando el límite de Antioquia…", flush=True)
    with get_connection() as conn:
        bbox = get_antioquia_bbox(conn)
        with conn.cursor() as cur:
            cur.execute(
                """
                CREATE INDEX IF NOT EXISTS vias_osm_geom_gix
                ON public.vias_osm USING GIST (geom);
                """
            )
            conn.commit()
        print(
            "Límite espacial calculado desde public.municipios: "
            f"lon {bbox[0]:.4f}–{bbox[2]:.4f}, lat {bbox[1]:.4f}–{bbox[3]:.4f}",
            flush=True,
        )
        importer = AntioquiaRoadImporter(conn, bbox)
        print(f"Leyendo {PBF_PATH} …", flush=True)
        # sparse_file_array evita mantener toda la tabla de ubicaciones en RAM.
        importer.apply_file(str(PBF_PATH), locations=True, idx="sparse_file_array")
        importer.flush()

        with conn.cursor() as cur:
            cur.execute("ANALYZE public.vias_osm;")
            cur.execute("""
                SELECT COUNT(*)
                FROM public.vias_osm v
                WHERE EXISTS (
                    SELECT 1
                    FROM public.municipios m
                    WHERE m.departamento ILIKE '%%Antioquia%%'
                      AND m.geom IS NOT NULL
                      AND gis.ST_Intersects(v.geom, m.geom)
                );
            """)
            total = cur.fetchone()[0]
            cur.execute("""
                SELECT clase,
                       ROUND((SUM(
                           gis.ST_Length(
                               gis.ST_Transform(
                                   gis.ST_Intersection(v.geom, m.geom), 3116
                               )
                           )
                       ) / 1000.0)::numeric, 3) AS longitud_km
                FROM public.vias_osm v
                JOIN public.municipios m
                  ON m.departamento ILIKE '%%Antioquia%%'
                 AND gis.ST_Intersects(v.geom, m.geom)
                GROUP BY clase
                ORDER BY longitud_km DESC;
            """)
            summary = cur.fetchall()

    print("\nIMPORTACIÓN TERMINADA", flush=True)
    print(f"Vías almacenadas/intersectando Antioquia: {total:,}", flush=True)
    print("Longitud calculada por clase vial (km):", flush=True)
    for clase, km in summary:
        print(f"  {clase or 'sin clase'}: {km:,.3f} km", flush=True)
    print(
        "\nNota: las longitudes por clase pueden contar una vía en más de un "
        "municipio cuando atraviesa límites municipales. La vista existente "
        "vw_inversig_longitud_vial_clase puede usarse para el desglose municipal.",
        flush=True,
    )


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\nImportación interrumpida por el usuario.", file=sys.stderr)
        raise
    except Exception as exc:
        print(f"\nERROR DE IMPORTACIÓN: {exc}", file=sys.stderr)
        raise
