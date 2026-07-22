-- Torrek Scan (isoliert von DryTrack): additiv.
-- 1) Notiz je Gerät ("defekt", "läuft nicht") — Info fürs Büro.
alter table scan_erfassung add column if not exists notiz text;
-- 2) Foto-Erinnerung pro Büro einstellbar: aus | hinweis | pflicht.
--    "hinweis" = beim Speichern ohne Foto einmal nachfragen (Standard).
insert into scan_einstellung (schluessel, wert)
  values ('foto_pflicht', 'hinweis')
  on conflict (schluessel) do nothing;

