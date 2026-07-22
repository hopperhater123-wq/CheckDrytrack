-- Schlanker Bestellweg fürs Ersatzmaterial (kein ERP): Status + Menge + Bestelldatum.
ALTER TABLE bemusterung ADD COLUMN IF NOT EXISTS bestellstatus text NOT NULL DEFAULT 'ausgewaehlt';
ALTER TABLE bemusterung ADD COLUMN IF NOT EXISTS menge text;
ALTER TABLE bemusterung ADD COLUMN IF NOT EXISTS bestelldatum text;

-- Demo-Posten, damit die Dashboard-Kachel auch in der geteilten Demo etwas zeigt.
INSERT INTO bemusterung (id, projekt_id, material_beschreibung, lieferant, musterfoto_referenz, bestellstatus, menge, bestelldatum)
VALUES
  ('bm-1', 'p-1', 'Cera Vogue Feinsteinzeug 60×60, anthrazit', 'Cera Vogue', NULL, 'ausgewaehlt', '18 m²', NULL),
  ('bm-2', 'p-2', 'Eiche-Landhausdiele, geölt', 'Parkett Kraus', NULL, 'bestellt', '24 m²', now()::text)
ON CONFLICT (id) DO NOTHING;

