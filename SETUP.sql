-- =====================================================
-- TAL DO FUT — Script SQL para o Supabase
-- Cole isso no SQL Editor do seu projeto e execute
-- =====================================================

-- 1. TABELA DE EVENTOS
create table if not exists eventos (
  id            text primary key,
  admin_id      uuid references auth.users(id) on delete cascade,
  nome          text not null,
  data          date,
  hora          text,
  local         text,
  valor         numeric(10,2) default 0,
  chave_pix     text,
  minimo_jogadores int default 10,
  times_sorteados  jsonb,
  created_at    timestamptz default now()
);

-- 2. TABELA DE JOGADORES
create table if not exists jogadores (
  id          uuid primary key default gen_random_uuid(),
  evento_id   text references eventos(id) on delete cascade,
  nome        text not null,
  nivel       int  default 1 check (nivel between 1 and 3),
  goleiro     boolean default false,
  pago        boolean default false,
  confirmado  boolean default true,
  created_at  timestamptz default now(),
  unique(evento_id, nome)
);

-- 3. HABILITAR RLS
alter table eventos   enable row level security;
alter table jogadores enable row level security;

-- 4. POLÍTICAS — EVENTOS (só o admin dono gerencia)
create policy "admin_select_eventos"
  on eventos for select
  using (auth.uid() = admin_id);

create policy "admin_insert_eventos"
  on eventos for insert
  with check (auth.uid() = admin_id);

create policy "admin_update_eventos"
  on eventos for update
  using (auth.uid() = admin_id);

create policy "admin_delete_eventos"
  on eventos for delete
  using (auth.uid() = admin_id);

-- Jogadores podem ler o evento pelo id (sem auth)
create policy "publico_select_evento_por_id"
  on eventos for select
  using (true);

-- 5. POLÍTICAS — JOGADORES (leitura pública, escrita pública p/ jogadores)
create policy "publico_select_jogadores"
  on jogadores for select
  using (true);

create policy "publico_insert_jogadores"
  on jogadores for insert
  with check (true);

create policy "publico_update_jogadores"
  on jogadores for update
  using (true);

create policy "publico_delete_jogadores"
  on jogadores for delete
  using (true);

-- 6. REALTIME (para atualização ao vivo)
-- No painel do Supabase: Database → Replication → Tables → marque "jogadores" e "eventos"
-- Ou rode:
alter publication supabase_realtime add table jogadores;
alter publication supabase_realtime add table eventos;
