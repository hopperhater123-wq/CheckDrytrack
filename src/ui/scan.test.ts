import { describe, expect, it } from "vitest";
import { codeAusScan, ohnePruefziffer } from "./CameraScanner";

// Etiketten-Realität (Feld-Befund): Drucker codiert 12 gedruckte Ziffern als
// EAN-13 → die Striche tragen eine 13. Prüfziffer. Scan, Etikett und Tippen
// müssen dieselbe Inventarnummer ergeben.
describe("ohnePruefziffer (EAN-13)", () => {
  it("schneidet eine gültige Prüfziffer ab", () => {
    expect(ohnePruefziffer("5100000026095")).toBe("510000002609");
  });
  it("lässt eine ungültige 13. Ziffer unangetastet (echter 13-steller)", () => {
    expect(ohnePruefziffer("5100000026094")).toBe("5100000026094");
  });
  it("lässt 12-Steller und alphanumerische Nummern unverändert", () => {
    expect(ohnePruefziffer("510000002609")).toBe("510000002609");
    expect(ohnePruefziffer("KT-1001")).toBe("KT-1001");
  });
});

describe("codeAusScan", () => {
  it("zieht die Inventarnummer aus dem Deep-Link und normalisiert sie", () => {
    expect(codeAusScan("https://beispiel.de/?inv=5100000026095")).toBe("510000002609");
  });
  it("normalisiert direkte Scans", () => {
    expect(codeAusScan(" 5100000026095 ")).toBe("510000002609");
  });
});
