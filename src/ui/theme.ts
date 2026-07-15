// Design-Wahl Hell / Dunkel / Automatisch. "Automatisch" folgt dem System
// (prefers-color-scheme); Hell/Dunkel erzwingen das Theme über data-theme,
// dessen CSS-Overrides in styles.css bereits vorbereitet sind.

export type ThemeWahl = "hell" | "dunkel" | "auto";

export function themeWahl(): ThemeWahl {
  const w = localStorage.getItem("torrek.theme");
  return w === "hell" || w === "dunkel" ? w : "auto";
}

export function setzeTheme(wahl: ThemeWahl) {
  localStorage.setItem("torrek.theme", wahl);
  wende(wahl);
}

/** Beim App-Start aufrufen (vor dem Rendern), damit nichts umspringt. */
export function wendeThemeAn() {
  wende(themeWahl());
}

function wende(wahl: ThemeWahl) {
  const root = document.documentElement;
  if (wahl === "auto") delete root.dataset.theme;
  else root.dataset.theme = wahl === "hell" ? "light" : "dark";

  // Statusleisten-Farbe (PWA) mitziehen: dunkler Grund im Dark Mode, sonst Petrol.
  const dunkel = wahl === "dunkel" || (wahl === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dunkel ? "#0A1416" : "#0E7C86");
}
