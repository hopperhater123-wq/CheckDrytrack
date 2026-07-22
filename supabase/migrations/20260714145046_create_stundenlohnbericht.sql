create table if not exists public.stundenlohnbericht (
  id text primary key,
  projekt_id text not null,
  datum date not null,
  stunden jsonb not null default '[]'::jsonb,
  material jsonb not null default '[]'::jsonb,
  bemerkungen text,
  unterschrift_kunde text,
  unterschrift_kunde_name text,
  unterschrift_mitarbeiter text,
  erstellt_von text not null,
  erstellt_am timestamptz not null default now()
);
grant select, insert, update, delete on public.stundenlohnbericht to anon, authenticated;
alter table public.stundenlohnbericht enable row level security;
drop policy if exists demo_vollzugriff on public.stundenlohnbericht;
create policy demo_vollzugriff on public.stundenlohnbericht for all to anon, authenticated using (true) with check (true);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='stundenlohnbericht') then
    alter publication supabase_realtime add table public.stundenlohnbericht;
  end if;
end $$;

