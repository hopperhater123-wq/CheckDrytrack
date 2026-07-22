-- 360°-Raumansicht (Roadmap C-Detail): neue Foto-Kategorie "pano" (equirektangulares Panorama).
-- Additiv: bestehende Werte bleiben gültig, der Check wird nur erweitert.
ALTER TABLE public.raum_foto DROP CONSTRAINT IF EXISTS raum_foto_kategorie_check;
ALTER TABLE public.raum_foto ADD CONSTRAINT raum_foto_kategorie_check
  CHECK (kategorie = ANY (ARRAY['uebersicht'::text, 'schadenstelle'::text, 'pano'::text]));

