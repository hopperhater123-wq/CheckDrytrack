import type {
  DokumentTyp, FeedKategorie, FeedUrsprung, GeraetStatus, KontaminationArt, ProjektStatus,
} from "../domain/types";

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

export const DOKUMENT_TYP_LABEL: Record<DokumentTyp, string> = {
  messprotokoll: "Messprotokoll", schadensaufnahme_doku: "Schadensaufnahme-Doku", erstbericht: "Erstbericht",
  abschlussbericht: "Abschlussbericht", kva: "KVA", strombrief: "Strombrief",
};
