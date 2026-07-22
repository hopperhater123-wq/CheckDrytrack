-- RLS scharf: Zugriff nur noch für eingeloggte Nutzer (Pilot-Zugangssperre, 22.07.2026).
--
-- ⚠️ NOCH NICHT ANGEWANDT. Diese Migration wird ERST bei der Scharfschaltung eingespielt —
-- zusammen mit dem Deploy der App mit VITE_AUTH_REQUIRED=true UND nachdem ein geteiltes
-- Login-Konto in Supabase (Auth → Users) angelegt wurde. Andernfalls verliert die laufende
-- App (die bis dahin mit dem anon-Key arbeitet) schlagartig jeden Datenzugriff.
--
-- Wirkung: Jede „demo_vollzugriff"-Policy der Haupt-App wird von „anon, authenticated" auf
-- „authenticated" umgestellt und die anon-Grants entzogen. Damit ist der öffentliche anon-Key
-- im App-Bundle wertlos — ohne Anmeldung kommt niemand mehr an Projekt-/Mess-/KVA-Daten.
--
-- Bewusst NICHT angefasst: die Torrek-Scan-Brücke (scan_erfassung/scan_einstellung mit den
-- Policies buero_liest_scans/buero_markiert_uebernahme/buero_foto_pflicht). Die Feld-App
-- schreibt über eine Edge Function mit service_role (umgeht RLS) und ist ein eigenes,
-- kleineres Sicherheitsmodell — separat zu behandeln, um den Feld-Weg nicht zu brechen.

do $$
declare r record;
begin
  for r in
    select schemaname, tablename
    from pg_policies
    where policyname = 'demo_vollzugriff' and schemaname = 'public'
  loop
    execute format('drop policy demo_vollzugriff on %I.%I', r.schemaname, r.tablename);
    execute format('create policy demo_vollzugriff on %I.%I for all to authenticated using (true) with check (true)', r.schemaname, r.tablename);
    -- anon-Rechte entziehen: ohne Login gar kein Zugriff mehr (Grants sind unabhängig von RLS).
    execute format('revoke all on %I.%I from anon', r.schemaname, r.tablename);
  end loop;
end $$;
