-- Pronóstico de Vacaciones CCT — esquema para Supabase
-- Ejecutar en el mismo proyecto de Supabase del Hub (SQL Editor → New query → Run).
-- Reutiliza public.es_usuario_permitido() de schema.sql (solo correos @bafar.com.mx).
-- La plantilla (empleados) se carga aparte con vacaciones_seed.sql, que NO se publica en el repo.

create or replace function public.es_usuario_permitido() returns boolean
language sql stable as $$
  select coalesce(lower(auth.jwt() ->> 'email') like '%@bafar.com.mx', false);
$$;

-- Plantilla de la unidad organizativa CCT (origen: SAP HCM ECP, PA0001/PA0002/HRP1001)
create table if not exists public.vac_empleados (
  pernr   integer primary key,
  nombre  text    not null,
  area    text    not null,
  orden   integer not null default 99,
  puesto  text,
  email   text,
  activo  boolean not null default true
);

-- Un registro por persona y día marcado
create table if not exists public.vac_pronostico (
  pernr            integer not null references public.vac_empleados(pernr) on delete cascade,
  fecha            date    not null,
  tipo             text    not null default 'V' check (tipo in ('V','G','P')),
  actualizado_por  text    default (auth.jwt() ->> 'email'),
  actualizado      timestamptz not null default now(),
  primary key (pernr, fecha)
);
create index if not exists vac_pronostico_fecha_idx on public.vac_pronostico (fecha);

alter table public.vac_empleados  enable row level security;
alter table public.vac_pronostico enable row level security;

drop policy if exists "vac leer empleados" on public.vac_empleados;
create policy "vac leer empleados" on public.vac_empleados for select to authenticated using (public.es_usuario_permitido());

drop policy if exists "vac leer"     on public.vac_pronostico;
drop policy if exists "vac crear"    on public.vac_pronostico;
drop policy if exists "vac editar"   on public.vac_pronostico;
drop policy if exists "vac eliminar" on public.vac_pronostico;
create policy "vac leer"     on public.vac_pronostico for select to authenticated using (public.es_usuario_permitido());
create policy "vac crear"    on public.vac_pronostico for insert to authenticated with check (public.es_usuario_permitido());
create policy "vac editar"   on public.vac_pronostico for update to authenticated using (public.es_usuario_permitido()) with check (public.es_usuario_permitido());
create policy "vac eliminar" on public.vac_pronostico for delete to authenticated using (public.es_usuario_permitido());

do $$ begin
  alter publication supabase_realtime add table public.vac_pronostico;
exception when duplicate_object then null; end $$;
