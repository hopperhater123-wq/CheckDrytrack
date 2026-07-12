import { useState } from "react";
import { useDB } from "../app/useStore";
import { useNav } from "../app/nav";
import { GERAET_STATUS_LABEL } from "../app/labels";
import type { GeraetStatus } from "../domain/types";

const FILTER: (GeraetStatus | "alle")[] = ["alle", "lager", "baustelle", "werkstatt"];

export function GeraeteListe() {
  const db = useDB();
  const nav = useNav();
  const [filter, setFilter] = useState<GeraetStatus | "alle">("alle");
  const [suche, setSuche] = useState("");

  const geraete = db.geraet
    .filter((g) => filter === "alle" || g.status === filter)
    .filter((g) => !suche || g.inventarnummer.toLowerCase().includes(suche.toLowerCase()))
    .sort((a, b) => a.inventarnummer.localeCompare(b.inventarnummer));

  const projektNummer = (pid: string | null) => pid ? db.projekt.find((p) => p.id === pid)?.projektnummer ?? "?" : null;

  return (
    <div className="screen">
      <h1>Geräte <span className="muted">({db.geraet.length})</span></h1>
      <input className="search" placeholder="Inventarnummer…" value={suche} onChange={(e) => setSuche(e.target.value)} />
      <div className="segmented">
        {FILTER.map((f) => (
          <button key={f} className={filter === f ? "seg active" : "seg"} onClick={() => setFilter(f)}>
            {f === "alle" ? "Alle" : GERAET_STATUS_LABEL[f]}
          </button>
        ))}
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
    </div>
  );
}
