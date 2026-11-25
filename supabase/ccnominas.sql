-- Catálogo de admisibilidad de CC-nóminas por infotipo — esquema para Supabase
-- Ejecutar en el mismo proyecto de Supabase del Hub (SQL Editor → New query → Run).
-- Origen: SAP S/4HANA HCM, tabla T512Z (vista V_T512Z) con textos de T512T y T582S.
-- Los datos se cargan aparte con ccnominas_seed.sql, que NO se publica en el repo.
-- Solo lectura para usuarios @bafar.com.mx (RLS).

create or replace function public.es_usuario_permitido() returns boolean
language sql stable as $$
  select coalesce(lower(auth.jwt() ->> 'email') like '%@bafar.com.mx', false);
$$;

create table if not exists public.ccnom_admisibilidad (
  sistema   text not null default 'K8E',
  molga     text not null,
  infty     text not null,
  itext     text,
  lgart     text not null,
  lgtxt     text,
  begda     date not null,
  endda     date not null,
  extraido  timestamptz not null default now(),
  primary key (sistema, molga, infty, lgart, endda)
);
create index if not exists ccnom_admisibilidad_lgart_idx on public.ccnom_admisibilidad (lgart);

alter table public.ccnom_admisibilidad enable row level security;

drop policy if exists "ccnom leer" on public.ccnom_admisibilidad;
create policy "ccnom leer" on public.ccnom_admisibilidad
  for select to authenticated using (public.es_usuario_permitido());
-- Sin políticas de insert/update/delete: desde la página solo se consulta.
-- La carga se hace desde el SQL Editor (rol postgres), que no pasa por RLS.
