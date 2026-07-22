// KVA-Modul: Kostenvoranschlag aus der Positionsauflistung.
// PO-Entscheidung 22.07.2026 (plancraft-Vergleich): Die „kein ERP"-Grenze wird gezielt
// verschoben — Torrek darf ein KVA (Angebot) mit Preisen erstellen. Rechnungen,
// Mahnwesen und Buchhaltung bleiben weiterhin draußen (Bürosoftware).
// Preise sieht und pflegt ausschließlich das Büro (rolle !== "monteur").

import type { DryTrackDB, Leistungsposition } from "./types";

export const MWST_SATZ = 0.19;

/** Gesamtpreis einer Position (Menge × Einzelpreis, kaufmännisch auf Cent gerundet). */
export function positionsGesamt(p: Pick<Leistungsposition, "menge" | "einzelpreis">): number | null {
  if (p.menge == null || p.einzelpreis == null) return null;
  return Math.round(p.menge * p.einzelpreis * 100) / 100;
}

export interface KvaSummen {
  netto: number;
  mwst: number;
  brutto: number;
  bewertet: number; // Positionen mit Preis UND Menge
  offen: number; // Positionen ohne Preis oder ohne Menge — fehlen im Summenblock
}

/** Summen über alle Positionen; unbepreiste/mengenlose Positionen zählen als „offen". */
export function kvaSummen(positionen: Leistungsposition[], mwstSatz = MWST_SATZ): KvaSummen {
  let netto = 0;
  let bewertet = 0;
  for (const p of positionen) {
    const gp = positionsGesamt(p);
    if (gp == null) continue;
    netto = Math.round((netto + gp) * 100) / 100;
    bewertet += 1;
  }
  const mwst = Math.round(netto * mwstSatz * 100) / 100;
  const brutto = Math.round((netto + mwst) * 100) / 100;
  return { netto, mwst, brutto, bewertet, offen: positionen.length - bewertet };
}

/** Euro-Format (de-DE, geschütztes Leerzeichen wie im Browser). */
export function euro(n: number): string {
  return n.toLocaleString("de-DE", { style: "currency", currency: "EUR" });
}

/** Preis-Gedächtnis: zuletzt verwendeter Einzelpreis für denselben Kurztext
 *  (projektübergreifend) — Stammdaten light, ohne eigene Preisliste. */
export function preisVorschlag(db: DryTrackDB, kurztext: string): number | null {
  const gesucht = kurztext.trim().toLowerCase();
  if (!gesucht) return null;
  const treffer = db.leistungsposition
    .filter((p) => p.einzelpreis != null && p.kurztext.trim().toLowerCase() === gesucht)
    .sort((a, b) => (a.erstellt_am < b.erstellt_am ? 1 : -1));
  return treffer[0]?.einzelpreis ?? null;
}
