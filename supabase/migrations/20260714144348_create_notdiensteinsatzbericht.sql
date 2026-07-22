create table if not exists public.notdiensteinsatzbericht (
  id text primary key,
  projekt_id text not null,
  datum date not null,
  alarmierung text,
  ankunft text,
  schadenursache text,
  sofortmassnahmen text not null,
  bemerkungen text,
  unterschrift_kunde text,
  unterschrift_kunde_name text,
  unterschrift_mitarbeiter text,
  erstellt_von text not null,
  erstellt_am timestamptz not null default now()
);
grant select, insert, update, delete on public.notdiensteinsatzbericht to anon, authenticated;
alter table public.notdiensteinsatzbericht enable row level security;
drop policy if exists demo_vollzugriff on public.notdiensteinsatzbericht;
create policy demo_vollzugriff on public.notdiensteinsatzbericht for all to anon, authenticated using (true) with check (true);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='notdiensteinsatzbericht') then
    alter publication supabase_realtime add table public.notdiensteinsatzbericht;
  end if;
end $$;

