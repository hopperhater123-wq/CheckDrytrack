import { beforeEach, describe, expect, it, vi } from "vitest";

// Reproduziert den Datenverlust-Bug in der Offline-Queue: mehrere Mutationen in
// schneller Folge (neuer Gerätetyp + Gerät + Aufbau) dürfen sich beim
// gleichzeitigen Flushen nicht gegenseitig aus der Queue werfen — alle müssen
// am (gemockten) Server ankommen.

// Minimaler localStorage-Ersatz (Tests laufen in Node).
const speicher = new Map<string, string>();
beforeEach(() => {
  speicher.clear();
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => speicher.get(k) ?? null,
    setItem: (k: string, v: string) => void speicher.set(k, v),
    removeItem: (k: string) => void speicher.delete(k),
  });
});

// Gemockter Supabase-Client: jeder upsert wird protokolliert und löst erst nach
// einem Tick auf — so überlappen sich nebenläufige Flush-Läufe (das Bug-Fenster).
const gesendet: Record<string, unknown[]> = {};
vi.mock("@supabase/supabase-js", () => ({
  createClient: () => ({
    from: (tabelle: string) => ({
      upsert: async (rows: unknown[]) => {
        await new Promise((r) => setTimeout(r, 5));
        (gesendet[tabelle] ??= []).push(...rows);
        return { error: null };
      },
      delete: () => ({ in: async () => ({ error: null }) }),
    }),
  }),
}));

describe("Offline-Queue (Sync)", () => {
  it("verliert bei schnell aufeinanderfolgenden Mutationen keinen Eintrag", async () => {
    for (const k of Object.keys(gesendet)) delete gesendet[k];
    const { pushDiff } = await import("./remote");

    // Drei Diffs quasi-gleichzeitig einreihen — wie NeuGeraet (Typ + Gerät) + Aufbau.
    pushDiff([{ tabelle: "geraetetyp", upserts: [{ id: "gt-x", bezeichnung: "Test" }], deletes: [] }]);
    pushDiff([{ tabelle: "geraet", upserts: [{ inventarnummer: "KT-9999", geraetetyp_id: "gt-x" }], deletes: [] }]);
    pushDiff([{ tabelle: "einsatz", upserts: [{ id: "e-x", geraet_inventarnummer: "KT-9999" }], deletes: [] }]);

    // Warten bis die Queue vollständig geleert ist.
    await vi.waitFor(() => {
      expect(JSON.parse(localStorage.getItem("drytrack.sync.queue.v1") ?? "[]")).toHaveLength(0);
    }, { timeout: 1000 });

    // Alle drei Tabellen müssen genau ihren Datensatz erhalten haben.
    expect(gesendet.geraetetyp).toEqual([{ id: "gt-x", bezeichnung: "Test" }]);
    expect(gesendet.geraet).toEqual([{ inventarnummer: "KT-9999", geraetetyp_id: "gt-x" }]);
    expect(gesendet.einsatz).toEqual([{ id: "e-x", geraet_inventarnummer: "KT-9999" }]);
  });
});
