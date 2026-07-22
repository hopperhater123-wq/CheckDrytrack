import { useState } from "react";
import { motion, Stagger, Item } from "../ui/motion";
import { useDB } from "../app/useStore";
import { useSession } from "../app/session";
import { useNav } from "../app/nav";
import { store } from "../domain/store";
import { Icon } from "../ui/Icon";
import { spiele } from "../ui/sound";
import { MITNEHMEN_LABEL, KONTROLL_ERGEBNIS_LABEL } from "../app/labels";
import { briefingStatus, hatBriefing } from "../domain/termin";
import { KontrollGate, brauchtKontrollGate } from "./KontrollGate";
import { AnimatePresence } from "../ui/motion";
import type { Termin } from "../domain/types";

// „Mein Tag" — Startpunkt des Monteurs. Der Tag ist die Route: Termine in
// Reihenfolge, jeder Termin startet den geführten Besuch am Objekt.
// (Arbeitsablauf-Analyse 15.07.2026: die Einheit der Arbeit ist der Besuch,
// nicht die Datenbank-Tabelle.)

const TAG_MS = 864e5;
const isoTag = (d: Date) => d.toISOString().slice(0, 10);

export function HeuteScreen() {
  const db = useDB();
  const { user } = useSession();
  const nav = useNav();
  const [nurMeine, setNurMeine] = useState(user.rolle === "monteur");
  const [gateFuer, setGateFuer] = useState<Termin | null>(null); // Kontroll-Entscheidung (F8)

  const heute = new Date();
  const heuteIso = isoTag(heute);
  const morgenIso = isoTag(new Date(heute.getTime() + TAG_MS));

  const projekt = (pid: string) => db.projekt.find((p) => p.id === pid);
  const relevant = (t: Termin) => !nurMeine || t.mitarbeiter_id === user.id || t.mitarbeiter_id === null;
  const sortiert = (a: Termin, b: Termin) => ((a.uhrzeit ?? "99") < (b.uhrzeit ?? "99") ? -1 : 1);

  const termineHeute = db.termin.filter((t) => t.datum === heuteIso && relevant(t)).sort(sortiert);
  const termineMorgen = db.termin.filter((t) => t.datum === morgenIso && relevant(t)).sort(sortiert);
  const erledigt = termineHeute.filter((t) => t.erledigt).length;

  const datumLang = heute.toLocaleDateString("de-DE", { weekday: "long", day: "numeric", month: "long" });

  return (
    <div className="screen">
      <div className="screen-head">
        <div>
          <span className="eyebrow">{datumLang}</span>
          <h1>Mein Tag</h1>
        </div>
        <button className="btn btn-sm" onClick={() => nav({ name: "termine" })}>
          <Icon name="calendar" size={15} /> Woche
        </button>
      </div>

      {/* Tagesfortschritt: erledigte Besuche auf der Trocknungslinie des Tages. */}
      {termineHeute.length > 0 && (
        <div className="tag-fortschritt">
          <div className="tag-fortschritt-track">
            <motion.span
              className="tag-fortschritt-fill"
              initial={false}
              animate={{ width: `${termineHeute.length ? (erledigt / termineHeute.length) * 100 : 0}%` }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            />
          </div>
          <span className="muted small">{erledigt} von {termineHeute.length} Besuchen erledigt</span>
        </div>
      )}

      <label className="toggle" style={{ marginBottom: 14 }}>
        <input type="checkbox" checked={nurMeine} onChange={(e) => setNurMeine(e.target.checked)} /> Nur meine Termine
      </label>

      {termineHeute.length === 0 ? (
        <section className="card">
          <p className="muted" style={{ marginBottom: 10 }}>Heute stehen keine Termine an.</p>
          <div className="btn-row">
            <button className="btn btn-sm" onClick={() => nav({ name: "termine" })}>Wochenplan öffnen</button>
            <button className="btn btn-sm" onClick={() => nav({ name: "projekte" })}>Projekte ansehen</button>
          </div>
        </section>
      ) : (
        <Stagger className="tour">
          {termineHeute.map((t) => {
            const p = projekt(t.projekt_id);
            return (
              <Item key={t.id} className={`tour-stop${t.erledigt ? " erledigt" : ""}`}>
                <div className="tour-zeit">
                  <span className="tour-uhr">{t.uhrzeit ?? "—"}</span>
                  <button
                    className={`termin-check${t.erledigt ? " on" : ""}`}
                    onClick={() => {
                      // Kontrolltermin (F8): erst entscheiden, dann Häkchen.
                      if (!t.erledigt && brauchtKontrollGate(t)) { setGateFuer(t); return; }
                      store.setTerminErledigt(t.id, !t.erledigt); if (!t.erledigt) spiele("tick");
                    }}
                    aria-label={t.erledigt ? "Als offen markieren" : "Als erledigt markieren"}
                  >
                    {t.erledigt && <Icon name="check" size={13} />}
                  </button>
                </div>
                <div className="tour-card card">
                  <div className="tour-card-head">
                    <div className="tour-card-main">
                      <span className="tour-aufgabe">{t.beschreibung}</span>
                      <span className="muted small">{p ? `${p.projektnummer} · ${p.bezeichnung}` : "Projekt?"}</span>
                    </div>
                    {t.mitarbeiter_id === null && <span className="chip small chip-warn">nicht zugewiesen</span>}
                    {t.kontrolle && (
                      t.kontrolle_ergebnis
                        ? <span className="chip small chip-neutral">{KONTROLL_ERGEBNIS_LABEL[t.kontrolle_ergebnis]}</span>
                        : <span className="chip small chip-warn">Kontrolle</span>
                    )}
                  </div>
                  {/* Besuch hat den Termin geschlossen, Entscheidung fehlt noch → nachholen */}
                  {t.erledigt && brauchtKontrollGate(t) && (
                    <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => setGateFuer(t)}>
                      Kontrolle entscheiden (Erfolg / verlängern / Methode)
                    </button>
                  )}

                  {/* Auftrags-Briefing (F1): was das Büro vorgibt — vor der Abfahrt sichtbar. */}
                  <BriefingBlock termin={t} />

                  {p && (
                    <a className="tour-adresse" href={`https://www.google.com/maps?q=${encodeURIComponent(p.adresse)}`} target="_blank" rel="noreferrer">
                      <Icon name="map" size={14} /> {p.adresse}
                    </a>
                  )}
                  {p?.telefon && (
                    <a className="tour-adresse" href={`tel:${p.telefon.replace(/\s/g, "")}`}>
                      <Icon name="phone" size={14} /> {p.ansprechpartner ? `${p.ansprechpartner} · ` : ""}{p.telefon}
                    </a>
                  )}
                  <div className="btn-row" style={{ marginTop: 10 }}>
                    {!t.erledigt && (
                      <button className="btn btn-sm btn-primary" onClick={() => nav({ name: "besuch", projektId: t.projekt_id, terminId: t.id })}>
                        Besuch starten <Icon name="chevronRight" size={14} />
                      </button>
                    )}
                    <button className="btn btn-sm" onClick={() => nav({ name: "projekt", id: t.projekt_id })}>Projekt</button>
                  </div>
                </div>
              </Item>
            );
          })}
        </Stagger>
      )}

      {/* Morgen-Vorschau: Briefing schon heute Abend sichtbar, damit man vorbereitet losfährt. */}
      {termineMorgen.length > 0 && (
        <section className="card" style={{ marginTop: 18 }}>
          <div className="card-head"><h2>Morgen <span className="count">{termineMorgen.length}</span></h2></div>
          {termineMorgen.map((t) => {
            const p = projekt(t.projekt_id);
            return (
              <button key={t.id} className="listrow" onClick={() => nav({ name: "projekt", id: t.projekt_id })}>
                <div className="listrow-main">
                  <span className="listrow-title">{t.uhrzeit ?? "—"} · {t.beschreibung}</span>
                  <span className="listrow-sub">
                    {p ? `${p.projektnummer} · ${p.bezeichnung}` : ""}
                    {hatBriefing(t) ? " · Auftrag hinterlegt" : ""}
                  </span>
                </div>
                <Icon name="chevronRight" size={16} />
              </button>
            );
          })}
        </section>
      )}

      <AnimatePresence>{gateFuer && <KontrollGate termin={gateFuer} userId={user.id} onClose={() => setGateFuer(null)} />}</AnimatePresence>
    </div>
  );
}

// Auftrags-Briefing des Büros je Termin (F1/F9): Detail-Auftrag + Mitnehm-Checkliste.
// „NEU/GEÄNDERT" hebt hervor, dass sich der Umfang geändert hat — genau der Fall,
// bei dem der Monteur sonst erst vor Ort merkt, dass mehr zu tun ist.
function BriefingBlock({ termin }: { termin: Termin }) {
  if (!hatBriefing(termin)) return null;
  const status = briefingStatus(termin);
  const mitnehmen = termin.mitnehmen ?? [];
  return (
    <div className={`briefing${status === "neu" || status === "geaendert" ? " briefing-alarm" : ""}`}>
      <div className="briefing-kopf">
        <span className="briefing-titel"><Icon name="fileText" size={13} /> Auftrag vom Büro</span>
        {status === "neu" && <span className="chip small chip-warn">NEU</span>}
        {status === "geaendert" && <span className="chip small chip-warn">GEÄNDERT</span>}
      </div>
      {termin.briefing && <p className="briefing-text">{termin.briefing}</p>}
      {mitnehmen.length > 0 && (
        <div className="briefing-mitnehmen">
          <span className="muted small">Mitnehmen:</span>
          {mitnehmen.map((k) => (
            <span key={k} className={`chip small ${k === "ausweis" ? "chip-warn" : "chip-neutral"}`}>
              {k === "ausweis" ? "🪪 " : ""}{MITNEHMEN_LABEL[k] ?? k}
            </span>
          ))}
        </div>
      )}
      {(status === "neu" || status === "geaendert") && (
        <button className="btn btn-sm" style={{ marginTop: 8 }} onClick={() => store.quittiereTerminBriefing(termin.id)}>
          <Icon name="check" size={14} /> Verstanden
        </button>
      )}
    </div>
  );
}
