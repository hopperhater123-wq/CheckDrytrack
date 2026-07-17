import { useRef, useState } from "react";
import { komprimiereBild } from "./foto";
import { Icon } from "./Icon";

// Kompaktes Zählerfoto-Feld (Errungenschaft aus „Torrek Scan"): ein Beweisfoto
// vom Zähler beim Auf-/Abbau. Kamera (capture="environment") oder Galerie,
// vor dem Speichern komprimiert (foto.ts). Optional — kein Zwang.
export function FotoErfassung({ label, wert, onChange }: {
  label: string;
  wert: string | null;
  onChange: (dataUrl: string | null) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [laedt, setLaedt] = useState(false);

  const waehlen = async (dateien: FileList | null) => {
    const datei = dateien?.[0];
    if (!datei) return;
    setLaedt(true);
    try { onChange(await komprimiereBild(datei)); } catch { /* ungültiges Bild — ignorieren */ }
    setLaedt(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="field">
      <span>{label}</span>
      {wert ? (
        <div className="zfoto-vorschau">
          <img src={wert} alt={label} />
          <button type="button" className="zfoto-del" onClick={() => onChange(null)} aria-label="Foto entfernen">
            <Icon name="x" size={16} />
          </button>
        </div>
      ) : (
        <button type="button" className="btn zfoto-btn" onClick={() => inputRef.current?.click()} disabled={laedt}>
          <Icon name="camera" size={17} /> {laedt ? "Wird verarbeitet…" : "Zählerfoto aufnehmen"}
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => void waehlen(e.target.files)} />
    </div>
  );
}
