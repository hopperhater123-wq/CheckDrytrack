-- Raum löschen (Fehlerfassung, PO 18.07.): Dokumentation am Raum fällt mit
-- (CASCADE), Einsätze und Plan-Markierungen bleiben erhalten und verlieren nur
-- den Raum-Bezug (SET NULL). Nur Delete-Verhalten — Spalten/Daten unverändert.
ALTER TABLE public.messung DROP CONSTRAINT messung_raum_id_fkey,
  ADD CONSTRAINT messung_raum_id_fkey FOREIGN KEY (raum_id) REFERENCES public.raum(id) ON DELETE CASCADE;
ALTER TABLE public.raum_foto DROP CONSTRAINT raum_foto_raum_id_fkey,
  ADD CONSTRAINT raum_foto_raum_id_fkey FOREIGN KEY (raum_id) REFERENCES public.raum(id) ON DELETE CASCADE;
ALTER TABLE public.bodenaufbau_schicht DROP CONSTRAINT bodenaufbau_schicht_raum_id_fkey,
  ADD CONSTRAINT bodenaufbau_schicht_raum_id_fkey FOREIGN KEY (raum_id) REFERENCES public.raum(id) ON DELETE CASCADE;
ALTER TABLE public.einsatz DROP CONSTRAINT einsatz_raum_id_fkey,
  ADD CONSTRAINT einsatz_raum_id_fkey FOREIGN KEY (raum_id) REFERENCES public.raum(id) ON DELETE SET NULL;
ALTER TABLE public.grundriss_markierung DROP CONSTRAINT grundriss_markierung_raum_id_fkey,
  ADD CONSTRAINT grundriss_markierung_raum_id_fkey FOREIGN KEY (raum_id) REFERENCES public.raum(id) ON DELETE SET NULL;

