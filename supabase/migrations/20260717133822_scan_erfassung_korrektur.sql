-- Torrek Scan: Zählerstand-Korrektur (Tippfehler). Additiv:
-- kwh_alt = ursprünglicher Wert (bleibt beim ersten Korrigieren stehen),
-- korrigiert_am = Zeitpunkt der letzten Korrektur.
ALTER TABLE scan_erfassung ADD COLUMN IF NOT EXISTS kwh_alt numeric;
ALTER TABLE scan_erfassung ADD COLUMN IF NOT EXISTS korrigiert_am timestamptz;

