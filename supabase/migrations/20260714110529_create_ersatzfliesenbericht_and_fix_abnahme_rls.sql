create table if not exists public.ersatzfliesenbericht (
  id text primary key,
  projekt_id text not null,
  datum date not null,
  bemerkungen text,
  unterschrift_kunde text,
  unterschrift_kunde_name text,
  unterschrift_mitarbeiter text,
  erstellt_von text not null,
  erstellt_am timestamptz not null default now()
);
grant select, insert, update, delete on public.ersatzfliesenbericht to anon, authenticated;
alter table public.ersatzfliesenbericht enable row level security;
drop policy if exists demo_vollzugriff on public.ersatzfliesenbericht;
create policy demo_vollzugriff on public.ersatzfliesenbericht for all to anon, authenticated using (true) with check (true);
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname='supabase_realtime' and schemaname='public' and tablename='ersatzfliesenbericht') then
    alter publication supabase_realtime add table public.ersatzfliesenbericht;
  end if;
end $$;

alter table public.abnahmeprotokoll enable row level security;
drop policy if exists demo_vollzugriff on public.abnahmeprotokoll;
create policy demo_vollzugriff on public.abnahmeprotokoll for all to anon, authenticated using (true) with check (true);

