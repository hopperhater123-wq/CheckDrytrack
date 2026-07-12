import { useState } from "react";
import { useDB } from "../app/useStore";
import { store } from "../domain/store";
import { fmtDatum } from "../app/format";
import { Icon } from "../ui/Icon";

// Grundriss (007 AI Spec): primär Import aus MagicPlan (FR-KI-004), sonst Skizze/Foto (FR-KI-005).
// Die App zeichnet keinen eigenen Grundriss — sie bindet den fertigen Plan ein und verortet Markierungen.
export function GrundrissTab({ projektId, userId }: { projektId: string; userId: string }) {
  const db = useDB();
  const grundriss = db.grundriss.find((g) => g.projekt_id === projektId);
  const raeume = db.raum.filter((r) => r.projekt_id === projektId);
  const markierungen = grundriss ? db.grundriss_markierung.filter((m) => m.grundriss_id === grundriss.id) : [];
  const benutzerName = (uid: string) => db.benutzer.find((b) => b.id === uid)?.name ?? "?";
  const raumName = (rid: string | null) => (rid ? db.raum.find((r) => r.id === rid)?.bezeichnung ?? "?" : "ganzer Plan");

  const [neu, setNeu] = useState(false);

  return (
    <section className="card">
      <div className="card-head">
        <h2>Grundriss</h2>
        {grundriss && <span className="chip chip-neutral">{grundriss.quelle === "magicplan" ? "MagicPlan" : "Skizze/Foto"}</span>}
      </div>

      {!grundriss ? (
        <div className="grundriss-canvas">
          <div className="grundriss-empty">
            <Icon name="map" size={34} />
            <p className="muted small" style={{ margin: 0, maxWidth: 320 }}>
              Noch kein Grundriss. Der fertige Plan wird aus <strong>MagicPlan</strong> übernommen
              (der Techniker scannt wie gewohnt), alternativ als Skizze/Foto.
            </p>
            <div className="quickpick" style={{ justifyContent: "center" }}>
              <button className="btn btn-primary btn-sm" onClick={() => store.setGrundriss(projektId, "magicplan", `magicplan://${projektId}/plan.pdf`)}>
                <Icon name="layers" size={15} /> MagicPlan importieren
              </button>
              <button className="btn btn-sm" onClick={() => store.setGrundriss(projektId, "skizze_foto", `storage://${projektId}/skizze.jpg`)}>Skizze / Foto</button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grundriss-canvas" style={{ minHeight: 160 }}>
            <div className="grundriss-empty">
              <Icon name="map" size={30} />
              <span className="muted small">{grundriss.datei_referenz}</span>
              <span className="muted small">importiert am {fmtDatum(grundriss.erstellt_am)}</span>
            </div>
          </div>

          <div className="card-head" style={{ marginTop: 16 }}>
            <h3 style={{ margin: 0 }}>Markierungen <span className="count">{markierungen.length}</span></h3>
            <button className="btn btn-sm" onClick={() => setNeu(true)}><Icon name="plus" size={14} /> Markierung</button>
          </div>
          {markierungen.length === 0 && <p className="muted small">Noch keine Markierungen. Hinweise für Sanierer/Trocknungsmonteur hier verorten (FR-PROJ-025).</p>}
          {markierungen.map((m) => (
            <div key={m.id} className="mark">
              <span className={`mark-pin ${m.zielgruppe}`}>{m.zielgruppe === "sanierer" ? "S" : "T"}</span>
              <div>
                <div style={{ fontWeight: 600, fontSize: ".9rem" }}>{m.text}</div>
                <div className="muted small">{raumName(m.raum_id)} · für {m.zielgruppe === "sanierer" ? "Sanierer" : "Trocknungsmonteur"} · {benutzerName(m.erstellt_von)}</div>
              </div>
            </div>
          ))}

          {neu && <MarkierungForm grundrissId={grundriss.id} raeume={raeume} userId={userId} onClose={() => setNeu(false)} />}
        </>
      )}
    </section>
  );
}

function MarkierungForm({ grundrissId, raeume, userId, onClose }: {
  grundrissId: string; raeume: import("../domain/types").Raum[]; userId: string; onClose: () => void;
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
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
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
      </div>
    </div>
  );
}
