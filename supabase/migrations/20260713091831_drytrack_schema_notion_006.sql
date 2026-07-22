-- DryTrack-Schema — 1:1 aus "006 · Datenbank" (Notion, Source of Truth, Stand 12.07.2026).
-- Deutsche Tabellen-/Feldnamen wie dokumentiert. Das alte englische MVP-Schema
-- (profiles/projects/devices/…, leer) bleibt unangetastet — laut Docs zurückgezogen.

create table if not exists benutzer (
  id text primary key,
  name text not null,
  microsoft_account_id text not null,
  rolle text not null check (rolle in ('monteur','disposition','projektleiter','admin_gf'))
);

create table if not exists geraetetyp (
  id text primary key,
  bezeichnung text not null,
  ist_freitext boolean not null default false,
  leistungswert_kw double precision,
  luftleistung_m3h double precision
);

create table if not exists versicherung (
  id text primary key,
  name text not null
);

create table if not exists projekt (
  id text primary key,
  projektnummer text not null,
  status text not null,
  storniert boolean not null default false,
  ist_erstmassnahme boolean not null default false,
  bezeichnung text not null,
  adresse text not null,
  geo_lat double precision,
  geo_lng double precision,
  kontamination_art text,
  gefaehrdungsbeurteilung_abgeschlossen boolean not null default false,
  versicherung_id text references versicherung(id),
  angelegt_von text references benutzer(id),
  angelegt_am timestamptz not null default now()
);

create table if not exists geraet (
  inventarnummer text primary key, -- = Barcode-/QR-Inhalt
  geraetetyp_id text not null references geraetetyp(id),
  status text not null check (status in ('lager','baustelle','werkstatt')),
  eigentum text not null check (eigentum in ('eigen','gemietet')),
  e_check_datum date,
  aktuelles_projekt_id text references projekt(id)
);

create table if not exists raum (
  id text primary key,
  projekt_id text not null references projekt(id),
  bezeichnung text not null,
  daemmstoff_status text,
  daemmstoff_material_id text
);

-- Herzstück (10 · Einsätze)
create table if not exists einsatz (
  id text primary key,
  projekt_id text not null references projekt(id),
  geraet_inventarnummer text not null references geraet(inventarnummer),
  raum_id text references raum(id),
  aufbau_datum timestamptz not null,
  abbau_datum timestamptz,
  zaehlerstand_start double precision not null,
  zaehlerstand_ende double precision,
  verbrauch_geschaetzt boolean not null default false
);

create table if not exists feed_eintrag (
  id text primary key,
  projekt_id text not null references projekt(id),
  geraet_inventarnummer text,
  ursprung text not null,
  kategorie text,
  inhalt text not null,
  autor_id text references benutzer(id),
  erstellt_am timestamptz not null default now()
);

create table if not exists feed_kommentar (
  id text primary key,
  feed_eintrag_id text not null references feed_eintrag(id),
  autor_id text references benutzer(id),
  inhalt text not null,
  erstellt_am timestamptz not null default now()
);

create table if not exists dokument (
  id text primary key,
  projekt_id text not null references projekt(id),
  typ text not null,
  speicher_referenz text not null,
  erstellt_von text references benutzer(id),
  erstellt_am timestamptz not null default now()
);

create table if not exists materialdatenbank (
  id text primary key,
  bezeichnung text not null,
  kategorie text,
  trocknungsfaehig boolean,
  austauschpflichtig boolean,
  bewertungsmodell text not null check (bewertungsmodell in ('digit_grenzwert','vergleichsmessung','status_checkliste')),
  praxisgrenzwert_digit double precision,
  schicht_typ text check (schicht_typ in ('oberbelag','estrich','daemmung'))
);

create table if not exists bodenaufbau_schicht (
  id text primary key,
  raum_id text not null references raum(id),
  reihenfolge integer not null,
  schicht_typ text not null check (schicht_typ in ('oberbelag','estrich','daemmung')),
  material_id text not null references materialdatenbank(id)
);

create table if not exists messung (
  id text primary key,
  raum_id text not null references raum(id),
  material_id text not null references materialdatenbank(id),
  messverfahren text not null check (messverfahren in ('widerstand','dielektrisch')),
  anzeige_digit double precision,
  referenz_digit double precision,
  status_checkliste jsonb,
  absolute_feuchte_g_kg double precision,
  temperatur_c double precision,
  rel_luftfeuchte_prozent double precision,
  anlass text not null check (anlass in ('eingangsmessung','freimessung')),
  gemessen_von text references benutzer(id),
  gemessen_am timestamptz not null default now()
);

create table if not exists grundriss (
  id text primary key,
  projekt_id text not null references projekt(id),
  quelle text not null check (quelle in ('magicplan','skizze_foto')),
  datei_referenz text not null,
  erstellt_am timestamptz not null default now()
);

create table if not exists grundriss_markierung (
  id text primary key,
  grundriss_id text not null references grundriss(id),
  raum_id text references raum(id),
  zielgruppe text not null check (zielgruppe in ('sanierer','trocknungsmonteur')),
  text text not null,
  erstellt_von text references benutzer(id),
  erstellt_am timestamptz not null default now()
);

create table if not exists bemusterung (
  id text primary key,
  projekt_id text not null references projekt(id),
  material_beschreibung text not null,
  musterfoto_referenz text,
  lieferant text
);

create table if not exists raum_foto (
  id text primary key,
  raum_id text not null references raum(id),
  kategorie text not null check (kategorie in ('uebersicht','schadenstelle')),
  datei_referenz text not null,
  aufgenommen_von text references benutzer(id),
  aufgenommen_am timestamptz not null default now()
);

create table if not exists firmen_einstellung (
  schluessel text primary key,
  wert text not null
);

-- RLS: Demo-Phase — voller Zugriff für anon/authenticated.
-- Produktiv ersetzt Microsoft-365-Auth (FR-SEC-001) diese Policies durch rollenbasierte.
do $$
declare t text;
begin
  foreach t in array array['benutzer','geraetetyp','versicherung','projekt','geraet','raum','einsatz',
    'feed_eintrag','feed_kommentar','dokument','materialdatenbank','bodenaufbau_schicht','messung',
    'grundriss','grundriss_markierung','bemusterung','raum_foto','firmen_einstellung']
  loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists demo_vollzugriff on %I', t);
    execute format('create policy demo_vollzugriff on %I for all to anon, authenticated using (true) with check (true)', t);
    execute format('alter publication supabase_realtime add table %I', t);
  end loop;
end $$;

