import { useRef, useState } from "react";
import { Modal, AnimatePresence, motion, staggerContainer, fadeUpItem, useScroll, useTransform, type MotionValue } from "../ui/motion";
import { useDB } from "../app/useStore";
import { useSession } from "../app/session";
import { useNav } from "../app/nav";
import { store } from "../domain/store";
import { PROJEKT_STATUS_LABEL } from "../app/labels";
import { istLaufend } from "../domain/einsatz";
import type { DryTrackDB, Projekt } from "../domain/types";

// Sticky-Stapel (Referenz-Technik ②, nur Desktop): aktive Trocknungen als große
// Karten, die beim Scrollen aufeinander stapeln — frühere Karten bleiben sticky
// stehen und schrumpfen leicht, während die nächste darüber gleitet.
function AktiverStapel({ projekte, db }: { projekte: Projekt[]; db: DryTrackDB }) {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  if (projekte.length < 2) return null; // ein Stapel braucht mindestens zwei Karten
  return (
    <div className="stapel" ref={ref}>
      <p className="eyebrow" style={{ marginBottom: 2 }}>Aktive Trocknungen</p>
      {projekte.map((p, i) => (
        <StapelKarte key={p.id} p={p} db={db} index={i} total={projekte.length} progress={scrollYProgress} />
      ))}
    </div>
  );
}

function StapelKarte({ p, db, index, total, progress }: {
  p: Projekt; db: DryTrackDB; index: number; total: number; progress: MotionValue<number>;
}) {
  const nav = useNav();
  const geraete = db.einsatz.filter((e) => e.projekt_id === p.id && istLaufend(e)).length;
  const raeume = db.raum.filter((r) => r.projekt_id === p.id).length;
  // Frühere Karten schrumpfen, je weiter der Stapel gescrollt ist (Referenz-Formel).
  const zielScale = 1 - (total - 1 - index) * 0.04;
  const scale = useTransform(progress, [index / total, 1], [1, zielScale]);
  return (
    <div className="stapel-slot">
      <motion.button
        className="stapel-karte" style={{ scale, top: 96 + index * 26 }}
        onClick={() => nav({ name: "projekt", id: p.id })}
      >
        <div className="stapel-kopf">
          <span className="stapel-nr">{p.projektnummer}</span>
          <span className={`chip status-${p.status}`}>{PROJEKT_STATUS_LABEL[p.status]}</span>
        </div>
        <h2 className="stapel-titel">{p.bezeichnung}</h2>
        <p className="muted">{p.adresse}</p>
        <div className="stapel-fakten">
          <span><strong>{geraete}</strong> {geraete === 1 ? "Gerät läuft" : "Geräte laufen"}</span>
          <span><strong>{raeume}</strong> {raeume === 1 ? "Raum" : "Räume"}</span>
          <span className="muted">seit {new Date(p.angelegt_am).toLocaleDateString("de-DE")}</span>
        </div>
      </motion.button>
    </div>
  );
}

export function ProjekteListe({ neuInitial = false }: { neuInitial?: boolean }) {
  const db = useDB();
  const { user, can } = useSession();
  const nav = useNav();
  const [suche, setSuche] = useState("");
  const [zeigeArchiv, setZeigeArchiv] = useState(false);
  const [neu, setNeu] = useState(neuInitial);

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

      {!suche && !zeigeArchiv && (
        <AktiverStapel
          db={db}
          projekte={db.projekt.filter((p) => !p.storniert && p.status !== "abgeschlossen"
            && db.einsatz.some((e) => e.projekt_id === p.id && istLaufend(e)))}
        />
      )}

      {projekte.length === 0 && <p className="muted">Keine Projekte gefunden.</p>}
      <motion.div className="liste" variants={staggerContainer} initial="hidden" animate="show"
        style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {projekte.map((p) => {
          const geraete = db.einsatz.filter((e) => e.projekt_id === p.id && istLaufend(e)).length;
          return (
            <motion.button layout variants={fadeUpItem} key={p.id} className="listrow" onClick={() => nav({ name: "projekt", id: p.id })}>
              <div className="listrow-main">
                <span className="listrow-title">{p.projektnummer} · {p.bezeichnung}</span>
                <span className="listrow-sub">{p.adresse}</span>
              </div>
              <div className="listrow-side">
                <span className={`chip status-${p.status}`}>{PROJEKT_STATUS_LABEL[p.status]}</span>
                {geraete > 0 && <span className="muted small">{geraete} Geräte laufen</span>}
                {p.storniert && <span className="chip chip-danger">storniert</span>}
              </div>
            </motion.button>
          );
        })}
      </motion.div>

      <AnimatePresence>{neu && <NeuesProjekt onClose={() => setNeu(false)} onCreated={(id) => { setNeu(false); nav({ name: "projekt", id }); }} userId={user.id} />}</AnimatePresence>
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
    <Modal onClose={onClose}>
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
      </Modal>
  );
}
