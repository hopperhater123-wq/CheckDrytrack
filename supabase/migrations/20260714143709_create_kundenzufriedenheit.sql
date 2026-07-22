create table if not exists public.kundenzufriedenheit (
  id text primary key,
  projekt_id text not null,
  datum date not null,
  bewertung_freundlichkeit int not null,
  bewertung_sauberkeit int not null,
  bewertung_termintreue int not null,
  bewertung_qualitaet int not null,
  weiterempfehlung boolean not null default true,
  kommentar text,
  unterschrift_kunde text,
  unterschrift_kunde_name text,
  erstellt_von text not null,
  erstellt_am timestamptz not null default now()
);
grant select, insert, update, delete on public.kundenzufriedenheit to anon, authenticated;
alter table public.kundenzufriedenheit enable row level security;
drop policy if exists demo_vollzugriff on public.kundenzufriedenheit;
create policy demo_vollzugriff on public.kundenzufriedenheit for all to anon, authenticated using (true) with check (true);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='kundenzufriedenheit') then
    alter publication supabase_realtime add table public.kundenzufriedenheit;
  end if;
end $$;

