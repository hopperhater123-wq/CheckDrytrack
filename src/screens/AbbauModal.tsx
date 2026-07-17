import { useState } from "react";
import { Modal } from "../ui/motion";
import { useDB } from "../app/useStore";
import { useSession } from "../app/session";
import { store } from "../domain/store";
import { einsatzTage } from "../domain/einsatz";
import { fmtZahl } from "../app/format";
import { FotoErfassung } from "../ui/FotoErfassung";
import type { Einsatz } from "../domain/types";

// Geräte-Abbau (FR-EINSATZ-002/003): Endzählerstand ODER Fallback-Schätzung bei defektem Zähler.
export function AbbauModal({ einsatz, onClose }: { einsatz: Einsatz; onClose: () => void }) {
  const db = useDB();
  const { user } = useSession();
  const [defekt, setDefekt] = useState(false);
  const [endstand, setEndstand] = useState("");
  const [foto, setFoto] = useState<string | null>(null);
  const [notiz, setNotiz] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);

  const geraet = db.geraet.find((g) => g.inventarnummer === einsatz.geraet_inventarnummer);
  const typ = db.geraetetyp.find((t) => t.id === geraet?.geraetetyp_id);
  const tage = einsatzTage(einsatz);
  const kw = typ?.leistungswert_kw ?? 0;

  const endNum = parseFloat(endstand.replace(",", "."));
  const gemessen = !defekt && Number.isFinite(endNum) ? Math.max(0, endNum - einsatz.zaehlerstand_start) : null;
  const schaetzung = kw * tage * 24;

  const abbauen = () => {
    setFehler(null);
    const res = store.abbau({
      einsatz_id: einsatz.id,
      zaehlerstand_ende: defekt ? null : endNum,
      autor_id: user.id,
      foto_ende: foto,
      notiz,
    });
    if (!res.ok) { setFehler(res.error ?? "Fehler"); return; }
    onClose();
  };

  const gueltig = defekt || (Number.isFinite(endNum) && endNum >= einsatz.zaehlerstand_start);

  return (
    <Modal onClose={onClose}>
        <h2>Gerät abbauen</h2>
        <p className="muted small">{einsatz.geraet_inventarnummer} · {typ?.bezeichnung} · {tage} Einsatztage</p>

        <div className="readout">Startzählerstand: <strong>{fmtZahl(einsatz.zaehlerstand_start)} kWh</strong></div>

        <label className="toggle"><input type="checkbox" checked={defekt} onChange={(e) => setDefekt(e.target.checked)} /> Zähler defekt / unlesbar — Verbrauch schätzen (FR-EINSATZ-003)</label>

        {!defekt ? (
          <label className="field"><span>Endzählerstand (kWh)</span>
            <input inputMode="decimal" value={endstand} onChange={(e) => setEndstand(e.target.value)} placeholder="z. B. 1543,7" autoFocus />
          </label>
        ) : (
          <p className="muted small">
            Näherung: {tage} Tage × {fmtZahl(kw, 2)} kW × 24 h = <strong>{fmtZahl(schaetzung)} kWh</strong> — im Strombrief als Näherungswert ohne Gewähr gekennzeichnet.
          </p>
        )}

        <div className="readout accent">
          Verbrauch: <strong>{fmtZahl(defekt ? schaetzung : gemessen ?? 0)} kWh</strong>{defekt ? " (geschätzt)" : ""}
        </div>

        <FotoErfassung label="Zählerfoto Endstand (Beweis, optional)" wert={foto} onChange={setFoto} />
        <label className="field"><span>Notiz (optional)</span>
          <input value={notiz} onChange={(e) => setNotiz(e.target.value)} placeholder="z. B. Auffälligkeit beim Abbau" />
        </label>

        {fehler && <p className="error">{fehler}</p>}
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" onClick={abbauen} disabled={!gueltig}>Abbau bestätigen</button>
        </div>
      </Modal>
  );
}
