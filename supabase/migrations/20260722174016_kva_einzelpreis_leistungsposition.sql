-- KVA-Modul (PO-Entscheidung 22.07.2026): Einzelpreis netto je Leistungsposition.
-- Additiv; Preise pflegt nur das Büro (App-seitig gegated).
ALTER TABLE leistungsposition ADD COLUMN IF NOT EXISTS einzelpreis double precision;

