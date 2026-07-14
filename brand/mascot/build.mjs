import fs from "fs";
const F = "/home/user/CheckDrytrack/.claude/skills/canvas-design/canvas-fonts/";
const b64 = (f) => fs.readFileSync(F + f).toString("base64");
const face = (fam, file, w, st = "normal") =>
  `@font-face{font-family:"${fam}";font-weight:${w};font-style:${st};src:url(data:font/ttf;base64,${b64(file)}) format("truetype");}`;
const fonts = [
  face("Sig", "BigShoulders-Bold.ttf", 700),
  face("Sig", "BigShoulders-Regular.ttf", 500),
  face("Mono", "JetBrainsMono-Regular.ttf", 400),
  face("Ser", "Lora-Italic.ttf", 500, "italic"),
].join("\n");

// ---- Camel "Kamil": constructed dromedary silhouette, facing right ----
const leg = (cx, darker) =>
  `<path d="M ${cx - 10},248 C ${cx - 13},295 ${cx - 12},335 ${cx - 9},357 L ${cx + 9},357 C ${cx + 12},335 ${cx + 13},295 ${cx + 10},248 Z" fill="${darker ? "#B87C22" : "url(#amber)"}"/>` +
  `<ellipse cx="${cx}" cy="359" rx="12" ry="6" fill="#A96E1C"/>`;

const camel = `
<g id="kamil">
  ${leg(120, true)} ${leg(90, true)}
  ${leg(250, false)} ${leg(222, false)}
  <path d="M 50,152 C 44,178 46,206 52,226 C 45,231 43,241 50,248 C 57,241 59,231 55,224 C 60,204 58,176 62,154 Z" fill="#B87C22"/>
  <path d="M 45,190 C 45,146 92,118 176,118 C 250,118 300,148 300,192 C 300,242 250,266 175,266 C 95,266 45,236 45,190 Z" fill="url(#amber)"/>
  <path d="M 84,132 C 100,52 214,48 248,142 C 206,118 122,118 84,132 Z" fill="url(#amber)"/>
  <path d="M 262,150 C 300,150 322,120 342,96 C 356,77 372,65 390,61 C 404,58 416,65 420,79 C 438,85 460,97 470,113 C 476,122 472,132 462,133 C 446,134 430,128 418,123 C 402,129 388,141 376,159 C 360,183 336,197 312,197 C 292,197 276,185 268,169 C 262,161 260,155 262,150 Z" fill="url(#amber)"/>
  <path d="M 384,60 C 381,43 390,35 397,40 C 401,50 398,59 391,63 Z" fill="#C6892A"/>
  <path d="M 402,60 C 406,50 412,50 414,60 C 410,66 406,66 402,60 Z" fill="#B87C22"/>
  <circle cx="410" cy="92" r="5.4" fill="#0C1417"/>
  <circle cx="412" cy="90" r="1.6" fill="#F3F5F4"/>
  <path d="M 452,118 C 456,116 460,118 459,122" fill="none" stroke="#8C5A16" stroke-width="2.4" stroke-linecap="round"/>
  <path d="M 442,128 C 448,131 455,131 460,129" fill="none" stroke="#8C5A16" stroke-width="2" stroke-linecap="round"/>
</g>`;

const ann = (x1, y1, x2, y2, tx, ty, text, anchor = "start") => `
  <circle cx="${x1}" cy="${y1}" r="3" fill="#0E7C86"/>
  <path d="M ${x1},${y1} L ${x2},${y2}" stroke="#0E7C86" stroke-width="1" opacity="0.65"/>
  <text x="${tx}" y="${ty}" text-anchor="${anchor}" font-family="Mono" font-size="15" letter-spacing="1.5" fill="#3A4A4C">${text}</text>`;

let ticks = "";
for (let i = 0; i <= 20; i++) {
  const x = 170 + i * (860 / 20);
  const big = i % 5 === 0;
  ticks += `<line x1="${x}" y1="${big ? 968 : 972}" x2="${x}" y2="${big ? 996 : 992}" stroke="#F3F5F4" stroke-width="${big ? 2 : 1}" opacity="0.75"/>`;
}

let grid = "";
for (let x = 0; x <= 1200; x += 40) grid += `<line x1="${x}" y1="0" x2="${x}" y2="1680" stroke="#0E7C86" stroke-width="1" opacity="0.05"/>`;
for (let y = 0; y <= 1680; y += 40) grid += `<line x1="0" y1="${y}" x2="1200" y2="${y}" stroke="#0E7C86" stroke-width="1" opacity="0.05"/>`;

const pal = [["#0E7C86", "INSTRUMENT-TEAL"], ["#3F9AA0", "ÜBERGANG"], ["#E0A43B", "SAND-AMBER"], ["#0C1417", "TIEF-ANTHRAZIT"], ["#D8483A", "BRICK / ALARM"]];
let swatch = "";
pal.forEach((p, i) => {
  const x = 170 + i * 180;
  swatch += `<rect x="${x}" y="1300" width="150" height="52" rx="7" fill="${p[0]}"/>` +
    `<text x="${x}" y="1378" font-family="Mono" font-size="13" letter-spacing="0.5" fill="#3A4A4C">${p[0]}</text>` +
    `<text x="${x}" y="1398" font-family="Mono" font-size="11" letter-spacing="1" fill="#7A8A8C">${p[1]}</text>`;
});

const svg = `<svg width="1200" height="1680" viewBox="0 0 1200 1680" xmlns="http://www.w3.org/2000/svg">
<defs>
  <linearGradient id="amber" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#E7B457"/><stop offset="1" stop-color="#C6892A"/></linearGradient>
  <linearGradient id="dline" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#0B5560"/><stop offset="0.45" stop-color="#3F9AA0"/><stop offset="1" stop-color="#E0A43B"/></linearGradient>
</defs>
<rect width="1200" height="1680" fill="#ECEFEE"/>
${grid}
<path d="M60,60 h26 M60,60 v26" stroke="#0C1417" stroke-width="2"/>
<path d="M1140,60 h-26 M1140,60 v26" stroke="#0C1417" stroke-width="2"/>
<path d="M60,1620 h26 M60,1620 v-26" stroke="#0C1417" stroke-width="2"/>
<path d="M1140,1620 h-26 M1140,1620 v-26" stroke="#0C1417" stroke-width="2"/>
<text x="600" y="120" text-anchor="middle" font-family="Mono" font-size="17" letter-spacing="7" fill="#0E7C86">DRYTRACK  ·  FELDFAUNA  ·  TAFEL I</text>
<text x="600" y="250" text-anchor="middle" font-family="Sig" font-weight="700" font-size="150" letter-spacing="4" fill="#0C1417">KAMIL</text>
<text x="600" y="298" text-anchor="middle" font-family="Ser" font-style="italic" font-size="30" fill="#3A4A4C">Camelus siccus — der Wächter des trockenen Endes</text>
<g transform="translate(0,-150)">
<rect x="170" y="972" width="860" height="16" rx="8" fill="url(#dline)"/>
${ticks}
<rect x="762" y="960" width="4" height="40" rx="2" fill="#F3F5F4" stroke="#0C1417" stroke-width="1"/>
<text x="170" y="1030" font-family="Mono" font-size="15" letter-spacing="3" fill="#3A4A4C">NASS</text>
<text x="1030" y="1030" text-anchor="end" font-family="Mono" font-size="15" letter-spacing="3" fill="#C6892A">TROCKEN</text>
<g transform="translate(520,623)">${camel}</g>
${ann(646, 690, 880, 690, 892, 695, "HÖCKER · WASSERRESERVE")}
${ann(760, 983, 760, 1092, 760, 1112, "HABITAT · DAS TROCKENE ENDE", "middle")}
${ann(560, 845, 360, 845, 352, 850, "FELL · SAND-AMBER", "end")}
</g>
<text x="170" y="1250" font-family="Mono" font-size="16" letter-spacing="4" fill="#0C1417">PRÄPARAT-NR. 01 · EINSATZ: LADEZUSTAND · LEERE LISTE · „OBJEKT TROCKEN“</text>
${swatch}
<text x="600" y="1560" text-anchor="middle" font-family="Sig" font-weight="500" font-size="26" letter-spacing="2" fill="#0C1417">Ein Tier, das die Dürre beherrscht — für eine Marke, die trocknet.</text>
<text x="600" y="1600" text-anchor="middle" font-family="Mono" font-size="14" letter-spacing="3" fill="#7A8A8C">SICCO · MASKOTTCHEN-STUDIE · 14.07.2026</text>
</svg>`;

const html = `<!doctype html><html><head><meta charset="utf-8"><style>${fonts}
*{margin:0;padding:0}body{width:1200px;height:1680px}</style></head><body>${svg}</body></html>`;
fs.writeFileSync("kamil.html", html);
fs.writeFileSync("kamil.svg", svg);
console.log("ok, html bytes:", fs.statSync("kamil.html").size);
