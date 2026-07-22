// Positionsvorschlag für die Positionsauflistung (Aufmaß): regelbasiert aus dem,
// was Torrek schon weiß — Geräte-Einsätze, Trocknungsmethoden je Raum, gezeichnete
// Befunde (gezählte Bohrungen …), Stunden und Sanierungs-Maßnahmen.
// Vorschläge ERGÄNZEN nur (bestehende Positionen mit gleichem Kurztext+Raum werden
// übersprungen) und bleiben preisfrei — die Bewertung passiert im Büro (kein ERP).
// Flächen/Längen aus der Skizze sind NICHT ableitbar (Foto ohne Maßstab, F6-Vision).

import type { DryTrackDB, Leistungsposition } from "./types";
import { befundBereich, BEFUND_KAT_MAP } from "../app/labels";
import { einsatzTage } from "./einsatz";
import { arbeitszeitMin } from "./zeit";

export type PositionsVorschlag = Omit<Leistungsposition, "id" | "erstellt_von" | "erstellt_am">;

/** Gerätetyp-Bezeichnung → Trocknungs-Rolle (robust über Schlüsselwörter). */
function geraetRolle(bezeichnung: string): "daemmschicht" | "ventilator" | "raum" {
  const b = bezeichnung.toLowerCase();
  if (b.includes("turbine") || b.includes("seitenkanal")) return "daemmschicht";
  if (b.includes("ventilator") || b.includes("gebläse") || b.includes("geblaese") || b.includes("radial")) return "ventilator";
  return "raum"; // Kondensation/Adsorption/Heizer → Raumtrocknung
}

export function erzeugePositionsvorschlaege(db: DryTrackDB, projektId: string): PositionsVorschlag[] {
  const vorschlaege: PositionsVorschlag[] = [];
  const vorhanden = new Set(
    db.leistungsposition
      .filter((p) => p.projekt_id === projektId)
      .map((p) => `${p.kurztext}|${p.raum_id ?? ""}`),
  );
  const push = (v: Omit<PositionsVorschlag, "projekt_id">) => {
    const key = `${v.kurztext}|${v.raum_id ?? ""}`;
    if (vorhanden.has(key)) return;
    vorhanden.add(key);
    vorschlaege.push({ projekt_id: projektId, ...v });
  };
  // einzelpreis bleibt leer: bepreist wird im Büro (KVA-Modul), nicht vom Generator.
  const leer = { gewerk: "Trocknung", artikel_nr: null, langtext: null, aufmass_zeilen: [] as { bezug: string; formel: string }[], einzelpreis: null, bemerkung: null };

  // --- 1 · Geräte-Einsätze: die stärkste Quelle -------------------------------
  const einsaetze = db.einsatz.filter((e) => e.projekt_id === projektId);
  const typVon = (inv: string) => db.geraetetyp.find((t) => t.id === db.geraet.find((g) => g.inventarnummer === inv)?.geraetetyp_id);
  const proRaum = new Map<string, { rollen: Map<string, number>; maxTage: number }>();
  for (const e of einsaetze) {
    const rolle = geraetRolle(typVon(e.geraet_inventarnummer)?.bezeichnung ?? "");
    const key = e.raum_id ?? "";
    const eintrag = proRaum.get(key) ?? { rollen: new Map(), maxTage: 0 };
    eintrag.rollen.set(rolle, (eintrag.rollen.get(rolle) ?? 0) + 1);
    eintrag.maxTage = Math.max(eintrag.maxTage, einsatzTage(e));
    proRaum.set(key, eintrag);
  }
  const standzeitHinweis = (tage: number) =>
    tage > 28 ? `Standzeit ${tage} Tage — ab dem 29. Tag 15 % Aufschlag/Woche prüfen.` : `Standzeit bisher ${tage} Tage.`;
  for (const [raumId, info] of proRaum) {
    const raum = db.raum.find((r) => r.id === raumId);
    const flaeche = raum?.betroffene_flaeche_m2;
    if (info.rollen.has("daemmschicht")) {
      push({
        ...leer, kurztext: "Estrichdämmschicht-Trocknung", raum_id: raumId || null, einheit: "Stck", menge: 1,
        bemerkung: [standzeitHinweis(info.maxTage), flaeche ? `Betroffene Fläche lt. Raum: ${flaeche} m².` : null].filter(Boolean).join(" "),
      });
    }
    if (info.rollen.has("raum")) {
      push({
        ...leer, kurztext: "Raum-Trocknung", raum_id: raumId || null, einheit: "Stck", menge: 1,
        bemerkung: [standzeitHinweis(info.maxTage), flaeche ? `Betroffene Fläche lt. Raum: ${flaeche} m².` : null].filter(Boolean).join(" "),
      });
    }
    const ventilatoren = info.rollen.get("ventilator") ?? 0;
    if (ventilatoren > 0) {
      push({
        ...leer, kurztext: "Ventilator in Verbindung mit Raum-/Dämmschichttrocknung",
        raum_id: raumId || null, einheit: "Stck", menge: ventilatoren, bemerkung: standzeitHinweis(info.maxTage),
      });
    }
  }

  // --- 2 · Gezeichnete Befunde: zählbare Punkte, Linien als Merker ------------
  const grIds = new Set(db.grundriss.filter((g) => g.projekt_id === projektId).map((g) => g.id));
  const marks = db.grundriss_markierung.filter((m) => grIds.has(m.grundriss_id) && m.geometrie);
  const anzahl = (kat: string) => marks.filter((m) => m.kategorie === kat).length;
  const nKern = anzahl("kernbohrung");
  if (nKern > 0) push({ ...leer, kurztext: "Kernbohrungen", raum_id: null, einheit: "Stck", menge: nKern, bemerkung: "Anzahl aus der Plan-Zeichnung." });
  const nCera = anzahl("ceravogue_bohrung");
  if (nCera > 0) push({ ...leer, kurztext: "CeraVogue-Bohrung inkl. Einleger", raum_id: null, einheit: "Stck", menge: nCera, bemerkung: "Anzahl aus der Plan-Zeichnung." });
  const nAbschottung = anzahl("abschottung");
  if (nAbschottung > 0) push({ ...leer, kurztext: "Abschottung (Trocknung) erstellen", raum_id: null, einheit: "Stck", menge: nAbschottung, bemerkung: "Anzahl aus der Plan-Zeichnung." });
  const nSockel = anzahl("sockelleiste");
  if (nSockel > 0) push({
    ...leer, kurztext: "Sockelleiste (Holz, PVC, Textil) demontieren", gewerk: "Abbruch/Demontage",
    raum_id: null, einheit: "lfm", menge: null,
    bemerkung: `${nSockel} Linienzug/-züge auf dem Plan — Länge nachtragen (Skizze ohne Maßstab).`,
  });

  // --- 3 · Stunden aus den Besuchsberichten -----------------------------------
  const berichtIds = new Set(db.besuchsbericht.filter((b) => b.projekt_id === projektId).map((b) => b.id));
  const minuten = db.stunden_eintrag
    .filter((s) => berichtIds.has(s.besuchsbericht_id))
    .reduce((sum, s) => sum + (arbeitszeitMin(s.von, s.bis, s.pause_min) ?? 0), 0);
  if (minuten > 0) {
    const stunden = Math.round((minuten / 60) * 4) / 4; // auf Viertelstunden
    push({
      ...leer, kurztext: "Stundensatz Trocknungstechniker", raum_id: null, einheit: "Std", menge: stunden,
      bemerkung: "Summe aus den Besuchsberichten — nur Arbeiten ansetzen, die nicht in Positionen enthalten sind.",
    });
  }

  // --- 4 · Sanierungs-Maßnahmen (Wiederherstellung, je Kategorie einmal) ------
  const sanKategorien = new Set(
    marks.filter((m) => befundBereich(m.kategorie, m.zielgruppe) === "sanierung" && m.kategorie).map((m) => m.kategorie!),
  );
  for (const m of db.massnahme.filter((x) => x.projekt_id === projektId && x.kategorie)) sanKategorien.add(m.kategorie!);
  for (const kat of sanKategorien) {
    const label = BEFUND_KAT_MAP[kat]?.label;
    if (!label) continue;
    push({ ...leer, gewerk: "Wiederherstellung", kurztext: label, raum_id: null, einheit: "qm", menge: null, bemerkung: "Aus den Sanierungs-Maßnahmen — Aufmaß nachtragen." });
  }

  return vorschlaege;
}
