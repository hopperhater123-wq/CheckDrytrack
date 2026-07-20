import { useState } from "react";
import { useDB } from "../app/useStore";
import { useNav } from "../app/nav";
import { GERAET_STATUS_LABEL } from "../app/labels";
import { berechneVerbrauch } from "../domain/einsatz";
import { arbeitsmappeTeilen } from "../ui/tabelle";
import { Icon } from "../ui/Icon";
import { CameraScanner } from "../ui/CameraScanner";
import type { GeraetStatus } from "../domain/types";

const FILTER: (GeraetStatus | "alle")[] = ["alle", "lager", "baustelle", "werkstatt"];

export function GeraeteListe() {
  const db = useDB();
  const nav = useNav();
  const [filter, setFilter] = useState<GeraetStatus | "alle">("alle");
  const [suche, setSuche] = useState("");
  const [kamera, setKamera] = useState(false);

  // Scan aus der Geräteliste: gefundenes Gerät direkt öffnen, sonst als Suche übernehmen.
  const scanTreffer = (code: string) => {
    setKamera(false);
    const c = code.trim().toUpperCase();
    const g = db.geraet.find((x) => x.inventarnummer.toUpperCase() === c);
    if (g) nav({ name: "geraet", inv: g.inventarnummer });
    else setSuche(c);
  };

  const geraete = db.geraet
    .filter((g) => filter === "alle" || g.status === filter)
    .filter((g) => !suche || g.inventarnummer.toLowerCase().includes(suche.toLowerCase()))
    .sort((a, b) => a.inventarnummer.localeCompare(b.inventarnummer));

  const projektNummer = (pid: string | null) => pid ? db.projekt.find((p) => p.id === pid)?.projektnummer ?? "?" : null;
  const heute = new Date().toISOString().slice(0, 10);

  // Geräteliste (die „Datenbank") als echte Excel-Datei zum Teilen/Mailen.
  const exportGeraete = () => {
    const zeilen = db.geraet.slice().sort((a, b) => a.inventarnummer.localeCompare(b.inventarnummer)).map((g) => {
      const typ = db.geraetetyp.find((t) => t.id === g.geraetetyp_id);
      return [g.inventarnummer, typ?.bezeichnung ?? "", typ?.leistungswert_kw ?? "", GERAET_STATUS_LABEL[g.status],
        projektNummer(g.aktuelles_projekt_id) ?? "", g.eigentum === "gemietet" ? "gemietet" : "eigen",
        g.e_check_datum ? new Date(g.e_check_datum).toLocaleDateString("de-DE") : ""];
    });
    return arbeitsmappeTeilen(`Torrek-Geraeteliste-${heute}.xlsx`, {
      blattname: "Geräte",
      titel: "Torrek — Geräteliste (Inventar)",
      kopfzeilen: [["Datum:", new Date().toLocaleDateString("de-DE")], ["Geräte:", db.geraet.length]],
      spalten: ["Inventarnummer", "Gerätetyp", "Leistung kW", "Status", "Aktuelles Projekt", "Eigentum", "E-Check"],
      zeilen,
      breiten: [16, 24, 12, 12, 16, 10, 12],
    }, "Torrek Geräteliste");
  };

  // Einsätze (Aufbau/Abbau mit kWh + Verbrauch) als echte Excel-Datei.
  const exportEinsaetze = () => {
    const zeilen = db.einsatz.slice().sort((a, b) => (a.aufbau_datum < b.aufbau_datum ? 1 : -1)).map((e) => {
      const g = db.geraet.find((x) => x.inventarnummer === e.geraet_inventarnummer);
      const typ = g ? db.geraetetyp.find((t) => t.id === g.geraetetyp_id) : undefined;
      const p = db.projekt.find((x) => x.id === e.projekt_id);
      const raum = e.raum_id ? db.raum.find((r) => r.id === e.raum_id)?.bezeichnung ?? "" : "";
      const v = g ? berechneVerbrauch(e, g, typ) : null;
      return [e.geraet_inventarnummer, typ?.bezeichnung ?? "", p?.projektnummer ?? "", raum,
        new Date(e.aufbau_datum).toLocaleDateString("de-DE"), e.zaehlerstand_start,
        e.abbau_datum ? new Date(e.abbau_datum).toLocaleDateString("de-DE") : "", e.zaehlerstand_ende ?? "",
        v ? Math.round(v.verbrauch) : "", v ? (v.geschaetzt ? "ja" : "nein") : "", e.abbau_datum ? "abgebaut" : "läuft"];
    });
    return arbeitsmappeTeilen(`Torrek-Einsaetze-${heute}.xlsx`, {
      blattname: "Einsätze",
      titel: "Torrek — Einsätze (Aufbau/Abbau)",
      kopfzeilen: [["Datum:", new Date().toLocaleDateString("de-DE")], ["Einsätze:", db.einsatz.length]],
      spalten: ["Inventarnummer", "Gerätetyp", "Projekt", "Raum", "Aufbau", "Start kWh", "Abbau", "Ende kWh", "Verbrauch kWh", "geschätzt", "Status"],
      zeilen,
      breiten: [16, 22, 12, 14, 12, 11, 12, 11, 15, 10, 10],
    }, "Torrek Einsätze");
  };

  return (
    <div className="screen">
      <h1>Geräte <span className="muted">({db.geraet.length})</span></h1>
      <div className="inline-add">
        <input className="search" placeholder="Inventarnummer…" value={suche} onChange={(e) => setSuche(e.target.value)} />
        <button className="btn" onClick={() => setKamera(true)} aria-label="Gerät scannen"><Icon name="scan" size={18} /></button>
      </div>
      <div className="segmented">
        {FILTER.map((f) => (
          <button key={f} className={filter === f ? "seg active" : "seg"} onClick={() => setFilter(f)}>
            {f === "alle" ? "Alle" : GERAET_STATUS_LABEL[f]}
          </button>
        ))}
      </div>
      <div className="btn-row" style={{ margin: "2px 0 14px" }}>
        <button className="btn btn-sm" onClick={() => void exportGeraete()}><Icon name="fileText" size={15} /> Geräteliste (Excel)</button>
        <button className="btn btn-sm" onClick={() => void exportEinsaetze()} disabled={db.einsatz.length === 0}><Icon name="fileText" size={15} /> Einsätze (kWh)</button>
      </div>

      {geraete.map((g) => {
        const typ = db.geraetetyp.find((t) => t.id === g.geraetetyp_id);
        return (
          <button key={g.inventarnummer} className="listrow" onClick={() => nav({ name: "geraet", inv: g.inventarnummer })}>
            <div className="listrow-main">
              <span className="listrow-title">{g.inventarnummer}</span>
              <span className="listrow-sub">{typ?.bezeichnung}{g.eigentum === "gemietet" ? " · gemietet" : ""}</span>
            </div>
            <div className="listrow-side">
              <span className={`chip dot-chip dot-${g.status}`}>{GERAET_STATUS_LABEL[g.status]}</span>
              {g.aktuelles_projekt_id && <span className="muted small">{projektNummer(g.aktuelles_projekt_id)}</span>}
            </div>
          </button>
        );
      })}
      {geraete.length === 0 && <p className="muted">Keine Geräte.</p>}

      {kamera && <CameraScanner onClose={() => setKamera(false)} onDetect={scanTreffer} />}
    </div>
  );
}
