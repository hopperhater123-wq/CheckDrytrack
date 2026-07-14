// DryTrack — Datenmodell
// 1:1 abgeleitet aus "006 · Datenbank" (Notion, Source of Truth, Stand 12.07.2026).
// 17 Tabellen, deutsche Feldnamen wie im Schema dokumentiert.

// ---------------------------------------------------------------------------
// Enums (Enum-Werte exakt aus dem Schema)
// ---------------------------------------------------------------------------

export type Rolle = "monteur" | "disposition" | "projektleiter" | "admin_gf";

export type GeraetStatus = "lager" | "baustelle" | "werkstatt";
export type Eigentum = "eigen" | "gemietet";

// Status-Lebenszyklus Projekt (FR-PROJ-010/011)
export type ProjektStatus =
  | "angelegt"
  | "schadenaufnahme"
  | "kva_freigabe_ausstehend"
  | "freie_fahrt"
  | "trocknung_laeuft"
  | "kontrolle"
  | "strombrief"
  | "sanierung"
  | "abgeschlossen";

export type KontaminationArt = "sauber" | "faekalien" | "heizoel" | "schimmel" | "sonstige";

export type DaemmstoffStatus = "unbekannt" | "verdacht" | "bestaetigt";

// Feed-Eintrag (FR-KOMM-001/005)
export type FeedUrsprung =
  | "scan"
  | "zaehlerstand"
  | "teilabbau"
  | "e_check_faellig"
  | "check_in"
  | "check_out"
  | "manuell";

export type FeedKategorie =
  | "notiz"
  | "problem"
  | "hinweis"
  | "geraet"
  | "foto"
  | "kunde"
  | "dispo";

export type DokumentTyp =
  | "messprotokoll"
  | "schadensaufnahme_doku"
  | "erstbericht"
  | "abschlussbericht"
  | "abnahmeprotokoll"
  | "auftrag_abtretung"
  | "vertretervollmacht"
  | "ersatzfliesenbericht"
  | "kundenzufriedenheit"
  | "kva"
  | "strombrief";

export type Bewertungsmodell = "digit_grenzwert" | "vergleichsmessung" | "status_checkliste";
export type Messverfahren = "widerstand" | "dielektrisch";
export type Messanlass = "eingangsmessung" | "freimessung";

// Bauteil-/Bodenaufbau-Schichten. Boden: Oberbelag › Estrich › Dämmung (006 Datenbank);
// weitere Bauteile aus der Alt-System-Analyse 13.07.2026 (Putz, Mauerwerk, Decke, Schüttung, Dielung).
export type SchichtTyp =
  | "oberbelag" | "estrich" | "daemmung"
  | "putz" | "mauerwerk" | "decke_massiv" | "decke_abgehaengt" | "schuettung" | "dielung";

// Estrich-Bauart (Alt-System: SE mit/ohne FBH, Verbundestrich, Estrich auf Trennlage).
export type EstrichBauart = "schwimmend" | "verbund" | "trennlage";

// Status-Checkliste für Dämmstoffe/KMF (FR-MESS-001).
export interface MessStatusCheckliste {
  trocken: boolean;
  feucht: boolean;
  kontaminiert: boolean;
  austausch_erforderlich: boolean;
}

// ---------------------------------------------------------------------------
// Entitäten (17 Tabellen)
// ---------------------------------------------------------------------------

export interface Benutzer {
  id: string;
  name: string;
  microsoft_account_id: string;
  rolle: Rolle;
}

export interface Geraetetyp {
  id: string;
  bezeichnung: string;
  ist_freitext: boolean;
  leistungswert_kw: number | null;
  luftleistung_m3h: number | null;
}

export interface Geraet {
  inventarnummer: string; // PK, = Barcode-Inhalt
  geraetetyp_id: string;
  status: GeraetStatus;
  eigentum: Eigentum;
  e_check_datum: string | null; // ISO-Date
  aktuelles_projekt_id: string | null; // nur gesetzt wenn status=baustelle
}

export interface Versicherung {
  id: string;
  name: string;
}

export interface Projekt {
  id: string;
  projektnummer: string; // Format JJJJ-NNNN
  status: ProjektStatus;
  storniert: boolean;
  ist_erstmassnahme: boolean;
  bezeichnung: string; // Kurztitel (Kunde/Ort) — praktischer Zusatz für die Liste
  adresse: string;
  geo_lat: number | null;
  geo_lng: number | null;
  kontamination_art: KontaminationArt | null;
  gefaehrdungsbeurteilung_abgeschlossen: boolean;
  versicherung_id: string | null;
  // Objektdaten (Alt-System-Analyse 13.07.2026, Backlog ④)
  baujahr: number | null;
  geschosse: number | null;
  bauweise: string | null; // z. B. "Massiv", "Holzständer", "Fertighaus"
  aundv_unterschrieben: boolean; // Auftrag & Abtretungserklärung unterschrieben
  aundv_unterschrift: string | null; // PNG-Data-URL der Kundenunterschrift
  aundv_unterschrift_name: string | null; // Name des Unterzeichnenden
  aundv_datum: string | null; // ISO-Date der Unterzeichnung
  // Vertretervollmacht (Alt-System): Kunde bevollmächtigt das Unternehmen ggü. der Versicherung.
  vollmacht_unterschrift: string | null;
  vollmacht_unterschrift_name: string | null;
  vollmacht_datum: string | null;
  angelegt_von: string; // FK benutzer
  angelegt_am: string;
}

export interface Raum {
  id: string;
  projekt_id: string;
  bezeichnung: string;
  daemmstoff_status: DaemmstoffStatus | null;
  daemmstoff_material_id: string | null;
  // Raum-Stammdaten (Alt-System-Analyse 13.07.2026)
  raumtyp: string | null;
  geschoss: string | null; // z. B. "EG", "1. OG", "DG", "Keller"
  wohneinheit: string | null;
  // Trocknungsart
  trocknung_konstruktion: boolean | null;
  trocknung_raum: boolean | null;
  trocknung_schacht: boolean | null; // Schacht- und Hohlraumtrocknung
  // Zustand bei Trocknungsbeginn
  faekalschaden: boolean | null;
  freies_wasser: boolean | null;
  sichtbarer_schimmel: boolean | null;
  betroffene_flaeche_m2: number | null;
}

// Herzstück der Plattform (10 · Einsätze)
export interface Einsatz {
  id: string;
  projekt_id: string;
  geraet_inventarnummer: string;
  raum_id: string | null;
  aufbau_datum: string;
  abbau_datum: string | null; // NULL solange laufend
  zaehlerstand_start: number;
  zaehlerstand_ende: number | null;
  verbrauch_geschaetzt: boolean; // true = Fallback-Schätzung (FR-EINSATZ-003)
}

export interface FeedEintrag {
  id: string;
  projekt_id: string;
  geraet_inventarnummer: string | null;
  ursprung: FeedUrsprung;
  kategorie: FeedKategorie | null; // nur wenn ursprung=manuell
  inhalt: string;
  autor_id: string;
  erstellt_am: string;
}

export interface FeedKommentar {
  id: string;
  feed_eintrag_id: string;
  autor_id: string;
  inhalt: string;
  erstellt_am: string;
}

export interface Dokument {
  id: string;
  projekt_id: string;
  typ: DokumentTyp;
  speicher_referenz: string;
  erstellt_von: string;
  erstellt_am: string;
}

export interface Materialdatenbank {
  id: string;
  bezeichnung: string;
  kategorie: string | null;
  trocknungsfaehig: boolean | null;
  austauschpflichtig: boolean | null;
  bewertungsmodell: Bewertungsmodell;
  praxisgrenzwert_digit: number | null;
  // Ergänzung: in welcher Bodenaufbau-Schicht dieses Material vorkommt (für den Aufbau-Selektor).
  schicht_typ: SchichtTyp | null;
}

// Eine Schicht im Bauteilaufbau eines Raums (006 Datenbank + Alt-System-Analyse 13.07.2026).
export interface BodenaufbauSchicht {
  id: string;
  raum_id: string;
  reihenfolge: number; // 0 = oberste Schicht (Oberbelag); weitere Bauteile ab 10
  schicht_typ: SchichtTyp;
  material_id: string;
  fussbodenheizung: boolean | null; // nur estrich relevant
  bauart: EstrichBauart | null; // nur estrich relevant
}

export interface Messung {
  id: string;
  raum_id: string;
  material_id: string;
  messverfahren: Messverfahren;
  anzeige_digit: number | null;
  // Vergleichsmessung (FR-MESS-001): Referenz an garantiert trockener Vergleichsstelle.
  referenz_digit: number | null;
  // Status-Checkliste (FR-MESS-001) für Dämmstoffe/KMF statt eines Zahlenwerts.
  status_checkliste: MessStatusCheckliste | null;
  absolute_feuchte_g_kg: number | null;
  temperatur_c: number | null;
  rel_luftfeuchte_prozent: number | null;
  anlass: Messanlass;
  gemessen_von: string;
  gemessen_am: string;
}

export interface Grundriss {
  id: string;
  projekt_id: string;
  geschoss: string | null; // NEU (Backlog ⑤): eine Skizze je Geschoss (Keller/EG/1. OG/…)
  raumhoehe_m: number | null; // NEU: RHM aus der Skizze
  quelle: "magicplan" | "skizze_foto";
  datei_referenz: string;
  erstellt_am: string;
}

export interface GrundrissMarkierung {
  id: string;
  grundriss_id: string;
  raum_id: string | null;
  zielgruppe: "sanierer" | "trocknungsmonteur";
  text: string;
  erstellt_von: string;
  erstellt_am: string;
}

export interface Bemusterung {
  id: string;
  projekt_id: string;
  material_beschreibung: string;
  musterfoto_referenz: string | null;
  lieferant: string | null;
}

export interface RaumFoto {
  id: string;
  raum_id: string;
  kategorie: "uebersicht" | "schadenstelle";
  datei_referenz: string;
  aufgenommen_von: string;
  aufgenommen_am: string;
}

// Termin für die Wochenplanung (Alt-System-Analyse 13.07.2026, Backlog ③).
export interface Termin {
  id: string;
  projekt_id: string;
  datum: string; // ISO-Date
  uhrzeit: string | null; // "08:30"
  mitarbeiter_id: string | null; // FK benutzer, null = noch nicht zugewiesen
  beschreibung: string; // z. B. "TRO Abbau / CeraVogue setzen / WH aufnehmen"
  erledigt: boolean;
  erstellt_von: string;
  erstellt_am: string;
}

// Besuchsbericht mit Stundennachweis (Alt-System-Analyse 13.07.2026, Backlog ①).
export interface Besuchsbericht {
  id: string;
  projekt_id: string;
  datum: string; // ISO-Date des Besuchs
  naechster_termin: string | null; // ISO-Date
  fahrtkilometer: number | null;
  bemerkungen: string | null;
  geleistete_arbeiten: string;
  // Unterschriften auf dem Gerät (Backlog ②): PNG als Data-URL — wird im PDF angezeigt.
  unterschrift_kunde: string | null;
  unterschrift_kunde_name: string | null; // wer unterschrieben hat (VN/Auftraggeber)
  unterschrift_mitarbeiter: string | null;
  erstellt_von: string; // FK benutzer
  erstellt_am: string;
}

export interface StundenEintrag {
  id: string;
  besuchsbericht_id: string;
  mitarbeiter_name: string; // Freitext wie im Alt-System (nicht jeder Kollege ist App-Benutzer)
  gewerk: string; // z. B. "Trocknung"
  von: string; // "08:30"
  bis: string; // "14:30"
  pause_min: number;
}

// Abnahme der Trocknungsleistung durch den Kunden (Alt-System: Abnahmeprotokoll).
export type AbnahmeStatus = "ohne_mangel" | "mit_mangel" | "verweigert";

export interface Abnahmeprotokoll {
  id: string;
  projekt_id: string;
  datum: string; // ISO-Date der Abnahme
  abnahme_status: AbnahmeStatus;
  maengel: string | null; // Mängelbeschreibung (bei mit_mangel/verweigert)
  bemerkungen: string | null;
  unterschrift_kunde: string | null; // PNG-Data-URL
  unterschrift_kunde_name: string | null;
  unterschrift_mitarbeiter: string | null;
  erstellt_von: string; // FK benutzer
  erstellt_am: string;
}

// Kundenzufriedenheit (Alt-System): Bewertung der Leistung durch den Kunden (1–5) + Unterschrift.
export interface Kundenzufriedenheit {
  id: string;
  projekt_id: string;
  datum: string; // ISO-Date
  bewertung_freundlichkeit: number; // 1–5
  bewertung_sauberkeit: number;
  bewertung_termintreue: number;
  bewertung_qualitaet: number;
  weiterempfehlung: boolean;
  kommentar: string | null;
  unterschrift_kunde: string | null;
  unterschrift_kunde_name: string | null;
  erstellt_von: string;
  erstellt_am: string;
}

// Ersatzfliesenbericht (Alt-System): entfernte Fliesen, bemusterter Ersatz, Kundenbestätigung.
// Die bemusterten Materialien liegen in der Tabelle `bemusterung` (projektbezogen).
export interface Ersatzfliesenbericht {
  id: string;
  projekt_id: string;
  datum: string; // ISO-Date
  bemerkungen: string | null;
  unterschrift_kunde: string | null;
  unterschrift_kunde_name: string | null;
  unterschrift_mitarbeiter: string | null;
  erstellt_von: string;
  erstellt_am: string;
}

export interface FirmenEinstellung {
  schluessel: string; // z.B. freigabegrenze_eur
  wert: string;
}

// ---------------------------------------------------------------------------
// Aggregierter Datenbank-Zustand (alle 17 Tabellen)
// ---------------------------------------------------------------------------

export interface DryTrackDB {
  benutzer: Benutzer[];
  geraetetyp: Geraetetyp[];
  geraet: Geraet[];
  versicherung: Versicherung[];
  projekt: Projekt[];
  raum: Raum[];
  einsatz: Einsatz[];
  feed_eintrag: FeedEintrag[];
  feed_kommentar: FeedKommentar[];
  dokument: Dokument[];
  materialdatenbank: Materialdatenbank[];
  bodenaufbau_schicht: BodenaufbauSchicht[];
  messung: Messung[];
  grundriss: Grundriss[];
  grundriss_markierung: GrundrissMarkierung[];
  bemusterung: Bemusterung[];
  raum_foto: RaumFoto[];
  besuchsbericht: Besuchsbericht[];
  stunden_eintrag: StundenEintrag[];
  abnahmeprotokoll: Abnahmeprotokoll[];
  ersatzfliesenbericht: Ersatzfliesenbericht[];
  kundenzufriedenheit: Kundenzufriedenheit[];
  termin: Termin[];
  firmen_einstellung: FirmenEinstellung[];
}
