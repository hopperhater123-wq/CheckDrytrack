-- F8: Kontrolltermin mit Entscheidungs-Gate ("in 2 Wochen schauen").
-- kontrolle = Flag; kontrolle_ergebnis = erfolg | verlaengern | methode_aendern;
-- kontrolle_notiz = optionale Begründung (z. B. "Latex ankratzen").
ALTER TABLE termin ADD COLUMN IF NOT EXISTS kontrolle boolean NOT NULL DEFAULT false;
ALTER TABLE termin ADD COLUMN IF NOT EXISTS kontrolle_ergebnis text;
ALTER TABLE termin ADD COLUMN IF NOT EXISTS kontrolle_notiz text;

