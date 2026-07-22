-- === Rücknahme aller Eingriffe in Torrek-Tabellen ===
drop index if exists einsatz_offen_je_geraet;

alter table einsatz
  drop column if exists foto_start_ref,
  drop column if exists foto_ende_ref,
  drop column if exists quelle;

alter table geraet
  drop column if exists automatisch_erfasst,
  drop column if exists erfasst_am;

delete from geraetetyp where id = 'gt-unbekannt';
delete from firmen_einstellung where schluessel = 'interim_app_code';

-- === Eigene Welt: keine Fremdschlüssel, kein Kontakt zu Torrek ===
create table if not exists scan_einstellung (
  schluessel text primary key,
  wert       text not null
);

create table if not exists scan_erfassung (
  local_id      uuid primary key,
  projektnummer text        not null,
  mieter        text,
  code          text        not null,
  typ_id        text,
  modus         text        not null check (modus in ('aufbau','abbau')),
  kwh           numeric     not null check (kwh >= 0),
  foto_ref      text,
  erfasst_am    timestamptz not null default now(),
  quelle        text        not null default 'torrek-scan'
);

comment on table scan_erfassung is
  'Torrek Scan (Übergangslösung). Bewusst ohne Fremdschlüssel und ohne Bezug zu geraet/projekt/einsatz. Wegwerfbar per DROP.';
comment on column scan_erfassung.code is
  'Rohcode vom Etikett, Code 128, 12-stellig. Keine Kurzform, keine Ableitung.';
comment on column scan_erfassung.typ_id is
  'Lose Referenz auf geraetetyp.id — absichtlich KEIN Fremdschlüssel. Reine Notiz für die spätere Übernahme.';

-- Ein Gerät genau einmal pro Projekt und Vorgang
create unique index if not exists scan_erfassung_eindeutig
  on scan_erfassung (projektnummer, code, modus);

create index if not exists scan_erfassung_projekt on scan_erfassung (projektnummer, modus);

alter table scan_erfassung enable row level security;
alter table scan_einstellung enable row level security;
-- Keine Policies: nur die Edge Function (service role) kommt dran.

insert into scan_einstellung (schluessel, wert)
values ('app_code', 'TROCKNUNG-2026')
on conflict (schluessel) do nothing;

