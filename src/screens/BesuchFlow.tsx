import { useState } from "react";
import { motion, AnimatePresence, EASE } from "../ui/motion";
import { useDB } from "../app/useStore";
import { useSession } from "../app/session";
import { useNav } from "../app/nav";
import { store } from "../domain/store";
import { KONTAMINATION_LABEL, PROJEKT_STATUS_LABEL } from "../app/labels";
import { istLaufend } from "../domain/einsatz";
import { Icon, type IconName } from "../ui/Icon";
import { TrockenMoment } from "../ui/TrockenMoment";
import { MessprotokollTab } from "./MessprotokollTab";
import { EinsaetzeTab, FeedTab } from "./ProjektDetail";
import { BerichtForm } from "./BerichteTab";

// Geführter Besuch — der Arbeitsablauf des Trocknungstechnikers als Schrittfolge.
// Entspricht einer Spalte im alten Papier-Messprotokoll: ein Besuchstermin =
// Ankunft → Messen → Geräte → Doku → Bericht mit Unterschrift.

const SCHRITTE: { key: string; label: string; icon: IconName }[] = [
  { key: "ankunft", label: "Ankunft", icon: "map" },
  { key: "messen", label: "Messen", icon: "gauge" },
  { key: "geraete", label: "Geräte", icon: "wind" },
  { key: "doku", label: "Doku", icon: "camera" },
  { key: "abschluss", label: "Abschluss", icon: "fileText" },
];

export function BesuchFlow({ projektId, terminId }: { projektId: string; terminId?: string }) {
  const db = useDB();
  const { user } = useSession();
  const nav = useNav();
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const [angekommen, setAngekommen] = useState(false);
  const [fertig, setFertig] = useState(false);

  const p = db.projekt.find((x) => x.id === projektId);
  const termin = terminId ? db.termin.find((t) => t.id === terminId) : undefined;
  if (!p) return <div className="screen"><p className="muted">Projekt nicht gefunden.</p></div>;

  const gehe = (ziel: number) => {
    setDir(ziel > idx ? 1 : -1);
    setIdx(Math.max(0, Math.min(SCHRITTE.length - 1, ziel)));
  };

  const ankommen = () => {
    store.checkIn(projektId, user.id);
    setAngekommen(true);
  };

  const abschliessen = () => {
    store.checkOut(projektId, user.id);
    if (termin && !termin.erledigt) store.setTerminErledigt(termin.id, true);
    setFertig(true);
  };

  const schritt = SCHRITTE[idx];

  return (
    <div className="screen besuch">
      {/* Kopf: Objekt + Ausstieg */}
      <div className="besuch-head">
        <button className="iconbtn" onClick={() => nav({ name: "heute" })} aria-label="Besuch verlassen"><Icon name="x" size={18} /></button>
        <div className="besuch-titel">
          <span className="eyebrow">Besuch · {p.projektnummer}</span>
          <h1>{p.bezeichnung}</h1>
        </div>
        <span className={`chip small status-${p.status}`}>{PROJEKT_STATUS_LABEL[p.status]}</span>
      </div>

      {/* Schritt-Schiene: der Ablauf ist sichtbar, erledigte Schritte füllen sich. */}
      <div className="besuch-rail" role="tablist" aria-label="Besuchsschritte">
        {SCHRITTE.map((s, i) => (
          <button
            key={s.key}
            role="tab"
            aria-selected={i === idx}
            className={`rail-stop${i === idx ? " aktiv" : ""}${i < idx ? " done" : ""}`}
            onClick={() => gehe(i)}
          >
            <span className="rail-dot">{i < idx ? <Icon name="check" size={12} /> : <Icon name={s.icon} size={13} />}</span>
            <span className="rail-label">{s.label}</span>
          </button>
        ))}
        <motion.span
          className="rail-fill"
          initial={false}
          animate={{ width: `${(idx / (SCHRITTE.length - 1)) * 100}%` }}
          transition={{ duration: 0.45, ease: EASE }}
        />
      </div>

      {/* Schritt-Inhalt mit richtungsabhängigem Übergang */}
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={schritt.key}
          initial={{ opacity: 0, x: 28 * dir }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -28 * dir }}
          transition={{ duration: 0.22, ease: EASE }}
        >
          {schritt.key === "ankunft" && <AnkunftSchritt projektId={projektId} terminBeschreibung={termin?.beschreibung} angekommen={angekommen} onAnkommen={ankommen} />}
          {schritt.key === "messen" && <MessprotokollTab projektId={projektId} userId={user.id} />}
          {schritt.key === "geraete" && (
            <>
              <div className="banner small" style={{ marginBottom: 14 }}>
                Aufbau, Zählerstand und Abbau laufen über den Scan — Gerät scannen, Rest folgt automatisch.
              </div>
              <button className="btn btn-primary" style={{ marginBottom: 14 }} onClick={() => nav({ name: "scan" })}>
                <Icon name="scan" size={16} /> Gerät scannen
              </button>
              <EinsaetzeTab projektId={projektId} einsaetze={db.einsatz.filter((e) => e.projekt_id === projektId)} />
            </>
          )}
          {schritt.key === "doku" && <FeedTab projektId={projektId} userId={user.id} />}
          {schritt.key === "abschluss" && <AbschlussSchritt projektId={projektId} userId={user.id} />}
        </motion.div>
      </AnimatePresence>

      {/* Fußleiste: Zurück / Weiter — der Ablauf führt, springt aber nicht ein. */}
      <div className="besuch-fuss">
        <button className="btn" onClick={() => gehe(idx - 1)} disabled={idx === 0}>
          <Icon name="chevronLeft" size={15} /> Zurück
        </button>
        <span className="muted small">Schritt {idx + 1} von {SCHRITTE.length}</span>
        {idx < SCHRITTE.length - 1 ? (
          <button className="btn btn-primary" onClick={() => gehe(idx + 1)}>
            Weiter <Icon name="chevronRight" size={15} />
          </button>
        ) : (
          <button className="btn btn-primary" onClick={abschliessen}>
            <Icon name="check" size={15} /> Besuch abschließen
          </button>
        )}
      </div>

      <AnimatePresence>
        {fertig && (
          <TrockenMoment
            titel="Besuch abgeschlossen"
            sub={`${p.projektnummer} · ${p.bezeichnung}`}
            onDone={() => nav({ name: "heute" })}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// --- Schritt 1: Ankunft ------------------------------------------------------

function AnkunftSchritt({ projektId, terminBeschreibung, angekommen, onAnkommen }: {
  projektId: string; terminBeschreibung?: string; angekommen: boolean; onAnkommen: () => void;
}) {
  const db = useDB();
  const p = db.projekt.find((x) => x.id === projektId);
  if (!p) return null;
  const raeume = db.raum.filter((r) => r.projekt_id === projektId);
  const laufend = db.einsatz.filter((e) => e.projekt_id === projektId).filter(istLaufend).length;

  return (
    <>
      {p.kontamination_art && p.kontamination_art !== "sauber" && !p.gefaehrdungsbeurteilung_abgeschlossen && (
        <div className="banner danger">
          ⚠ Kontamination: {KONTAMINATION_LABEL[p.kontamination_art]} — Gefährdungsbeurteilung noch offen. Erst Schutzmaßnahmen, dann Arbeit.
        </div>
      )}

      <section className="card">
        <div className="card-head"><h2>Auftrag</h2></div>
        {terminBeschreibung
          ? <p style={{ margin: 0, fontWeight: 600 }}>{terminBeschreibung}</p>
          : <p className="muted" style={{ margin: 0 }}>Freier Besuch — kein Termin hinterlegt.</p>}
        <a className="tour-adresse" style={{ marginTop: 10 }} href={`https://www.google.com/maps?q=${encodeURIComponent(p.adresse)}`} target="_blank" rel="noreferrer">
          <Icon name="map" size={14} /> {p.adresse}
        </a>
        <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={onAnkommen} disabled={angekommen}>
          {angekommen ? <><Icon name="check" size={15} /> Ankunft erfasst</> : "Ankunft erfassen"}
        </button>
      </section>

      <section className="card">
        <div className="card-head"><h2>Lage am Objekt</h2></div>
        <dl className="facts">
          <div><dt>Räume</dt><dd>{raeume.length ? raeume.map((r) => r.bezeichnung).join(", ") : "noch keine erfasst"}</dd></div>
          <div><dt>Laufende Geräte</dt><dd>{laufend}</dd></div>
          <div><dt>A&amp;A</dt><dd>{p.aundv_unterschrieben ? "✓ unterschrieben" : "offen"}</dd></div>
          <div><dt>Vollmacht</dt><dd>{p.vollmacht_unterschrift ? "✓ unterschrieben" : "offen"}</dd></div>
        </dl>
        {(!p.aundv_unterschrieben || !p.vollmacht_unterschrift) && (
          <p className="muted small" style={{ marginBottom: 0 }}>
            Fehlende Unterschriften (A&amp;A/Vollmacht) im Projekt unter „Übersicht → Objekt" nachholen — am besten beim Ersttermin.
          </p>
        )}
      </section>
    </>
  );
}

// --- Schritt 5: Abschluss ----------------------------------------------------

function AbschlussSchritt({ projektId, userId }: { projektId: string; userId: string }) {
  const db = useDB();
  const [berichtOffen, setBerichtOffen] = useState(false);
  const heuteIso = new Date().toISOString().slice(0, 10);

  const messungenHeute = db.messung.filter((m) => {
    const raum = db.raum.find((r) => r.id === m.raum_id);
    return raum?.projekt_id === projektId && m.gemessen_am.slice(0, 10) === heuteIso;
  }).length;
  const laufend = db.einsatz.filter((e) => e.projekt_id === projektId).filter(istLaufend).length;
  const berichteHeute = db.besuchsbericht.filter((b) => b.projekt_id === projektId && b.datum === heuteIso);

  return (
    <>
      <section className="card">
        <div className="card-head"><h2>Besuch im Überblick</h2></div>
        <dl className="facts">
          <div><dt>Messungen heute</dt><dd>{messungenHeute}</dd></div>
          <div><dt>Geräte im Einsatz</dt><dd>{laufend}</dd></div>
          <div><dt>Besuchsbericht</dt><dd>{berichteHeute.length ? "✓ erstellt" : "fehlt noch"}</dd></div>
        </dl>
      </section>

      <section className="card">
        <div className="card-head"><h2>Besuchsbericht</h2>
          <button className="btn btn-sm btn-primary" onClick={() => setBerichtOffen(true)}>+ Bericht</button>
        </div>
        {berichteHeute.length === 0
          ? <p className="muted" style={{ margin: 0 }}>Der Bericht ist der Stundennachweis des Besuchs — Arbeiten, Stunden, Unterschrift des Kunden.</p>
          : berichteHeute.map((b) => (
            <div key={b.id} className="listrow static">
              <div className="listrow-main">
                <span className="listrow-title">Bericht von heute</span>
                <span className="listrow-sub">{b.geleistete_arbeiten.split("\n")[0]}</span>
              </div>
              {b.unterschrift_kunde && <span className="chip small chip-live"><Icon name="check" size={12} /> unterschrieben</span>}
            </div>
          ))}
      </section>

      <AnimatePresence>
        {berichtOffen && <BerichtForm projektId={projektId} userId={userId} onClose={() => setBerichtOffen(false)} />}
      </AnimatePresence>
    </>
  );
}
