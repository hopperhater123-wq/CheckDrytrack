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
  hygrometer: "Hygrometer (Raumluft)", kernfeuchte: "Kernfeuchtemessung",
};

// Messort-Schnellwahl (PO 21.07.): häufige Hohlraum-/Messstellen ohne Tippen.
export const MESSORT_VORSCHLAEGE: string[] = [
  "Badewannen-Hohlraum", "Dusche-Hohlraum", "Schacht", "Randfuge", "Wand Nord", "Estrich",
];

export const MESSANLASS_LABEL: Record<Messanlass, string> = {
  eingangsmessung: "Eingangsmessung", freimessung: "Freimessung",
};

// Kontrolltermin-Entscheidung (F8): das Gate am Ende von „in 2 Wochen schauen".
export const KONTROLL_ERGEBNIS_LABEL: Record<import("../domain/types").KontrollErgebnis, string> = {
  erfolg: "Erfolg — trocken", verlaengern: "Verlängern", methode_aendern: "Methode ändern",
};

export const DOKUMENT_TYP_LABEL: Record<DokumentTyp, string> = {
  messprotokoll: "Messprotokoll", schadensaufnahme_doku: "Schadensaufnahme-Doku", erstbericht: "Erstbericht",
  abschlussbericht: "Abschlussbericht", abnahmeprotokoll: "Abnahmeprotokoll",
  auftrag_abtretung: "Auftrag & Abtretung", vertretervollmacht: "Vertretervollmacht",
  ersatzfliesenbericht: "Ersatzfliesenbericht", kundenzufriedenheit: "Kundenzufriedenheit",
  notdienst_einsatzbericht: "Notdienst-Einsatzbericht", stundenlohnbericht: "Stundenlohnbericht",
  zusatzerklaerung: "Zusatzerklärung zum Auftrag", organschaft: "Erklärung zur Organschaft",
  auftrag_schadenbeseitigung: "Auftrag zur Schadenbeseitigung",
  einwilligung_befragung: "Einwilligung Kundenzufriedenheitsbefragung",
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

// Kostenträger-Klärung (F4): wer zahlt.
export const KOSTENTRAEGER_LABEL: Record<import("../domain/types").Kostentraeger, string> = {
  gebaeude_vs: "Gebäudeversicherung", hausrat_vs: "Hausratversicherung",
  verursacher: "Verursacher / Installateur", privat: "Privat / Selbstzahler", ungeklaert: "Ungeklärt",
};
export const KOSTENTRAEGER_STATUS_LABEL: Record<import("../domain/types").KostentraegerStatus, string> = {
  offen: "offen", in_klaerung: "in Klärung", geklaert: "geklärt",
};

// Trocknungsmethode + Erschwernisse je Raum (F7).
export const TROCKNUNGSMETHODE_OPTIONEN: { key: string; label: string }[] = [
  { key: "raumtrocknung", label: "Raumtrocknung" },
  { key: "adsorption_durchzug", label: "Adsorption mit Durchzug" },
  { key: "folientunnel", label: "Folientunnel / Zeltverfahren" },
  { key: "daemmschicht_unterdruck", label: "Dämmschicht (Unterdruck)" },
  { key: "schacht_hohlraum", label: "Schacht-/Hohlraumtrocknung" },
  { key: "sonstige", label: "Sonstige" },
];
export const TROCKNUNGSMETHODE_LABEL: Record<string, string> =
  Object.fromEntries(TROCKNUNGSMETHODE_OPTIONEN.map((o) => [o.key, o.label]));

export const ERSCHWERNIS_OPTIONEN: { key: string; label: string }[] = [
  { key: "latex_dampfsperre", label: "Latexfarbe / Dampfsperre" },
  { key: "kalksandstein", label: "Kalksandstein" },
  { key: "fliesenspiegel", label: "Fliesenspiegel" },
  { key: "estrich_dicht", label: "Dichter Estrich" },
  { key: "schwer_zugaenglich", label: "Schwer zugänglich" },
  { key: "historisch", label: "Historische Bausubstanz" },
];
export const ERSCHWERNIS_LABEL: Record<string, string> =
  Object.fromEntries(ERSCHWERNIS_OPTIONEN.map((o) => [o.key, o.label]));

// Ursachen-Chronik (F6): wer hat die Feststellung gemacht.
export const URSACHE_QUELLE_LABEL: Record<import("../domain/types").UrsacheQuelle, string> = {
  leckortung: "Leckortung", installateur: "Installateur", sanierer: "Sanierer",
  gutachter: "Gutachter", wir: "Wir (Torrek)", sonstige: "Sonstige",
};
// Art der Grundriss-Markierung (F6): Ursache (wo das Wasser herkommt) vs. Feuchtestelle.
export const MARKIERUNG_ART_LABEL: Record<import("../domain/types").MarkierungArt, string> = {
  schadensursache: "Schadensursache", feuchtestelle: "Feuchtestelle", hinweis: "Hinweis",
};

// Befund-Layer (F14/F16, PO 21.07.): Zeichen-Kategorien für den Grundriss — je Kategorie
// eine feste Farbe und Form (Fläche schraffiert / Linie / Punkt). Die Farben meiden
// bewusst Rot/Gelb/Grün — die bleiben laut CLAUDE.md den Messwert-Bewertungen vorbehalten.
// Zwei Bereiche (PO-Struktur): „trocknung" = Doku des Trocknungstechnikers (was gemacht
// wurde — KEINE Maßnahme), „sanierung" = Aufgaben für den Sanierer (echte Maßnahmen mit
// Status offen→erledigt). Dieselbe Skizze wird nach Bereich gefiltert angezeigt.
export type BefundForm = "flaeche" | "linie" | "punkt";
export type BefundBereich = "trocknung" | "sanierung";
export interface BefundKategorie { key: string; label: string; form: BefundForm; farbe: string; bereich: BefundBereich; }
export const BEFUND_KATEGORIEN: BefundKategorie[] = [
  // ---- Trocknung (Doku: was der Trocknungstechniker gemacht/festgestellt hat) ----
  { key: "nass",           label: "Nass / Feuchtefläche",     form: "flaeche", farbe: "#2563eb", bereich: "trocknung" },
  { key: "kontamination",  label: "Kontamination",            form: "flaeche", farbe: "#7c3aed", bereich: "trocknung" },
  { key: "hohlraum",       label: "Hohlraumtrocknung",        form: "flaeche", farbe: "#0891b2", bereich: "trocknung" },
  { key: "sockelleiste",   label: "Sockelleiste entfernt",    form: "linie",   farbe: "#c026a9", bereich: "trocknung" },
  { key: "estrich",        label: "Estrich / Dämmung geöffnet", form: "linie", farbe: "#0e8a94", bereich: "trocknung" },
  { key: "messpunkt",      label: "Messpunkt",                form: "punkt",   farbe: "#1d4ed8", bereich: "trocknung" }, // nummeriert
  { key: "kernbohrung",    label: "Kernbohrloch",             form: "punkt",   farbe: "#4f46e5", bereich: "trocknung" },
  { key: "geraet",         label: "Gerät / Trockner",         form: "punkt",   farbe: "#0d9488", bereich: "trocknung" },
  { key: "schacht",        label: "Schachttrocknung",         form: "punkt",   farbe: "#0369a1", bereich: "trocknung" },
  { key: "fensterschott",  label: "Fensterschott",            form: "punkt",   farbe: "#a21caf", bereich: "trocknung" },
  { key: "einbauschrank",  label: "Schrank demontiert (Hänge-/Einbau)", form: "punkt", farbe: "#78716c", bereich: "trocknung" },
  { key: "ceravogue_bohrung", label: "CeraVogue-Bohrung (inkl. Einleger)", form: "punkt", farbe: "#155e75", bereich: "trocknung" },
  { key: "abschottung",    label: "Abschottung / Staubschutzwand", form: "linie", farbe: "#6b21a8", bereich: "trocknung" },
  { key: "infrarot",       label: "Infrarot-Trocknung",       form: "flaeche", farbe: "#7e22ce", bereich: "trocknung" },
  { key: "befund",         label: "Befund / Hinweis",         form: "punkt",   farbe: "#334155", bereich: "trocknung" },
  // ---- Sanierung (Aufgaben für den Sanierer → Maßnahmenliste) ----
  { key: "malern_iso",     label: "Malern + Iso",             form: "linie",   farbe: "#9333ea", bereich: "sanierung" },
  { key: "sockel_setzen",  label: "Sockelleisten setzen",     form: "linie",   farbe: "#db2777", bereich: "sanierung" },
  // CeraVogue: die BOHRUNG (durch die Fliese, mit Keramik-Einleger) ist Trocknung —
  // das spätere Setzen/Bestellen des Einlegers ist Wiederherstellung (Alt-System-Katalog).
  { key: "ceravogue_setzen",   label: "CeraVogue-Einleger setzen",    form: "punkt", farbe: "#be185d", bereich: "sanierung" },
  { key: "ceravogue_bestellen", label: "CeraVogue-Einleger bestellen", form: "punkt", farbe: "#831843", bereich: "sanierung" },
  { key: "bodenbelag",     label: "Bodenbelag einsetzen (Laminat/Parkett/Teppich/Fliese)", form: "flaeche", farbe: "#6d28d9", bereich: "sanierung" },
  { key: "boden_schleifen", label: "Boden schleifen (Kleberreste)", form: "flaeche", farbe: "#8b5e34", bereich: "sanierung" },
  { key: "schrank_montieren", label: "Schrank wieder montieren", form: "punkt", farbe: "#57534e", bereich: "sanierung" },
  { key: "tuer",           label: "Tür demontieren",          form: "punkt",   farbe: "#475569", bereich: "sanierung" },
  { key: "tuer_einbau",    label: "Tür einbauen",             form: "punkt",   farbe: "#3730a3", bereich: "sanierung" },
  { key: "tapezieren",     label: "Tapezieren",               form: "linie",   farbe: "#c026d3", bereich: "sanierung" },
  { key: "silikonfuge",    label: "Silikonfugen erneuern",    form: "linie",   farbe: "#0284c7", bereich: "sanierung" },
];
export const BEFUND_KAT_MAP: Record<string, BefundKategorie> =
  Object.fromEntries(BEFUND_KATEGORIEN.map((k) => [k.key, k]));
export const BEFUND_BEREICH_LABEL: Record<BefundBereich, string> = {
  trocknung: "Trocknung", sanierung: "Sanierung",
};
/** Bereich eines Befunds/einer Markierung: aus der Kategorie, sonst aus der Zielgruppe. */
export function befundBereich(kategorie?: string | null, zielgruppe?: string): BefundBereich {
  const k = kategorie ? BEFUND_KAT_MAP[kategorie] : undefined;
  if (k) return k.bereich;
  return zielgruppe === "sanierer" ? "sanierung" : "trocknung";
}

// Leistungskatalog (F17, PO 21.07.): die echten Positionstexte aus dem Alt-System
// (Tablet-Fotos, Tabs ABB/TRO/ANA/WDH/HAUS). Maßnahmen aus dem Katalog wählen
// heißt: die Formulierung passt später 1:1 zur Abrechnung. Bewusst reine Textliste —
// kein Aufmaß, keine Preise (kein ERP).
export interface LeistungsGewerk { key: string; label: string; positionen: string[] }
export const LEISTUNGSKATALOG: LeistungsGewerk[] = [
  {
    key: "abb", label: "Abbruch / Demontage (wir)", positionen: [
      "Abdecken der Laufwege mit Vlies",
      "Abdecken Boden mit Folie",
      "Abschottung (Abbruch) erstellen (mit/ohne Tür)",
      "Fliesen zerstörungsfrei ausbauen (Bodenfliese)",
      "Sockelfliesen zerstörungsfrei ausbauen",
      "Sockelfliesen demontieren (zerbrochen)",
      "Fliesen im Dünnbett demontieren",
      "Fliesen im Dickbett demontieren",
      "Naturstein-Belag demontieren",
      "Tapeten – 1-lagig – demontieren",
      "Tapeten – mehrlagig oder wasserfest – demontieren",
      "Putz entfernen",
      "Gipskarton-Platten/Fermacell/Paneele demontieren (mit Erhalt der Unterkonstruktion)",
      "Gipskarton-Platten/Fermacell/Paneele demontieren (ohne Erhalt der Unterkonstruktion)",
      "Gipskarton-Verbundplatten (GK+Styropor) demontieren",
      "Spanplatte/OSB-Platte demontieren",
      "Dämmung entfernen (Styropor/Mineralwolle)",
      "Sockelleiste (Holz, PVC, Textil) demontieren",
      "Sockelleiste (Holz, PVC, Textil) zerstörungsfrei demontieren",
      "Bodenbelag – lose – (Linoleum, PVC, Teppich, Laminat, Parkett) demontieren",
      "Bodenbelag – verklebt – demontieren",
      "Estrich demontieren",
      "Estrich fräsen (alten Kleber und Ausgleich abfräsen, diffusionsoffene Oberfläche)",
      "Schüttung aus Holzbalkendecke demontieren",
      "Styropordeckenplatten demontieren",
      "Odenwalddecke (OWA) demontieren",
      "Schilfrohrmattendecke demontieren",
      "Einbauküche ausbauen (Ober-/Unter-/Hochschränke)",
      "Baumischabfall entsorgen",
      "Persönliche Schutzausrüstung",
    ],
  },
  {
    key: "tro", label: "Trocknung (wir)", positionen: [
      "Estrichdämmschicht-Trocknung ohne Erhalt des Fußbodenoberbelags",
      "Estrichdämmschicht-Trocknung mit Erhalt des Fußbodenoberbelags",
      "Mehraufwand wegen Fußbodenheizung / Leitungen unter dem Estrich",
      "Holzbalkendecken-Trocknung (von oben/unten)",
      "Wandflächentrocknung (Länge/Höhe)",
      "Raum-Trocknung (ohne Dämmschichttrocknung)",
      "Schacht-Trocknung",
      "Hohlraum-Trocknung (Wanne/Decke/Wand)",
      "Deckenmax-Bohrung",
      "Brandschutzstopfen",
      "Abschottung (Trocknung) erstellen (mit/ohne Türe)",
      "Infrarot-Trocknung",
      "Ventilator",
      "CeraVogue-Bohrung inkl. Einleger",
      "Notdienst",
    ],
  },
  {
    key: "ana", label: "Antimikrobielle Maßnahmen (wir)", positionen: [
      "Absaugen mit H-Sauger",
      "Desinfektion mit Ethanol/Wasserstoffperoxid",
      "Unterdruckhaltung",
      "Luftreiniger-Einsatz",
      "Estrichdesinfektion",
      "Kaltnebelverfahren",
      "Geruchsbehandlung",
      "Feinreinigung",
      "Persönliche Schutzausrüstung",
    ],
  },
  {
    key: "wdh", label: "Wiederherstellung (Sanierer)", positionen: [
      "Öffnung in Boden/Wand/Decke verschließen",
      "Dämmung einbringen (Styropor/Mineralwolle)",
      "Estrich liefern und einbringen",
      "Trockenestrich herstellen",
      "Bodenbeschichtung aufbringen",
      "Fliesen (Ersatzfliese vorhanden) wieder einsetzen",
      "Fliesen (neu) verlegen",
      "Naturstein-Belag verlegen",
      "Sockelfliesen verlegen",
      "Silikonfuge herstellen",
      "Spanplatte/OSB verlegen",
      "Oberbelag – lose – (Teppich/PVC/Linoleum, Laminat, Parkett) verlegen",
      "Oberbelag – verklebt – verlegen",
      "Parkett schleifen und versiegeln",
      "Sockelleisten verlegen (liefern/vorhanden)",
      "Trockenbau (Gipskarton …) montieren (mit/ohne UK)",
      "Gipskarton-Verbundplatten (GK+Styropor) einbringen",
      "Putz aufbringen",
      "Wand- bzw. Deckenflächen spachteln",
      "Strukturputz aufbringen",
      "Isolieranstrich/Sperrgrund auftragen",
      "Tapete neu (Rauhfaser, Glasfaser, Malervlies, Muster-/Vinyltapete)",
      "Anstrich neu (Farbe, Latex …)",
      "Paneel-/Holzverkleidung erneuern (Decke/Wand, mit/ohne UK)",
      "Odenwalddecke (OWA) erneuern",
      "Tür mit Rahmen erneuern",
      "Einbauküche einbauen (Ober-/Unter-/Hochschränke)",
    ],
  },
  {
    key: "haus", label: "Hausrat", positionen: [
      "Verpackungseinheiten",
      "Möbel demontieren",
      "Bewegungsarbeiten im Gebäude",
      "Auslagerung von Hausrat",
      "Entsorgung und Dokumentation",
    ],
  },
];

// Beteiligte je Projekt (F3): Rollen der externen Parteien.
export const BETEILIGTER_ROLLE_LABEL: Record<import("../domain/types").BeteiligterRolle, string> = {
  leckortung: "Leckortung", installateur: "Installateur", sanierer: "Sanierer",
  gutachter: "Gutachter", gebaeude_vs: "Gebäudeversicherung", hausrat_vs: "Hausratversicherung",
  makler: "Makler / Verwaltung", vn: "Versicherungsnehmer", mieter: "Mieter",
  eigentuemer: "Eigentümer / Vermieter", sonstige: "Sonstige",
};
