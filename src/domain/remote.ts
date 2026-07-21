// Supabase-Anbindung (008 Backend / ADR-1): Postgres + Realtime als geteilte Quelle,
// localStorage bleibt Offline-Cache (000 Vision: Offline-First).
//
// Arbeitsweise:
//  - Beim Start: Offline-Queue flushen → alle Tabellen ziehen → lokalen Store ersetzen → Realtime abonnieren.
//  - Jede lokale Mutation: commit() ermittelt den Diff (Upserts/Deletes je Tabelle) und ruft pushDiff().
//  - Offline/Fehler: Änderungen landen in einer persistenten Queue und werden beim nächsten
//    Online-Gehen idempotent (PK-Upserts) nachgespielt. Ohne Konfiguration/Netz läuft alles rein lokal.

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "../config";
import type { DryTrackDB } from "./types";

export type TabelleName = keyof DryTrackDB;

export const TABELLEN: TabelleName[] = [
  "benutzer", "geraetetyp", "geraet", "versicherung", "projekt", "raum", "einsatz",
  "feed_eintrag", "feed_kommentar", "dokument", "materialdatenbank", "bodenaufbau_schicht",
  "messpunkt", "messung", "grundriss", "grundriss_markierung", "bemusterung", "raum_foto",
  "besuchsbericht", "stunden_eintrag", "abnahmeprotokoll", "ersatzfliesenbericht", "kundenzufriedenheit",
  "notdiensteinsatzbericht", "stundenlohnbericht", "termin", "trocknungsergebnis", "firmen_einstellung",
  "beteiligter",
];

export function pkVon(tabelle: TabelleName): string {
  if (tabelle === "geraet") return "inventarnummer";
  if (tabelle === "firmen_einstellung") return "schluessel";
  return "id";
}

export interface TabellenDiff {
  tabelle: TabelleName;
  upserts: Record<string, unknown>[];
  deletes: string[]; // PK-Werte
}

const QUEUE_KEY = "drytrack.sync.queue.v1";

let client: SupabaseClient | null = null;
let verbunden = false; // erst nach erfolgreichem Pull true

function supabase(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_KEY) return null;
  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_KEY, {
      // Auth-fähig, damit derselbe Client den Microsoft-365-Login (OAuth-Redirect) tragen
      // kann. Ohne aktiven Login werden die Anfragen weiter mit dem anon-Key ausgeführt.
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    });
  }
  return client;
}

/** Geteilter Supabase-Client (auch für den Auth-Layer, src/domain/auth.ts). */
export function getSupabaseClient(): SupabaseClient | null {
  return supabase();
}

export function istVerbunden(): boolean {
  return verbunden;
}

// ---------------------------------------------------------------------------
// Offline-Queue
// ---------------------------------------------------------------------------

function queueLesen(): TabellenDiff[] {
  try { return JSON.parse(localStorage.getItem(QUEUE_KEY) ?? "[]"); } catch { return []; }
}
function queueSchreiben(q: TabellenDiff[]) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch { /* voll — Sync beim nächsten Pull */ }
}

async function diffSenden(sb: SupabaseClient, diff: TabellenDiff): Promise<void> {
  const pk = pkVon(diff.tabelle);
  if (diff.upserts.length) {
    const { error } = await sb.from(diff.tabelle).upsert(diff.upserts, { onConflict: pk });
    if (error) throw error;
  }
  if (diff.deletes.length) {
    const { error } = await sb.from(diff.tabelle).delete().in(pk, diff.deletes);
    if (error) throw error;
  }
}

// Nur ein Flush gleichzeitig. Sonst hielten mehrere Läufe je eine veraltete
// Queue-Kopie über den await hinweg und überschrieben sich beim Zurückschreiben
// gegenseitig — dabei gingen frisch angehängte Einträge (z. B. neues Gerät +
// Aufbau in schneller Folge) verloren und kamen nie am Server an.
let flushLaeuft = false;
let flushErneut = false;

async function queueFlushen(): Promise<boolean> {
  const sb = supabase();
  if (!sb) return false;
  if (flushLaeuft) { flushErneut = true; return false; } // laufender Lauf nimmt neue Einträge mit
  flushLaeuft = true;
  try {
    do {
      flushErneut = false;
      while (queueLesen().length) {
        const q = queueLesen();
        try {
          await diffSenden(sb, q[0]);
        } catch {
          return false; // Eintrag bleibt an Position 0 → nächster Versuch (online-Event / Start)
        }
        // Frisch lesen statt veralteter Kopie: nebenläufig angehängte Einträge
        // bleiben erhalten, nur der gerade gesendete (Position 0) fällt raus.
        queueSchreiben(queueLesen().slice(1));
      }
    } while (flushErneut);
    return true;
  } finally {
    flushLaeuft = false;
  }
}

/** Von store.commit() aufgerufen: Diff einreihen und (best effort) sofort senden. */
export function pushDiff(diffs: TabellenDiff[]) {
  const relevante = diffs.filter((d) => d.upserts.length || d.deletes.length);
  if (!relevante.length || !supabase()) return;
  queueSchreiben([...queueLesen(), ...relevante]);
  void queueFlushen();
}

// ---------------------------------------------------------------------------
// Pull + Realtime
// ---------------------------------------------------------------------------

// ⚠️ OFFENE TECHNISCHE SCHULD (Roadmap 011 D · Teil 2, Tagebuch #050):
// select("*") zieht ALLE Bilder (Base64 in den Tabellen) bei JEDEM Start mit.
// Vor flächendeckendem 360°-Rollout: Bilder in Supabase Storage auslagern und
// hier nur noch Verweise ziehen (Lazy-Loading). Siehe Kopf von localdb.ts.
async function allesZiehen(sb: SupabaseClient): Promise<DryTrackDB> {
  const db = {} as Record<TabelleName, unknown[]>;
  await Promise.all(TABELLEN.map(async (t) => {
    const { data, error } = await sb.from(t).select("*");
    if (error) throw error;
    db[t] = data ?? [];
  }));
  return db as unknown as DryTrackDB;
}

export interface RemoteHooks {
  ersetzen: (db: DryTrackDB) => void;
  anwenden: (tabelle: TabelleName, event: "INSERT" | "UPDATE" | "DELETE", neu: Record<string, unknown> | null, alt: Record<string, unknown> | null) => void;
}

/** Startet die Synchronisation. Kein Throw — bei Fehlschlag bleibt die App rein lokal. */
export async function starteSync(hooks: RemoteHooks): Promise<void> {
  const sb = supabase();
  if (!sb) return;

  const verbinden = async () => {
    await queueFlushen(); // lokale Änderungen zuerst, sonst überschreibt der Pull sie
    const db = await allesZiehen(sb);
    hooks.ersetzen(db);
    verbunden = true;
  };

  try {
    await verbinden();
  } catch {
    // offline oder blockiert (z. B. Demo-Sandbox) → lokal weiterarbeiten
    window.addEventListener("online", () => { void verbinden().catch(() => {}); }, { once: true });
    return;
  }

  sb.channel("drytrack-db")
    .on("postgres_changes", { event: "*", schema: "public" }, (payload) => {
      hooks.anwenden(
        payload.table as TabelleName,
        payload.eventType,
        (payload.new ?? null) as Record<string, unknown> | null,
        (payload.old ?? null) as Record<string, unknown> | null,
      );
    })
    .subscribe();

  window.addEventListener("online", () => { void verbinden().catch(() => {}); });
}

/** Vollständigen lokalen Stand zum Server spiegeln (einmalig nach Erst-Seed nicht nötig — Seed liegt in der Migration). */
export function diffAusStaenden(prev: DryTrackDB, next: DryTrackDB): TabellenDiff[] {
  return TABELLEN.map((t) => {
    const pk = pkVon(t);
    const alt = new Map((prev[t] as unknown as Record<string, unknown>[]).map((r) => [String(r[pk]), r]));
    const neu = new Map((next[t] as unknown as Record<string, unknown>[]).map((r) => [String(r[pk]), r]));
    const upserts: Record<string, unknown>[] = [];
    const deletes: string[] = [];
    neu.forEach((row, key) => {
      const vorher = alt.get(key);
      if (!vorher || JSON.stringify(vorher) !== JSON.stringify(row)) upserts.push(row);
    });
    alt.forEach((_row, key) => { if (!neu.has(key)) deletes.push(key); });
    return { tabelle: t, upserts, deletes };
  });
}
