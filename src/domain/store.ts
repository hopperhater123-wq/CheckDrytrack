// Offline-First-Datenhaltung (000 Vision: "Die Anwendung muss vollständig offline funktionieren").
// localStorage als lokale Quelle; ein Realtime-Backend (Supabase, siehe 008) würde hier andocken.
// Über das `storage`-Event synchronisieren offene Tabs live (Annäherung an FR-Realtime).

import type {
  DryTrackDB, Eigentum, Einsatz, EstrichBauart, FeedEintrag, FeedKategorie, Geraet, Geraetetyp, Messanlass,
  MessStatusCheckliste, Messverfahren, Projekt, ProjektStatus, Raum, SchichtTyp,
} from "./types";
import { absoluteFeuchteGKg } from "./mess";
import { seedDB } from "./seed";
import { diffAusStaenden, pkVon, pushDiff, starteSync, type TabelleName } from "./remote";

const STORAGE_KEY = "drytrack.db.v2"; // v2: Bodenaufbau/Messung-Felder ergänzt (Migration)
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
      if (raw) return this.normalize(JSON.parse(raw));
    } catch {
      /* fällt auf Seed zurück */
    }
    const fresh = seedDB();
    this.persist(fresh);
    return fresh;
  }

  /** Robust gegen ältere/teilweise Datenstände: fehlende Tabellen werden zu leeren Arrays. */
  private normalize(parsed: Partial<DryTrackDB>): DryTrackDB {
    const leer: DryTrackDB = {
      benutzer: [], geraetetyp: [], geraet: [], versicherung: [], projekt: [], raum: [],
      einsatz: [], feed_eintrag: [], feed_kommentar: [], dokument: [], materialdatenbank: [],
      bodenaufbau_schicht: [], messpunkt: [], messung: [], grundriss: [], grundriss_markierung: [],
      bemusterung: [], raum_foto: [], besuchsbericht: [], stunden_eintrag: [], abnahmeprotokoll: [],
      ersatzfliesenbericht: [], kundenzufriedenheit: [], notdiensteinsatzbericht: [], stundenlohnbericht: [],
      termin: [], trocknungsergebnis: [], firmen_einstellung: [],
    };
    const base = parsed.benutzer?.length ? leer : seedDB(); // ganz leerer Stand → Seed
    return { ...base, ...parsed } as DryTrackDB;
  }

  private persist(db: DryTrackDB) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    } catch {
      /* Speicher voll o.ä. — App bleibt trotzdem im Speicher nutzbar */
    }
  }

  private commit(mutate: (db: DryTrackDB) => void, stumm = false) {
    // Immutable Copy, damit React-Consumer sicher neu rendern.
    const prev = this.db;
    const next: DryTrackDB = structuredClone(prev);
    mutate(next);
    this.db = next;
    this.persist(next);
    this.emit();
    // Sync (008 Backend): Diff je Tabelle an Supabase — außer die Änderung KAM von dort.
    if (!stumm) pushDiff(diffAusStaenden(prev, next));
  }

  /** Kompletter Serverstand ersetzt den lokalen Cache (nach Pull). */
  private ersetzeVomServer(db: DryTrackDB) {
    this.db = this.normalize(db);
    this.persist(this.db);
    this.emit();
  }

  /** Einzelne Realtime-Änderung einspielen (kein Re-Push → stumm). */
  private wendeRemoteAn(tabelle: TabelleName, event: "INSERT" | "UPDATE" | "DELETE", neu: Record<string, unknown> | null, alt: Record<string, unknown> | null) {
    if (!(tabelle in this.db)) return; // Events fremder Tabellen (z. B. Alt-Schema) ignorieren
    const pk = pkVon(tabelle);
    this.commit((db) => {
      const rows = db[tabelle] as unknown as Record<string, unknown>[];
      if (event === "DELETE") {
        const key = alt?.[pk];
        db[tabelle] = rows.filter((r) => r[pk] !== key) as never;
      } else if (neu) {
        const i = rows.findIndex((r) => r[pk] === neu[pk]);
        if (i >= 0) rows[i] = neu; else rows.push(neu);
      }
    }, true);
  }

  /** Vom App-Start aufgerufen; ohne Konfiguration/Netz bleibt alles lokal. */
  starteRemoteSync() {
    void starteSync({
      ersetzen: (db) => this.ersetzeVomServer(db),
      anwenden: (t, e, n, a) => this.wendeRemoteAn(t, e, n, a),
    });
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
    // Mit Backend: frischen Serverstand ziehen statt lokalem Seed zu vertrauen.
    this.starteRemoteSync();
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
  // Geräte-Stammdaten (Neuanlage beim Scannen unbekannter Etiketten, FR-SCAN-001)
  // ---------------------------------------------------------------------------

  /** Neuen (Freitext-)Gerätetyp anlegen — z. B. beim Erfassen eines unbekannten Geräts. */
  addGeraetetyp(bezeichnung: string, leistungswert_kw: number | null = null): Geraetetyp {
    const typ: Geraetetyp = { id: uid("gt"), bezeichnung: bezeichnung.trim(), ist_freitext: true, leistungswert_kw, luftleistung_m3h: null };
    this.commit((db) => { db.geraetetyp.push(typ); });
    return typ;
  }

  /** Neues Gerät (Stammdaten) anlegen — Inventarnummer = Barcode-Inhalt. Standard: eigenes Gerät, im Lager. */
  addGeraet(params: { inventarnummer: string; geraetetyp_id: string; eigentum?: Eigentum }): { ok: boolean; error?: string } {
    const inv = params.inventarnummer.trim().toUpperCase();
    if (!inv) return { ok: false, error: "Inventarnummer fehlt." };
    if (this.db.geraet.some((g) => g.inventarnummer === inv)) return { ok: false, error: "Gerät mit dieser Nummer existiert bereits." };
    this.commit((db) => {
      db.geraet.push({
        inventarnummer: inv, geraetetyp_id: params.geraetetyp_id, status: "lager",
        eigentum: params.eigentum ?? "eigen", e_check_datum: null, aktuelles_projekt_id: null,
      });
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

  // Geführter Besuch (Arbeitsablauf): Ankunft/Abschluss am Objekt landen im Feed (FR-KOMM-001).
  checkIn(projekt_id: string, autor_id: string) {
    this.commit((db) => {
      db.feed_eintrag.push(autoFeed(projekt_id, null, "check_in", autor_id, "Am Objekt angekommen — Besuch gestartet."));
    });
  }

  checkOut(projekt_id: string, autor_id: string) {
    this.commit((db) => {
      db.feed_eintrag.push(autoFeed(projekt_id, null, "check_out", autor_id, "Besuch abgeschlossen."));
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
      baujahr: null, geschosse: null, bauweise: null, ansprechpartner: null, telefon: null, aundv_unterschrieben: false,
      aundv_unterschrift: null, aundv_unterschrift_name: null, aundv_datum: null,
      vollmacht_unterschrift: null, vollmacht_unterschrift_name: null, vollmacht_datum: null,
      angelegt_von: params.angelegt_von, angelegt_am: new Date().toISOString(),
    };
    this.commit((db) => { db.projekt.push(projekt); });
    return projekt;
  }

  /** Auftrag & Abtretungserklärung (A&A) unterschreiben — setzt Unterschrift + Datum am Projekt. */
  setAundV(params: { projekt_id: string; unterschrift: string | null; name: string | null; datum: string; autor_id: string }) {
    this.commit((db) => {
      const p = db.projekt.find((x) => x.id === params.projekt_id);
      if (!p) return;
      p.aundv_unterschrift = params.unterschrift;
      p.aundv_unterschrift_name = params.name;
      p.aundv_datum = params.datum;
      p.aundv_unterschrieben = true;
      db.feed_eintrag.push(autoFeed(params.projekt_id, null, "manuell", params.autor_id, "Auftrag & Abtretungserklärung (A&A) unterschrieben.", "kunde"));
    });
  }

  /** Vertretervollmacht unterschreiben — setzt Unterschrift + Datum am Projekt. */
  setVollmacht(params: { projekt_id: string; unterschrift: string | null; name: string | null; datum: string; autor_id: string }) {
    this.commit((db) => {
      const p = db.projekt.find((x) => x.id === params.projekt_id);
      if (!p) return;
      p.vollmacht_unterschrift = params.unterschrift;
      p.vollmacht_unterschrift_name = params.name;
      p.vollmacht_datum = params.datum;
      db.feed_eintrag.push(autoFeed(params.projekt_id, null, "manuell", params.autor_id, "Vertretervollmacht unterschrieben.", "kunde"));
    });
  }

  /** Objektdaten pflegen (Baujahr/Geschosse/Bauweise/A&A), Backlog ④. */
  setObjektdaten(projekt_id: string, patch: Partial<Pick<Projekt, "baujahr" | "geschosse" | "bauweise" | "aundv_unterschrieben" | "ansprechpartner" | "telefon">>) {
    this.commit((db) => {
      const p = db.projekt.find((x) => x.id === projekt_id);
      if (p) Object.assign(p, patch);
    });
  }

  addRaum(projekt_id: string, bezeichnung: string): Raum {
    const raum: Raum = {
      id: uid("r"), projekt_id, bezeichnung, daemmstoff_status: "unbekannt", daemmstoff_material_id: null,
      raumtyp: null, geschoss: null, wohneinheit: null,
      trocknung_konstruktion: null, trocknung_raum: null, trocknung_schacht: null,
      faekalschaden: null, freies_wasser: null, sichtbarer_schimmel: null, betroffene_flaeche_m2: null,
    };
    this.commit((db) => { db.raum.push(raum); });
    return raum;
  }

  /** Raum-Stammdaten, Trocknungsart und Zustand bei Trocknungsbeginn (Alt-System-Analyse 13.07.2026). */
  setRaumDetails(raum_id: string, details: Partial<Omit<Raum, "id" | "projekt_id">>) {
    this.commit((db) => {
      const raum = db.raum.find((r) => r.id === raum_id);
      if (raum) Object.assign(raum, details);
    });
  }

  /** Bauteilaufbau eines Raums setzen. Boden (Reihenfolge 0–2) + weitere Bauteile (ab 10). */
  setBodenaufbau(
    raum_id: string,
    schichten: { schicht_typ: SchichtTyp; material_id: string | null; fussbodenheizung?: boolean | null; bauart?: EstrichBauart | null }[],
  ) {
    this.commit((db) => {
      db.bodenaufbau_schicht = db.bodenaufbau_schicht.filter((s) => s.raum_id !== raum_id);
      schichten.forEach((s, i) => {
        if (!s.material_id) return;
        db.bodenaufbau_schicht.push({
          id: uid("bs"), raum_id, reihenfolge: i, schicht_typ: s.schicht_typ, material_id: s.material_id,
          fussbodenheizung: s.schicht_typ === "estrich" ? (s.fussbodenheizung ?? null) : null,
          bauart: s.schicht_typ === "estrich" ? (s.bauart ?? null) : null,
        });
      });
      // Dämmstoff-Status am Raum mitziehen (006 Datenbank): Dämmschicht bekannt → mind. "verdacht".
      const raum = db.raum.find((r) => r.id === raum_id);
      const daemmung = schichten.find((s) => s.schicht_typ === "daemmung" && s.material_id);
      if (raum) {
        raum.daemmstoff_material_id = daemmung?.material_id ?? null;
        if (daemmung && raum.daemmstoff_status === "unbekannt") raum.daemmstoff_status = "verdacht";
      }
    });
  }

  /** Messung erfassen (FR-MESS-001/003/006). Absolute Feuchte wird aus Temp + rel. Feuchte berechnet. */
  // Ergebnis der Trocknung je Geschoss (Alt-System): Upsert auf (projekt, geschoss).
  setTrocknungsergebnis(params: {
    projekt_id: string; geschoss: string; autor_id: string;
    beginn_datum?: string | null; abgeschlossen?: boolean; bemerkungen?: string | null;
    unterschrift_kunde?: string | null; unterschrift_kunde_name?: string | null;
  }) {
    this.commit((db) => {
      let e = db.trocknungsergebnis.find((x) => x.projekt_id === params.projekt_id && x.geschoss === params.geschoss);
      if (!e) {
        e = {
          id: uid("te"), projekt_id: params.projekt_id, geschoss: params.geschoss,
          beginn_datum: null, abgeschlossen: false, bemerkungen: null,
          unterschrift_kunde: null, unterschrift_kunde_name: null,
          erstellt_von: params.autor_id, erstellt_am: new Date().toISOString(),
        };
        db.trocknungsergebnis.push(e);
      }
      if (params.beginn_datum !== undefined) e.beginn_datum = params.beginn_datum;
      if (params.abgeschlossen !== undefined) e.abgeschlossen = params.abgeschlossen;
      if (params.bemerkungen !== undefined) e.bemerkungen = params.bemerkungen;
      if (params.unterschrift_kunde !== undefined) e.unterschrift_kunde = params.unterschrift_kunde;
      if (params.unterschrift_kunde_name !== undefined) e.unterschrift_kunde_name = params.unterschrift_kunde_name;
    });
  }

  // Benannte Messpunkte (Alt-System-Matrix): je Raum wiederkehrende Messstellen.
  addMesspunkt(params: { raum_id: string; bezeichnung: string; messort: string | null; tiefe_cm: number | null; material_id: string | null }) {
    this.commit((db) => {
      db.messpunkt.push({ id: uid("mp"), ...params });
    });
  }

  removeMesspunkt(id: string) {
    this.commit((db) => {
      db.messpunkt = db.messpunkt.filter((m) => m.id !== id);
      // Messungen behalten — nur die Zuordnung lösen.
      for (const m of db.messung) if (m.messpunkt_id === id) m.messpunkt_id = null;
    });
  }

  addMessung(params: {
    raum_id: string; messpunkt_id: string | null; material_id: string; messverfahren: Messverfahren; anlass: Messanlass;
    anzeige_digit: number | null; referenz_digit: number | null;
    status_checkliste: MessStatusCheckliste | null;
    temperatur_c: number | null; rel_luftfeuchte_prozent: number | null;
    stroemung_m_s: number | null; messgeraet: string | null;
    gemessen_von: string;
  }) {
    const abs = params.temperatur_c != null && params.rel_luftfeuchte_prozent != null
      ? absoluteFeuchteGKg(params.temperatur_c, params.rel_luftfeuchte_prozent) : null;
    this.commit((db) => {
      db.messung.push({
        id: uid("me"), raum_id: params.raum_id, messpunkt_id: params.messpunkt_id, material_id: params.material_id,
        messverfahren: params.messverfahren, anzeige_digit: params.anzeige_digit,
        referenz_digit: params.referenz_digit, status_checkliste: params.status_checkliste,
        absolute_feuchte_g_kg: abs, temperatur_c: params.temperatur_c,
        rel_luftfeuchte_prozent: params.rel_luftfeuchte_prozent,
        stroemung_m_s: params.stroemung_m_s, messgeraet: params.messgeraet, anlass: params.anlass,
        gemessen_von: params.gemessen_von, gemessen_am: new Date().toISOString(),
      });
    });
  }

  /** Besuchsbericht mit Stundennachweis anlegen (Alt-System-Analyse, Backlog ①). */
  addBesuchsbericht(params: {
    projekt_id: string; datum: string; naechster_termin: string | null; fahrtkilometer: number | null;
    bemerkungen: string | null; geleistete_arbeiten: string;
    stunden: { mitarbeiter_name: string; gewerk: string; von: string; bis: string; pause_min: number }[];
    unterschrift_kunde: string | null; unterschrift_kunde_name: string | null; unterschrift_mitarbeiter: string | null;
    erstellt_von: string;
  }) {
    const berichtId = uid("bb");
    this.commit((db) => {
      db.besuchsbericht.push({
        id: berichtId, projekt_id: params.projekt_id, datum: params.datum,
        naechster_termin: params.naechster_termin, fahrtkilometer: params.fahrtkilometer,
        bemerkungen: params.bemerkungen, geleistete_arbeiten: params.geleistete_arbeiten,
        unterschrift_kunde: params.unterschrift_kunde, unterschrift_kunde_name: params.unterschrift_kunde_name,
        unterschrift_mitarbeiter: params.unterschrift_mitarbeiter,
        erstellt_von: params.erstellt_von, erstellt_am: new Date().toISOString(),
      });
      params.stunden.forEach((s) => {
        db.stunden_eintrag.push({ id: uid("st"), besuchsbericht_id: berichtId, ...s });
      });
      db.feed_eintrag.push(autoFeed(params.projekt_id, null, "check_out", params.erstellt_von,
        `Besuchsbericht vom ${new Date(params.datum).toLocaleDateString("de-DE")} erstellt (${params.stunden.length} Stunden-Einträge).`));
    });
    return berichtId;
  }

  /** Abnahmeprotokoll anlegen (Kunden-Abnahme der Trocknungsleistung, mit Unterschriften). */
  addAbnahmeprotokoll(params: {
    projekt_id: string; datum: string; abnahme_status: import("./types").AbnahmeStatus;
    maengel: string | null; bemerkungen: string | null;
    unterschrift_kunde: string | null; unterschrift_kunde_name: string | null; unterschrift_mitarbeiter: string | null;
    erstellt_von: string;
  }) {
    const id = uid("ap");
    this.commit((db) => {
      db.abnahmeprotokoll.push({
        id, projekt_id: params.projekt_id, datum: params.datum, abnahme_status: params.abnahme_status,
        maengel: params.maengel, bemerkungen: params.bemerkungen,
        unterschrift_kunde: params.unterschrift_kunde, unterschrift_kunde_name: params.unterschrift_kunde_name,
        unterschrift_mitarbeiter: params.unterschrift_mitarbeiter,
        erstellt_von: params.erstellt_von, erstellt_am: new Date().toISOString(),
      });
      const status = params.abnahme_status === "ohne_mangel" ? "ohne Mängel"
        : params.abnahme_status === "mit_mangel" ? "mit Mängeln" : "verweigert";
      db.feed_eintrag.push(autoFeed(params.projekt_id, null, "check_out", params.erstellt_von,
        `Abnahmeprotokoll vom ${new Date(params.datum).toLocaleDateString("de-DE")} erstellt (Abnahme ${status}).`));
    });
    return id;
  }

  /** Bemusterung (Ersatzmaterial) zu einem Projekt erfassen — Art, Beschreibung, Lieferant, Musterfoto, Menge. */
  addBemusterung(params: { projekt_id: string; material_beschreibung: string; lieferant: string | null; musterfoto_referenz: string | null; menge?: string | null; art?: import("./types").BemusterungArt }) {
    this.commit((db) => {
      db.bemusterung.push({
        id: uid("bm"), projekt_id: params.projekt_id, material_beschreibung: params.material_beschreibung,
        musterfoto_referenz: params.musterfoto_referenz, lieferant: params.lieferant,
        art: params.art ?? "sonstiges", bestellstatus: "ausgewaehlt", menge: params.menge ?? null, bestelldatum: null,
      });
    });
  }

  /** Bestellstatus des Ersatzmaterials setzen (schlanker Bestellweg, kein ERP). */
  setBemusterungStatus(id: string, status: import("./types").Bestellstatus) {
    this.commit((db) => {
      const b = db.bemusterung.find((x) => x.id === id);
      if (!b) return;
      b.bestellstatus = status;
      // Bestelldatum beim ersten Wechsel auf „bestellt" festhalten.
      if (status === "bestellt" && !b.bestelldatum) b.bestelldatum = new Date().toISOString();
      if (status === "ausgewaehlt") b.bestelldatum = null;
    });
  }

  removeBemusterung(id: string) {
    this.commit((db) => { db.bemusterung = db.bemusterung.filter((b) => b.id !== id); });
  }

  /** Ersatzfliesenbericht anlegen (Kundenbestätigung des bemusterten Ersatzes, mit Unterschriften). */
  addErsatzfliesenbericht(params: {
    projekt_id: string; datum: string; bemerkungen: string | null;
    unterschrift_kunde: string | null; unterschrift_kunde_name: string | null; unterschrift_mitarbeiter: string | null;
    erstellt_von: string;
  }) {
    const id = uid("ef");
    this.commit((db) => {
      db.ersatzfliesenbericht.push({
        id, projekt_id: params.projekt_id, datum: params.datum, bemerkungen: params.bemerkungen,
        unterschrift_kunde: params.unterschrift_kunde, unterschrift_kunde_name: params.unterschrift_kunde_name,
        unterschrift_mitarbeiter: params.unterschrift_mitarbeiter,
        erstellt_von: params.erstellt_von, erstellt_am: new Date().toISOString(),
      });
      db.feed_eintrag.push(autoFeed(params.projekt_id, null, "check_out", params.erstellt_von,
        `Ersatzfliesenbericht vom ${new Date(params.datum).toLocaleDateString("de-DE")} erstellt.`));
    });
    return id;
  }

  /** Kundenzufriedenheit erfassen (Bewertung 1–5 je Dimension + Weiterempfehlung + Unterschrift). */
  addKundenzufriedenheit(params: {
    projekt_id: string; datum: string;
    bewertung_freundlichkeit: number; bewertung_sauberkeit: number; bewertung_termintreue: number; bewertung_qualitaet: number;
    weiterempfehlung: boolean; kommentar: string | null;
    unterschrift_kunde: string | null; unterschrift_kunde_name: string | null; erstellt_von: string;
  }) {
    const id = uid("kz");
    this.commit((db) => {
      db.kundenzufriedenheit.push({
        id, projekt_id: params.projekt_id, datum: params.datum,
        bewertung_freundlichkeit: params.bewertung_freundlichkeit, bewertung_sauberkeit: params.bewertung_sauberkeit,
        bewertung_termintreue: params.bewertung_termintreue, bewertung_qualitaet: params.bewertung_qualitaet,
        weiterempfehlung: params.weiterempfehlung, kommentar: params.kommentar,
        unterschrift_kunde: params.unterschrift_kunde, unterschrift_kunde_name: params.unterschrift_kunde_name,
        erstellt_von: params.erstellt_von, erstellt_am: new Date().toISOString(),
      });
      const schnitt = ((params.bewertung_freundlichkeit + params.bewertung_sauberkeit + params.bewertung_termintreue + params.bewertung_qualitaet) / 4).toFixed(1);
      db.feed_eintrag.push(autoFeed(params.projekt_id, null, "manuell", params.erstellt_von, `Kundenzufriedenheit erfasst (Ø ${schnitt}/5${params.weiterempfehlung ? ", weiterempfohlen" : ""}).`, "kunde"));
    });
    return id;
  }

  /** Notdienst-Einsatzbericht anlegen (Erstmaßnahme mit Sofortmaßnahmen + Unterschriften). */
  addNotdiensteinsatzbericht(params: {
    projekt_id: string; datum: string; alarmierung: string | null; ankunft: string | null;
    schadenursache: string | null; sofortmassnahmen: string; bemerkungen: string | null;
    unterschrift_kunde: string | null; unterschrift_kunde_name: string | null; unterschrift_mitarbeiter: string | null;
    erstellt_von: string;
  }) {
    const id = uid("nd");
    this.commit((db) => {
      db.notdiensteinsatzbericht.push({
        id, projekt_id: params.projekt_id, datum: params.datum, alarmierung: params.alarmierung, ankunft: params.ankunft,
        schadenursache: params.schadenursache, sofortmassnahmen: params.sofortmassnahmen, bemerkungen: params.bemerkungen,
        unterschrift_kunde: params.unterschrift_kunde, unterschrift_kunde_name: params.unterschrift_kunde_name,
        unterschrift_mitarbeiter: params.unterschrift_mitarbeiter,
        erstellt_von: params.erstellt_von, erstellt_am: new Date().toISOString(),
      });
      db.feed_eintrag.push(autoFeed(params.projekt_id, null, "check_in", params.erstellt_von,
        `Notdienst-Einsatzbericht vom ${new Date(params.datum).toLocaleDateString("de-DE")} erstellt.`));
    });
    return id;
  }

  /** Stundenlohnbericht anlegen (Regie-/Stundenlohnarbeiten: Stunden + Material + Unterschriften). */
  addStundenlohnbericht(params: {
    projekt_id: string; datum: string;
    stunden: import("./types").StundenlohnStunde[]; material: import("./types").StundenlohnMaterial[];
    schadenrolle: string | null; fahrtkilometer: number | null;
    hin_und_rueckfahrt: boolean; anteilig: boolean; naechster_termin: string | null;
    bemerkungen: string | null;
    unterschrift_kunde: string | null; unterschrift_kunde_name: string | null; unterschrift_mitarbeiter: string | null;
    erstellt_von: string;
  }) {
    const id = uid("sl");
    this.commit((db) => {
      db.stundenlohnbericht.push({
        id, projekt_id: params.projekt_id, datum: params.datum,
        stunden: params.stunden, material: params.material,
        schadenrolle: params.schadenrolle, fahrtkilometer: params.fahrtkilometer,
        hin_und_rueckfahrt: params.hin_und_rueckfahrt, anteilig: params.anteilig,
        naechster_termin: params.naechster_termin, bemerkungen: params.bemerkungen,
        unterschrift_kunde: params.unterschrift_kunde, unterschrift_kunde_name: params.unterschrift_kunde_name,
        unterschrift_mitarbeiter: params.unterschrift_mitarbeiter,
        erstellt_von: params.erstellt_von, erstellt_am: new Date().toISOString(),
      });
      const summe = params.stunden.reduce((s, z) => s + (Number.isFinite(z.stunden) ? z.stunden : 0), 0);
      db.feed_eintrag.push(autoFeed(params.projekt_id, null, "check_out", params.erstellt_von,
        `Stundenlohnbericht vom ${new Date(params.datum).toLocaleDateString("de-DE")} erstellt (${summe.toLocaleString("de-DE")} h, ${params.material.length} Materialposten).`));
    });
    return id;
  }

  /** Termin anlegen (Wochenplanung, Backlog ③). */
  addTermin(params: { projekt_id: string; datum: string; uhrzeit: string | null; mitarbeiter_id: string | null; beschreibung: string; erstellt_von: string }) {
    this.commit((db) => {
      db.termin.push({
        id: uid("t"), projekt_id: params.projekt_id, datum: params.datum, uhrzeit: params.uhrzeit,
        mitarbeiter_id: params.mitarbeiter_id, beschreibung: params.beschreibung,
        erledigt: false, erstellt_von: params.erstellt_von, erstellt_am: new Date().toISOString(),
      });
    });
  }

  setTerminErledigt(termin_id: string, erledigt: boolean) {
    this.commit((db) => {
      const t = db.termin.find((x) => x.id === termin_id);
      if (t) t.erledigt = erledigt;
    });
  }

  geraetById(inv: string): Geraet | undefined {
    return this.db.geraet.find((g) => g.inventarnummer === inv);
  }

  /** Grundriss je Geschoss anlegen/ersetzen (Backlog ⑤; FR-KI-004 MagicPlan, FR-KI-005 Skizze/Foto). */
  setGrundriss(projekt_id: string, geschoss: string | null, quelle: "magicplan" | "skizze_foto", datei_referenz: string) {
    this.commit((db) => {
      db.grundriss = db.grundriss.filter((g) => !(g.projekt_id === projekt_id && g.geschoss === geschoss));
      db.grundriss.push({ id: uid("gr"), projekt_id, geschoss, raumhoehe_m: null, quelle, datei_referenz, erstellt_am: new Date().toISOString() });
    });
  }

  /** Weitere Skizze zum selben Geschoss hinzufügen (Alt-System: "Skizze 1 von 3"). */
  addGrundriss(projekt_id: string, geschoss: string | null, quelle: "magicplan" | "skizze_foto", datei_referenz: string) {
    this.commit((db) => {
      db.grundriss.push({ id: uid("gr"), projekt_id, geschoss, raumhoehe_m: null, quelle, datei_referenz, erstellt_am: new Date().toISOString() });
    });
  }

  /** Raumhöhe (RHM) einer Skizze setzen. */
  setGrundrissRaumhoehe(grundriss_id: string, raumhoehe_m: number | null) {
    this.commit((db) => {
      const g = db.grundriss.find((x) => x.id === grundriss_id);
      if (g) g.raumhoehe_m = raumhoehe_m;
    });
  }

  /** Skizzen-/Fotobild eines Grundrisses ersetzen (Upload oder Annotation). */
  setGrundrissBild(grundriss_id: string, datei_referenz: string) {
    this.commit((db) => {
      const g = db.grundriss.find((x) => x.id === grundriss_id);
      if (g) { g.datei_referenz = datei_referenz; g.quelle = "skizze_foto"; }
    });
  }

  /** Raumfoto-Bild ersetzen (Annotation wird ins Bild eingebrannt). */
  setRaumFotoBild(foto_id: string, datei_referenz: string) {
    this.commit((db) => {
      const f = db.raum_foto.find((x) => x.id === foto_id);
      if (f) f.datei_referenz = datei_referenz;
    });
  }

  /** Dokument protokollieren (z. B. erzeugter Strombrief, 14 · Dokumente). */
  addDokument(params: { projekt_id: string; typ: import("./types").DokumentTyp; speicher_referenz: string; erstellt_von: string }) {
    this.commit((db) => {
      db.dokument.push({
        id: uid("d"), projekt_id: params.projekt_id, typ: params.typ,
        speicher_referenz: params.speicher_referenz, erstellt_von: params.erstellt_von,
        erstellt_am: new Date().toISOString(),
      });
      db.feed_eintrag.push(autoFeed(params.projekt_id, null, "manuell", params.erstellt_von, `Dokument erstellt: ${params.typ}.`, "dispo"));
    });
  }

  /** Raum-Foto anlegen (14 · Dokumente / FlashApp-Ersatz). Bild als komprimierte Data-URL. */
  addRaumFoto(params: { raum_id: string; kategorie: "uebersicht" | "schadenstelle"; datei_referenz: string; aufgenommen_von: string }) {
    this.commit((db) => {
      db.raum_foto.push({
        id: uid("rf"), raum_id: params.raum_id, kategorie: params.kategorie,
        datei_referenz: params.datei_referenz, aufgenommen_von: params.aufgenommen_von,
        aufgenommen_am: new Date().toISOString(),
      });
    });
  }

  /** Raum-Foto entfernen. */
  removeRaumFoto(foto_id: string) {
    this.commit((db) => { db.raum_foto = db.raum_foto.filter((f) => f.id !== foto_id); });
  }

  /** Markierung auf dem Grundriss (FR-PROJ-025): Hinweis für Sanierer oder Trocknungsmonteur. */
  addMarkierung(params: { grundriss_id: string; raum_id: string | null; zielgruppe: "sanierer" | "trocknungsmonteur"; text: string; erstellt_von: string }) {
    this.commit((db) => {
      db.grundriss_markierung.push({
        id: uid("gm"), grundriss_id: params.grundriss_id, raum_id: params.raum_id,
        zielgruppe: params.zielgruppe, text: params.text, erstellt_von: params.erstellt_von,
        erstellt_am: new Date().toISOString(),
      });
    });
  }
}

function autoFeed(projekt_id: string, geraet: string | null, ursprung: FeedEintrag["ursprung"], autor_id: string, inhalt: string, kategorie: FeedKategorie | null = null): FeedEintrag {
  return { id: uid("f"), projekt_id, geraet_inventarnummer: geraet, ursprung, kategorie: ursprung === "manuell" ? kategorie : null, inhalt, autor_id, erstellt_am: new Date().toISOString() };
}

export const store = new Store();
