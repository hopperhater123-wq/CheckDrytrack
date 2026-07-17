import { useState } from "react";
import { Modal } from "../ui/motion";
import { useSession } from "../app/session";
import { store } from "../domain/store";
import { fmtZahl } from "../app/format";
import type { Einsatz } from "../domain/types";

// Zählerstand-Korrektur (Tippfehler im Feld — Lücke, die auch „Torrek Scan" hatte).
// Start immer korrigierbar; Ende nur bei abgebautem Einsatz. Trägt man bei einer
// Schätzung (Zähler defekt) nachträglich einen Endstand ein, wird daraus ein Messwert.
export function KorrekturModal({ einsatz, onClose }: { einsatz: Einsatz; onClose: () => void }) {
  const { user } = useSession();
  const [start, setStart] = useState(String(einsatz.zaehlerstand_start).replace(".", ","));
  const [ende, setEnde] = useState(einsatz.zaehlerstand_ende !== null ? String(einsatz.zaehlerstand_ende).replace(".", ",") : "");
  const [fehler, setFehler] = useState<string | null>(null);

  const abgebaut = einsatz.abbau_datum !== null;
  const startNum = parseFloat(start.replace(",", "."));
  const endeNum = ende.trim() === "" ? null : parseFloat(ende.replace(",", "."));
  const gueltig = Number.isFinite(startNum) && startNum >= 0
    && (endeNum === null || (Number.isFinite(endeNum) && endeNum >= startNum));

  const speichern = () => {
    setFehler(null);
    const res = store.korrigiereEinsatz({
      einsatz_id: einsatz.id,
      zaehlerstand_start: startNum,
      zaehlerstand_ende: abgebaut ? endeNum : undefined,
      autor_id: user.id,
    });
    if (!res.ok) { setFehler(res.error ?? "Fehler"); return; }
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <h2>Zählerstand korrigieren</h2>
      <p className="muted small">
        {einsatz.geraet_inventarnummer} · bisher Start {fmtZahl(einsatz.zaehlerstand_start)} kWh
        {abgebaut && ` · Ende ${einsatz.zaehlerstand_ende !== null ? `${fmtZahl(einsatz.zaehlerstand_ende)} kWh` : "geschätzt"}`}
      </p>

      <label className="field"><span>Startzählerstand (kWh)</span>
        <input inputMode="decimal" value={start} onChange={(e) => setStart(e.target.value)} autoFocus />
      </label>
      {abgebaut && (
        <label className="field"><span>Endzählerstand (kWh){einsatz.verbrauch_geschaetzt ? " — leer = Schätzung beibehalten" : ""}</span>
          <input inputMode="decimal" value={ende} onChange={(e) => setEnde(e.target.value)} placeholder={einsatz.verbrauch_geschaetzt ? "z. B. 1543,7" : undefined} />
        </label>
      )}
      <p className="muted small">Die Korrektur wird im Projekt-Feed protokolliert (alt → neu).</p>

      {fehler && <p className="error">{fehler}</p>}
      <div className="modal-actions">
        <button className="btn" onClick={onClose}>Abbrechen</button>
        <button className="btn btn-primary" onClick={speichern} disabled={!gueltig}>Korrektur speichern</button>
      </div>
    </Modal>
  );
}
