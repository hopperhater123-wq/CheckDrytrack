// Einsatz-Logik — das Herzstück (10 · Einsätze).
// FR-EINSATZ-002: Verbrauch = Zählerdifferenz, Dauer = Aufbau→Abbau.
// FR-EINSATZ-003: Fallback bei defektem/unlesbarem Zähler = Einsatztage × Geräteleistung (kW).

import type { Einsatz, Geraet, Geraetetyp } from "./types";

export const MS_PRO_TAG = 1000 * 60 * 60 * 24;

/** Einsatzdauer in Tagen (angebrochene Tage aufgerundet, min. 1). Läuft der Einsatz noch, bis jetzt. */
export function einsatzTage(einsatz: Einsatz, jetzt: Date = new Date()): number {
  const start = new Date(einsatz.aufbau_datum).getTime();
  const ende = einsatz.abbau_datum ? new Date(einsatz.abbau_datum).getTime() : jetzt.getTime();
  return Math.max(1, Math.ceil((ende - start) / MS_PRO_TAG));
}

export interface VerbrauchErgebnis {
  /** kWh */
  verbrauch: number;
  /** true = FR-EINSATZ-003-Schätzung (Näherungswert ohne Gewähr), false = gemessen */
  geschaetzt: boolean;
}

/**
 * Stromverbrauch eines abgebauten Einsatzes.
 * - Regelfall (FR-EINSATZ-002): Endstand − Startstand.
 * - Fallback (FR-EINSATZ-003): Einsatztage × Nennleistung (kW) × 24 h, als Näherung gekennzeichnet.
 * Liefert null, solange der Einsatz noch läuft (kein Abbau).
 */
export function berechneVerbrauch(
  einsatz: Einsatz,
  _geraet: Geraet,
  typ: Geraetetyp | undefined,
): VerbrauchErgebnis | null {
  if (einsatz.abbau_datum === null) return null;

  if (!einsatz.verbrauch_geschaetzt && einsatz.zaehlerstand_ende !== null) {
    return {
      verbrauch: Math.max(0, einsatz.zaehlerstand_ende - einsatz.zaehlerstand_start),
      geschaetzt: false,
    };
  }

  // Fallback-Schätzung
  const kw = typ?.leistungswert_kw ?? 0;
  const tage = einsatzTage(einsatz);
  return { verbrauch: kw * tage * 24, geschaetzt: true };
}

export function istLaufend(einsatz: Einsatz): boolean {
  return einsatz.abbau_datum === null;
}
