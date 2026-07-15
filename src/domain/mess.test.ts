import { describe, expect, it } from "vitest";
import { GKG_RICHTWERT, absoluteFeuchteGKg, bewerteMessung } from "./mess";
import type { Materialdatenbank, Messung } from "./types";

// Unit-Tests für die Bewertungslogik (012 · Testing) — alle vier Modelle
// inkl. Hygrometer-Sonderweg und der Magnus-Formel (FR-MESS-001/002/003).

const material = (patch: Partial<Materialdatenbank>): Materialdatenbank => ({
  id: "mat-test", bezeichnung: "Test", kategorie: null, trocknungsfaehig: true,
  austauschpflichtig: false, bewertungsmodell: "digit_grenzwert", praxisgrenzwert_digit: 50,
  schicht_typ: null, ...patch,
});

const messung = (patch: Partial<Messung>): Messung => ({
  id: "me-test", raum_id: "r-test", messpunkt_id: null, material_id: "mat-test",
  messverfahren: "widerstand", anzeige_digit: null, referenz_digit: null,
  status_checkliste: null, absolute_feuchte_g_kg: null, temperatur_c: null,
  rel_luftfeuchte_prozent: null, stroemung_m_s: null, messgeraet: null,
  anlass: "eingangsmessung", gemessen_von: "u-test", gemessen_am: "2026-07-15T08:00:00.000Z",
  ...patch,
});

describe("absoluteFeuchteGKg (Magnus-Formel, FR-MESS-003)", () => {
  it("liefert bekannte Referenzwerte", () => {
    // 20 °C / 50 % rF ≈ 7,3 g/kg; 27 °C / 75 % rF ≈ 17 g/kg (Alt-System-Frame: 16.90)
    expect(absoluteFeuchteGKg(20, 50)).toBeCloseTo(7.3, 0);
    expect(absoluteFeuchteGKg(27, 75)).toBeGreaterThan(16);
    expect(absoluteFeuchteGKg(27, 75)).toBeLessThan(18);
  });
  it("steigt monoton mit Temperatur und Feuchte", () => {
    expect(absoluteFeuchteGKg(25, 50)).toBeGreaterThan(absoluteFeuchteGKg(20, 50));
    expect(absoluteFeuchteGKg(20, 70)).toBeGreaterThan(absoluteFeuchteGKg(20, 50));
  });
});

describe("bewerteMessung · digit_grenzwert", () => {
  const estrich = material({ bewertungsmodell: "digit_grenzwert", praxisgrenzwert_digit: 50 });
  it("≤ Grenzwert → trocken", () => {
    expect(bewerteMessung(messung({ anzeige_digit: 50 }), estrich).bewertung).toBe("trocken");
  });
  it("bis 15 % über Grenzwert → grenzwertig", () => {
    expect(bewerteMessung(messung({ anzeige_digit: 54 }), estrich).bewertung).toBe("grenzwertig");
  });
  it("deutlich drüber → feucht", () => {
    expect(bewerteMessung(messung({ anzeige_digit: 78 }), estrich).bewertung).toBe("feucht");
  });
  it("ohne Wert → offen, als Praxisrichtwert markiert", () => {
    const b = bewerteMessung(messung({}), estrich);
    expect(b.bewertung).toBe("offen");
    expect(b.praxisrichtwert).toBe(true);
  });
});

describe("bewerteMessung · vergleichsmessung", () => {
  const fliese = material({ bewertungsmodell: "vergleichsmessung", praxisgrenzwert_digit: null });
  it("Δ ≤ 5 zur Referenz → trocken", () => {
    expect(bewerteMessung(messung({ anzeige_digit: 44, referenz_digit: 40 }), fliese).bewertung).toBe("trocken");
  });
  it("Δ ≤ 15 → grenzwertig, darüber feucht", () => {
    expect(bewerteMessung(messung({ anzeige_digit: 52, referenz_digit: 40 }), fliese).bewertung).toBe("grenzwertig");
    expect(bewerteMessung(messung({ anzeige_digit: 60, referenz_digit: 40 }), fliese).bewertung).toBe("feucht");
  });
  it("fehlende Referenz → offen", () => {
    expect(bewerteMessung(messung({ anzeige_digit: 52 }), fliese).bewertung).toBe("offen");
  });
});

describe("bewerteMessung · status_checkliste (KMF, FR-MESS-001)", () => {
  const kmf = material({ bewertungsmodell: "status_checkliste" });
  const checkliste = { trocken: false, feucht: false, kontaminiert: false, austausch_erforderlich: false };
  it("austausch_erforderlich schlägt alles", () => {
    expect(bewerteMessung(messung({ status_checkliste: { ...checkliste, feucht: true, austausch_erforderlich: true } }), kmf).bewertung).toBe("austausch");
  });
  it("kontaminiert vor feucht vor trocken", () => {
    expect(bewerteMessung(messung({ status_checkliste: { ...checkliste, kontaminiert: true, feucht: true } }), kmf).bewertung).toBe("kontaminiert");
    expect(bewerteMessung(messung({ status_checkliste: { ...checkliste, feucht: true } }), kmf).bewertung).toBe("feucht");
    expect(bewerteMessung(messung({ status_checkliste: { ...checkliste, trocken: true } }), kmf).bewertung).toBe("trocken");
  });
});

describe("bewerteMessung · hygrometer (materialunabhängig)", () => {
  it("bewertet über absolute Feuchte, auch ohne Material", () => {
    const b = bewerteMessung(messung({ messverfahren: "hygrometer", absolute_feuchte_g_kg: 6.2 }), undefined);
    expect(b.bewertung).toBe("trocken");
    expect(b.praxisrichtwert).toBe(true);
  });
  it("Richtwert-Kanten: ≤10 trocken, ≤11 grenzwertig, darüber feucht", () => {
    expect(bewerteMessung(messung({ messverfahren: "hygrometer", absolute_feuchte_g_kg: GKG_RICHTWERT }), undefined).bewertung).toBe("trocken");
    expect(bewerteMessung(messung({ messverfahren: "hygrometer", absolute_feuchte_g_kg: 10.8 }), undefined).bewertung).toBe("grenzwertig");
    expect(bewerteMessung(messung({ messverfahren: "hygrometer", absolute_feuchte_g_kg: 16.9 }), undefined).bewertung).toBe("feucht");
  });
  it("ohne °C/rF → offen", () => {
    expect(bewerteMessung(messung({ messverfahren: "hygrometer" }), undefined).bewertung).toBe("offen");
  });
  it("Hygrometer-Zweig greift auch mit gesetztem Material (Bohrloch an Putz)", () => {
    const putz = material({ bewertungsmodell: "digit_grenzwert", praxisgrenzwert_digit: 50 });
    const b = bewerteMessung(messung({ messverfahren: "hygrometer", absolute_feuchte_g_kg: 16.9 }), putz);
    expect(b.bewertung).toBe("feucht");
  });
});
