/**
 * Pasek postępu wyszukiwania — dwa kroki, które opowiadają prawdę o tym,
 * co dzieje się w backendzie w trakcie jednego żądania POST /api/match/search/:
 * najpierw deterministyczny silnik przegląda bibliotekę kart, potem model
 * decyzyjny weryfikuje powiązania trafień. Kroki odblokowują się w czasie,
 * a gdy odpowiedź przyjdzie — cały pasek znika razem z fazą „loading”.
 *
 * Dostępność: kontener to role="status" (ogłaszany raz, uprzejmie), kroki
 * mają ikony stanu różniące się kształtem, nie tylko kolorem.
 */
import { useEffect, useState } from "react";
import { useA11y } from "../lib/a11y";
import { INNOVATIONS } from "../lib/data";

/** Po tym czasie pokazujemy krok drugi — tyle realnie trwa faza silnika
 *  zanim odpowiedź Jeva dotrze (/backend/matchmaking/views.py: search → judge). */
const STEP_TWO_MS = 900;

export function SearchLoader() {
  const { t } = useA11y();
  const [step, setStep] = useState(0);

  useEffect(() => {
    const id = window.setTimeout(() => setStep(1), STEP_TWO_MS);
    return () => window.clearTimeout(id);
  }, []);

  const steps = [
    {
      label: t("Przeszukuję bibliotekę ROPS", "Szukam w bibliotece ROPS"),
      detail: t(
        `${INNOVATIONS.length} przetestowanych rozwiązań — wątki tematyczne i słowa kluczowe`,
        "Sprawdzam wszystkie rozwiązania, które już u kogoś zadziałały",
      ),
    },
    {
      label: t("Model weryfikuje trafienia", "Sprawdzam znalezione rozwiązania"),
      detail: t(
        "czy każde trafienie dotyczy tej samej potrzeby, co Twój opis?",
        "czy to rozwiązanie naprawdę pasuje do Twojego problemu?",
      ),
    },
  ];

  return (
    <div className="mm__loader" role="status">
      <h2 className="sr-only">Wyszukiwanie w toku</h2>
      {steps.map((s, i) => {
        const done = step > i;
        const active = step === i;
        if (i > step) return null;
        return (
          <div
            key={s.label}
            className={`mm__loader-step${done ? " is-done" : ""}${active ? " is-active" : ""}`}
          >
            <span className="mm__loader-ico" aria-hidden="true">
              {done ? "✓" : <span className="mm__loader-spin" />}
            </span>
            <div>
              <p className="mm__loader-label">
                {s.label}
                {done && <span className="sr-only"> — gotowe</span>}
              </p>
              <p className="mm__loader-detail">{s.detail}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
