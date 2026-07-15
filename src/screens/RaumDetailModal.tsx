import { useRef, useState } from "react";
import { useDB } from "../app/useStore";
import { AnimatePresence, Modal, motion } from "../ui/motion";
import { store } from "../domain/store";
import { useSession } from "../app/session";
import { komprimiereBild } from "../ui/foto";
import { FotoAnnotator } from "../ui/FotoAnnotator";
import { Icon } from "../ui/Icon";
import { GESCHOSSE, RAUMTYPEN } from "../app/labels";
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

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose}>Fertig</button>
        </div>
      </Modal>
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
  const [malen, setMalen] = useState<RaumFoto | null>(null);

  const dateienWaehlen = async (liste: FileList | null) => {
    if (!liste || !liste.length) return;
    setFehler(null); setLaedt(true);
    try {
      for (const datei of Array.from(liste)) {
        const dataUrl = await komprimiereBild(datei);
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
      </div>
      <input
        ref={inputRef} type="file" accept="image/*" capture="environment" multiple hidden
        onChange={(e) => void dateienWaehlen(e.target.files)}
      />
      <button className="btn block" disabled={laedt} onClick={() => inputRef.current?.click()}>
        <Icon name="camera" size={16} /> {laedt ? "Wird verarbeitet…" : `Foto aufnehmen / wählen (${kategorie === "uebersicht" ? "Übersicht" : "Schadenstelle"})`}
      </button>
      {fehler && <p className="error">{fehler}</p>}

      {fotos.length === 0 ? (
        <p className="muted small">Noch keine Fotos. Übersichts- und Schadenstellen-Aufnahmen dokumentieren den Zustand am Objekt.</p>
      ) : (
        <div className="foto-grid">
          <AnimatePresence>
            {fotos.map((f) => (
              <motion.div key={f.id} className="foto-item" layout
                initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.18 }}>
                <button className="foto-thumb" onClick={() => setGross(f.datei_referenz)} aria-label="Foto vergrößern">
                  <img src={f.datei_referenz} alt={f.kategorie} loading="lazy" />
                  <span className={`foto-tag${f.kategorie === "schadenstelle" ? " danger" : ""}`}>{f.kategorie === "schadenstelle" ? "Schaden" : "Übersicht"}</span>
                </button>
                <button className="foto-del" onClick={() => store.removeRaumFoto(f.id)} aria-label="Foto löschen"><Icon name="trash" size={14} /></button>
                <button className="foto-edit" onClick={() => setMalen(f)} aria-label="Foto markieren" title="Markieren"><Icon name="pen" size={14} /></button>
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
