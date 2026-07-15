import { useState } from "react";
import { useDB } from "../app/useStore";
import { useNav } from "../app/nav";
import { store } from "../domain/store";
import { BEMUSTERUNG_ART_LABEL, BESTELLSTATUS_LABEL } from "../app/labels";
import { Icon } from "../ui/Icon";
import type { Bestellstatus } from "../domain/types";

// Projektübergreifende Bestellübersicht fürs Büro: Ersatzmaterial aller Projekte
// zentral einsehen und Status umschalten (erfasst wird weiter im Projekt).
type Filter = "offen" | Bestellstatus | "alle";
const STATUS_RANG: Record<Bestellstatus, number> = { ausgewaehlt: 0, bestellt: 1, geliefert: 2 };

export function BestellungenScreen() {
  const db = useDB();
  const nav = useNav();
  const [filter, setFilter] = useState<Filter>("offen");

  const alle = db.bemusterung
    .map((m) => ({ m, p: db.projekt.find((p) => p.id === m.projekt_id) }))
    .filter((x): x is { m: (typeof x)["m"]; p: NonNullable<(typeof x)["p"]> } => !!x.p && !x.p.storniert)
    .sort((a, b) =>
      STATUS_RANG[a.m.bestellstatus] - STATUS_RANG[b.m.bestellstatus]
      || a.p.projektnummer.localeCompare(b.p.projektnummer));

  const zaehl = (s: Bestellstatus) => alle.filter((x) => x.m.bestellstatus === s).length;
  const passt = (s: Bestellstatus) => filter === "alle" ? true : filter === "offen" ? s !== "geliefert" : s === filter;
  const liste = alle.filter((x) => passt(x.m.bestellstatus));

  const FILTER: [Filter, string, number][] = [
    ["offen", "Offen", zaehl("ausgewaehlt") + zaehl("bestellt")],
    ["ausgewaehlt", "Zu bestellen", zaehl("ausgewaehlt")],
    ["bestellt", "Bestellt", zaehl("bestellt")],
    ["geliefert", "Geliefert", zaehl("geliefert")],
    ["alle", "Alle", alle.length],
  ];

  return (
    <div className="screen">
      <h1>Bestellungen</h1>
      <p className="muted" style={{ marginTop: -4 }}>
        Ersatzmaterial aller Projekte. Status hier direkt umschalten — erfasst wird im Projekt (Berichte → Ersatzfliesen).
      </p>

      <div className="segmented" style={{ display: "flex", flexWrap: "wrap", marginBottom: 14 }}>
        {FILTER.map(([f, label, n]) => (
          <button key={f} type="button" className={filter === f ? "seg active" : "seg"} onClick={() => setFilter(f)}>
            {label}{n > 0 ? ` · ${n}` : ""}
          </button>
        ))}
      </div>

      <section className="card">
        {liste.length === 0
          ? <p className="muted small" style={{ margin: 0 }}>Nichts in dieser Ansicht. Ersatzmaterial legst du im Projekt unter „Berichte → Ersatzfliesen" an.</p>
          : <div className="muster-liste">
              {liste.map(({ m, p }) => (
                <div key={m.id} className="muster-row">
                  <span className="muster-mini muster-noimg"><Icon name="layers" size={16} /></span>
                  <button className="muster-main" onClick={() => nav({ name: "projekt", id: p.id })}
                    style={{ textAlign: "left", background: "none", border: "none", padding: 0, cursor: "pointer" }}>
                    <div className="muster-titel">{m.material_beschreibung}</div>
                    <div className="muted small">
                      {[BEMUSTERUNG_ART_LABEL[m.art], m.menge, m.lieferant, `${p.projektnummer} · ${p.bezeichnung}`].filter(Boolean).join(" · ")}
                    </div>
                  </button>
                  <select className="muster-status" value={m.bestellstatus} aria-label="Bestellstatus"
                    onChange={(e) => store.setBemusterungStatus(m.id, e.target.value as Bestellstatus)}>
                    {(Object.keys(BESTELLSTATUS_LABEL) as Bestellstatus[]).map((s) => <option key={s} value={s}>{BESTELLSTATUS_LABEL[s]}</option>)}
                  </select>
                </div>
              ))}
            </div>}
      </section>
    </div>
  );
}
