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
  | "kva"
  | "strombrief";

export type Bewertungsmodell = "digit_grenzwert" | "vergleichsmessung" | "status_checkliste";
export type Messverfahren = "widerstand" | "dielektrisch";
export type Messanlass = "eingangsmessung" | "freimessung";

// Bodenaufbau-Schichten (Oberbelag › Estrich › Dämmstoff), FR-KI-001-Dämmstoff-Konzept (006 Datenbank).
export type SchichtTyp = "oberbelag" | "estrich" | "daemmung";

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
  angelegt_von: string; // FK benutzer
  angelegt_am: string;
}

export interface Raum {
  id: string;
  projekt_id: string;
  bezeichnung: string;
  daemmstoff_status: DaemmstoffStatus | null;
  daemmstoff_material_id: string | null;
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

// Eine Schicht im Bodenaufbau eines Raums (Ergänzung — Dämmstoff-/Bauteil-Konzept aus 006 Datenbank).
export interface BodenaufbauSchicht {
  id: string;
  raum_id: string;
  reihenfolge: number; // 0 = oberste Schicht (Oberbelag)
  schicht_typ: SchichtTyp;
  material_id: string;
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
  firmen_einstellung: FirmenEinstellung[];
}
