-- Termine für die Wochenplanung (Alt-System "Terminübersicht", Backlog ③).
create table if not exists termin (
  id text primary key,
  projekt_id text not null references projekt(id),
  datum date not null,
  uhrzeit text,
  mitarbeiter_id text references benutzer(id),
  beschreibung text not null,
  erledigt boolean not null default false,
  erstellt_von text references benutzer(id),
  erstellt_am timestamptz not null default now()
);

alter table termin enable row level security;
drop policy if exists demo_vollzugriff on termin;
create policy demo_vollzugriff on termin for all to anon, authenticated using (true) with check (true);
alter publication supabase_realtime add table termin;

insert into termin (id, projekt_id, datum, uhrzeit, mitarbeiter_id, beschreibung, erledigt, erstellt_von, erstellt_am) values
  ('t-1','p-1', current_date,     '08:30','u-monteur','TRO Abbau / Strömungskontrolle / WH aufnehmen', false, 'u-dispo', now() - interval '2 days'),
  ('t-2','p-2', current_date + 1, '07:00','u-monteur','Messwerte nachtragen 4.OT',                     false, 'u-dispo', now() - interval '2 days'),
  ('t-3','p-2', current_date + 2, '09:00', null,      'Gefährdungsbeurteilung abschließen (Fäkalien)', false, 'u-pl',    now() - interval '1 day'),
  ('t-4','p-1', current_date - 1, '10:00','u-monteur','Kontrollmessung Küche',                         true,  'u-dispo', now() - interval '4 days')
on conflict (id) do nothing;

