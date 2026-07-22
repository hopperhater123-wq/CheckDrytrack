-- Errungenschaften aus „Torrek Scan" in die Haupt-App übernehmen:
-- Beweisfoto vom Zähler (Auf-/Abbau) + Notiz je Einsatz. Additiv.
ALTER TABLE einsatz ADD COLUMN IF NOT EXISTS foto_start text;
ALTER TABLE einsatz ADD COLUMN IF NOT EXISTS foto_ende text;
ALTER TABLE einsatz ADD COLUMN IF NOT EXISTS notiz text;

