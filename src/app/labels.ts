import type {
  BemusterungArt, Bestellstatus, DokumentTyp, EstrichBauart, FeedKategorie, FeedUrsprung, GeraetStatus, KontaminationArt,
  Messanlass, Messverfahren, ProjektStatus, SchichtTyp,
} from "../domain/types";

export const BESTELLSTATUS_LABEL: Record<Bestellstatus, string> = {
  ausgewaehlt: "Zu bestellen",
  bestellt: "Bestellt",
  geliefert: "Geliefert",
};

export const BEMUSTERUNG_ART_LABEL: Record<BemusterungArt, string> = {
  einleger_keramik: "Einleger · Keramik",
  einleger_edelstahl: "Einleger · Edelstahl",
  sondereinleger: "Sondereinleger",
  ersatzfliese: "Ersatzfliese",
  parkett: "Parkett",
  laminat: "Laminat",
  vinyl: "Vinyl / Designbelag",
  teppich: "Teppichboden",
  sockelleiste: "Sockelleisten",
  sonstiges: "Sonstiges",
};

export const PROJEKT_STATUS_LABEL: Record<ProjektStatus, string> = {
  angelegt: "Angelegt",
  schadenaufnahme: "Schadenaufnahme",
  kva_freigabe_ausstehend: "KVA / Freigabe ausstehend",
  freie_fahrt: "Freie Fahrt",
  trocknung_laeuft: "Trocknung läuft",
  kontrolle: "Kontrolle",
  strombrief: "Strombrief",
  sanierung: "Sanierung",
  abgeschlossen: "Abgeschlossen",
};

// Reihenfolge des Lebenszyklus (FR-PROJ-010) für Statuswechsel-Auswahl.
export const PROJEKT_STATUS_REIHENFOLGE: ProjektStatus[] = [
  "angelegt", "schadenaufnahme", "kva_freigabe_ausstehend", "freie_fahrt",
  "trocknung_laeuft", "kontrolle", "strombrief", "sanierung", "abgeschlossen",
];

export const GERAET_STATUS_LABEL: Record<GeraetStatus, string> = {
  lager: "Lager", baustelle: "Baustelle", werkstatt: "Werkstatt",
};

export const KONTAMINATION_LABEL: Record<KontaminationArt, string> = {
  sauber: "Sauber (kein Kontakt)", faekalien: "Fäkalien", heizoel: "Heizöl", schimmel: "Schimmel", sonstige: "Sonstige",
};

export const FEED_KATEGORIE_LABEL: Record<FeedKategorie, string> = {
  notiz: "Notiz", problem: "Problem", hinweis: "Hinweis", geraet: "Gerät", foto: "Foto", kunde: "Kunde", dispo: "Dispo",
};

export const FEED_URSPRUNG_LABEL: Record<FeedUrsprung, string> = {
  scan: "Scan", zaehlerstand: "Zählerstand", teilabbau: "Abbau", e_check_faellig: "E-Check fällig",
  check_in: "Check-in", check_out: "Check-out", manuell: "Manuell",
};

export const SCHICHT_TYP_LABEL: Record<SchichtTyp, string> = {
  oberbelag: "Oberbelag", estrich: "Estrich", daemmung: "Dämmstoff",
  putz: "Putz", mauerwerk: "Mauerwerk", decke_massiv: "Decke massiv",
  decke_abgehaengt: "Decke abgehängt", schuettung: "Schüttung", dielung: "Dielung",
};

// Weitere betroffene Bauteile (neben dem Bodenaufbau), Alt-System-Analyse 13.07.2026.
export const WEITERE_BAUTEILE: SchichtTyp[] = [
  "putz", "mauerwerk", "decke_massiv", "decke_abgehaengt", "schuettung", "dielung",
];

export const BAUART_LABEL: Record<EstrichBauart, string> = {
  schwimmend: "Schwimmender Estrich", verbund: "Verbundestrich", trennlage: "Estrich auf Trennlage",
};

export const RAUMTYPEN = [
  "Wohnzimmer", "Schlafzimmer", "Kinderzimmer", "Küche", "Bad", "WC", "Flur",
  "Büro", "Keller", "Heizungskeller", "Treppenhaus", "Abstellraum", "Sonstiger Raum",
];

export const GESCHOSSE = ["Keller", "EG", "1. OG", "2. OG", "3. OG", "DG"];

export const MESSVERFAHREN_LABEL: Record<Messverfahren, string> = {
  widerstand: "Widerstand (maßgeblich)", dielektrisch: "Dielektrisch (Schätzung)",
  hygrometer: "Hygrometer (Raumluft)",
};

export const MESSANLASS_LABEL: Record<Messanlass, string> = {
  eingangsmessung: "Eingangsmessung", freimessung: "Freimessung",
};

export const DOKUMENT_TYP_LABEL: Record<DokumentTyp, string> = {
  messprotokoll: "Messprotokoll", schadensaufnahme_doku: "Schadensaufnahme-Doku", erstbericht: "Erstbericht",
  abschlussbericht: "Abschlussbericht", abnahmeprotokoll: "Abnahmeprotokoll",
  auftrag_abtretung: "Auftrag & Abtretung", vertretervollmacht: "Vertretervollmacht",
  ersatzfliesenbericht: "Ersatzfliesenbericht", kundenzufriedenheit: "Kundenzufriedenheit",
  notdienst_einsatzbericht: "Notdienst-Einsatzbericht", stundenlohnbericht: "Stundenlohnbericht",
  zusatzerklaerung: "Zusatzerklärung zum Auftrag", organschaft: "Erklärung zur Organschaft",
  merkblatt_hochwasser: "Merkblatt Überschwemmung/Hochwasser",
  kva: "KVA", strombrief: "Strombrief",
};

export const ABNAHME_STATUS_LABEL: Record<import("../domain/types").AbnahmeStatus, string> = {
  ohne_mangel: "Abnahme ohne Mängel", mit_mangel: "Abnahme mit Mängeln", verweigert: "Abnahme verweigert",
};

// Auftrags-Briefing (F1/F9, 21.07.): Mitnehm-Checkliste, die das Büro je Termin anhakt.
// „ausweis" adressiert direkt den Handwerkerausweis-Ärger (F9) — vor der Abfahrt sichtbar.
export const MITNEHMEN_OPTIONEN: { key: string; label: string }[] = [
  { key: "ausweis", label: "Handwerkerausweis" },
  { key: "schluessel", label: "Kundenschlüssel" },
  { key: "material", label: "Material (lt. Gutachter)" },
  { key: "werkzeug", label: "Spezialwerkzeug" },
  { key: "geraete", label: "Zusatzgeräte" },
];
export const MITNEHMEN_LABEL: Record<string, string> =
  Object.fromEntries(MITNEHMEN_OPTIONEN.map((o) => [o.key, o.label]));
