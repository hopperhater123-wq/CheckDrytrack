import { useRef, useState } from "react";
import { Modal, AnimatePresence } from "../ui/motion";
import { useDB } from "../app/useStore";
import { store } from "../domain/store";
import { fmtDatum, fmtZahl } from "../app/format";
import { GESCHOSSE } from "../app/labels";
import { Icon } from "../ui/Icon";
import { komprimiereBild } from "../ui/foto";
import { FotoAnnotator } from "../ui/FotoAnnotator";
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
        const gs = grundrisse
          .filter((x) => x.geschoss === geschoss)
          .sort((a, b) => (a.erstellt_am < b.erstellt_am ? -1 : 1));
        return (
          <GeschossBlock
            key={geschoss} projektId={projektId} geschoss={geschoss} grundrisse={gs}
            raeume={raeume.filter((r) => r.geschoss === geschoss)}
            markierungen={db.grundriss_markierung.filter((m) => gs.some((g) => g.id === m.grundriss_id))}
            benutzerName={(uid) => db.benutzer.find((b) => b.id === uid)?.name ?? "?"}
            raumName={(rid) => (rid ? db.raum.find((r) => r.id === rid)?.bezeichnung ?? "?" : "ganzer Plan")}
            onMarkierung={(gid) => setNeuFuer(gid)}
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

function GeschossBlock({ projektId, geschoss, grundrisse, raeume, markierungen, benutzerName, raumName, onMarkierung }: {
  projektId: string; geschoss: string; grundrisse: Grundriss[]; raeume: Raum[];
  markierungen: import("../domain/types").GrundrissMarkierung[];
  benutzerName: (uid: string) => string; raumName: (rid: string | null) => string; onMarkierung: (grundrissId: string) => void;
}) {
  const fotoInput = useRef<HTMLInputElement>(null);
  const modusRef = useRef<"ersetzen" | "neu">("ersetzen"); // was der nächste Upload bewirkt
  const [idx, setIdx] = useState(0);
  const [malen, setMalen] = useState(false);
  const [laedt, setLaedt] = useState(false);

  // Aktuelle Skizze (Alt-System: "Skizze 1 von 3" je Geschoss).
  const sicherIdx = Math.min(idx, Math.max(0, grundrisse.length - 1));
  const grundriss: Grundriss | undefined = grundrisse[sicherIdx];
  const hatBild = !!grundriss && grundriss.datei_referenz.startsWith("data:");

  // Skizze/Foto hochladen — ersetzt das aktuelle Bild oder legt eine weitere Skizze an.
  const hochladen = async (liste: FileList | null) => {
    if (!liste || !liste.length) return;
    setLaedt(true);
    try {
      const dataUrl = await komprimiereBild(liste[0]);
      if (!grundriss) store.setGrundriss(projektId, geschoss, "skizze_foto", dataUrl);
      else if (modusRef.current === "neu") { store.addGrundriss(projektId, geschoss, "skizze_foto", dataUrl); setIdx(grundrisse.length); }
      else store.setGrundrissBild(grundriss.id, dataUrl);
    } finally {
      setLaedt(false);
      if (fotoInput.current) fotoInput.current.value = "";
    }
  };
  const uploadStarten = (modus: "ersetzen" | "neu") => { modusRef.current = modus; fotoInput.current?.click(); };

  return (
    <div className="geschoss-block">
      <div className="geschoss-head">
        <span className="geschoss-name">{geschoss}</span>
        {grundriss
          ? <span className="chip small chip-neutral">{grundriss.quelle === "magicplan" ? "MagicPlan" : "Skizze/Foto"}</span>
          : <span className="muted small">{raeume.length} {raeume.length === 1 ? "Raum" : "Räume"}</span>}
      </div>

      <input ref={fotoInput} type="file" accept="image/*" capture="environment" hidden
        onChange={(e) => void hochladen(e.target.files)} />

      {!grundriss ? (
        <div className="quickpick">
          <button className="btn btn-primary btn-sm" onClick={() => store.setGrundriss(projektId, geschoss, "magicplan", `magicplan://${projektId}/${geschoss}.pdf`)}>
            <Icon name="layers" size={15} /> MagicPlan
          </button>
          <button className="btn btn-sm" disabled={laedt} onClick={() => uploadStarten("ersetzen")}>
            <Icon name="camera" size={15} /> Skizze / Foto
          </button>
        </div>
      ) : (
        <>
          {/* Pager, wenn mehrere Skizzen zum Geschoss existieren (Alt-System: "Skizze 1 von 3") */}
          {grundrisse.length > 1 && (
            <div className="wochen-nav" style={{ marginBottom: 8 }}>
              <button className="iconbtn" onClick={() => setIdx(Math.max(0, sicherIdx - 1))} disabled={sicherIdx === 0} aria-label="Vorherige Skizze"><Icon name="chevronLeft" size={16} /></button>
              <span className="muted small">Skizze {sicherIdx + 1} von {grundrisse.length}</span>
              <button className="iconbtn" onClick={() => setIdx(Math.min(grundrisse.length - 1, sicherIdx + 1))} disabled={sicherIdx === grundrisse.length - 1} aria-label="Nächste Skizze"><Icon name="chevronRight" size={16} /></button>
            </div>
          )}

          {hatBild ? (
            <>
              <div className="grundriss-bildwrap">
                <img className="grundriss-bild" src={grundriss.datei_referenz} alt={`Skizze ${geschoss}`} />
              </div>
              <div className="btn-row" style={{ marginBottom: 10, flexWrap: "wrap" }}>
                <button className="btn btn-sm btn-primary" onClick={() => setMalen(true)}>
                  <Icon name="pen" size={14} /> Markieren
                </button>
                <button className="btn btn-sm" disabled={laedt} onClick={() => uploadStarten("ersetzen")}>
                  <Icon name="camera" size={14} /> Neues Bild
                </button>
                <button className="btn btn-sm" disabled={laedt} onClick={() => uploadStarten("neu")}>
                  <Icon name="plus" size={14} /> Skizze
                </button>
              </div>
            </>
          ) : (
            <div className="grundriss-canvas" style={{ minHeight: 120 }}>
              <div className="grundriss-empty">
                <Icon name="map" size={26} />
                <span className="muted small">{grundriss.datei_referenz}</span>
                <span className="muted small">importiert am {fmtDatum(grundriss.erstellt_am)}</span>
                <button className="btn btn-sm" disabled={laedt} onClick={() => uploadStarten("ersetzen")}>
                  <Icon name="camera" size={14} /> {laedt ? "Wird verarbeitet…" : "Skizze/Foto hochladen"}
                </button>
              </div>
            </div>
          )}

          {malen && hatBild && (
            <FotoAnnotator
              src={grundriss.datei_referenz} titel={`Skizze ${geschoss}`}
              onSave={(dataUrl) => { store.setGrundrissBild(grundriss.id, dataUrl); setMalen(false); }}
              onClose={() => setMalen(false)}
            />
          )}

          <div className="rhm-row">
            <label className="field" style={{ margin: 0, flex: 1 }}><span>Raumhöhe (RHM, m)</span>
              <input inputMode="decimal" defaultValue={grundriss.raumhoehe_m ?? ""} placeholder="z. B. 2,43"
                onBlur={(e) => { const n = parseFloat(e.target.value.replace(",", ".")); store.setGrundrissRaumhoehe(grundriss.id, Number.isFinite(n) ? n : null); }} />
            </label>
            {grundriss.raumhoehe_m != null && <span className="muted small" style={{ alignSelf: "end", paddingBottom: 10 }}>{fmtZahl(grundriss.raumhoehe_m, 3)} m</span>}
          </div>

          <div className="card-head" style={{ marginTop: 4 }}>
            <h3 style={{ margin: 0 }}>Markierungen <span className="count">{markierungen.length}</span></h3>
            <button className="btn btn-sm" onClick={() => onMarkierung(grundriss.id)}><Icon name="plus" size={14} /> Markierung</button>
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
