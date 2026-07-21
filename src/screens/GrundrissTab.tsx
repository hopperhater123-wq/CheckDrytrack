import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { Modal, AnimatePresence } from "../ui/motion";
import { useDB } from "../app/useStore";
import { store } from "../domain/store";
import { fmtDatum, fmtZahl } from "../app/format";
import { GESCHOSSE, MARKIERUNG_ART_LABEL, BEFUND_KATEGORIEN, BEFUND_KAT_MAP } from "../app/labels";
import { Icon } from "../ui/Icon";
import { komprimiereBild } from "../ui/foto";
import { FotoAnnotator } from "../ui/FotoAnnotator";
import { RaumPanoKnopf } from "./RaumDetailModal";
import type { Grundriss, Raum, GrundrissMarkierung, BefundGeometrie } from "../domain/types";

// --- Befund-Layer (F14): gezeichnete Kategorien auf der Skizze --------------
// Farben meiden bewusst Rot/Gelb/Grün (die bleiben den Messwerten vorbehalten).

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
function normPunkt(e: ReactPointerEvent, el: SVGSVGElement) {
  const r = el.getBoundingClientRect();
  return { x: clamp01((e.clientX - r.left) / r.width), y: clamp01((e.clientY - r.top) / r.height) };
}
const geoParse = (m: GrundrissMarkierung): BefundGeometrie | null => {
  if (!m.geometrie) return null;
  try { return JSON.parse(m.geometrie) as BefundGeometrie; } catch { return null; }
};
const farbeVon = (m: GrundrissMarkierung) =>
  (m.kategorie && BEFUND_KAT_MAP[m.kategorie]?.farbe) ||
  (m.art === "schadensursache" ? "#1f2937" : m.art === "feuchtestelle" ? "#0e8a94" : "#334155");

// Zeichnet die gespeicherten Befund-Geometrien als SVG über das Bild (schreibgeschützt).
function BefundShapes({ markierungen }: { markierungen: GrundrissMarkierung[] }) {
  const mitGeo = markierungen.map((m) => ({ m, g: geoParse(m) })).filter((x) => x.g);
  const flaechenKat = BEFUND_KATEGORIEN.filter((k) => k.form === "flaeche");
  return (
    <svg className="befund-svg" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      <defs>
        {flaechenKat.map((k) => (
          <pattern key={k.key} id={`hatch-${k.key}`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="4" height="4" fill={k.farbe} fillOpacity="0.12" />
            <line x1="0" y1="0" x2="0" y2="4" stroke={k.farbe} strokeWidth="1" />
          </pattern>
        ))}
      </defs>
      {mitGeo.map(({ m, g }) => {
        const farbe = farbeVon(m);
        const erledigt = m.status === "erledigt";
        const op = erledigt ? 0.28 : 1;
        if (!g) return null;
        if (g.form === "flaeche") {
          const fill = m.kategorie ? `url(#hatch-${m.kategorie})` : "none";
          return <rect key={m.id} x={g.x * 100} y={g.y * 100} width={g.w * 100} height={g.h * 100}
            fill={fill} stroke={farbe} strokeWidth={1.6} vectorEffect="non-scaling-stroke" opacity={op} rx={0.6} />;
        }
        if (g.form === "linie") {
          return <line key={m.id} x1={g.x1 * 100} y1={g.y1 * 100} x2={g.x2 * 100} y2={g.y2 * 100}
            stroke={farbe} strokeWidth={3} strokeLinecap="round" strokeDasharray="5 3" vectorEffect="non-scaling-stroke" opacity={op} />;
        }
        return <circle key={m.id} cx={g.x * 100} cy={g.y * 100} r={1.7} fill={farbe} stroke="#fff" strokeWidth={0.7} vectorEffect="non-scaling-stroke" opacity={op} />;
      })}
    </svg>
  );
}

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
            key={geschoss} projektId={projektId} userId={userId} geschoss={geschoss} grundrisse={gs}
            panoRaumIds={new Set(db.raum_foto.filter((f) => f.kategorie === "pano").map((f) => f.raum_id))}
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

function GeschossBlock({ projektId, userId, geschoss, grundrisse, raeume, panoRaumIds, markierungen, benutzerName, raumName, onMarkierung }: {
  projektId: string; userId: string; geschoss: string; grundrisse: Grundriss[]; raeume: Raum[]; panoRaumIds: Set<string>;
  markierungen: import("../domain/types").GrundrissMarkierung[];
  benutzerName: (uid: string) => string; raumName: (rid: string | null) => string; onMarkierung: (grundrissId: string) => void;
}) {
  const fotoInput = useRef<HTMLInputElement>(null);
  const modusRef = useRef<"ersetzen" | "neu">("ersetzen"); // was der nächste Upload bewirkt
  const [idx, setIdx] = useState(0);
  const [malen, setMalen] = useState(false);
  const [befund, setBefund] = useState(false); // Befund-Zeichen-Editor offen (F14)
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

      {/* 360°-Einstieg vom Plan aus: je Raum mit Panorama ein Chip (Roadmap C-Detail). */}
      {raeume.some((r) => panoRaumIds.has(r.id)) && (
        <div className="btn-row" style={{ flexWrap: "wrap", marginBottom: 8 }}>
          {raeume.filter((r) => panoRaumIds.has(r.id)).map((r) => (
            <RaumPanoKnopf key={r.id} raumId={r.id} bezeichnung={r.bezeichnung} mitName />
          ))}
        </div>
      )}

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
              <div className="grundriss-bildwrap befund-stage">
                <img className="grundriss-bild" src={grundriss.datei_referenz} alt={`Skizze ${geschoss}`} />
                <BefundShapes markierungen={markierungen.filter((m) => m.grundriss_id === grundriss.id)} />
              </div>
              <div className="btn-row" style={{ marginBottom: 10, flexWrap: "wrap" }}>
                <button className="btn btn-sm btn-primary" onClick={() => setBefund(true)}>
                  <Icon name="pen" size={14} /> Befund zeichnen
                </button>
                <button className="btn btn-sm" onClick={() => setMalen(true)}>
                  <Icon name="pen" size={14} /> Freihand
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
          <AnimatePresence>
            {befund && hatBild && (
              <BefundEditor grundriss={grundriss} markierungen={markierungen} userId={userId} onClose={() => setBefund(false)} />
            )}
          </AnimatePresence>

          <div className="rhm-row">
            <label className="field" style={{ margin: 0, flex: 1 }}><span>Raumhöhe (RHM, m)</span>
              <input inputMode="decimal" defaultValue={grundriss.raumhoehe_m ?? ""} placeholder="z. B. 2,43"
                onBlur={(e) => { const n = parseFloat(e.target.value.replace(",", ".")); store.setGrundrissRaumhoehe(grundriss.id, Number.isFinite(n) ? n : null); }} />
            </label>
            {grundriss.raumhoehe_m != null && <span className="muted small" style={{ alignSelf: "end", paddingBottom: 10 }}>{fmtZahl(grundriss.raumhoehe_m, 3)} m</span>}
          </div>

          {(() => {
            const legende = markierungen.filter((m) => m.grundriss_id === grundriss.id);
            const offen = legende.filter((m) => m.status !== "erledigt").length;
            return (<>
              <div className="card-head" style={{ marginTop: 4 }}>
                <h3 style={{ margin: 0 }}>Legende <span className="count">{legende.length}</span></h3>
                <button className="btn btn-sm" onClick={() => onMarkierung(grundriss.id)}><Icon name="plus" size={14} /> Hinweis</button>
              </div>
              {legende.length === 0 && <p className="muted small">„Befund zeichnen" markiert Flächen/Linien auf dem Plan; hier erscheinen sie als Legende mit Status (markiert → erledigt).</p>}
              {legende.length > 0 && <p className="muted small" style={{ margin: "0 0 6px" }}>{offen} offen · {legende.length - offen} erledigt</p>}
              {legende.map((m) => {
                const kat = m.kategorie ? BEFUND_KAT_MAP[m.kategorie] : undefined;
                const erledigt = m.status === "erledigt";
                return (
                  <div key={m.id} className={`legende-row${erledigt ? " erledigt" : ""}`}>
                    <span className="legende-swatch" style={{ background: farbeVon(m) }} aria-hidden />
                    <div className="legende-txt">
                      <div className="legende-titel">{kat ? kat.label : m.text}</div>
                      <div className="muted small">
                        {kat ? "" : (m.art && m.art !== "hinweis" ? `${MARKIERUNG_ART_LABEL[m.art]} · ` : "")}
                        {raumName(m.raum_id)} · {benutzerName(m.erstellt_von)}
                      </div>
                    </div>
                    <button className={`legende-status${erledigt ? " on" : ""}`}
                      onClick={() => store.setMarkierungStatus(m.id, erledigt ? "offen" : "erledigt")}
                      title={erledigt ? "Als offen markieren" : "Als erledigt markieren"}>
                      {erledigt ? <><Icon name="check" size={13} /> erledigt</> : "offen"}
                    </button>
                    <button className="iconbtn" onClick={() => store.removeMarkierung(m.id)} title="Entfernen" aria-label="Entfernen"><Icon name="trash" size={14} /></button>
                  </div>
                );
              })}
            </>);
          })()}
        </>
      )}
    </div>
  );
}

// Zeichen-Editor: Kategorie wählen → auf dem Plan Fläche aufziehen / Linie oder Punkt setzen.
// Jede Zeichnung wird sofort als Befund gespeichert (schneller Feld-Workflow).
function BefundEditor({ grundriss, markierungen, userId, onClose }: {
  grundriss: Grundriss; markierungen: GrundrissMarkierung[]; userId: string; onClose: () => void;
}) {
  const [toolKey, setToolKey] = useState(BEFUND_KATEGORIEN[0].key);
  const [start, setStart] = useState<{ x: number; y: number } | null>(null);
  const [now, setNow] = useState<{ x: number; y: number } | null>(null);
  const [lineP1, setLineP1] = useState<{ x: number; y: number } | null>(null);
  const kat = BEFUND_KAT_MAP[toolKey];
  const aktuelle = markierungen.filter((m) => m.grundriss_id === grundriss.id);

  const speichern = (g: BefundGeometrie) =>
    store.addMarkierung({
      grundriss_id: grundriss.id, raum_id: null, zielgruppe: "trocknungsmonteur", art: "hinweis",
      kategorie: toolKey, text: kat.label, geometrie: JSON.stringify(g), status: "offen", erstellt_von: userId,
    });

  const onDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (kat.form !== "flaeche") return;
    const p = normPunkt(e, e.currentTarget);
    e.currentTarget.setPointerCapture(e.pointerId);
    setStart(p); setNow(p);
  };
  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (kat.form === "flaeche" && start) setNow(normPunkt(e, e.currentTarget));
  };
  const onUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    const p = normPunkt(e, e.currentTarget);
    if (kat.form === "flaeche") {
      if (start) {
        const x = Math.min(start.x, p.x), y = Math.min(start.y, p.y);
        const w = Math.abs(p.x - start.x), h = Math.abs(p.y - start.y);
        if (w > 0.02 && h > 0.02) speichern({ form: "flaeche", x, y, w, h });
        setStart(null); setNow(null);
      }
    } else if (kat.form === "linie") {
      if (!lineP1) setLineP1(p);
      else { speichern({ form: "linie", x1: lineP1.x, y1: lineP1.y, x2: p.x, y2: p.y }); setLineP1(null); }
    } else {
      speichern({ form: "punkt", x: p.x, y: p.y });
    }
  };

  const hinweis = kat.form === "flaeche" ? "Fläche aufziehen (tippen & ziehen) — wird schraffiert."
    : kat.form === "linie" ? (lineP1 ? "Endpunkt antippen." : "Startpunkt der Linie antippen.")
    : "Stelle auf dem Plan antippen.";
  const draftRect = start && now
    ? { x: Math.min(start.x, now.x) * 100, y: Math.min(start.y, now.y) * 100, w: Math.abs(now.x - start.x) * 100, h: Math.abs(now.y - start.y) * 100 }
    : null;

  return (
    <Modal onClose={onClose}>
      <h2>Befund zeichnen</h2>
      <div className="befund-tools">
        {BEFUND_KATEGORIEN.map((k) => (
          <button key={k.key} type="button" className={`befund-chip${toolKey === k.key ? " active" : ""}`}
            onClick={() => { setToolKey(k.key); setLineP1(null); setStart(null); setNow(null); }}>
            <span className="befund-dot" style={{ background: k.farbe }} />
            {k.label}
            <span className="befund-formtag">{k.form === "flaeche" ? "Fläche" : k.form === "linie" ? "Linie" : "Punkt"}</span>
          </button>
        ))}
      </div>
      <p className="muted small" style={{ margin: "2px 0 8px" }}>{hinweis}</p>
      <div className="befund-stage" style={{ touchAction: "none" }}>
        <img className="grundriss-bild" src={grundriss.datei_referenz} alt="Skizze" draggable={false} />
        <BefundShapes markierungen={aktuelle} />
        <svg className="befund-capture" viewBox="0 0 100 100" preserveAspectRatio="none"
          onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp}>
          {draftRect && <rect x={draftRect.x} y={draftRect.y} width={draftRect.w} height={draftRect.h}
            fill={kat.farbe} fillOpacity={0.15} stroke={kat.farbe} strokeWidth={1.6} vectorEffect="non-scaling-stroke" />}
          {lineP1 && <circle cx={lineP1.x * 100} cy={lineP1.y * 100} r={1.8} fill={kat.farbe} stroke="#fff" strokeWidth={0.7} vectorEffect="non-scaling-stroke" />}
        </svg>
      </div>
      <p className="muted small" style={{ marginTop: 6 }}>{aktuelle.filter((m) => m.geometrie).length} Befund(e) auf dieser Skizze · Status &amp; Löschen in der Legende darunter.</p>
      <div className="modal-actions">
        <button className="btn btn-primary" onClick={onClose}>Fertig</button>
      </div>
    </Modal>
  );
}

function MarkierungForm({ grundrissId, raeume, userId, onClose }: {
  grundrissId: string; raeume: Raum[]; userId: string; onClose: () => void;
}) {
  const [zielgruppe, setZielgruppe] = useState<"sanierer" | "trocknungsmonteur">("trocknungsmonteur");
  const [art, setArt] = useState<import("../domain/types").MarkierungArt>("hinweis");
  const [raumId, setRaumId] = useState("");
  const [text, setText] = useState("");

  const speichern = () => {
    if (!text.trim()) return;
    store.addMarkierung({ grundriss_id: grundrissId, raum_id: raumId || null, zielgruppe, art, text: text.trim(), erstellt_von: userId });
    onClose();
  };

  return (
    <Modal onClose={onClose}>
        <h2>Markierung hinzufügen</h2>
        <label className="field"><span>Art</span>
          <div className="segmented" style={{ display: "flex" }}>
            <button type="button" className={art === "schadensursache" ? "seg active" : "seg"} onClick={() => setArt("schadensursache")}>Schadensursache</button>
            <button type="button" className={art === "feuchtestelle" ? "seg active" : "seg"} onClick={() => setArt("feuchtestelle")}>Feuchtestelle</button>
            <button type="button" className={art === "hinweis" ? "seg active" : "seg"} onClick={() => setArt("hinweis")}>Hinweis</button>
          </div>
          <span className="muted small" style={{ marginTop: 4 }}>Ursache = wo das Wasser herkommt · Feuchtestelle = wo es ankommt/nass ist.</span>
        </label>
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
