-- Governador: AI personal governance sessions
create table if not exists governador_sessions (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references auth.users not null,
  mode        text        not null check (mode in ('recentratge','seguiment','coherencia','entrenador')),
  context     jsonb       default '{}'::jsonb,
  resposta    text        not null,
  created_at  timestamptz default now()
);

create index if not exists governador_sessions_user_mode_idx
  on governador_sessions (user_id, mode, created_at desc);

alter table governador_sessions enable row level security;

create policy "users manage own governador sessions"
  on governador_sessions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
