-- Besuchsbericht + Stundennachweis (Alt-System-Analyse 13.07.2026, Backlog ①).

create table if not exists besuchsbericht (
  id text primary key,
  projekt_id text not null references projekt(id),
  datum date not null,
  naechster_termin date,
  fahrtkilometer double precision,
  bemerkungen text,
  geleistete_arbeiten text not null,
  erstellt_von text references benutzer(id),
  erstellt_am timestamptz not null default now()
);

create table if not exists stunden_eintrag (
  id text primary key,
  besuchsbericht_id text not null references besuchsbericht(id),
  mitarbeiter_name text not null,
  gewerk text not null,
  von text not null,
  bis text not null,
  pause_min integer not null default 0
);

do $$
declare t text;
begin
  foreach t in array array['besuchsbericht','stunden_eintrag'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists demo_vollzugriff on %I', t);
    execute format('create policy demo_vollzugriff on %I for all to anon, authenticated using (true) with check (true)', t);
    execute format('alter publication supabase_realtime add table %I', t);
  end loop;
end $$;

-- Seed (gespiegelt aus src/domain/seed.ts)
insert into besuchsbericht (id, projekt_id, datum, naechster_termin, fahrtkilometer, bemerkungen, geleistete_arbeiten, erstellt_von, erstellt_am) values
  ('bb-1','p-1', current_date - 8, current_date + 2, 24,
   'Kunde ist mit Fliesenauswahl Cera Vogue einverstanden. Keine Bohrungen im Duschbereich gewünscht.',
   E'Schutz und Bewegung 3h\nFM + TRO Aufbau\nStrömungskontrolle 0,5h\nBemusterung Cera Vogue',
   'u-monteur', now() - interval '8 days')
on conflict (id) do nothing;

insert into stunden_eintrag (id, besuchsbericht_id, mitarbeiter_name, gewerk, von, bis, pause_min) values
  ('st-1','bb-1','Kevin Berg','Trocknung','08:30','14:30',0),
  ('st-2','bb-1','M. Pilic','Trocknung','08:30','14:30',30)
on conflict (id) do nothing;

