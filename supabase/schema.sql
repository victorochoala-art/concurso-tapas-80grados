-- ==========================================================
-- Concurso de Tapas UFV × 80 Grados · Base de datos (Supabase)
-- Pegar ENTERO en  SQL Editor  y pulsar  Run.  Se puede ejecutar más de una vez.
-- ==========================================================

-- ---------- Ajustes del concurso (una sola fila) ----------
create table if not exists public.ajustes (
  id             int primary key default 1 check (id = 1),
  max_plazas     int not null default 80,
  max_finalistas int not null default 8,
  abre           timestamptz not null default '2026-11-01 00:00:00+01',  -- abierto ya para poder probar
  cierra         timestamptz not null default '2027-01-15 23:59:59+01'
);
insert into public.ajustes (id) values (1) on conflict (id) do nothing;

-- ---------- Organizadores con acceso al panel ----------
create table if not exists public.admins (
  email text primary key
);

-- ---------- Candidaturas ----------
create table if not exists public.candidaturas (
  id                uuid primary key,
  numero            int not null unique,          -- orden de llegada
  estado            text not null default 'recibida'
                    check (estado in ('recibida', 'lista_espera', 'finalista', 'ganadora', 'descartada')),
  creado            timestamptz not null default now(),
  nombre            text not null,
  apellidos         text not null,
  email             text not null,
  telefono          text not null,
  grado             text not null,
  curso             text not null,
  plato             text not null,
  resumen           text not null,
  concepto          text not null,
  ingredientes      jsonb not null,               -- [{ "n": "Caldo", "q": "200", "u": "ml" }, ...]
  elaboracion       text not null,
  alergenos         text[] not null default '{}',
  foto              text not null,                -- ruta dentro del almacén "candidaturas"
  fotos             text[] not null default '{}',
  video             text,
  acepta_bases      boolean not null,
  acepta_privacidad boolean not null,
  notas             text not null default ''      -- notas internas de los organizadores
);
-- Un plato por persona (las descartadas no cuentan)
create unique index if not exists candidaturas_email_unico
  on public.candidaturas (lower(email)) where estado <> 'descartada';

-- ---------- Registro de emails enviados ----------
create table if not exists public.emails (
  id             bigint generated always as identity primary key,
  candidatura_id uuid references public.candidaturas (id) on delete cascade,
  tipo           text not null,                   -- confirmacion | finalista | personalizado
  destinatario   text not null,
  asunto         text not null default '',
  estado         text not null,                   -- enviado | error
  detalle        text not null default '',
  creado         timestamptz not null default now()
);
create index if not exists emails_candidatura on public.emails (candidatura_id);

-- ==========================================================
-- Funciones
-- ==========================================================

-- ¿Quien llama es organizador?
create or replace function public.es_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Lo único que ve la landing: plazas y si el plazo está abierto
create or replace function public.estado_concurso()
returns jsonb language sql stable security definer set search_path = public as $$
  select jsonb_build_object(
    'max_plazas', a.max_plazas,
    'ocupadas', (select count(*) from public.candidaturas where estado in ('recibida', 'finalista', 'ganadora')),
    'abierto', now() between a.abre and a.cierra,
    'aun_no', now() < a.abre
  )
  from public.ajustes a where a.id = 1;
$$;

-- Alta de una candidatura. Es la única vía de entrada: comprueba plazo, datos,
-- un plato por email y el cupo, todo dentro de un mismo bloqueo para que dos envíos
-- simultáneos no puedan ocupar la misma plaza.
create or replace function public.registrar_candidatura(p jsonb)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  a         public.ajustes;
  v_id      uuid;
  v_email   text := lower(trim(coalesce(p ->> 'email', '')));
  v_foto    text := coalesce(p ->> 'foto', '');
  v_fotos   text[];
  v_video   text := nullif(p ->> 'video', '');
  v_ruta    text;
  v_ocup    int;
  v_numero  int;
  v_estado  text;
  campo     text;
begin
  select * into a from public.ajustes where id = 1;
  if now() < a.abre then raise exception 'AUN_NO_ABIERTO'; end if;
  if now() > a.cierra then raise exception 'CERRADO'; end if;

  begin
    v_id := (p ->> 'id')::uuid;
  exception when others then
    raise exception 'DATOS_INCOMPLETOS';
  end;
  if v_id is null then raise exception 'DATOS_INCOMPLETOS'; end if;

  foreach campo in array array['nombre', 'apellidos', 'telefono', 'grado', 'curso', 'plato', 'resumen', 'concepto', 'elaboracion'] loop
    if trim(coalesce(p ->> campo, '')) = '' then raise exception 'DATOS_INCOMPLETOS'; end if;
  end loop;
  if v_email !~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]{2,}$' then raise exception 'EMAIL_INVALIDO'; end if;
  if jsonb_typeof(p -> 'ingredientes') is distinct from 'array' or jsonb_array_length(p -> 'ingredientes') = 0
     or jsonb_array_length(p -> 'ingredientes') > 60 then
    raise exception 'DATOS_INCOMPLETOS';
  end if;
  if coalesce((p ->> 'acepta_bases')::boolean, false) is not true
     or coalesce((p ->> 'acepta_privacidad')::boolean, false) is not true then
    raise exception 'FALTA_CONSENTIMIENTO';
  end if;

  -- Los archivos tienen que estar ya subidos, dentro de la carpeta de esta candidatura
  select coalesce(array_agg(x), '{}') into v_fotos
  from jsonb_array_elements_text(coalesce(p -> 'fotos', '[]'::jsonb)) as t(x);
  if coalesce(array_length(v_fotos, 1), 0) > 4 then raise exception 'ARCHIVO_INVALIDO'; end if;
  foreach v_ruta in array array_remove(array[v_foto, v_video] || v_fotos, null) loop
    if v_ruta not like v_id::text || '/%' or not exists (
      select 1 from storage.objects where bucket_id = 'candidaturas' and name = v_ruta
    ) then
      raise exception 'ARCHIVO_INVALIDO';
    end if;
  end loop;

  perform pg_advisory_xact_lock(8080);

  if exists (select 1 from public.candidaturas where lower(email) = v_email and estado <> 'descartada') then
    raise exception 'EMAIL_REPETIDO';
  end if;

  select count(*) into v_ocup from public.candidaturas where estado in ('recibida', 'finalista', 'ganadora');
  v_estado := case when v_ocup < a.max_plazas then 'recibida' else 'lista_espera' end;
  select coalesce(max(numero), 0) + 1 into v_numero from public.candidaturas;

  insert into public.candidaturas (
    id, numero, estado, nombre, apellidos, email, telefono, grado, curso,
    plato, resumen, concepto, ingredientes, elaboracion, alergenos,
    foto, fotos, video, acepta_bases, acepta_privacidad
  ) values (
    v_id, v_numero, v_estado,
    left(trim(p ->> 'nombre'), 80), left(trim(p ->> 'apellidos'), 120), v_email,
    left(trim(p ->> 'telefono'), 30), left(trim(p ->> 'grado'), 120), left(trim(p ->> 'curso'), 20),
    left(trim(p ->> 'plato'), 80), left(trim(p ->> 'resumen'), 160), left(trim(p ->> 'concepto'), 1200),
    p -> 'ingredientes', left(trim(p ->> 'elaboracion'), 3000),
    coalesce(array(select left(x, 40) from jsonb_array_elements_text(coalesce(p -> 'alergenos', '[]'::jsonb)) as t(x) limit 14), '{}'),
    v_foto, v_fotos, v_video, true, true
  );

  return jsonb_build_object('id', v_id, 'numero', v_numero, 'estado', v_estado, 'max_plazas', a.max_plazas);
end;
$$;

revoke all on function public.registrar_candidatura(jsonb) from public;
revoke all on function public.estado_concurso() from public;
revoke all on function public.es_admin() from public;
grant execute on function public.registrar_candidatura(jsonb) to anon, authenticated;
grant execute on function public.estado_concurso() to anon, authenticated;
grant execute on function public.es_admin() to authenticated;

-- ==========================================================
-- Permisos: el público no lee ni escribe tablas; solo los organizadores
-- ==========================================================
alter table public.candidaturas enable row level security;
alter table public.emails enable row level security;
alter table public.admins enable row level security;
alter table public.ajustes enable row level security;

drop policy if exists "organizadores leen candidaturas" on public.candidaturas;
create policy "organizadores leen candidaturas" on public.candidaturas
  for select to authenticated using (public.es_admin());
drop policy if exists "organizadores editan candidaturas" on public.candidaturas;
create policy "organizadores editan candidaturas" on public.candidaturas
  for update to authenticated using (public.es_admin()) with check (public.es_admin());

drop policy if exists "organizadores leen emails" on public.emails;
create policy "organizadores leen emails" on public.emails
  for select to authenticated using (public.es_admin());

drop policy if exists "organizadores ven la lista de organizadores" on public.admins;
create policy "organizadores ven la lista de organizadores" on public.admins
  for select to authenticated using (public.es_admin());

drop policy if exists "organizadores leen ajustes" on public.ajustes;
create policy "organizadores leen ajustes" on public.ajustes
  for select to authenticated using (public.es_admin());
drop policy if exists "organizadores editan ajustes" on public.ajustes;
create policy "organizadores editan ajustes" on public.ajustes
  for update to authenticated using (public.es_admin()) with check (public.es_admin());

-- ==========================================================
-- Almacén de fotos y vídeos (privado)
-- 50 MB por archivo es el máximo del plan gratuito; súbelo aquí si pasas a un plan de pago.
-- ==========================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'candidaturas', 'candidaturas', false, 52428800,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- El público solo puede subir; no puede ver, cambiar ni borrar nada.
drop policy if exists "subida de archivos de candidaturas" on storage.objects;
create policy "subida de archivos de candidaturas" on storage.objects
  for insert to anon, authenticated with check (bucket_id = 'candidaturas');
drop policy if exists "organizadores ven los archivos" on storage.objects;
create policy "organizadores ven los archivos" on storage.objects
  for select to authenticated using (bucket_id = 'candidaturas' and public.es_admin());

-- ==========================================================
-- ÚLTIMO PASO: añade aquí el email de cada organizador y vuelve a ejecutar solo estas líneas.
-- (Además hay que crear ese usuario en  Authentication → Users → Add user.)
-- ==========================================================
-- insert into public.admins (email) values ('organizador@ejemplo.com') on conflict do nothing;
