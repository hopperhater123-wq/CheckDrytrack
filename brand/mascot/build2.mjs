import fs from "fs";
const F = "/home/user/CheckDrytrack/.claude/skills/canvas-design/canvas-fonts/";
const b64 = (f) => fs.readFileSync(F + f).toString("base64");
const face = (fam, file, w, st = "normal") =>
  `@font-face{font-family:"${fam}";font-weight:${w};font-style:${st};src:url(data:font/ttf;base64,${b64(file)}) format("truetype");}`;
const fonts = [
  face("Sig", "BigShoulders-Bold.ttf", 700),
  face("Mono", "JetBrainsMono-Regular.ttf", 400),
  face("Ser", "Lora-Italic.ttf", 500, "italic"),
].join("\n");

// ---- Farben (flat, Duolingo-artig, aus der Sicco-Palette) ----
const C = {
  amber: "#E8A83E", light: "#F6D289", mid: "#D0912C", dark: "#B87C22",
  teal: "#0E7C86", tealD: "#0A626A", tealL: "#2AA7B0",
  eye: "#33210F", mouth: "#7A4E12", tongue: "#E86D5A", blush: "#F0B25C",
};

// ---- Kopf als wiederverwendbare Funktion (Ausdruck steuerbar) ----
// local coords: Zentrum (0,0), Kopf rx180/ry160, Helm oben.
function head(expr) {
  // Augen
  let eyes;
  if (expr === "joy") {
    eyes = `
      <path d="M -92,-30 Q -62,-64 -32,-30" fill="none" stroke="${C.eye}" stroke-width="12" stroke-linecap="round"/>
      <path d="M 32,-30 Q 62,-64 92,-30" fill="none" stroke="${C.eye}" stroke-width="12" stroke-linecap="round"/>`;
  } else {
    const dx = expr === "focus" ? 10 : 0, dy = expr === "focus" ? 12 : 0;
    eyes = `
      <ellipse cx="-62" cy="-30" rx="46" ry="56" fill="#FFFFFF"/>
      <ellipse cx="62" cy="-30" rx="46" ry="56" fill="#FFFFFF"/>
      <ellipse cx="${-52 + dx}" cy="${-24 + dy}" rx="21" ry="27" fill="${C.eye}"/>
      <ellipse cx="${52 + dx}" cy="${-24 + dy}" rx="21" ry="27" fill="${C.eye}"/>
      <circle cx="${-44 + dx}" cy="${-34 + dy}" r="7" fill="#FFFFFF"/>
      <circle cx="${60 + dx}" cy="${-34 + dy}" r="7" fill="#FFFFFF"/>`;
  }
  // Mund
  let mouth;
  if (expr === "joy") {
    mouth = `
      <path d="M -52,92 Q 0,150 52,92 Z" fill="${C.mouth}"/>
      <ellipse cx="0" cy="122" rx="24" ry="13" fill="${C.tongue}"/>`;
  } else if (expr === "focus") {
    mouth = `<circle cx="10" cy="106" r="13" fill="${C.mouth}"/>`;
  } else {
    mouth = `<path d="M -32,100 Q 0,128 32,100" fill="none" stroke="${C.mouth}" stroke-width="9" stroke-linecap="round"/>`;
  }
  return `
  <g>
    <!-- Ohren -->
    <ellipse cx="-160" cy="-92" rx="36" ry="48" fill="${C.amber}" transform="rotate(-18 -160 -92)"/>
    <ellipse cx="-158" cy="-88" rx="18" ry="26" fill="${C.dark}" transform="rotate(-18 -158 -88)"/>
    <ellipse cx="160" cy="-92" rx="36" ry="48" fill="${C.amber}" transform="rotate(18 160 -92)"/>
    <ellipse cx="158" cy="-88" rx="18" ry="26" fill="${C.dark}" transform="rotate(18 158 -88)"/>
    <!-- Kopf -->
    <ellipse cx="0" cy="0" rx="180" ry="160" fill="${C.amber}"/>
    <!-- Wangen -->
    <ellipse cx="-118" cy="52" rx="26" ry="16" fill="${C.blush}" opacity="0.7"/>
    <ellipse cx="118" cy="52" rx="26" ry="16" fill="${C.blush}" opacity="0.7"/>
    <!-- Schnauze -->
    <ellipse cx="0" cy="80" rx="112" ry="78" fill="${C.light}"/>
    <ellipse cx="-36" cy="52" rx="9" ry="14" fill="${C.dark}" transform="rotate(-14 -36 52)"/>
    <ellipse cx="36" cy="52" rx="9" ry="14" fill="${C.dark}" transform="rotate(14 36 52)"/>
    ${mouth}
    ${eyes}
    <!-- Bauhelm (Teal) -->
    <path d="M -112,-108 A 112,96 0 0 1 112,-108 Z" fill="${C.teal}"/>
    <path d="M -30,-196 A 30,20 0 0 1 30,-196 L 24,-160 L -24,-160 Z" fill="${C.tealL}" opacity="0"/>
    <rect x="-14" y="-206" width="28" height="52" rx="14" fill="${C.teal}"/>
    <rect x="-138" y="-122" width="276" height="30" rx="15" fill="${C.tealD}"/>
    <rect x="-34" y="-190" width="20" height="66" rx="10" fill="${C.tealL}" opacity="0.55"/>
  </g>`;
}

// ---- Ganzkörper (Haupt-Pose) ----
const bodyGroup = `
<g>
  <!-- Schatten -->
  <ellipse cx="580" cy="988" rx="330" ry="30" fill="#0C1417" opacity="0.07"/>
  <!-- hintere Beine -->
  <line x1="440" y1="790" x2="440" y2="915" stroke="${C.mid}" stroke-width="60" stroke-linecap="round"/>
  <line x1="662" y1="790" x2="662" y2="915" stroke="${C.mid}" stroke-width="60" stroke-linecap="round"/>
  <rect x="408" y="906" width="64" height="40" rx="17" fill="${C.dark}"/>
  <rect x="630" y="906" width="64" height="40" rx="17" fill="${C.dark}"/>
  <!-- Schwanz -->
  <path d="M 828,660 Q 902,700 882,780" fill="none" stroke="${C.mid}" stroke-width="26" stroke-linecap="round"/>
  <circle cx="882" cy="792" r="30" fill="${C.dark}"/>
  <!-- Hals -->
  <line x1="392" y1="474" x2="494" y2="652" stroke="${C.amber}" stroke-width="150" stroke-linecap="round"/>
  <!-- Körper + Höcker -->
  <circle cx="702" cy="552" r="106" fill="${C.amber}"/>
  <path d="M 640,505 A 106,106 0 0 1 795,520" fill="none" stroke="${C.mid}" stroke-width="14" stroke-linecap="round" opacity="0.5"/>
  <ellipse cx="590" cy="720" rx="252" ry="152" fill="${C.amber}"/>
  <ellipse cx="560" cy="762" rx="142" ry="92" fill="${C.light}"/>
  <!-- vordere Beine -->
  <line x1="490" y1="790" x2="490" y2="920" stroke="${C.amber}" stroke-width="66" stroke-linecap="round"/>
  <line x1="712" y1="790" x2="712" y2="920" stroke="${C.amber}" stroke-width="66" stroke-linecap="round"/>
  <rect x="456" y="908" width="68" height="40" rx="17" fill="${C.dark}"/>
  <rect x="678" y="908" width="68" height="40" rx="17" fill="${C.dark}"/>
  <!-- Kopf -->
  <g transform="translate(358,350)">${head("default")}</g>
</g>`;

// ---- Trocknungslinie als Boden ----
const ground = `
<defs>
  <linearGradient id="dline" x1="0" y1="0" x2="1" y2="0">
    <stop offset="0" stop-color="#0B5560"/><stop offset="0.45" stop-color="#3F9AA0"/><stop offset="1" stop-color="#E0A43B"/>
  </linearGradient>
</defs>
<rect x="120" y="946" width="960" height="18" rx="9" fill="url(#dline)"/>
<rect x="806" y="936" width="4" height="38" rx="2" fill="#FFFFFF" stroke="#0C1417" stroke-width="1"/>`;

// ---- Ausdrucks-Reihe ----
const emotes = `
<text x="600" y="1102" text-anchor="middle" font-family="Mono" font-size="17" letter-spacing="6" fill="#7A8A8C">AUSDRÜCKE</text>
<g transform="translate(260,1250) scale(0.40)">${head("default")}</g>
<g transform="translate(600,1250) scale(0.40)">${head("joy")}</g>
<g transform="translate(940,1250) scale(0.40)">${head("focus")}</g>
<text x="260" y="1382" text-anchor="middle" font-family="Mono" font-size="19" letter-spacing="3" fill="#3A4A4C">„HALLO“</text>
<text x="600" y="1382" text-anchor="middle" font-family="Mono" font-size="19" letter-spacing="3" fill="#C6892A">„TROCKEN!“</text>
<text x="940" y="1382" text-anchor="middle" font-family="Mono" font-size="19" letter-spacing="3" fill="#3A4A4C">„MISST …“</text>`;

const svg = `<svg width="1200" height="1500" viewBox="0 0 1200 1500" xmlns="http://www.w3.org/2000/svg">
<rect width="1200" height="1500" fill="#F7F8F7"/>
<circle cx="571" cy="726" r="330" fill="${C.light}" opacity="0.30"/>
<text x="600" y="108" text-anchor="middle" font-family="Mono" font-size="17" letter-spacing="7" fill="${C.teal}">SICCO · MASKOTTCHEN</text>
<text x="600" y="232" text-anchor="middle" font-family="Sig" font-weight="700" font-size="140" letter-spacing="4" fill="#0C1417">KAMIL</text>
<text x="600" y="282" text-anchor="middle" font-family="Ser" font-style="italic" font-size="28" fill="#3A4A4C">Der freundliche Wächter des Trockenen</text>
<g transform="translate(96,218) scale(0.84)">
${ground}
${bodyGroup}
</g>
${emotes}
<text x="600" y="1462" text-anchor="middle" font-family="Mono" font-size="14" letter-spacing="3" fill="#9AA6A5">SICCO · KAMIL V2 · 14.07.2026</text>
</svg>`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>${fonts}
*{margin:0;padding:0}body{width:1200px;height:1500px}</style></head><body>${svg}</body></html>`;
fs.writeFileSync("kamil2.html", html);
fs.writeFileSync("kamil2.svg", svg);
console.log("ok");
