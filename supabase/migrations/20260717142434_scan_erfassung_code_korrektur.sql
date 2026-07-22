-- Torrek Scan: auch die Etikettennummer (code) ist korrigierbar.
-- code_alt behält die ursprüngliche Nummer (bleibt beim ersten Korrigieren stehen).
ALTER TABLE scan_erfassung ADD COLUMN IF NOT EXISTS code_alt text;

