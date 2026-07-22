-- F7 · Trocknungsmethode + Erschwernisse je Raum (PO 21.07.): wie getrocknet wird
-- (Folientunnel, Adsorption m. Durchzug …) und was es erschwert (Latex/Dampfsperre,
-- Kalksandstein …). Rein additiv.
ALTER TABLE public.raum ADD COLUMN IF NOT EXISTS trocknungsmethode text;
ALTER TABLE public.raum ADD COLUMN IF NOT EXISTS erschwernisse jsonb NOT NULL DEFAULT '[]'::jsonb;

