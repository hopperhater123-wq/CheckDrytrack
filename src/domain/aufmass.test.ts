import { describe, expect, it } from "vitest";
import { berechneAufmass, summeAufmass } from "./aufmass";

// Aufmaß-Formeln wie im Alt-System ("Positionsauflistung über ausgeführte Leistungen").
describe("berechneAufmass", () => {
  it("wertet die Original-Formeln aus den Alt-System-Fotos aus", () => {
    expect(berechneAufmass("(3,97*3,77)+(1,55*2,15)")).toBeCloseTo(18.3, 1);
    expect(berechneAufmass("(3,97+5,33)*2,46")).toBeCloseTo(22.88, 2);
    expect(berechneAufmass("(3,97+5,33)*2,46*2")).toBeCloseTo(45.76, 2);
  });
  it("versteht Punkt und Komma, Vorzeichen und Division", () => {
    expect(berechneAufmass("3.5*2")).toBe(7);
    expect(berechneAufmass("10/4")).toBe(2.5);
    expect(berechneAufmass("-2+5")).toBe(3);
    expect(berechneAufmass("1")).toBe(1);
  });
  it("lehnt alles ab, was keine reine Rechenformel ist", () => {
    expect(berechneAufmass("alert(1)")).toBeNull();
    expect(berechneAufmass("3,97*")).toBeNull();
    expect(berechneAufmass("(3,97")).toBeNull();
    expect(berechneAufmass("")).toBeNull();
    expect(berechneAufmass("1e9")).toBeNull();
  });
});

describe("summeAufmass", () => {
  it("summiert auswertbare Zeilen (Decke + Wände)", () => {
    expect(summeAufmass(["(3,97*3,77)+(1,55*2,15)", "(3,97+5,33)*2,46"])).toBeCloseTo(41.18, 1);
  });
  it("ist null ohne auswertbare Zeile", () => {
    expect(summeAufmass(["", "abc"])).toBeNull();
  });
});
