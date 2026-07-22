import { describe, expect, it } from "vitest";
import { euro, kvaSummen, positionsGesamt, preisVorschlag } from "./kva";
import { seedDB } from "./seed";
import type { Leistungsposition } from "./types";

// KVA-Modul (PO-Entscheidung 22.07.2026): Preise nur fürs Büro, Summen mit 19 % USt.
const pos = (teil: Partial<Leistungsposition>): Leistungsposition => ({
  id: "lp-t", projekt_id: "p-1", gewerk: "Trocknung", artikel_nr: null,
  kurztext: "Raum-Trocknung", langtext: null, raum_id: null, einheit: "Stck",
  aufmass_zeilen: [], menge: 1, einzelpreis: null, bemerkung: null,
  erstellt_von: "u-dispo", erstellt_am: "2026-07-22T08:00:00.000Z", ...teil,
});

describe("positionsGesamt", () => {
  it("rechnet Menge × Einzelpreis auf Cent gerundet", () => {
    expect(positionsGesamt(pos({ menge: 18.3, einzelpreis: 12.5 }))).toBe(228.75);
    expect(positionsGesamt(pos({ menge: 3, einzelpreis: 0.333 }))).toBe(1);
  });
  it("ist null ohne Preis oder ohne Menge", () => {
    expect(positionsGesamt(pos({ menge: null, einzelpreis: 10 }))).toBeNull();
    expect(positionsGesamt(pos({ menge: 2, einzelpreis: null }))).toBeNull();
  });
});

describe("kvaSummen", () => {
  it("summiert Netto, USt und Brutto und zählt offene Positionen", () => {
    const s = kvaSummen([
      pos({ menge: 2, einzelpreis: 100 }),
      pos({ menge: 11.5, einzelpreis: 58 }),
      pos({ menge: null, einzelpreis: 20 }), // lfm ohne Aufmaß → offen
    ]);
    expect(s.netto).toBe(867);
    expect(s.mwst).toBeCloseTo(164.73, 2);
    expect(s.brutto).toBeCloseTo(1031.73, 2);
    expect(s.bewertet).toBe(2);
    expect(s.offen).toBe(1);
  });
});

describe("preisVorschlag", () => {
  it("liefert den zuletzt verwendeten Preis für denselben Kurztext (projektübergreifend)", () => {
    const db = seedDB();
    db.leistungsposition.push(
      pos({ id: "lp-a", projekt_id: "p-2", einzelpreis: 95, erstellt_am: "2026-07-01T08:00:00.000Z" }),
      pos({ id: "lp-b", projekt_id: "p-1", einzelpreis: 99, erstellt_am: "2026-07-20T08:00:00.000Z" }),
    );
    expect(preisVorschlag(db, " raum-trocknung ")).toBe(99);
    expect(preisVorschlag(db, "Unbekannte Position")).toBeNull();
  });
});

describe("euro", () => {
  it("formatiert de-DE mit €-Zeichen", () => {
    expect(euro(1234.5).replace(/ /g, " ")).toBe("1.234,50 €");
  });
});
