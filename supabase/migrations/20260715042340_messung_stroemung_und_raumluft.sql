-- m/s-Spalte aus dem Alt-System (Anemometer) + Pseudo-Material Raumluft für Hygrometer-Messungen
ALTER TABLE public.messung ADD COLUMN IF NOT EXISTS stroemung_m_s numeric;
INSERT INTO public.materialdatenbank (id, bezeichnung, kategorie, trocknungsfaehig, austauschpflichtig, bewertungsmodell, praxisgrenzwert_digit, schicht_typ)
VALUES ('mat-raumluft', 'Raumluft', 'Raumluft', NULL, NULL, 'digit_grenzwert', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

