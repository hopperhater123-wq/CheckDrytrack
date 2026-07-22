// KVA-Modul: Kostenvoranschlag aus der Positionsauflistung.
// PO-Entscheidung 22.07.2026 (plancraft-Vergleich): Die „kein ERP"-Grenze wird gezielt
// verschoben — Torrek darf ein KVA (Angebot) mit Preisen erstellen. Rechnungen,
// Mahnwesen und Buchhaltung bleiben weiterhin draußen (Bürosoftware).
// Preise sieht und pflegt ausschließlich das Büro (rolle !== "monteur").

import type { DryTrackDB, Kva, KvaPosition, Leistungsposition, Projekt } from "./types";
import { arbeitszeitMin } from "./zeit";

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

/** Snapshot der aktuellen Positionsauflistung fürs Festschreiben eines KVA.
 *  Raumnamen werden als Text kopiert — spätere Umbenennungen ändern das Angebot nicht. */
export function erstelleKvaSnapshot(db: DryTrackDB, projektId: string): Pick<Kva, "positionen" | "netto" | "mwst" | "brutto"> {
  const quelle = db.leistungsposition.filter((p) => p.projekt_id === projektId);
  const positionen: KvaPosition[] = quelle.map((p) => ({
    gewerk: p.gewerk, artikel_nr: p.artikel_nr, kurztext: p.kurztext, langtext: p.langtext,
    raum: p.raum_id ? db.raum.find((r) => r.id === p.raum_id)?.bezeichnung ?? null : null,
    menge: p.menge, einheit: p.einheit, einzelpreis: p.einzelpreis, gesamt: positionsGesamt(p),
  }));
  const s = kvaSummen(quelle);
  return { positionen, netto: s.netto, mwst: s.mwst, brutto: s.brutto };
}

/** Laufende KVA-Nummer je Projekt (1, 2, 3 …). */
export function naechsteKvaNummer(db: DryTrackDB, projektId: string): number {
  return db.kva.filter((k) => k.projekt_id === projektId).reduce((max, k) => Math.max(max, k.nummer), 0) + 1;
}

/** Anzeige-Nummer, z. B. "KVA-2026-0142-02". */
export function kvaNummerText(projekt: Projekt, kva: Pick<Kva, "nummer">): string {
  return `KVA-${projekt.projektnummer}-${String(kva.nummer).padStart(2, "0")}`;
}

/** Nachkalkulation light: erfasste Arbeitsminuten aus allen Besuchsberichten des Projekts. */
export function erfassteStundenMin(db: DryTrackDB, projektId: string): number {
  const berichtIds = new Set(db.besuchsbericht.filter((b) => b.projekt_id === projektId).map((b) => b.id));
  return db.stunden_eintrag
    .filter((s) => berichtIds.has(s.besuchsbericht_id))
    .reduce((sum, s) => sum + (arbeitszeitMin(s.von, s.bis, s.pause_min) ?? 0), 0);
}

/** Summe der Std-Positionen im Aufmaß (Gegenstück zu den erfassten Stunden). */
export function aufmassStunden(positionen: Leistungsposition[]): number {
  return positionen.filter((p) => p.einheit === "Std" && p.menge != null).reduce((sum, p) => sum + p.menge!, 0);
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
