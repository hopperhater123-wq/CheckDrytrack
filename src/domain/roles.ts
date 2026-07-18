// Rollen-Rechte-Matrix — 1:1 aus "04 · Rollenmodell" (Notion).
// Rechte sind additiv nach oben (Admin/GF sieht alles). Genau eine Rolle pro Benutzer.

import type { Rolle } from "./types";

export interface Faehigkeiten {
  geraeteScannen: boolean;
  // Bestellstatus (Bemusterung/Bestellübersicht) ändern: Büro-Sache —
  // der Monteur SIEHT Bestellungen, markiert aber nichts (PO-Vorgabe 18.07.).
  bestellungenVerwalten: boolean;
  alleErfassungenEinsehen: boolean;
  projektAnlegen: boolean;
  projektBearbeiten: boolean;
  geraeteStammdatenVerwalten: boolean;
  mitarbeiterVerwalten: boolean;
  exportReporting: boolean;
  analytics: boolean;
  // Entscheidendes Unterscheidungsmerkmal: KVA/Kosten/Rechnungszahlen.
  // Monteur ❌, Disposition/Projektleiter/Admin ✅.
  kostenSichtbar: boolean;
}

export const ROLLEN_LABEL: Record<Rolle, string> = {
  monteur: "Monteur",
  disposition: "Disposition",
  projektleiter: "Projektleiter",
  admin_gf: "Admin / GF",
};

export function faehigkeiten(rolle: Rolle): Faehigkeiten {
  switch (rolle) {
    case "monteur":
      return {
        geraeteScannen: true,
        bestellungenVerwalten: false,
        alleErfassungenEinsehen: false,
        projektAnlegen: true,
        projektBearbeiten: false,
        geraeteStammdatenVerwalten: false,
        mitarbeiterVerwalten: false,
        exportReporting: false,
        analytics: false,
        kostenSichtbar: false,
      };
    case "disposition":
      return {
        geraeteScannen: true,
        bestellungenVerwalten: true,
        alleErfassungenEinsehen: true,
        projektAnlegen: true,
        projektBearbeiten: true,
        geraeteStammdatenVerwalten: true,
        mitarbeiterVerwalten: false,
        exportReporting: true,
        analytics: true,
        kostenSichtbar: true,
      };
    case "projektleiter":
      return {
        geraeteScannen: true,
        bestellungenVerwalten: true,
        alleErfassungenEinsehen: true, // eigene Projekte
        projektAnlegen: true,
        projektBearbeiten: true, // eigene
        geraeteStammdatenVerwalten: false,
        mitarbeiterVerwalten: false,
        exportReporting: true,
        analytics: true,
        kostenSichtbar: true,
      };
    case "admin_gf":
      return {
        geraeteScannen: true,
        bestellungenVerwalten: true,
        alleErfassungenEinsehen: true,
        projektAnlegen: true,
        projektBearbeiten: true,
        geraeteStammdatenVerwalten: true,
        mitarbeiterVerwalten: true,
        exportReporting: true,
        analytics: true,
        kostenSichtbar: true,
      };
  }
}
