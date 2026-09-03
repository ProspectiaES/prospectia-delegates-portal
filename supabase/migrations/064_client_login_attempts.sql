-- Client self-service login (NIF/CIF) — attempt log + rate-limit source.
-- No RLS policies added: service-role (admin client) only, same pattern as other internal-only tables.
create table client_login_attempts (
  id           bigserial primary key,
  nif_attempt  text not null,
  ip           text,
  success      boolean not null,
  contact_id   text references holded_contacts(id),
  created_at   timestamptz not null default now()
);

create index client_login_attempts_ip_created_idx  on client_login_attempts (ip, created_at desc);
create index client_login_attempts_nif_created_idx on client_login_attempts (nif_attempt, created_at desc);

alter table client_login_attempts enable row level security;
