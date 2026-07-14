import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { store } from "./domain/store";
import "./fonts.generated.css";
import "./styles.css";

// Supabase-Sync starten (008 Backend): Pull → Realtime; ohne Netz/Konfig rein lokal.
store.starteRemoteSync();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// PWA: App-Shell offline verfügbar machen. Nur in sicheren Kontexten (https/localhost);
// in der Single-File-Demo (Artifact) gibt es kein sw.js — der catch schluckt das.
if ("serviceWorker" in navigator && !import.meta.env.DEV) {
  window.addEventListener("load", () => {
    // Relativ registrieren: funktioniert an der Domain-Wurzel UND auf Subpfad-Hosting
    // (Edge Function unter /functions/v1/app/) — BASE_URL wäre dort fälschlich "/".
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
