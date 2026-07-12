// Messsystem-Logik — aus "📏 Messsystem" (Notion, FR-MESS-001 bis 007).
// Wichtig: alle Grenzwerte sind PRAXISRICHTWERTE, keine DIN-Normwerte (FR-MESS-002).

import type { Materialdatenbank, Messung } from "./types";

/**
 * Absolute Feuchte (Mischungsverhältnis) in g/kg aus Temperatur (°C) und rel. Luftfeuchte (%).
 * Magnus-Formel (FR-MESS-003). Richtwert: ≤ 10 g/kg = trocken, > 10 g/kg = feucht.
 */
export function absoluteFeuchteGKg(temperaturC: number, relFeuchteProzent: number, druckHpa = 1013.25): number {
  const es = 6.112 * Math.exp((17.62 * temperaturC) / (243.12 + temperaturC)); // Sättigungsdampfdruck [hPa]
  const e = (relFeuchteProzent / 100) * es; // Dampfdruck [hPa]
  const x = (622 * e) / (druckHpa - e); // Mischungsverhältnis [g/kg]
  return Math.round(x * 10) / 10;
}

export const GKG_RICHTWERT = 10; // FR-MESS-003

export type Bewertung = "trocken" | "grenzwertig" | "feucht" | "kontaminiert" | "austausch" | "offen";

export interface BewertungErgebnis {
  bewertung: Bewertung;
  text: string;
  /** true, wenn die Bewertung auf einem Praxisrichtwert beruht (FR-MESS-002, keine Norm). */
  praxisrichtwert: boolean;
}

/** Bewertet eine Messung je nach Bewertungsmodell des Materials (FR-MESS-001). */
export function bewerteMessung(m: Messung, material: Materialdatenbank | undefined): BewertungErgebnis {
  if (!material) return { bewertung: "offen", text: "Material unbekannt", praxisrichtwert: false };

  switch (material.bewertungsmodell) {
    case "digit_grenzwert": {
      const grenz = material.praxisgrenzwert_digit;
      if (m.anzeige_digit == null || grenz == null) return { bewertung: "offen", text: "Kein Digit-Wert", praxisrichtwert: true };
      if (m.anzeige_digit <= grenz) return { bewertung: "trocken", text: `${m.anzeige_digit} ≤ ${grenz} Digits`, praxisrichtwert: true };
      if (m.anzeige_digit <= grenz * 1.15) return { bewertung: "grenzwertig", text: `${m.anzeige_digit} Digits (knapp über ${grenz})`, praxisrichtwert: true };
      return { bewertung: "feucht", text: `${m.anzeige_digit} > ${grenz} Digits`, praxisrichtwert: true };
    }
    case "vergleichsmessung": {
      // Kein fixer Zahlenwert — Beurteilung relativ zur trockenen Vergleichsstelle (FR-MESS-001).
      if (m.anzeige_digit == null || m.referenz_digit == null) return { bewertung: "offen", text: "Referenz fehlt", praxisrichtwert: true };
      const diff = m.anzeige_digit - m.referenz_digit;
      if (diff <= 5) return { bewertung: "trocken", text: `Δ ${diff} zur Referenz (${m.referenz_digit})`, praxisrichtwert: true };
      if (diff <= 15) return { bewertung: "grenzwertig", text: `Δ ${diff} zur Referenz`, praxisrichtwert: true };
      return { bewertung: "feucht", text: `Δ ${diff} über Referenz`, praxisrichtwert: true };
    }
    case "status_checkliste": {
      const c = m.status_checkliste;
      if (!c) return { bewertung: "offen", text: "Status offen", praxisrichtwert: false };
      if (c.austausch_erforderlich) return { bewertung: "austausch", text: "Austausch erforderlich", praxisrichtwert: false };
      if (c.kontaminiert) return { bewertung: "kontaminiert", text: "Kontaminiert", praxisrichtwert: false };
      if (c.feucht) return { bewertung: "feucht", text: "Feucht", praxisrichtwert: false };
      if (c.trocken) return { bewertung: "trocken", text: "Trocken", praxisrichtwert: false };
      return { bewertung: "offen", text: "Status offen", praxisrichtwert: false };
    }
  }
}

export const BEWERTUNG_LABEL: Record<Bewertung, string> = {
  trocken: "Trocken", grenzwertig: "Grenzwertig", feucht: "Feucht",
  kontaminiert: "Kontaminiert", austausch: "Austausch", offen: "Offen",
};
