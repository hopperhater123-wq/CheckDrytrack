import { useState } from "react";
import { Modal, AnimatePresence } from "../ui/motion";
import { useDB } from "../app/useStore";
import { store } from "../domain/store";
import { fmtDatum, fmtZahl } from "../app/format";
import { GESCHOSSE } from "../app/labels";
import { Icon } from "../ui/Icon";
import type { Grundriss, Raum } from "../domain/types";

// Grundriss/Skizze JE GESCHOSS (Backlog ⑤; Alt-System zeigte Skizzen pro Keller/EG/OG/DG).
// 007 AI Spec: primär Import aus MagicPlan (FR-KI-004), sonst Skizze/Foto (FR-KI-005).
export function GrundrissTab({ projektId, userId }: { projektId: string; userId: string }) {
  const db = useDB();
  const raeume = db.raum.filter((r) => r.projekt_id === projektId);
  const grundrisse = db.grundriss.filter((g) => g.projekt_id === projektId);
  const [neuFuer, setNeuFuer] = useState<string | null>(null); // grundriss_id
  const [addGeschoss, setAddGeschoss] = useState(GESCHOSSE[1]); // Default EG

  // Anzuzeigende Geschosse: aus Räumen + vorhandenen Skizzen, in fester Reihenfolge.
  const vorhanden = new Set<string>();
  raeume.forEach((r) => r.geschoss && vorhanden.add(r.geschoss));
  grundrisse.forEach((g) => g.geschoss && vorhanden.add(g.geschoss));
  const geschosse = GESCHOSSE.filter((g) => vorhanden.has(g));
  const nochOffen = GESCHOSSE.filter((g) => !vorhanden.has(g));

  return (
    <section className="card">
      <div className="card-head">
        <h2>Grundriss / Skizzen</h2>
        <span className="muted small">je Geschoss</span>
      </div>

      {geschosse.length === 0 && (
        <p className="muted small">Noch kein Geschoss erfasst. Unten ein Geschoss wählen und Skizze/MagicPlan hinzufügen.</p>
      )}

      {geschosse.map((geschoss) => {
        const g = grundrisse.find((x) => x.geschoss === geschoss);
        return (
          <GeschossBlock
            key={geschoss} projektId={projektId} geschoss={geschoss} grundriss={g}
            raeume={raeume.filter((r) => r.geschoss === geschoss)}
            markierungen={g ? db.grundriss_markierung.filter((m) => m.grundriss_id === g.id) : []}
            benutzerName={(uid) => db.benutzer.find((b) => b.id === uid)?.name ?? "?"}
            raumName={(rid) => (rid ? db.raum.find((r) => r.id === rid)?.bezeichnung ?? "?" : "ganzer Plan")}
            onMarkierung={() => g && setNeuFuer(g.id)}
          />
        );
      })}

      {/* Weiteres Geschoss hinzufügen */}
      {nochOffen.length > 0 && (
        <div className="inline-add" style={{ marginTop: 14 }}>
          <select value={addGeschoss} onChange={(e) => setAddGeschoss(e.target.value)}>
            {nochOffen.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
          <button className="btn btn-sm" onClick={() => store.setGrundriss(projektId, addGeschoss, "magicplan", `magicplan://${projektId}/${addGeschoss}.pdf`)}>
            <Icon name="plus" size={14} /> Geschoss
          </button>
        </div>
      )}

      <AnimatePresence>
        {neuFuer && (
          <MarkierungForm grundrissId={neuFuer} raeume={raeume} userId={userId} onClose={() => setNeuFuer(null)} />
        )}
      </AnimatePresence>
    </section>
  );
}

function GeschossBlock({ projektId, geschoss, grundriss, raeume, markierungen, benutzerName, raumName, onMarkierung }: {
  projektId: string; geschoss: string; grundriss: Grundriss | undefined; raeume: Raum[];
  markierungen: import("../domain/types").GrundrissMarkierung[];
  benutzerName: (uid: string) => string; raumName: (rid: string | null) => string; onMarkierung: () => void;
}) {
  return (
    <div className="geschoss-block">
      <div className="geschoss-head">
        <span className="geschoss-name">{geschoss}</span>
        {grundriss
          ? <span className="chip small chip-neutral">{grundriss.quelle === "magicplan" ? "MagicPlan" : "Skizze/Foto"}</span>
          : <span className="muted small">{raeume.length} {raeume.length === 1 ? "Raum" : "Räume"}</span>}
      </div>

      {!grundriss ? (
        <div className="quickpick">
          <button className="btn btn-primary btn-sm" onClick={() => store.setGrundriss(projektId, geschoss, "magicplan", `magicplan://${projektId}/${geschoss}.pdf`)}>
            <Icon name="layers" size={15} /> MagicPlan
          </button>
          <button className="btn btn-sm" onClick={() => store.setGrundriss(projektId, geschoss, "skizze_foto", `storage://${projektId}/${geschoss}-skizze.jpg`)}>Skizze / Foto</button>
        </div>
      ) : (
        <>
          <div className="grundriss-canvas" style={{ minHeight: 120 }}>
            <div className="grundriss-empty">
              <Icon name="map" size={26} />
              <span className="muted small">{grundriss.datei_referenz}</span>
              <span className="muted small">importiert am {fmtDatum(grundriss.erstellt_am)}</span>
            </div>
          </div>

          <div className="rhm-row">
            <label className="field" style={{ margin: 0, flex: 1 }}><span>Raumhöhe (RHM, m)</span>
              <input inputMode="decimal" defaultValue={grundriss.raumhoehe_m ?? ""} placeholder="z. B. 2,43"
                onBlur={(e) => { const n = parseFloat(e.target.value.replace(",", ".")); store.setGrundrissRaumhoehe(grundriss.id, Number.isFinite(n) ? n : null); }} />
            </label>
            {grundriss.raumhoehe_m != null && <span className="muted small" style={{ alignSelf: "end", paddingBottom: 10 }}>{fmtZahl(grundriss.raumhoehe_m, 3)} m</span>}
          </div>

          <div className="card-head" style={{ marginTop: 4 }}>
            <h3 style={{ margin: 0 }}>Markierungen <span className="count">{markierungen.length}</span></h3>
            <button className="btn btn-sm" onClick={onMarkierung}><Icon name="plus" size={14} /> Markierung</button>
          </div>
          {markierungen.length === 0 && <p className="muted small">Hinweise für Sanierer/Trocknungsmonteur hier verorten (FR-PROJ-025).</p>}
          {markierungen.map((m) => (
            <div key={m.id} className="mark">
              <span className={`mark-pin ${m.zielgruppe}`}>{m.zielgruppe === "sanierer" ? "S" : "T"}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: ".9rem" }}>{m.text}</div>
                <div className="muted small">{raumName(m.raum_id)} · für {m.zielgruppe === "sanierer" ? "Sanierer" : "Trocknungsmonteur"} · {benutzerName(m.erstellt_von)}</div>
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}

function MarkierungForm({ grundrissId, raeume, userId, onClose }: {
  grundrissId: string; raeume: Raum[]; userId: string; onClose: () => void;
}) {
  const [zielgruppe, setZielgruppe] = useState<"sanierer" | "trocknungsmonteur">("trocknungsmonteur");
  const [raumId, setRaumId] = useState("");
  const [text, setText] = useState("");

  const speichern = () => {
    if (!text.trim()) return;
    store.addMarkierung({ grundriss_id: grundrissId, raum_id: raumId || null, zielgruppe, text: text.trim(), erstellt_von: userId });
    onClose();
  };

  return (
    <Modal onClose={onClose}>
        <h2>Markierung hinzufügen</h2>
        <label className="field"><span>Für wen?</span>
          <div className="segmented" style={{ display: "flex" }}>
            <button type="button" className={zielgruppe === "trocknungsmonteur" ? "seg active" : "seg"} onClick={() => setZielgruppe("trocknungsmonteur")}>Trocknungsmonteur</button>
            <button type="button" className={zielgruppe === "sanierer" ? "seg active" : "seg"} onClick={() => setZielgruppe("sanierer")}>Sanierer</button>
          </div>
        </label>
        <label className="field"><span>Raum (optional)</span>
          <select value={raumId} onChange={(e) => setRaumId(e.target.value)}>
            <option value="">— ganzer Plan —</option>
            {raeume.map((r) => <option key={r.id} value={r.id}>{r.bezeichnung}</option>)}
          </select>
        </label>
        <label className="field"><span>Hinweis</span>
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder='z. B. "hier malern + Isolierung"' autoFocus />
        </label>
        <div className="modal-actions">
          <button className="btn" onClick={onClose}>Abbrechen</button>
          <button className="btn btn-primary" onClick={speichern} disabled={!text.trim()}>Speichern</button>
        </div>
      </Modal>
  );
}
