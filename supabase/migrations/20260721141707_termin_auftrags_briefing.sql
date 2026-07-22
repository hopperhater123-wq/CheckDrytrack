-- F1 · Auftrags-Briefing pro Termin (PO 21.07., Field-Discovery):
-- Büro pflegt „Was ist heute zu tun" + Mitnehm-Checkliste (inkl. Handwerkerausweis, F9).
-- briefing_stand = letzte Büro-Änderung, briefing_quittiert = Monteur hat's zur Kenntnis
-- genommen → daraus der „Auftrag geändert/neu"-Hinweis in „Mein Tag". Rein additiv.
ALTER TABLE public.termin ADD COLUMN IF NOT EXISTS briefing text;
ALTER TABLE public.termin ADD COLUMN IF NOT EXISTS mitnehmen jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.termin ADD COLUMN IF NOT EXISTS briefing_stand timestamptz;
ALTER TABLE public.termin ADD COLUMN IF NOT EXISTS briefing_quittiert timestamptz;

