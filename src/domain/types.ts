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

// Kostenträger-Klärung (F4): wer zahlt den Schaden? Bis geklärt bleibt es offen.
export type Kostentraeger = "gebaeude_vs" | "hausrat_vs" | "verursacher" | "privat" | "ungeklaert";
export type KostentraegerStatus = "offen" | "in_klaerung" | "geklaert";

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
  | "notdienst_einsatzbericht"
  | "stundenlohnbericht"
  | "zusatzerklaerung"
  | "organschaft"
  | "auftrag_schadenbeseitigung"
  | "einwilligung_befragung"
  | "merkblatt_hochwasser"
  | "kva"
  | "strombrief";

export type Bewertungsmodell = "digit_grenzwert" | "vergleichsmessung" | "status_checkliste";
export type Messverfahren = "widerstand" | "dielektrisch" | "hygrometer" | "kernfeuchte";
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
  // Kostenträger-Klärung (F4, 21.07.): „Wer zahlt?" ist oft lange unklar
  // (Hausrat- vs. Gebäude-VS, Verursacher/Installateur, privat). Bis geklärt
  // warnt ein Banner im Projekt.
  kostentraeger?: Kostentraeger | null;
  kostentraeger_status?: KostentraegerStatus; // offen | in_klaerung | geklaert
  kostentraeger_notiz?: string | null;
  // Objektdaten (Alt-System-Analyse 13.07.2026, Backlog ④)
  baujahr: number | null;
  geschosse: number | null;
  bauweise: string | null; // z. B. "Massiv", "Holzständer", "Fertighaus"
  // Kontakt vor Ort (Alt-System: "VN Frau Fässer 0866 94390 ab 9 Uhr da" im Termin-Betreff).
  ansprechpartner: string | null;
  telefon: string | null;
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
  // Trocknungsmethode + Erschwernisse (F7, 21.07.): WIE getrocknet wird und WARUM
  // es zäh ist (z. B. Latexfarbe = Dampfsperre, Kalksandstein). Rechtfertigt Dauer
  // und Mehrkosten gegenüber der Versicherung.
  trocknungsmethode?: string | null; // Schlüssel aus TROCKNUNGSMETHODE_OPTIONEN
  erschwernisse?: string[]; // Schlüssel aus ERSCHWERNIS_OPTIONEN
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
  // Errungenschaften aus „Torrek Scan": Beweisfoto vom Zähler (Auf-/Abbau) + Notiz.
  foto_start: string | null; // Zählerfoto beim Aufbau (komprimierte JPEG-Data-URL)
  foto_ende: string | null;  // Zählerfoto beim Abbau
  notiz: string | null;      // freie Notiz zum Einsatz
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

// Benannter Messpunkt je Raum (Alt-System: Zeilen der Messprotokoll-Matrix,
// z. B. "Randfuge Süd", "Putzmessung Wand", "Raumluft") — wird Besuch für Besuch
// erneut gemessen, optional mit Messort und Bohrtiefe.
export interface Messpunkt {
  id: string;
  raum_id: string;
  bezeichnung: string;
  messort: string | null; // z. B. "Wand Nord, 30 cm über OKF"
  tiefe_cm: number | null; // Bohrtiefe (6-mm-Bohrung, Schachtmessung)
  material_id: string | null; // Standard-Material/Messstelle dieses Punkts
}

export interface Messung {
  id: string;
  raum_id: string;
  // Zuordnung zu einem benannten Messpunkt (optional — Einzelmessungen bleiben möglich).
  messpunkt_id: string | null;
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
  // Luftgeschwindigkeit in m/s (Alt-System-Spalte, Anemometer bei Schacht-/Hohlraumtrocknung).
  stroemung_m_s: number | null;
  // Messgerät mit Nummer (Alt-System-Maske "Messgeräte": Uni 2 / RTU 600 + Pflicht-Gerätenummer).
  messgeraet: string | null;
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
  // Art der Markierung (F6): Schadensursache (wo das Wasser herkommt) vs.
  // Feuchtestelle (wo es ankommt/nass ist) vs. allgemeiner Hinweis.
  art?: MarkierungArt;
  // Befund-Layer (F14): gezeichnete Kategorie (Farbe/Form via BEFUND_KATEGORIEN),
  // Status offen→erledigt (Legende „markiert/erledigt"), Geometrie als JSON
  // (normierte 0..1-Koordinaten über der aktuellen Skizze). Alle optional —
  // Text-Hinweise ohne Zeichnung bleiben unverändert gültig.
  kategorie?: string;
  status?: MarkierungStatus;
  geometrie?: string;
  text: string;
  erstellt_von: string;
  erstellt_am: string;
}
export type MarkierungArt = "schadensursache" | "feuchtestelle" | "hinweis";
export type MarkierungStatus = "offen" | "erledigt";
// Gezeichnete Befund-Geometrie auf der Skizze (normiert 0..1).
export type BefundGeometrie =
  | { form: "flaeche"; x: number; y: number; w: number; h: number }
  | { form: "linie"; x1: number; y1: number; x2: number; y2: number }
  | { form: "punkt"; x: number; y: number };

// Projektweite Maßnahme (F15): abzuarbeitende Tätigkeit — z. B. „Tür demontieren",
// „malern + Iso". Ergänzt die am Grundriss gezeichneten Befunde um freie Text-Maßnahmen,
// die es nicht nur in der Zeichnung, sondern projektweit (Karte + Dossier) zu vermerken gilt.
export interface Massnahme {
  id: string;
  projekt_id: string;
  raum_id: string | null;
  kategorie?: string; // optional aus BEFUND_KATEGORIEN
  text: string;
  status: MarkierungStatus; // offen | erledigt (gleiche Semantik wie Befund)
  erledigt_am: string | null;
  erstellt_von: string;
  erstellt_am: string;
}

// Ursachen-Chronik (F6): wer wann was zur Schadensursache festgestellt hat.
// Die Beweiskette gegen das „wer-ist-schuld"-Pingpong (Leckortung → Installateur …).
export type UrsacheQuelle = "leckortung" | "installateur" | "sanierer" | "gutachter" | "wir" | "sonstige";
export interface UrsacheEintrag {
  id: string;
  projekt_id: string;
  datum: string; // ISO-Date der Feststellung
  quelle: UrsacheQuelle;
  text: string;
  foto: string | null; // optionale komprimierte Data-URL
  erstellt_von: string;
  erstellt_am: string;
}

// Bestellweg des Ersatzmaterials nach der Bemusterung (schlank — kein ERP):
// ausgewählt (Kunde hat gewählt) → bestellt → geliefert.
export type Bestellstatus = "ausgewaehlt" | "bestellt" | "geliefert";

// Art des bemusterten Materials. Einleger (Cera-Vogue-System) verschließen die zur
// Trocknung gebohrten Löcher — Menge ≈ Anzahl der Bohrlöcher, gezählt in Stück.
export type BemusterungArt =
  | "einleger_keramik" | "einleger_edelstahl" | "sondereinleger"
  | "ersatzfliese" | "parkett" | "laminat" | "vinyl" | "teppich" | "sockelleiste" | "sonstiges";

export interface Bemusterung {
  id: string;
  projekt_id: string;
  material_beschreibung: string;
  musterfoto_referenz: string | null;
  lieferant: string | null;
  // Ersatzmaterial-Bestellung (additiv, 013 Geschäftsprozess Schritt „Bemusterung → Bestellung → Einbau").
  art: BemusterungArt;
  bestellstatus: Bestellstatus;
  menge: string | null; // frei, z. B. „14 Stück" (Einleger) oder „24 m²" (Bodenbelag)
  bestelldatum: string | null; // gesetzt beim Wechsel auf „bestellt"
}

export interface RaumFoto {
  id: string;
  raum_id: string;
  kategorie: "uebersicht" | "schadenstelle" | "pano"; // pano = 360°-Rundumblick (equirectangular)
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
  // Auftrags-Briefing (F1, 21.07.): Büro pflegt Detail-Auftrag + Mitnehm-Checkliste,
  // Monteur sieht es in „Mein Tag" vor der Abfahrt. briefing_stand/-quittiert steuern
  // den „Auftrag geändert/neu"-Hinweis (stand = letzte Büro-Änderung, quittiert = gesehen).
  briefing?: string | null;
  mitnehmen?: string[]; // Schlüssel aus MITNEHMEN_OPTIONEN (z. B. "ausweis")
  briefing_stand?: string | null; // ISO-Zeitpunkt der letzten Büro-Änderung
  briefing_quittiert?: string | null; // ISO-Zeitpunkt „vom Monteur zur Kenntnis genommen"
  // Kontrolltermin mit Entscheidungs-Gate (F8): „in 2 Wochen schauen" ist kein
  // Merkzettel im Kopf — beim Erledigen ist eine Entscheidung fällig.
  kontrolle?: boolean;
  kontrolle_ergebnis?: KontrollErgebnis | null;
  kontrolle_notiz?: string | null;
  erstellt_von: string;
  erstellt_am: string;
}
export type KontrollErgebnis = "erfolg" | "verlaengern" | "methode_aendern";

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

// Stundenlohnbericht (Alt-System): Regie-/Stundenlohnarbeiten mit Stundennachweis + Materialliste.
export interface StundenlohnStunde { mitarbeiter_name: string; taetigkeit: string; stunden: number }
export interface StundenlohnMaterial { bezeichnung: string; menge: number; einheit: string }

export interface Stundenlohnbericht {
  id: string;
  projekt_id: string;
  datum: string; // ISO-Date
  stunden: StundenlohnStunde[];
  material: StundenlohnMaterial[];
  // Felder aus dem Alt-System-Formular (Frame-Analyse 15.07.2026)
  schadenrolle: string | null;
  fahrtkilometer: number | null;
  hin_und_rueckfahrt: boolean;
  anteilig: boolean;
  naechster_termin: string | null; // ISO-Date
  bemerkungen: string | null;
  unterschrift_kunde: string | null;
  unterschrift_kunde_name: string | null;
  unterschrift_mitarbeiter: string | null;
  erstellt_von: string;
  erstellt_am: string;
}

// Notdienst-Einsatzbericht (Alt-System): Erstmaßnahme/Notdienst mit Sofortmaßnahmen + Unterschrift.
export interface Notdiensteinsatzbericht {
  id: string;
  projekt_id: string;
  datum: string; // ISO-Date
  alarmierung: string | null; // Uhrzeit "HH:MM"
  ankunft: string | null; // Uhrzeit "HH:MM"
  schadenursache: string | null;
  sofortmassnahmen: string; // durchgeführte Sofortmaßnahmen
  bemerkungen: string | null;
  unterschrift_kunde: string | null;
  unterschrift_kunde_name: string | null;
  unterschrift_mitarbeiter: string | null;
  erstellt_von: string;
  erstellt_am: string;
}

// Erstbericht (Alt-System „sprint. Erstbericht", PO-Fotos 22.07.): das Dokument des
// ersten Besuchs für die Versicherung — Gebäude/Baustoffe im Schadenbereich,
// Schadenangaben, erforderliche Maßnahmen (+ wer ausführt), Gerätebedarf und
// überschlägige Kostenschätzung. Ein Bericht je Projekt, bis zur Abgabe editierbar.
export type ErstMassnahmeDurch = "wir" | "andere_firma" | "vn_eigenleistung";
export interface ErstMassnahme { noetig: boolean; durch: ErstMassnahmeDurch | null }
export interface Erstbericht {
  id: string;
  projekt_id: string;
  datum: string; // ISO-Date
  // Gebäude & Baustoffe im Schadenbereich
  baujahr: string | null;
  geschosse: string | null;
  objekttyp: string | null;
  gebaeudedaemmung: string | null;
  bauweise: string | null;
  aussenwand: string | null;
  deckenkonstruktion: string | null;
  deckenverkleidung: string | null;
  wandkonstruktion: string | null;
  wandaufbau: string | null;
  estrichart: string | null;
  daemmung_estrich: string | null;
  gebaeude_sonstiges: string | null; // z. B. letzte Sanierung im Jahr …
  // Angaben zum Schaden
  schadenursache: string | null;
  massnahmen_getroffen: boolean; // Maßnahmen zur Schadensminderung schon getroffen?
  ursache_beseitigt: boolean;
  anwesende: string | null; // bei der Schadenfeststellung
  leitungszustand: number | null; // 1 (gut) – 5 (schlecht)
  ursache_ort: "innerhalb" | "ausserhalb" | null;
  verursachung: string[]; // anwendungsfehler | handwerkerfehler | garantie | nachbar
  abwasser: string[]; // installationsfehler | verstopfung | rueckstau | muffenversatz | wurzeleinwachs
  schaden_sonstiges: string | null;
  // Erforderliche Maßnahmen (je: nötig? + Ausführung durch)
  massnahmen: Record<string, ErstMassnahme>; // leckortung | reparatur | trocknung | wiederherstellung
  // Gerätebedarf (Stückzahlen)
  geraete: Record<string, number>; // adsorber | kondensation | pumpe | turbine | kombi | ventilator | ir_platten
  trocknung_hinweise: string | null;
  // Sonstige Angaben
  schimmel: boolean;
  faekalien: boolean;
  desinfektion: boolean;
  ersatzfliesen_vorhanden: number;
  fliesen_zerstoerungsfrei: number;
  fliesen_zerstoert: number;
  weitere_infos: string | null;
  // Kostenschätzung in € (überschlägig, kein verbindliches Angebot)
  kosten: Record<string, number>; // leckortung | installateur | bodenbelaege | abbruch | trocknung | maler | fliesen | trockenbau | sonstiges | kva
  erstellt_von: string;
  erstellt_am: string;
}

// Ergänzende Gefährdungsbeurteilung (Alt-System sprint., PO-Fotos 22.07.):
// Arbeitsschutz je Projekt — Asbest (TRGS 519: BT-Tätigkeiten, Stoffe, Schutz),
// KMF (TRGS 521), sonstige Gefährdungen (Absturz TRBS 2121, enge Räume DGUV 113-004,
// Spannungsfreiheit/PRCDS) + Neubewertungen. Eine je Projekt, Upsert.
export type GefahrBefund = "ja" | "nein" | "verdacht";
export interface GbNeubewertung {
  datum: string;
  bearbeiter: string;
  asbest: GefahrBefund | null;
  bt_taetigkeiten: string[];
  stoffe: string[];
  schutz: string[];
  notiz: string | null;
}
export interface Gefaehrdungsbeurteilung {
  id: string;
  projekt_id: string;
  datum: string; // ISO-Date des Ersteintrags
  autor: string | null;
  bauleiter: string | null; // weisungsbefugter Bauleiter
  anmerkungen: string | null; // z. B. "Trocknung und Sanierung nach Wasserschaden"
  baujahr: string | null;
  // Asbest (TRGS 519)
  asbest: GefahrBefund | null;
  aufsicht_person: string | null; // Aufsichtsführende Person
  arbeitsbereich: string | null;
  bt_taetigkeiten: string[]; // Schlüssel aus GB_BT_TAETIGKEITEN
  stoffe: string[]; // Schlüssel aus GB_STOFFE
  stoffe_sonstiges: string | null;
  schutz: string[]; // Schlüssel aus GB_SCHUTZ
  schutz_sonstiges: string | null;
  // KMF (TRGS 521)
  kmf: GefahrBefund | null;
  kmf_wo: string | null;
  kmf_schutz: string | null;
  // Sonstige Gefährdungen
  absturz: boolean;
  absturz_wo: string | null;
  absturz_schutz: string | null;
  enge_raeume: boolean;
  enge_wo: string | null;
  enge_schutz: string | null;
  spannung_frei: boolean; // Spannungsfreiheit hergestellt/geprüft
  prcds: boolean; // PRCD-S im Einsatz
  spannung_schutz: string | null;
  neubewertungen: GbNeubewertung[];
  erstellt_von: string;
  erstellt_am: string;
}

// Schadenmeldung (GWG-/Wohnungswirtschafts-Vorlage, PO-Fotos 22.07.): der Meldeweg
// VOR dem Erstbericht — wer hat wann was gemeldet, welche Wohnung verursacht,
// welche sind geschädigt. Eine je Projekt, Upsert.
export interface SmWohnung { nr: string; lage: string; mieter: string; telefon: string }
export interface Schadenmeldung {
  id: string;
  projekt_id: string;
  schadenart: string | null; // z. B. "40 Maler/Gipser Trock"
  schadennummer: string | null;
  vertragsnummer: string | null; // Versicherungsschein-/Vertragsnummer
  auftragsnummer: string | null; // z. B. BTS-/interne Auftragsnummer
  eintritt_datum: string | null; // wann ist der Schaden eingetreten
  gemeldet_am: string | null;
  meldeweg: string | null; // z. B. "Ticket 64-260629-00359 durch Hausmeister"
  hergang: string | null; // was genau ist passiert / was wurde beschädigt
  verursachende_wohnung: SmWohnung;
  geschaedigte_wohnungen: SmWohnung[];
  hausrat_info: string | null; // Hausrat-/Haftpflichtversicherung der Mieter/Eigentümer
  nur_ursache_klaeren: boolean; // Gewährleistung: erst Ursache ermitteln + zurückmelden!
  sonstiges: string | null;
  erstellt_von: string;
  erstellt_am: string;
}

// Positionsauflistung über ausgeführte Leistungen (Alt-System sprint., PO-Fotos 22.07.):
// Aufmaß/Mengengerüst — Positionen je Gewerk mit Aufmaß-Formeln je Bezug (Decke/Wände…).
// BEWUSST OHNE PREISE (kein ERP): reiner Mengennachweis; Preise/Rechnung bleiben im Büro.
export interface AufmassZeile { bezug: string; formel: string }
export interface Leistungsposition {
  id: string;
  projekt_id: string;
  gewerk: string | null; // z. B. "Trocknung", "Malerarbeiten", "Baustelleneinrichtung"
  artikel_nr: string | null; // z. B. "001.010"
  kurztext: string;
  langtext: string | null;
  raum_id: string | null;
  einheit: string | null; // Stck | qm | Std | cbm …
  aufmass_zeilen: AufmassZeile[];
  menge: number | null; // Summe der Formeln oder manuell
  einzelpreis: number | null; // € netto je Einheit — KVA-Modul; sieht/pflegt nur das Büro
  bemerkung: string | null;
  erstellt_von: string;
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

// Ergebnis der Trocknung je Geschoss (Alt-System "Messprotokoll – Trocknung"):
// Beginn, Abschluss und Kundenunterschrift werden je Geschoss festgehalten.
export interface Trocknungsergebnis {
  id: string;
  projekt_id: string;
  geschoss: string; // "EG", "1. OG" … — "Gesamt", wenn keine Geschosse gepflegt sind
  beginn_datum: string | null; // ISO-Date
  abgeschlossen: boolean;
  bemerkungen: string | null;
  unterschrift_kunde: string | null; // PNG-Data-URL
  unterschrift_kunde_name: string | null;
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
  messpunkt: Messpunkt[];
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
  notdiensteinsatzbericht: Notdiensteinsatzbericht[];
  erstbericht: Erstbericht[];
  gefaehrdungsbeurteilung: Gefaehrdungsbeurteilung[];
  schadenmeldung: Schadenmeldung[];
  leistungsposition: Leistungsposition[];
  stundenlohnbericht: Stundenlohnbericht[];
  termin: Termin[];
  trocknungsergebnis: Trocknungsergebnis[];
  firmen_einstellung: FirmenEinstellung[];
  beteiligter: Beteiligter[];
  ursache_eintrag: UrsacheEintrag[];
  massnahme: Massnahme[];
}

// Beteiligte je Projekt (F3, 21.07.): externe Parteien mit Rolle + Telefon.
export type BeteiligterRolle =
  | "leckortung" | "installateur" | "sanierer" | "gutachter" | "gebaeude_vs"
  | "hausrat_vs" | "makler" | "vn" | "mieter" | "eigentuemer" | "sonstige";

export interface Beteiligter {
  id: string;
  projekt_id: string;
  rolle: BeteiligterRolle;
  name: string;
  telefon: string | null;
  notiz: string | null;
  erstellt_von: string;
  erstellt_am: string;
}
