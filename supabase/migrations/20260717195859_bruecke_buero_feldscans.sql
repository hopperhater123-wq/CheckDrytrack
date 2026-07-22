-- Brücke Büro ↔ Feld (Torrek liest Torrek-Scan-Erfassungen und übernimmt sie):
-- 1) Markierung, welche Feld-Scans schon als Einsätze übernommen wurden.
ALTER TABLE scan_erfassung ADD COLUMN IF NOT EXISTS uebernommen_am timestamptz;

-- 2) Büro (anon/authenticated) darf Feld-Scans LESEN und NUR uebernommen_am schreiben.
--    (RLS war deny-by-default; Policies gezielt öffnen, Spalten-Grant begrenzt das Schreiben.)
CREATE POLICY buero_liest_scans ON scan_erfassung
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY buero_markiert_uebernahme ON scan_erfassung
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
REVOKE UPDATE ON scan_erfassung FROM anon, authenticated;
GRANT UPDATE (uebernommen_am) ON scan_erfassung TO anon, authenticated;

-- 3) Foto-Pflicht ist Büro-steuerbar; der Zugangscode (app_code) bleibt unlesbar/gesperrt.
CREATE POLICY buero_foto_pflicht ON scan_einstellung
  FOR ALL TO anon, authenticated
  USING (schluessel = 'foto_pflicht') WITH CHECK (schluessel = 'foto_pflicht');

