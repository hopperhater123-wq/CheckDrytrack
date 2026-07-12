// Offline-First-Datenhaltung (000 Vision: "Die Anwendung muss vollständig offline funktionieren").
// localStorage als lokale Quelle; ein Realtime-Backend (Supabase, siehe 008) würde hier andocken.
// Über das `storage`-Event synchronisieren offene Tabs live (Annäherung an FR-Realtime).

import type {
  DryTrackDB, Einsatz, FeedEintrag, FeedKategorie, Geraet, Projekt, ProjektStatus, Raum,
} from "./types";
import { seedDB } from "./seed";

const STORAGE_KEY = "drytrack.db.v1";
type Listener = () => void;

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36).slice(-4)}`;
}

class Store {
  private db: DryTrackDB;
  private listeners = new Set<Listener>();

  constructor() {
    this.db = this.load();
    if (typeof window !== "undefined") {
      window.addEventListener("storage", (e) => {
        if (e.key === STORAGE_KEY && e.newValue) {
          this.db = JSON.parse(e.newValue);
          this.emit();
        }
      });
    }
  }

  private load(): DryTrackDB {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return JSON.parse(raw);
    } catch {
      /* fällt auf Seed zurück */
    }
    const fresh = seedDB();
    this.persist(fresh);
    return fresh;
  }

  private persist(db: DryTrackDB) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      /* Speicher voll o.ä. — App bleibt trotzdem im Speicher nutzbar */
    }
  }

  private commit(mutate: (db: DryTrackDB) => void) {
    // Immutable Copy, damit React-Consumer sicher neu rendern.
    const next: DryTrackDB = structuredClone(this.db);
    mutate(next);
    this.db = next;
    this.persist(next);
    this.emit();
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }

  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  getSnapshot = (): DryTrackDB => this.db;

  reset() {
    localStorage.removeItem(STORAGE_KEY);
    this.db = this.load();
    this.emit();
  }

  // ---------------------------------------------------------------------------
  // Einsatz-Mutationen — Herzstück (10 · Einsätze)
  // ---------------------------------------------------------------------------

  /** Geräte-Aufbau (FR-EINSATZ-001/002): neuer Einsatz, Startzählerstand, Gerät → Baustelle. */
  aufbau(params: {
    inventarnummer: string;
    projekt_id: string;
    raum_id: string | null;
    zaehlerstand_start: number;
    autor_id: string;
  }): { ok: boolean; error?: string } {
    const g = this.db.geraet.find((x) => x.inventarnummer === params.inventarnummer);
    if (!g) return { ok: false, error: `Gerät ${params.inventarnummer} nicht gefunden.` };
    if (g.status === "baustelle") return { ok: false, error: `Gerät ${g.inventarnummer} ist bereits im Einsatz.` };
    if (g.status === "werkstatt") return { ok: false, error: `Gerät ${g.inventarnummer} ist in der Werkstatt.` };

    const projekt = this.db.projekt.find((p) => p.id === params.projekt_id);
    this.commit((db) => {
      const einsatz: Einsatz = {
        id: uid("e"), projekt_id: params.projekt_id, geraet_inventarnummer: params.inventarnummer,
        raum_id: params.raum_id, aufbau_datum: new Date().toISOString(), abbau_datum: null,
        zaehlerstand_start: params.zaehlerstand_start, zaehlerstand_ende: null, verbrauch_geschaetzt: false,
      };
      db.einsatz.push(einsatz);
      const dev = db.geraet.find((x) => x.inventarnummer === params.inventarnummer)!;
      dev.status = "baustelle";
      dev.aktuelles_projekt_id = params.projekt_id;
      db.feed_eintrag.push(autoFeed(params.projekt_id, params.inventarnummer, "scan", params.autor_id,
        `Gerät ${params.inventarnummer} aufgebaut (${projekt?.projektnummer ?? ""}), Startzählerstand ${params.zaehlerstand_start.toLocaleString("de-DE")} kWh.`));
    });
    return { ok: true };
  }

  /** Geräte-Abbau (FR-EINSATZ-002/003): Einsatz abschließen, Endstand ODER Schätzung, Gerät → Lager. */
  abbau(params: {
    einsatz_id: string;
    zaehlerstand_ende: number | null; // null => Fallback-Schätzung (defekter/unlesbarer Zähler)
    autor_id: string;
  }): { ok: boolean; error?: string } {
    const e = this.db.einsatz.find((x) => x.id === params.einsatz_id);
    if (!e) return { ok: false, error: "Einsatz nicht gefunden." };
    if (e.abbau_datum !== null) return { ok: false, error: "Einsatz ist bereits abgebaut." };
    if (params.zaehlerstand_ende !== null && params.zaehlerstand_ende < e.zaehlerstand_start) {
      return { ok: false, error: "Endzählerstand darf nicht kleiner als der Startstand sein." };
    }

    this.commit((db) => {
      const einsatz = db.einsatz.find((x) => x.id === params.einsatz_id)!;
      einsatz.abbau_datum = new Date().toISOString();
      einsatz.zaehlerstand_ende = params.zaehlerstand_ende;
      einsatz.verbrauch_geschaetzt = params.zaehlerstand_ende === null;

      const dev = db.geraet.find((x) => x.inventarnummer === einsatz.geraet_inventarnummer);
      if (dev) { dev.status = "lager"; dev.aktuelles_projekt_id = null; }

      const info = params.zaehlerstand_ende === null
        ? "Zähler defekt/unlesbar — Verbrauch wird geschätzt (Näherungswert)."
        : `Endzählerstand ${params.zaehlerstand_ende.toLocaleString("de-DE")} kWh.`;
      db.feed_eintrag.push(autoFeed(einsatz.projekt_id, einsatz.geraet_inventarnummer, "teilabbau", params.autor_id,
        `Gerät ${einsatz.geraet_inventarnummer} abgebaut. ${info}`));
    });
    return { ok: true };
  }

  // ---------------------------------------------------------------------------
  // Weitere Mutationen
  // ---------------------------------------------------------------------------

  addFeedEintrag(params: { projekt_id: string; kategorie: FeedKategorie; inhalt: string; autor_id: string; geraet_inventarnummer?: string | null }) {
    this.commit((db) => {
      db.feed_eintrag.push({
        id: uid("f"), projekt_id: params.projekt_id, geraet_inventarnummer: params.geraet_inventarnummer ?? null,
        ursprung: "manuell", kategorie: params.kategorie, inhalt: params.inhalt, autor_id: params.autor_id,
        erstellt_am: new Date().toISOString(),
      });
    });
  }

  setProjektStatus(projekt_id: string, status: ProjektStatus, autor_id: string) {
    this.commit((db) => {
      const p = db.projekt.find((x) => x.id === projekt_id);
      if (p) {
        p.status = status;
        db.feed_eintrag.push(autoFeed(projekt_id, null, "manuell", autor_id, `Projektstatus geändert auf „${status}".`, "dispo"));
      }
    });
  }

  createProjekt(params: { bezeichnung: string; adresse: string; ist_erstmassnahme: boolean; angelegt_von: string }): Projekt {
    const jahr = new Date().getFullYear();
    const laufend = this.db.projekt.filter((p) => p.projektnummer.startsWith(String(jahr))).length + 1;
    const projekt: Projekt = {
      id: uid("p"), projektnummer: `${jahr}-${String(laufend).padStart(4, "0")}`, status: "angelegt",
      storniert: false, ist_erstmassnahme: params.ist_erstmassnahme, bezeichnung: params.bezeichnung,
      adresse: params.adresse, geo_lat: null, geo_lng: null, kontamination_art: null,
      gefaehrdungsbeurteilung_abgeschlossen: false, versicherung_id: null,
      angelegt_von: params.angelegt_von, angelegt_am: new Date().toISOString(),
    };
    this.commit((db) => { db.projekt.push(projekt); });
    return projekt;
  }

  addRaum(projekt_id: string, bezeichnung: string): Raum {
    const raum: Raum = { id: uid("r"), projekt_id, bezeichnung, daemmstoff_status: "unbekannt", daemmstoff_material_id: null };
    this.commit((db) => { db.raum.push(raum); });
    return raum;
  }

  geraetById(inv: string): Geraet | undefined {
    return this.db.geraet.find((g) => g.inventarnummer === inv);
  }
}

function autoFeed(projekt_id: string, geraet: string | null, ursprung: FeedEintrag["ursprung"], autor_id: string, inhalt: string, kategorie: FeedKategorie | null = null): FeedEintrag {
  return { id: uid("f"), projekt_id, geraet_inventarnummer: geraet, ursprung, kategorie: ursprung === "manuell" ? kategorie : null, inhalt, autor_id, erstellt_am: new Date().toISOString() };
}

export const store = new Store();
