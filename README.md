# mini-visor-sig

Mini visor geográfico web para carga, visualización y reproyección de capas SIG.

## Datos geográficos

Capitales, ciudades y municipios se consultan mediante FastAPI desde Supabase
PostgreSQL + PostGIS. El backend usa `ST_AsGeoJSON(geom)` para entregar
GeoJSON a Leaflet en EPSG:4326. La reproyección sigue en `/reproject` con PyProj.

Configure esta variable de entorno exclusivamente en el backend:

```text
SUPABASE_DB_URL=postgresql://postgres.[project-ref]:[password]@[host]:5432/postgres?sslmode=require
```

Nunca exponga esta variable ni una clave `service_role` en el frontend.

Las tablas consultadas son:

- `public."capitales_departamentales — Capitales Departamentales"`
- `public.ciudades`
- `public."municipios_atlas — municipios"`

Active RLS y conceda únicamente lectura pública si las capas son públicas:

```sql
alter table public."capitales_departamentales — Capitales Departamentales" enable row level security;
alter table public.ciudades enable row level security;
alter table public."municipios_atlas — municipios" enable row level security;

create policy "lectura publica capitales"
on public."capitales_departamentales — Capitales Departamentales"
for select to anon using (true);

create policy "lectura publica ciudades"
on public.ciudades
for select to anon using (true);

create policy "lectura publica municipios"
on public."municipios_atlas — municipios"
for select to anon using (true);
```

No cree políticas de inserción, actualización ni borrado para este visor.
