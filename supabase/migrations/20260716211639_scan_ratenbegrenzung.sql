-- Ratenbegrenzung gegen Durchprobieren des Zugangscodes.
-- Grund: Repo ist öffentlich → Endpunkt bekannt; verify_jwt ist aus →
-- der App-Code ist die einzige Schranke. Ohne Bremse ist er in Minuten geraten.
create table if not exists scan_fehlversuch (
  id         bigserial primary key,
  quelle     text        not null,          -- IP bzw. Proxy-Kette
  zeitpunkt  timestamptz not null default now()
);

comment on table scan_fehlversuch is
  'Nur Fehlversuche. Erfolgreiche Anfragen werden NICHT protokolliert — kein Bewegungsprofil der Monteure.';

create index if not exists scan_fehlversuch_quelle
  on scan_fehlversuch (quelle, zeitpunkt desc);

alter table scan_fehlversuch enable row level security;
-- Keine Policies: nur die Edge Function (service role).

