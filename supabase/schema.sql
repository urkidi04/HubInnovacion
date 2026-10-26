-- Registro de Ahorro con IA — esquema para Supabase
-- Ejecutar completo en Supabase → SQL Editor → New query → Run.
-- Si cambias el dominio, reemplaza 'bafar.com.mx' en la función es_usuario_permitido().

create extension if not exists pgcrypto;

create table if not exists public.registros (
  id               uuid primary key default gen_random_uuid(),
  personas         text[]  not null check (cardinality(personas) > 0),
  compartida       text    not null default 'No' check (compartida in ('Sí','No')),
  tarea            text    not null,
  clasificacion    text    not null,
  proceso          text    not null,
  antes            integer not null check (antes >= 0),
  ahora            integer not null check (ahora >= 0),
  reduccion        integer generated always as (antes - ahora) stored,
  comentario       text,
  fecha_registro   timestamptz not null default now(),
  fecha_inicio     date,
  fecha_fin        date,
  creado_por       uuid default auth.uid(),
  creado_por_email text default (auth.jwt() ->> 'email'),
  constraint rango_fechas check (fecha_fin is null or fecha_inicio is null or fecha_fin >= fecha_inicio)
);

create index if not exists registros_fecha_registro_idx on public.registros (fecha_registro desc);

-- Solo usuarios autenticados con correo del dominio permitido
create or replace function public.es_usuario_permitido() returns boolean
language sql stable as $$
  select coalesce(lower(auth.jwt() ->> 'email') like '%@bafar.com.mx', false);
$$;

alter table public.registros enable row level security;

drop policy if exists "leer registros"      on public.registros;
drop policy if exists "crear registros"     on public.registros;
drop policy if exists "editar registros"    on public.registros;
drop policy if exists "eliminar registros"  on public.registros;

create policy "leer registros"     on public.registros for select to authenticated using (public.es_usuario_permitido());
create policy "crear registros"    on public.registros for insert to authenticated with check (public.es_usuario_permitido());
create policy "editar registros"   on public.registros for update to authenticated using (public.es_usuario_permitido()) with check (public.es_usuario_permitido());
create policy "eliminar registros" on public.registros for delete to authenticated using (public.es_usuario_permitido());

-- Actualizaciones en vivo entre usuarios
do $$ begin
  alter publication supabase_realtime add table public.registros;
exception when duplicate_object then null; end $$;

-- Registro inicial (capturado en la versión anterior de la app)
insert into public.registros (personas, compartida, tarea, clasificacion, proceso, antes, ahora, comentario, fecha_registro)
select array['Maryssa Ortiz'], 'No',
       'Generación automática de scripts DDL/DML correctivos para 9 tablas de replicación faltantes',
       'Aplicación', 'MCP SQL Server + Generador DDL IA', 480, 20, 'Menor espera del usuario',
       '2026-10-09 10:17:14-06'
where not exists (select 1 from public.registros where tarea like 'Generación automática de scripts DDL/DML%');
