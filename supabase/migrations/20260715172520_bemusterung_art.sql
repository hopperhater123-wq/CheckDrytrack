-- Art des bemusterten Materials (Einleger/Fliese/Parkett …), additiv.
ALTER TABLE bemusterung ADD COLUMN IF NOT EXISTS art text NOT NULL DEFAULT 'sonstiges';
UPDATE bemusterung SET art = 'einleger_keramik' WHERE id = 'bm-1';
UPDATE bemusterung SET art = 'parkett' WHERE id = 'bm-2';

