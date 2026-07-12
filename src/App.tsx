import { useState } from "react";
import { useDB } from "./app/useStore";
import { SessionProvider, useSession } from "./app/session";
import { NavCtx, type Route } from "./app/nav";
import { Login } from "./screens/Login";
import { Dashboard } from "./screens/Dashboard";
import { ProjekteListe } from "./screens/ProjekteListe";
import { ProjektDetail } from "./screens/ProjektDetail";
import { GeraeteListe } from "./screens/GeraeteListe";
import { GeraetDetail } from "./screens/GeraetDetail";
import { ScanFlow } from "./screens/ScanFlow";
import { Einstellungen } from "./screens/Einstellungen";
import { ROLLEN_LABEL } from "./domain/roles";
import { Icon, type IconName } from "./ui/Icon";

export function App() {
  const db = useDB();
  return (
    <SessionProvider users={db.benutzer}>
      {(login) => (db.benutzer.length && !localStorage.getItem("drytrack.session.userId")
        ? <Login users={db.benutzer} onLogin={login} />
        : <Shell />)}
    </SessionProvider>
  );
}

function Shell() {
  const [route, setRoute] = useState<Route>({ name: "dashboard" });
  const { user, logout } = useSession();

  return (
    <NavCtx.Provider value={setRoute}>
      <div className="app">
        <header className="topbar">
          <div className="brand" onClick={() => setRoute({ name: "dashboard" })}>
            <span className="logo"><Icon name="droplet" size={16} strokeWidth={2} /></span> DryTrack
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

        <nav className="tabbar">
          <Tab active={route.name === "dashboard"} onClick={() => setRoute({ name: "dashboard" })} icon="dashboard" label="Dashboard" />
          <Tab active={route.name === "projekte" || route.name === "projekt"} onClick={() => setRoute({ name: "projekte" })} icon="folder" label="Projekte" />
          <Tab active={route.name === "scan"} onClick={() => setRoute({ name: "scan" })} icon="scan" label="Scan" primary />
          <Tab active={route.name === "geraete" || route.name === "geraet"} onClick={() => setRoute({ name: "geraete" })} icon="wind" label="Geräte" />
          <Tab active={route.name === "einstellungen"} onClick={() => setRoute({ name: "einstellungen" })} icon="menu" label="Mehr" />
        </nav>
      </div>
    </NavCtx.Provider>
  );
}

function Screen({ route }: { route: Route }) {
  switch (route.name) {
    case "dashboard": return <Dashboard />;
    case "projekte": return <ProjekteListe />;
    case "projekt": return <ProjektDetail id={route.id} />;
    case "geraete": return <GeraeteListe />;
    case "geraet": return <GeraetDetail inv={route.inv} />;
    case "scan": return <ScanFlow />;
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
