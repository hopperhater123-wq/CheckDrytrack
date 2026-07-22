create table if not exists public.abnahmeprotokoll (
  id text primary key,
  projekt_id text not null,
  datum date not null,
  abnahme_status text not null,
  maengel text,
  bemerkungen text,
  unterschrift_kunde text,
  unterschrift_kunde_name text,
  unterschrift_mitarbeiter text,
  erstellt_von text not null,
  erstellt_am timestamptz not null default now()
);

-- Offenes Setup wie die übrigen Tabellen (RLS bleibt aus; Zugriff über anon-Key).
grant select, insert, update, delete on public.abnahmeprotokoll to anon, authenticated;

-- Realtime-Publication, damit Änderungen live synchronisieren.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'abnahmeprotokoll'
  ) then
    alter publication supabase_realtime add table public.abnahmeprotokoll;
  end if;
end $$;

