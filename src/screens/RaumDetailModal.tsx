import { useRef, useState } from "react";
import { useDB } from "../app/useStore";
import { AnimatePresence, Modal, motion } from "../ui/motion";
import { store } from "../domain/store";
import { useSession } from "../app/session";
import { komprimiereBild } from "../ui/foto";
import { FotoAnnotator } from "../ui/FotoAnnotator";
import { Pano360 } from "../ui/Pano360";
import { Icon } from "../ui/Icon";
import { ERSCHWERNIS_OPTIONEN, GESCHOSSE, RAUMTYPEN, TROCKNUNGSMETHODE_OPTIONEN } from "../app/labels";
import { AufbauEditor } from "./MessprotokollTab";
import type { Raum, RaumFoto } from "../domain/types";

// Raum-Detail (Alt-System-Analyse 13.07.2026): Stammdaten, Trocknungsart,
// Zustand bei Trocknungsbeginn und Bauteilaufbau — alles direkt speichernd (kein OK-Knopf nötig).
export function RaumDetailModal({ raumId, onClose }: { raumId: string; onClose: () => void }) {
  const db = useDB();
  const raum = db.raum.find((r) => r.id === raumId);
  if (!raum) return null;

  const set = (details: Partial<Raum>) => store.setRaumDetails(raum.id, details);
  const zahl = (s: string) => { const n = parseFloat(s.replace(",", ".")); return Number.isFinite(n) ? n : null; };

  return (
    <Modal onClose={onClose}>
        <h2>{raum.bezeichnung}</h2>
        <p className="muted small">Änderungen werden sofort gespeichert und synchronisiert.</p>

        {/* Umbenennen (PO 18.07.): Tippfehler bei der Anlage direkt hier korrigieren. */}
        <label className="field"><span>Bezeichnung</span>
          <input defaultValue={raum.bezeichnung} placeholder="z. B. Küche"
            onBlur={(e) => { const b = e.target.value.trim(); if (b && b !== raum.bezeichnung) set({ bezeichnung: b }); }} />
        </label>

        <div className="two-col">
          <label className="field"><span>Raumtyp</span>
            <select value={raum.raumtyp ?? ""} onChange={(e) => set({ raumtyp: e.target.value || null })}>
              <option value="">— wählen —</option>
              {RAUMTYPEN.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>
          <label className="field"><span>Geschoss</span>
            <select value={raum.geschoss ?? ""} onChange={(e) => set({ geschoss: e.target.value || null })}>
              <option value="">— wählen —</option>
              {GESCHOSSE.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </label>
        </div>
        <label className="field"><span>Wohneinheit (optional)</span>
          <input value={raum.wohneinheit ?? ""} onChange={(e) => set({ wohneinheit: e.target.value || null })} placeholder="z. B. 1OG links, Whg. Müller" />
        </label>

        <h3>Trocknung</h3>
        <div className="checkgrid">
          <label className={`checkchip${raum.trocknung_konstruktion ? " on" : ""}`}>
            <input type="checkbox" checked={raum.trocknung_konstruktion ?? false} onChange={(e) => set({ trocknung_konstruktion: e.target.checked })} />
            Konstruktion
          </label>
          <label className={`checkchip${raum.trocknung_raum ? " on" : ""}`}>
            <input type="checkbox" checked={raum.trocknung_raum ?? false} onChange={(e) => set({ trocknung_raum: e.target.checked })} />
            Raumtrocknung
          </label>
          <label className={`checkchip${raum.trocknung_schacht ? " on" : ""}`}>
            <input type="checkbox" checked={raum.trocknung_schacht ?? false} onChange={(e) => set({ trocknung_schacht: e.target.checked })} />
            Schacht/Hohlraum
          </label>
        </div>

        {/* F7: WIE getrocknet wird + WARUM es zäh ist (rechtfertigt Dauer ggü. VS). */}
        <label className="field" style={{ marginTop: 10 }}><span>Trocknungsmethode</span>
          <select value={raum.trocknungsmethode ?? ""} onChange={(e) => set({ trocknungsmethode: e.target.value || null })}>
            <option value="">— wählen —</option>
            {TROCKNUNGSMETHODE_OPTIONEN.map((o) => <option key={o.key} value={o.key}>{o.label}</option>)}
          </select>
        </label>
        <div className="field"><span>Erschwernisse <span className="muted small">(warum es länger dauert)</span></span>
          <div className="checkgrid" style={{ marginTop: 4 }}>
            {ERSCHWERNIS_OPTIONEN.map((o) => {
              const an = (raum.erschwernisse ?? []).includes(o.key);
              return (
                <label key={o.key} className={`checkchip${an ? " on" : ""}`}>
                  <input type="checkbox" checked={an} onChange={() => {
                    const akt = raum.erschwernisse ?? [];
                    set({ erschwernisse: an ? akt.filter((k) => k !== o.key) : [...akt, o.key] });
                  }} />
                  {o.label}
                </label>
              );
            })}
          </div>
        </div>

        <h3>Zustand bei Trocknungsbeginn</h3>
        <div className="checkgrid">
          <label className={`checkchip${raum.faekalschaden ? " on danger" : ""}`}>
            <input type="checkbox" checked={raum.faekalschaden ?? false} onChange={(e) => set({ faekalschaden: e.target.checked })} />
            Fäkalschaden
          </label>
          <label className={`checkchip${raum.freies_wasser ? " on" : ""}`}>
            <input type="checkbox" checked={raum.freies_wasser ?? false} onChange={(e) => set({ freies_wasser: e.target.checked })} />
            Freies Wasser
          </label>
          <label className={`checkchip${raum.sichtbarer_schimmel ? " on danger" : ""}`}>
            <input type="checkbox" checked={raum.sichtbarer_schimmel ?? false} onChange={(e) => set({ sichtbarer_schimmel: e.target.checked })} />
            Sichtbarer Schimmel
          </label>
        </div>
        <label className="field" style={{ marginTop: 10 }}><span>Betroffene Fläche (m²)</span>
          <input inputMode="decimal" defaultValue={raum.betroffene_flaeche_m2 ?? ""} placeholder="z. B. 12"
            onBlur={(e) => set({ betroffene_flaeche_m2: zahl(e.target.value) })} />
        </label>

        <h3>Bauteilaufbau</h3>
        <AufbauEditor raum={raum} />

        <h3>Fotos</h3>
        <RaumFotos raumId={raum.id} />

        {/* Fehlerfassung (PO 18.07.): falsch angelegten Raum wieder loswerden.
            Messungen/Fotos des Raums fallen mit — deshalb Rückfrage mit Eckdaten. */}
        <RaumLoeschenKnopf raum={raum} onGeloescht={onClose} />

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose}>Fertig</button>
        </div>
      </Modal>
  );
}

// „Raum löschen" mit Rückfrage: nennt, was mitgelöscht wird; Einsätze bleiben
// erhalten (verlieren nur den Raum-Bezug) — wie das Server-FK-Verhalten.
function RaumLoeschenKnopf({ raum, onGeloescht }: { raum: Raum; onGeloescht: () => void }) {
  const db = useDB();
  const { user } = useSession();
  const messungen = db.messung.filter((m) => m.raum_id === raum.id).length;
  const fotos = db.raum_foto.filter((f) => f.raum_id === raum.id).length;

  const loeschen = () => {
    const inhalt = [messungen ? `${messungen} Messungen` : null, fotos ? `${fotos} Fotos` : null].filter(Boolean).join(" und ");
    const frage = `Raum „${raum.bezeichnung}" wirklich löschen?` +
      (inhalt ? `\n\nDabei werden auch ${inhalt} gelöscht.` : "") +
      "\n\nGeräte-Einsätze bleiben erhalten und verlieren nur den Raum-Bezug.";
    if (!window.confirm(frage)) return;
    const res = store.loescheRaum(raum.id, user.id);
    if (res.ok) onGeloescht();
    else window.alert(res.error ?? "Löschen fehlgeschlagen.");
  };

  return (
    <button className="btn btn-ghost block loeschen-btn" style={{ marginTop: 14 }} onClick={loeschen}>
      <Icon name="trash" size={15} /> Raum löschen (Fehlerfassung)
    </button>
  );
}

// 360°-Einstieg (Roadmap C-Detail): kleiner Knopf überall dort, wo ein Raum
// auftaucht (Messprotokoll, Grundriss) — erscheint nur, wenn ein Panorama existiert.
export function RaumPanoKnopf({ raumId, bezeichnung, mitName }: { raumId: string; bezeichnung: string; mitName?: boolean }) {
  const db = useDB();
  const [offen, setOffen] = useState(false);
  const panos = db.raum_foto.filter((f) => f.raum_id === raumId && f.kategorie === "pano");
  if (!panos.length) return null;
  const neuestes = panos.reduce((a, b) => (a.aufgenommen_am > b.aufgenommen_am ? a : b));
  return (
    <>
      <button className="chip small pano-chip" onClick={() => setOffen(true)} title={`360°-Ansicht ${bezeichnung}`}>
        <Icon name="camera" size={12} /> {mitName ? `${bezeichnung} 360°` : "360°"}
      </button>
      <AnimatePresence>
        {offen && <Pano360 src={neuestes.datei_referenz} titel={`360° — ${bezeichnung}`} onClose={() => setOffen(false)} />}
      </AnimatePresence>
    </>
  );
}

// Foto-Dokumentation je Raum (FlashApp-Ersatz, 14 · Dokumente). Aufnahme über die
// Kamera (capture="environment") oder Galerie; Bilder werden vor dem Speichern komprimiert.
export function RaumFotos({ raumId }: { raumId: string }) {
  const db = useDB();
  const { user } = useSession();
  const fotos = db.raum_foto.filter((f) => f.raum_id === raumId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [kategorie, setKategorie] = useState<RaumFoto["kategorie"]>("uebersicht");
  const [laedt, setLaedt] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const [gross, setGross] = useState<string | null>(null);
  const [pano, setPano] = useState<string | null>(null);
  const [malen, setMalen] = useState<RaumFoto | null>(null);

  const dateienWaehlen = async (liste: FileList | null) => {
    if (!liste || !liste.length) return;
    setFehler(null); setLaedt(true);
    try {
      for (const datei of Array.from(liste)) {
        // Panoramen brauchen mehr Breite, sonst verschwimmt die Kugel-Ansicht.
        const dataUrl = await komprimiereBild(datei, kategorie === "pano" ? 4096 : undefined);
        store.addRaumFoto({ raum_id: raumId, kategorie, datei_referenz: dataUrl, aufgenommen_von: user.id });
      }
    } catch {
      setFehler("Ein Bild konnte nicht verarbeitet werden.");
    } finally {
      setLaedt(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div className="fotos">
      <div className="segmented small">
        <button className={kategorie === "uebersicht" ? "seg active" : "seg"} onClick={() => setKategorie("uebersicht")}>Übersicht</button>
        <button className={kategorie === "schadenstelle" ? "seg active" : "seg"} onClick={() => setKategorie("schadenstelle")}>Schadenstelle</button>
        <button className={kategorie === "pano" ? "seg active" : "seg"} onClick={() => setKategorie("pano")}>360°</button>
      </div>
      {/* Panoramen entstehen in der Kamera-/Pano-App des Handys → Galerie statt Kamera öffnen. */}
      <input
        ref={inputRef} type="file" accept="image/*" multiple hidden
        {...(kategorie !== "pano" ? { capture: "environment" as const } : {})}
        onChange={(e) => void dateienWaehlen(e.target.files)}
      />
      <button className="btn block" disabled={laedt} onClick={() => inputRef.current?.click()}>
        <Icon name="camera" size={16} /> {laedt ? "Wird verarbeitet…"
          : kategorie === "pano" ? "Panorama aus Galerie wählen (360°)"
          : `Foto aufnehmen / wählen (${kategorie === "uebersicht" ? "Übersicht" : "Schadenstelle"})`}
      </button>
      {kategorie === "pano" && (
        <p className="muted small">Mit der Panorama-Funktion der Handy-Kamera einmal im Raum drehen, dann das Bild hier wählen — es wird als schwenkbare 360°-Ansicht gezeigt.</p>
      )}
      {fehler && <p className="error">{fehler}</p>}

      {fotos.length === 0 ? (
        <p className="muted small">Noch keine Fotos. Übersichts- und Schadenstellen-Aufnahmen dokumentieren den Zustand am Objekt.</p>
      ) : (
        <div className="foto-grid">
          <AnimatePresence>
            {fotos.map((f) => (
              <motion.div key={f.id} className="foto-item" layout
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.18 }}>
                <button className="foto-thumb" onClick={() => (f.kategorie === "pano" ? setPano(f.datei_referenz) : setGross(f.datei_referenz))}
                  aria-label={f.kategorie === "pano" ? "360°-Ansicht öffnen" : "Foto vergrößern"}>
                  <img src={f.datei_referenz} alt={f.kategorie} loading="lazy" />
                  <span className={`foto-tag${f.kategorie === "schadenstelle" ? " danger" : ""}`}>
                    {f.kategorie === "schadenstelle" ? "Schaden" : f.kategorie === "pano" ? "360°" : "Übersicht"}
                  </span>
                </button>
                <button className="foto-del" onClick={() => store.removeRaumFoto(f.id)} aria-label="Foto löschen"><Icon name="trash" size={14} /></button>
                {f.kategorie !== "pano" && (
                  <button className="foto-edit" onClick={() => setMalen(f)} aria-label="Foto markieren" title="Markieren"><Icon name="pen" size={14} /></button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      <AnimatePresence>
        {gross && (
          <Modal onClose={() => setGross(null)}>
            <img src={gross} alt="Foto" style={{ width: "100%", borderRadius: 12, display: "block" }} />
            <div className="modal-actions"><button className="btn btn-primary" onClick={() => setGross(null)}>Schließen</button></div>
          </Modal>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {pano && <Pano360 src={pano} titel="360°-Ansicht" onClose={() => setPano(null)} />}
      </AnimatePresence>

      {malen && (
        <FotoAnnotator
          src={malen.datei_referenz} titel={malen.kategorie === "schadenstelle" ? "Schadenstelle markieren" : "Foto markieren"}
          onSave={(dataUrl) => { store.setRaumFotoBild(malen.id, dataUrl); setMalen(null); }}
          onClose={() => setMalen(null)}
        />
      )}
    </div>
  );
}
