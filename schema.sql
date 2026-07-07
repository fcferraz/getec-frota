-- ============================================================
-- GETEC Frota — Schema Supabase (Postgres)
-- Gestão de km e abastecimento de veículos da empresa
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- 1. USUÁRIOS (perfil vinculado ao Supabase Auth)
-- ------------------------------------------------------------
create table public.usuarios (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  email text not null,
  papel text not null default 'funcionario' check (papel in ('admin','funcionario')),
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 2. VEÍCULOS (frota)
-- ------------------------------------------------------------
create table public.veiculos (
  id uuid primary key default gen_random_uuid(),
  placa text not null unique,
  modelo text not null,
  apelido text,
  km_atual numeric not null default 0,
  ativo boolean not null default true,
  criado_em timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 3. ABASTECIMENTOS
-- ------------------------------------------------------------
create table public.abastecimentos (
  id uuid primary key default gen_random_uuid(),
  veiculo_id uuid not null references public.veiculos(id) on delete restrict,
  usuario_id uuid not null references public.usuarios(id) on delete restrict,
  data date not null default current_date,
  km_odometro numeric not null,
  litros numeric not null check (litros > 0),
  valor_total numeric not null check (valor_total > 0),
  valor_por_litro numeric generated always as (round((valor_total / nullif(litros,0))::numeric, 3)) stored,
  posto text,
  foto_recibo_url text,
  observacao text,
  criado_em timestamptz not null default now()
);

-- ------------------------------------------------------------
-- 4. VIAGENS (uso do veículo)
-- ------------------------------------------------------------
create table public.viagens (
  id uuid primary key default gen_random_uuid(),
  veiculo_id uuid not null references public.veiculos(id) on delete restrict,
  usuario_id uuid not null references public.usuarios(id) on delete restrict,
  data date not null default current_date,
  km_inicial numeric not null,
  km_final numeric not null check (km_final >= km_inicial),
  km_rodado numeric generated always as (km_final - km_inicial) stored,
  destino text,
  motivo text,
  observacao text,
  foto_km_final_url text,
  criado_em timestamptz not null default now()
);

-- Antifraude: km_inicial é sempre derivado pelo banco, nunca digitado.
-- km_final da última viagem do veículo, ou km_atual se for a primeira.
create or replace function public.definir_km_inicial_viagem()
returns trigger language plpgsql as $$
declare
  ultimo_km numeric;
begin
  select km_final into ultimo_km from public.viagens
  where veiculo_id = new.veiculo_id order by criado_em desc limit 1;
  if ultimo_km is not null then
    new.km_inicial := ultimo_km;
  else
    select km_atual into new.km_inicial from public.veiculos where id = new.veiculo_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_definir_km_inicial on public.viagens;
create trigger trg_definir_km_inicial
before insert on public.viagens
for each row execute function public.definir_km_inicial_viagem();

-- ------------------------------------------------------------
-- 5. ROW LEVEL SECURITY
-- ------------------------------------------------------------
alter table public.usuarios enable row level security;
alter table public.veiculos enable row level security;
alter table public.abastecimentos enable row level security;
alter table public.viagens enable row level security;

-- Função auxiliar: verifica se o usuário logado é admin
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.usuarios u
    where u.id = auth.uid() and u.papel = 'admin' and u.ativo = true
  );
$$;

-- USUARIOS: cada um vê o próprio perfil; admin vê todos
create policy "usuarios_select"
on public.usuarios for select
using (id = auth.uid() or public.is_admin());

create policy "usuarios_update_admin"
on public.usuarios for update
using (public.is_admin());

create policy "usuarios_insert"
on public.usuarios for insert
with check (public.is_admin() or id = auth.uid());

-- Autocadastro entra sempre como funcionario/ativo; só admin cria/promove admin.
create or replace function public.forcar_papel_funcionario_autocadastro()
returns trigger language plpgsql as $$
begin
  if not public.is_admin() then
    new.papel := 'funcionario';
    new.ativo := true;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_forcar_papel_autocadastro on public.usuarios;
create trigger trg_forcar_papel_autocadastro
before insert on public.usuarios
for each row execute function public.forcar_papel_funcionario_autocadastro();

-- VEICULOS: todo autenticado pode ver; só admin gerencia
create policy "veiculos_select"
on public.veiculos for select
using (auth.role() = 'authenticated');

create policy "veiculos_all_admin"
on public.veiculos for all
using (public.is_admin())
with check (public.is_admin());

-- ABASTECIMENTOS: funcionário vê/insere só o próprio; admin vê/gerencia tudo
create policy "abastecimentos_select"
on public.abastecimentos for select
using (usuario_id = auth.uid() or public.is_admin());

create policy "abastecimentos_insert"
on public.abastecimentos for insert
with check (usuario_id = auth.uid());

create policy "abastecimentos_update_admin"
on public.abastecimentos for update using (public.is_admin());

create policy "abastecimentos_delete_admin"
on public.abastecimentos for delete using (public.is_admin());

-- VIAGENS: mesma lógica de abastecimentos
create policy "viagens_select"
on public.viagens for select
using (usuario_id = auth.uid() or public.is_admin());

create policy "viagens_insert"
on public.viagens for insert
with check (usuario_id = auth.uid());

create policy "viagens_update_admin"
on public.viagens for update using (public.is_admin());

create policy "viagens_delete_admin"
on public.viagens for delete using (public.is_admin());

-- ------------------------------------------------------------
-- 6. STORAGE (fotos de recibo)
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('recibos', 'recibos', false)
on conflict (id) do nothing;

-- Convenção de caminho: {usuario_id}/{arquivo}.jpg
create policy "recibos_select"
on storage.objects for select
using (
  bucket_id = 'recibos' and (
    auth.uid()::text = (storage.foldername(name))[1] or public.is_admin()
  )
);

create policy "recibos_insert"
on storage.objects for insert
with check (
  bucket_id = 'recibos' and auth.uid()::text = (storage.foldername(name))[1]
);

-- ------------------------------------------------------------
-- 7. TRIGGER: manter km_atual do veículo sincronizado
-- ------------------------------------------------------------
create or replace function public.atualizar_km_veiculo()
returns trigger
language plpgsql
as $$
begin
  update public.veiculos
  set km_atual = greatest(km_atual, coalesce(new.km_odometro, new.km_final))
  where id = new.veiculo_id;
  return new;
end;
$$;

create trigger trg_km_abastecimento
after insert on public.abastecimentos
for each row execute function public.atualizar_km_veiculo();

create trigger trg_km_viagem
after insert on public.viagens
for each row execute function public.atualizar_km_veiculo();
