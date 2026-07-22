import { describe, expect, it } from "vitest";
import { seedDB } from "./seed";
import { erzeugePositionsvorschlaege } from "./positionsvorschlag";

// Regelbasierte Positions-Vorschläge auf den Seed-Daten (Projekt p-1:
// 2 Kondenstrockner in Küche/Flur, 1 Seitenkanalturbine in der Küche,
// Besuchsbericht mit 2 Stunden-Einträgen à 6h/5,5h).
describe("erzeugePositionsvorschlaege", () => {
  it("leitet Raum-/Dämmschicht-Trocknung aus den Geräte-Einsätzen ab", () => {
    const db = seedDB();
    const v = erzeugePositionsvorschlaege(db, "p-1");
    const kuerzel = v.map((x) => `${x.kurztext}@${x.raum_id}`);
    expect(kuerzel).toContain("Raum-Trocknung@r-1");
    expect(kuerzel).toContain("Raum-Trocknung@r-2");
    expect(kuerzel).toContain("Estrichdämmschicht-Trocknung@r-1");
  });
  it("summiert Stunden aus den Besuchsberichten (11,5 h)", () => {
    const db = seedDB();
    const std = erzeugePositionsvorschlaege(db, "p-1").find((x) => x.kurztext.includes("Stundensatz"));
    expect(std?.menge).toBe(11.5);
    expect(std?.einheit).toBe("Std");
  });
  it("überspringt bereits vorhandene Positionen (gleicher Kurztext + Raum)", () => {
    const db = seedDB();
    db.leistungsposition.push({
      id: "lp-x", projekt_id: "p-1", gewerk: "Trocknung", artikel_nr: null,
      kurztext: "Raum-Trocknung", langtext: null, raum_id: "r-1", einheit: "Stck",
      aufmass_zeilen: [], menge: 1, bemerkung: null, erstellt_von: "u-dispo", erstellt_am: "x",
    });
    const kuerzel = erzeugePositionsvorschlaege(db, "p-1").map((x) => `${x.kurztext}@${x.raum_id}`);
    expect(kuerzel).not.toContain("Raum-Trocknung@r-1");
    expect(kuerzel).toContain("Raum-Trocknung@r-2");
  });
  it("zählt gezeichnete Bohrungen vom Plan", () => {
    const db = seedDB();
    db.grundriss.push({ id: "gr-x", projekt_id: "p-1", geschoss: "EG", quelle: "skizze_foto", datei_referenz: "data:", raumhoehe_m: null, erstellt_am: "x" });
    for (let i = 0; i < 3; i++) db.grundriss_markierung.push({
      id: `gm-${i}`, grundriss_id: "gr-x", raum_id: null, zielgruppe: "trocknungsmonteur",
      art: "hinweis", kategorie: "kernbohrung", status: "offen", geometrie: '{"form":"punkt","x":0.5,"y":0.5}',
      text: "Kernbohrloch", erstellt_von: "u-dispo", erstellt_am: "x",
    });
    const kern = erzeugePositionsvorschlaege(db, "p-1").find((x) => x.kurztext === "Kernbohrungen");
    expect(kern?.menge).toBe(3);
  });
});
