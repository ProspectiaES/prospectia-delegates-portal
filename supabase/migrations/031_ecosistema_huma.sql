-- Ecosistema Humà: relational awareness system
create table if not exists ecosistema_persones (
  id             uuid        default gen_random_uuid() primary key,
  user_id        uuid        references auth.users not null,
  nom            text        not null,
  rol_vital      text,
  categoria      text        not null default 'nucli'
                             check (categoria in ('nucli','estrategic','expansio','drenant')),
  energia        integer     check (energia between 1 and 5),
  claredat       integer     check (claredat between 1 and 5),
  autenticitat   integer     check (autenticitat between 1 and 5),
  alineacio      integer     check (alineacio between 1 and 5),
  profunditat    integer     check (profunditat between 1 and 5),
  confianca      integer     check (confianca between 1 and 5),
  estat_relacional text,
  sensacio_post  text,
  notes          text,
  avatar_emoji   text        default '👤',
  created_at     timestamptz default now(),
  updated_at     timestamptz default now()
);

create index if not exists ecosistema_persones_user_idx
  on ecosistema_persones (user_id, categoria);

alter table ecosistema_persones enable row level security;

create policy "users manage own persones"
  on ecosistema_persones for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Interaction log
create table if not exists ecosistema_interaccions (
  id          uuid        default gen_random_uuid() primary key,
  user_id     uuid        references auth.users not null,
  persona_id  uuid        references ecosistema_persones on delete cascade,
  data        date        not null,
  qualitat    integer     check (qualitat between 1 and 5),
  sensacio    text,
  notes       text,
  created_at  timestamptz default now()
);

create index if not exists ecosistema_interaccions_persona_idx
  on ecosistema_interaccions (persona_id, data desc);

alter table ecosistema_interaccions enable row level security;

create policy "users manage own interaccions"
  on ecosistema_interaccions for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
