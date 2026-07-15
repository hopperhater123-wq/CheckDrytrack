import { useState } from "react";
import { useDB } from "./app/useStore";
import { SessionProvider, useSession } from "./app/session";
import { NavCtx, type Route } from "./app/nav";
import { Login } from "./screens/Login";
import { HeuteScreen } from "./screens/HeuteScreen";
import { BesuchFlow } from "./screens/BesuchFlow";
import { Dashboard } from "./screens/Dashboard";
import { ProjekteListe } from "./screens/ProjekteListe";
import { ProjektDetail } from "./screens/ProjektDetail";
import { GeraeteListe } from "./screens/GeraeteListe";
import { GeraetDetail } from "./screens/GeraetDetail";
import { ScanFlow } from "./screens/ScanFlow";
import { Einstellungen } from "./screens/Einstellungen";
import { TermineScreen } from "./screens/TermineScreen";
import { BestellungenScreen } from "./screens/BestellungenScreen";
import { ROLLEN_LABEL } from "./domain/roles";
import { Icon, type IconName } from "./ui/Icon";
import { Intro } from "./ui/Intro";
import { MotionConfig, EASE, DUR, AnimatePresence } from "./ui/motion";

export function App() {
  const db = useDB();
  // Marken-Intro beim App-Start (überspringbar); die App rendert darunter schon mit.
  const [intro, setIntro] = useState(true);
  return (
    // Globale Motion-Defaults: konsistentes Timing/Easing, Reduced-Motion respektiert.
    <MotionConfig transition={{ duration: DUR, ease: EASE }} reducedMotion="user">
      <SessionProvider users={db.benutzer}>
        {(login, auth) => (db.benutzer.length && !localStorage.getItem("drytrack.session.userId")
          ? <Login users={db.benutzer} onLogin={login} ms365Fehler={auth.ms365Fehler} />
          : <Shell />)}
      </SessionProvider>
      <AnimatePresence>{intro && <Intro onDone={() => setIntro(false)} />}</AnimatePresence>
    </MotionConfig>
  );
}

// Navigationsziele — nach Arbeitsablauf sortiert: „Heute" ist der Startpunkt
// des Monteurs (der Tag als Route), das Dashboard bleibt die Büro-Ansicht.
const NAV_ITEMS: { icon: IconName; label: string; ziel: Route; match: Route["name"][]; nurDesktop?: boolean }[] = [
  { icon: "sun", label: "Heute", ziel: { name: "heute" }, match: ["heute", "besuch"] },
  { icon: "dashboard", label: "Dashboard", ziel: { name: "dashboard" }, match: ["dashboard"], nurDesktop: true },
  { icon: "folder", label: "Projekte", ziel: { name: "projekte" }, match: ["projekte", "projekt"] },
  { icon: "scan", label: "Scan", ziel: { name: "scan" }, match: ["scan"] },
  { icon: "calendar", label: "Termine", ziel: { name: "termine" }, match: ["termine"], nurDesktop: true },
  { icon: "layers", label: "Bestellungen", ziel: { name: "bestellungen" }, match: ["bestellungen"], nurDesktop: true },
  { icon: "wind", label: "Geräte", ziel: { name: "geraete" }, match: ["geraete", "geraet"] },
  { icon: "menu", label: "Einstellungen", ziel: { name: "einstellungen" }, match: ["einstellungen"] },
];

// Deep-Link vom Projekt-QR: ?p=<projektId> öffnet direkt das Projekt (Backlog ④).
// Sonst startet der Monteur in seinem Tag, Büro-Rollen im Dashboard.
function startRoute(rolle: string): Route {
  try {
    const pid = new URLSearchParams(window.location.search).get("p");
    if (pid) {
      // Param aus der URL entfernen, damit ein Reload wieder auf den Start führt.
      const url = new URL(window.location.href);
      url.searchParams.delete("p");
      window.history.replaceState(null, "", url.toString());
      return { name: "projekt", id: pid };
    }
  } catch { /* ignorieren */ }
  return rolle === "monteur" ? { name: "heute" } : { name: "dashboard" };
}

function Shell() {
  const { user, logout } = useSession();
  const [route, setRoute] = useState<Route>(() => startRoute(user.rolle));
  const initialen = user.name.split(" ").map((t) => t[0]).slice(0, 2).join("");

  return (
    <NavCtx.Provider value={setRoute}>
      <div className="app">
        {/* Sidebar — nur Desktop (Office) */}
        <aside className="sidebar">
          <div className="brand" onClick={() => setRoute({ name: "dashboard" })}>
            <span className="logo"><Icon name="droplet" size={16} strokeWidth={2} /></span> Torrek
          </div>
          <button className="btn btn-primary sidebar-cta" onClick={() => setRoute({ name: "projekte", neu: true })}>
            <Icon name="plus" size={16} /> Neues Projekt
          </button>
          <nav className="sidebar-nav">
            {NAV_ITEMS.map((n) => (
              <button
                key={n.label}
                className={`navitem${n.match.includes(route.name) ? " active" : ""}`}
                onClick={() => setRoute(n.ziel)}
              >
                <Icon name={n.icon} size={18} /> {n.label}
              </button>
            ))}
          </nav>
          <div className="sidebar-user">
            <span className="avatar">{initialen}</span>
            <div style={{ minWidth: 0 }}>
              <div className="sidebar-user-name">{user.name}</div>
              <div className="muted small">{ROLLEN_LABEL[user.rolle]}</div>
            </div>
            <button className="iconbtn" onClick={logout} title="Abmelden" aria-label="Abmelden"><Icon name="logout" size={17} /></button>
          </div>
        </aside>

        <div className="maincol">
          {/* Topbar — nur mobil */}
          <header className="topbar">
            <div className="brand" onClick={() => setRoute({ name: "dashboard" })}>
              <span className="logo"><Icon name="droplet" size={16} strokeWidth={2} /></span> Torrek
            </div>
            <div className="whoami">
              <span className="whoami-name">{user.name}</span>
              <span className="badge">{ROLLEN_LABEL[user.rolle]}</span>
              <button className="iconbtn" onClick={logout} title="Abmelden" aria-label="Abmelden"><Icon name="logout" size={18} /></button>
            </div>
          </header>

          <main className="content">
            <Screen route={route} />
          </main>

          {/* Bottom-Tabs — nur mobil */}
          <nav className="tabbar">
            {NAV_ITEMS.filter((n) => !n.nurDesktop).map((n) => (
              <Tab
                key={n.label}
                active={n.match.includes(route.name)}
                onClick={() => setRoute(n.ziel)}
                icon={n.icon}
                label={n.label === "Einstellungen" ? "Mehr" : n.label}
                primary={n.icon === "scan"}
              />
            ))}
          </nav>
        </div>
      </div>
    </NavCtx.Provider>
  );
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case "heute": return <HeuteScreen />;
    case "besuch": return <BesuchFlow projektId={route.projektId} terminId={route.terminId} />;
    case "dashboard": return <Dashboard />;
    case "projekte": return <ProjekteListe key={route.neu ? "neu" : "std"} neuInitial={route.neu} />;
    case "projekt": return <ProjektDetail id={route.id} />;
    case "geraete": return <GeraeteListe />;
    case "geraet": return <GeraetDetail inv={route.inv} />;
    case "scan": return <ScanFlow />;
    case "termine": return <TermineScreen />;
    case "bestellungen": return <BestellungenScreen />;
    case "einstellungen": return <Einstellungen />;
  }
}

function Tab({ active, onClick, icon, label, primary }: { active: boolean; onClick: () => void; icon: IconName; label: string; primary?: boolean }) {
  return (
    <button className={`tab${active ? " active" : ""}${primary ? " primary" : ""}`} onClick={onClick} aria-label={label}>
      {primary ? <span className="tab-icon"><Icon name={icon} size={24} /></span> : <Icon name={icon} size={22} />}
      <span className="tab-label">{label}</span>
    </button>
  );
}
