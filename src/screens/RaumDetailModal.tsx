import { useDB } from "../app/useStore";
import { Modal } from "../ui/motion";
import { store } from "../domain/store";
import { GESCHOSSE, RAUMTYPEN } from "../app/labels";
import { AufbauEditor } from "./MessprotokollTab";
import type { Raum } from "../domain/types";

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

        <div className="modal-actions">
          <button className="btn btn-primary" onClick={onClose}>Fertig</button>
        </div>
      </Modal>
  );
}
