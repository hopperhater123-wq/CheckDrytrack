-- F14: Befund-Layer auf dem Grundriss. Additive Spalten an grundriss_markierung.
-- kategorie = Zeichen-Kategorie (nass/sockelleiste/...), status = markiert->erledigt,
-- geometrie = normierte 0..1-Koordinaten als JSON-Text.
ALTER TABLE grundriss_markierung ADD COLUMN IF NOT EXISTS kategorie text;
ALTER TABLE grundriss_markierung ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'offen';
ALTER TABLE grundriss_markierung ADD COLUMN IF NOT EXISTS geometrie text;

