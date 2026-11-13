# mini-visor-sig

Mini visor geográfico web para carga, visualización y reproyección de capas SIG.

## Datos geográficos

Los municipios, la normativa y las vías se consultan mediante FastAPI desde
Supabase PostgreSQL + PostGIS. El mapa muestra las 32 capitales departamentales
desde `data/capitales_departamentales.geojson`. Al tocar una capital, el botón
`Municipios` despliega el catálogo del departamento; al elegir un municipio se
abre su ficha por código DANE.

El catálogo ligero se consulta desde Supabase y usa `data/municipios_atlas.gpkg`
como respaldo local. La capa de centros poblados OSM no se dibuja en el mapa.

El backend usa `ST_AsGeoJSON(geom)` para entregar los polígonos municipales a
Leaflet en EPSG:4326. La reproyección sigue en `/reproject` con PyProj.

Configure esta variable de entorno exclusivamente en el backend:

```text
SUPABASE_DB_URL=postgresql://postgres.[project-ref]:[password]@[host]:5432/postgres?sslmode=require
```

Nunca exponga esta variable ni una clave `service_role` en el frontend.

Las tablas principales consultadas por el backend son:

- `public.municipios`
- `public.normativa_documentos`
- `public.vias_osm`
- `public.vw_igac_instrumentos_normativa`

La conexión a Supabase ocurre únicamente en el backend; no hacen falta políticas
RLS para exponer la cadena de conexión al navegador. Mantenga la URI fuera del
frontend y no la publique en logs o capturas.
