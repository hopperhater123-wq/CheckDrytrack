// Realistische Beispieldaten, damit die App ohne Backend sofort etwas zeigt.
import type { DryTrackDB } from "./types";

const now = Date.now();
const tage = (n: number) => new Date(now - n * 24 * 60 * 60 * 1000).toISOString();
const datum = (n: number) => new Date(now + n * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

export function seedDB(): DryTrackDB {
  return {
    benutzer: [
      { id: "u-monteur", name: "Kevin Berg", microsoft_account_id: "kevin@firma.de", rolle: "monteur" },
      { id: "u-dispo", name: "Sandra Roth", microsoft_account_id: "sandra@firma.de", rolle: "disposition" },
      { id: "u-pl", name: "Markus Feld", microsoft_account_id: "markus@firma.de", rolle: "projektleiter" },
      { id: "u-admin", name: "Anna Weiss", microsoft_account_id: "anna@firma.de", rolle: "admin_gf" },
    ],
    geraetetyp: [
      { id: "gt-kondens", bezeichnung: "Kondenstrockner", ist_freitext: false, leistungswert_kw: 0.9, luftleistung_m3h: 300 },
      { id: "gt-adsorp", bezeichnung: "Adsorptionstrockner", ist_freitext: false, leistungswert_kw: 1.4, luftleistung_m3h: 250 },
      { id: "gt-ventil", bezeichnung: "Ventilator / Radialgebläse", ist_freitext: false, leistungswert_kw: 0.25, luftleistung_m3h: 900 },
      { id: "gt-turbine", bezeichnung: "Seitenkanalturbine", ist_freitext: false, leistungswert_kw: 1.1, luftleistung_m3h: 210 },
      { id: "gt-heizer", bezeichnung: "Heizgebläse", ist_freitext: false, leistungswert_kw: 2.0, luftleistung_m3h: 400 },
    ],
    geraet: [
      { inventarnummer: "KT-1001", geraetetyp_id: "gt-kondens", status: "baustelle", eigentum: "eigen", e_check_datum: datum(120), aktuelles_projekt_id: "p-1" },
      { inventarnummer: "KT-1002", geraetetyp_id: "gt-kondens", status: "baustelle", eigentum: "eigen", e_check_datum: datum(200), aktuelles_projekt_id: "p-1" },
      { inventarnummer: "KT-1003", geraetetyp_id: "gt-kondens", status: "lager", eigentum: "eigen", e_check_datum: datum(-10), aktuelles_projekt_id: null },
      { inventarnummer: "AD-2001", geraetetyp_id: "gt-adsorp", status: "baustelle", eigentum: "gemietet", e_check_datum: datum(45), aktuelles_projekt_id: "p-2" },
      { inventarnummer: "VE-3001", geraetetyp_id: "gt-ventil", status: "lager", eigentum: "eigen", e_check_datum: datum(310), aktuelles_projekt_id: null },
      { inventarnummer: "VE-3002", geraetetyp_id: "gt-ventil", status: "werkstatt", eigentum: "eigen", e_check_datum: datum(15), aktuelles_projekt_id: null },
      { inventarnummer: "TU-4001", geraetetyp_id: "gt-turbine", status: "baustelle", eigentum: "eigen", e_check_datum: datum(90), aktuelles_projekt_id: "p-1" },
      { inventarnummer: "HZ-5001", geraetetyp_id: "gt-heizer", status: "lager", eigentum: "eigen", e_check_datum: datum(150), aktuelles_projekt_id: null },
    ],
    versicherung: [
      { id: "v-allianz", name: "Allianz" },
      { id: "v-provinzial", name: "Provinzial" },
    ],
    projekt: [
      {
        id: "p-1", projektnummer: "2026-0042", status: "trocknung_laeuft", storniert: false, ist_erstmassnahme: false,
        bezeichnung: "Wasserschaden Küche — Fam. Müller", adresse: "Lindenstraße 12, 40477 Düsseldorf",
        geo_lat: 51.2412, geo_lng: 6.7841, kontamination_art: "sauber", gefaehrdungsbeurteilung_abgeschlossen: true,
        versicherung_id: "v-allianz", angelegt_von: "u-dispo", angelegt_am: tage(9),
      },
      {
        id: "p-2", projektnummer: "2026-0043", status: "schadenaufnahme", storniert: false, ist_erstmassnahme: true,
        bezeichnung: "Rohrbruch Keller — Bäckerei Kern", adresse: "Marktplatz 3, 50667 Köln",
        geo_lat: 50.9375, geo_lng: 6.9603, kontamination_art: "faekalien", gefaehrdungsbeurteilung_abgeschlossen: false,
        versicherung_id: "v-provinzial", angelegt_von: "u-pl", angelegt_am: tage(2),
      },
      {
        id: "p-3", projektnummer: "2026-0039", status: "abgeschlossen", storniert: false, ist_erstmassnahme: false,
        bezeichnung: "Leitungswasser Bad — Fam. Schulz", adresse: "Am Hang 7, 42117 Wuppertal",
        geo_lat: 51.2562, geo_lng: 7.1508, kontamination_art: "sauber", gefaehrdungsbeurteilung_abgeschlossen: true,
        versicherung_id: "v-allianz", angelegt_von: "u-dispo", angelegt_am: tage(40),
      },
    ],
    raum: [
      { id: "r-1", projekt_id: "p-1", bezeichnung: "Küche", daemmstoff_status: "verdacht", daemmstoff_material_id: "m-perlite" },
      { id: "r-2", projekt_id: "p-1", bezeichnung: "Flur EG", daemmstoff_status: "unbekannt", daemmstoff_material_id: null },
      { id: "r-3", projekt_id: "p-2", bezeichnung: "Heizungskeller", daemmstoff_status: "unbekannt", daemmstoff_material_id: null },
      { id: "r-4", projekt_id: "p-3", bezeichnung: "Badezimmer OG", daemmstoff_status: "bestaetigt", daemmstoff_material_id: "m-styropor" },
    ],
    einsatz: [
      { id: "e-1", projekt_id: "p-1", geraet_inventarnummer: "KT-1001", raum_id: "r-1", aufbau_datum: tage(8), abbau_datum: null, zaehlerstand_start: 1240.5, zaehlerstand_ende: null, verbrauch_geschaetzt: false },
      { id: "e-2", projekt_id: "p-1", geraet_inventarnummer: "KT-1002", raum_id: "r-2", aufbau_datum: tage(8), abbau_datum: null, zaehlerstand_start: 980.0, zaehlerstand_ende: null, verbrauch_geschaetzt: false },
      { id: "e-3", projekt_id: "p-1", geraet_inventarnummer: "TU-4001", raum_id: "r-1", aufbau_datum: tage(6), abbau_datum: null, zaehlerstand_start: 55.2, zaehlerstand_ende: null, verbrauch_geschaetzt: false },
      { id: "e-4", projekt_id: "p-2", geraet_inventarnummer: "AD-2001", raum_id: "r-3", aufbau_datum: tage(2), abbau_datum: null, zaehlerstand_start: 300.0, zaehlerstand_ende: null, verbrauch_geschaetzt: false },
      // Abgeschlossener Einsatz mit gemessenem Verbrauch
      { id: "e-5", projekt_id: "p-3", geraet_inventarnummer: "KT-1003", raum_id: "r-4", aufbau_datum: tage(38), abbau_datum: tage(24), zaehlerstand_start: 400.0, zaehlerstand_ende: 702.5, verbrauch_geschaetzt: false },
      // Abgeschlossen mit Fallback-Schätzung (defekter Zähler)
      { id: "e-6", projekt_id: "p-3", geraet_inventarnummer: "VE-3001", raum_id: "r-4", aufbau_datum: tage(38), abbau_datum: tage(24), zaehlerstand_start: 0, zaehlerstand_ende: null, verbrauch_geschaetzt: true },
    ],
    feed_eintrag: [
      { id: "f-1", projekt_id: "p-1", geraet_inventarnummer: "KT-1001", ursprung: "scan", kategorie: null, inhalt: "Gerät KT-1001 in Küche aufgebaut, Startzählerstand 1240,5 kWh.", autor_id: "u-monteur", erstellt_am: tage(8) },
      { id: "f-2", projekt_id: "p-1", geraet_inventarnummer: null, ursprung: "manuell", kategorie: "hinweis", inhalt: "Kunde ist werktags erst ab 15 Uhr erreichbar.", autor_id: "u-dispo", erstellt_am: tage(7) },
      { id: "f-3", projekt_id: "p-1", geraet_inventarnummer: null, ursprung: "manuell", kategorie: "problem", inhalt: "Unter dem Estrich Verdacht auf Perlite-Dämmung — Bohrloch geplant.", autor_id: "u-monteur", erstellt_am: tage(5) },
      { id: "f-4", projekt_id: "p-2", geraet_inventarnummer: null, ursprung: "manuell", kategorie: "problem", inhalt: "Fäkalienkontamination — Gefährdungsbeurteilung noch offen!", autor_id: "u-pl", erstellt_am: tage(2) },
    ],
    feed_kommentar: [
      { id: "fk-1", feed_eintrag_id: "f-3", autor_id: "u-pl", inhalt: "Bohrloch am Donnerstag, ich bringe das Endoskop mit.", erstellt_am: tage(4) },
    ],
    dokument: [
      { id: "d-1", projekt_id: "p-3", typ: "strombrief", speicher_referenz: "storage://p-3/strombrief.pdf", erstellt_von: "u-dispo", erstellt_am: tage(23) },
      { id: "d-2", projekt_id: "p-3", typ: "abschlussbericht", speicher_referenz: "storage://p-3/abschluss.pdf", erstellt_von: "u-pl", erstellt_am: tage(23) },
      { id: "d-3", projekt_id: "p-1", typ: "schadensaufnahme_doku", speicher_referenz: "storage://p-1/aufnahme.pdf", erstellt_von: "u-monteur", erstellt_am: tage(8) },
    ],
    materialdatenbank: [
      { id: "m-perlite", bezeichnung: "Perlite", kategorie: "Dämmstoff", trocknungsfaehig: true, austauschpflichtig: false, bewertungsmodell: "digit_grenzwert", praxisgrenzwert_digit: 80 },
      { id: "m-styropor", bezeichnung: "Styropor (EPS)", kategorie: "Dämmstoff", trocknungsfaehig: false, austauschpflichtig: true, bewertungsmodell: "status_checkliste", praxisgrenzwert_digit: null },
      { id: "m-estrich", bezeichnung: "Zementestrich", kategorie: "Estrich", trocknungsfaehig: true, austauschpflichtig: false, bewertungsmodell: "digit_grenzwert", praxisgrenzwert_digit: 90 },
      { id: "m-mauerwerk", bezeichnung: "Kalksandstein", kategorie: "Mauerwerk", trocknungsfaehig: true, austauschpflichtig: false, bewertungsmodell: "vergleichsmessung", praxisgrenzwert_digit: null },
    ],
    messung: [
      { id: "me-1", raum_id: "r-1", material_id: "m-estrich", messverfahren: "widerstand", anzeige_digit: 145, absolute_feuchte_g_kg: null, temperatur_c: 21, rel_luftfeuchte_prozent: 62, anlass: "eingangsmessung", gemessen_von: "u-monteur", gemessen_am: tage(8) },
      { id: "me-2", raum_id: "r-1", material_id: "m-estrich", messverfahren: "widerstand", anzeige_digit: 96, absolute_feuchte_g_kg: null, temperatur_c: 22, rel_luftfeuchte_prozent: 51, anlass: "eingangsmessung", gemessen_von: "u-monteur", gemessen_am: tage(3) },
      { id: "me-3", raum_id: "r-4", material_id: "m-estrich", messverfahren: "widerstand", anzeige_digit: 70, absolute_feuchte_g_kg: null, temperatur_c: 23, rel_luftfeuchte_prozent: 45, anlass: "freimessung", gemessen_von: "u-monteur", gemessen_am: tage(24) },
    ],
    grundriss: [],
    grundriss_markierung: [],
    bemusterung: [],
    raum_foto: [],
    firmen_einstellung: [
      { schluessel: "freigabegrenze_eur", wert: "1500" },
    ],
  };
}
