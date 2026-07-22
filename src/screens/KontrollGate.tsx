import { useState } from "react";
import { Modal } from "../ui/motion";
import { store } from "../domain/store";
import type { KontrollErgebnis, Termin } from "../domain/types";

// Entscheidungs-Gate für Kontrolltermine (F8): „In 2 Wochen schauen" endet nicht
// mit einem Häkchen, sondern mit einer Entscheidung — Erfolg (Freimessung/Abbau
// planen), verlängern oder Methode ändern (z. B. Latex ankratzen, auf Adsorption
// umstellen). Die Entscheidung landet im Projekt-Feed (Nachvollziehbarkeit).
const OPTIONEN: { ergebnis: KontrollErgebnis; titel: string; sub: string }[] = [
  { ergebnis: "erfolg", titel: "Erfolg — trocken", sub: "Messwerte gut → Freimessung/Abbau planen." },
  { ergebnis: "verlaengern", titel: "Verlängern", sub: "Noch zu feucht → Trocknung läuft weiter, neuen Kontrolltermin setzen." },
  { ergebnis: "methode_aendern", titel: "Methode ändern", sub: "So wird das nichts → z. B. Latex ankratzen, auf Adsorption/Folientunnel umstellen." },
];

export function KontrollGate({ termin, userId, onClose }: { termin: Termin; userId: string; onClose: () => void }) {
  const [notiz, setNotiz] = useState("");
  const entscheiden = (ergebnis: KontrollErgebnis) => {
    store.setKontrollErgebnis({ termin_id: termin.id, ergebnis, notiz, autor_id: userId });
    onClose();
  };
  return (
    <Modal onClose={onClose}>
      <h2>Kontrolle — wie geht es weiter?</h2>
      <p className="muted small">{termin.beschreibung} · Die Entscheidung wird im Projekt-Feed protokolliert.</p>
      <div className="kontroll-optionen">
        {OPTIONEN.map((o) => (
          <button key={o.ergebnis} type="button" className="kontroll-option" onClick={() => entscheiden(o.ergebnis)}>
            <span className="kontroll-titel">{o.titel}</span>
            <span className="muted small">{o.sub}</span>
          </button>
        ))}
      </div>
      <label className="field" style={{ marginTop: 10 }}><span>Notiz (optional)</span>
        <input value={notiz} onChange={(e) => setNotiz(e.target.value)} placeholder='z. B. "Wand Nord noch 74 Digits — Latex ankratzen"' />
      </label>
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>Später entscheiden</button>
      </div>
    </Modal>
  );
}

/** Braucht dieser Termin beim Erledigen das Gate? */
export function brauchtKontrollGate(t: Termin): boolean {
  return !!t.kontrolle && !t.kontrolle_ergebnis;
}
