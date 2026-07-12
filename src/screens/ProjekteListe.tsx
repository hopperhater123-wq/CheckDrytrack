import { useState } from "react";
import { useDB } from "../app/useStore";
import { useSession } from "../app/session";
import { useNav } from "../app/nav";
import { store } from "../domain/store";
import { PROJEKT_STATUS_LABEL } from "../app/labels";
import { istLaufend } from "../domain/einsatz";

export function ProjekteListe() {
  const db = useDB();
  const { user, can } = useSession();
  const nav = useNav();
  const [suche, setSuche] = useState("");
  const [zeigeArchiv, setZeigeArchiv] = useState(false);
  const [neu, setNeu] = useState(false);

  const projekte = db.projekt
    .filter((p) => zeigeArchiv || (p.status !== "abgeschlossen" && !p.storniert))
    .filter((p) => {
      const q = suche.toLowerCase();
      return !q || p.projektnummer.toLowerCase().includes(q) || p.bezeichnung.toLowerCase().includes(q) || p.adresse.toLowerCase().includes(q);
    })
    .sort((a, b) => (a.angelegt_am < b.angelegt_am ? 1 : -1));

  return (
    <div className="screen">
      <div className="screen-head">
        <h1>Projekte</h1>
        {can.projektAnlegen && <button className="btn btn-primary" onClick={() => setNeu(true)}>+ Neu</button>}
      </div>

      <input className="search" placeholder="Projektnummer, Kunde oder Adresse…" value={suche} onChange={(e) => setSuche(e.target.value)} />
      <label className="toggle"><input type="checkbox" checked={zeigeArchiv} onChange={(e) => setZeigeArchiv(e.target.checked)} /> Abgeschlossene/stornierte anzeigen</label>

      {projekte.length === 0 && <p className="muted">Keine Projekte gefunden.</p>}
      {projekte.map((p) => {
        const geraete = db.einsatz.filter((e) => e.projekt_id === p.id && istLaufend(e)).length;
        return (
          <button key={p.id} className="listrow" onClick={() => nav({ name: "projekt", id: p.id })}>
            <div className="listrow-main">
              <span className="listrow-title">{p.projektnummer} · {p.bezeichnung}</span>
              <span className="listrow-sub">{p.adresse}</span>
            </div>
            <div className="listrow-side">
              <span className={`chip status-${p.status}`}>{PROJEKT_STATUS_LABEL[p.status]}</span>
              {geraete > 0 && <span className="muted small">{geraete} Geräte laufen</span>}
              {p.storniert && <span className="chip chip-danger">storniert</span>}
            </div>
          </button>
        );
      })}

      {neu && <NeuesProjekt onClose={() => setNeu(false)} onCreated={(id) => { setNeu(false); nav({ name: "projekt", id }); }} userId={user.id} />}
    </div>
  );
}

function NeuesProjekt({ onClose, onCreated, userId }: { onClose: () => void; onCreated: (id: string) => void; userId: string }) {
  const [bezeichnung, setBezeichnung] = useState("");
  const [adresse, setAdresse] = useState("");
  const [erst, setErst] = useState(false);

  const submit = () => {
    if (!bezeichnung.trim() || !adresse.trim()) return;
    const p = store.createProjekt({ bezeichnung: bezeichnung.trim(), adresse: adresse.trim(), ist_erstmassnahme: erst, angelegt_von: userId });
    onCreated(p.id);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <h2>Neues Projekt</h2>
        <p className="muted small">Projektnummer (JJJJ-NNNN) wird automatisch vergeben.</p>
        <label className="field"><span>Bezeichnung (Kunde / Schaden)</span>
          <input value={bezeichnung} onChange={(e) => setBezeichnung(e.target.value)} placeholder="z. B. Wasserschaden Küche — Fam. …" autoFocus />
        </label>
        <label className="field"><span>Adresse</span>
          <input value={adresse} onChange={(e) => setAdresse(e.target.value)} placeholder="Straße Nr, PLZ Ort" />
        </label>
        <label className="toggle"><input type="checkbox" checked={erst} onChange={(e) => setErst(e.target.checked)} /> Erstmaßnahme (FR-PROJ-027)</label>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" onClick={submit} disabled={!bezeichnung.trim() || !adresse.trim()}>Anlegen</button>
        </div>
      </div>
    </div>
  );
}
