// Lokaler Bild-/Datenspeicher auf IndexedDB (PO 18.07.: Speicher wächst mit Fotos).
//
// Warum: Der gesamte Offline-Datenbestand lag bisher als ein JSON in localStorage.
// localStorage ist je Ursprung auf ~5–10 MB gedeckelt — schon wenige (360°-)Fotos
// à 1–2 MB sprengen das. IndexedDB bietet Hunderte MB bis GB und ist ebenfalls
// vollständig offline. Deshalb: die VOLLE DB (inkl. Bilder) liegt hier; in
// localStorage bleibt nur ein schlanker Abzug OHNE Bilder (store.ts) für den
// Sofort-Start und die Tab-übergreifende Benachrichtigung.
//
// Bewusst ohne Fremdbibliothek — ein winziger Promise-Wrapper um IndexedDB.

import type { DryTrackDB } from "./types";

const DB_NAME = "torrek";
const STORE = "stand";
const KEY = "db";

function verfuegbar(): boolean {
  return typeof indexedDB !== "undefined";
}

function oeffnen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Vollen Stand aus IndexedDB lesen (null, wenn nichts abgelegt oder nicht verfügbar). */
export async function idbHolen(): Promise<DryTrackDB | null> {
  if (!verfuegbar()) return null;
  try {
    const db = await oeffnen();
    return await new Promise<DryTrackDB | null>((resolve, reject) => {
      const tx = db.transaction(STORE, "readonly");
      const req = tx.objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as DryTrackDB) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

/** Vollen Stand (inkl. Bilder) nach IndexedDB schreiben. */
export async function idbSetzen(daten: DryTrackDB): Promise<void> {
  if (!verfuegbar()) return;
  try {
    const db = await oeffnen();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(daten, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* Speicher voll o. ä. — App bleibt über den localStorage-Abzug nutzbar */
  }
}

/** Lokalen Stand löschen (für reset()). */
export async function idbLoeschen(): Promise<void> {
  if (!verfuegbar()) return;
  try {
    const db = await oeffnen();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).delete(KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    /* ignorieren */
  }
}
