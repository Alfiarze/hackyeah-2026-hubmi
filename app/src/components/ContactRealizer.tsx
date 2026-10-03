/**
 * „Skontaktuj się z realizatorem" - budowanie partnerstw międzysektorowych.
 *
 * To nie jest formularz kontaktowy do ROPS. Sens tego przycisku polega na tym,
 * że łączy gminę, która ma problem, z instytucją, która to samo rozwiązanie
 * już u siebie uruchomiła. Wiedza o wdrożeniu siedzi u realizatora, nie
 * w karcie - i właśnie tego nie da się wyczytać z PDF-a.
 *
 * Kontakty są fikcyjne (domena example.org, instytucje opisowe, zero nazwisk):
 * zadanie zabrania używania prawdziwych danych osobowych z materiałów ROPS.
 */
import { useState } from "react";
import type { Innovation } from "../lib/data";
import { addThread } from "../lib/store";

interface Props {
  innovation: Innovation;
  onDone: () => void;
}

export function ContactRealizer({ innovation, onDone }: Props) {
  const [idx, setIdx] = useState(0);
  const [msg, setMsg] = useState("");
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const d = innovation.deployments[idx];

  if (sent) {
    return (
      <div className="stack">
        <p role="status">
          <strong>Zapytanie wysłane.</strong> Trafiło do skrzynki Hubu jako wątek
          „pytanie" - zobaczysz je w module Komunikacja, a koordynator ROPS
          w panelu administratora.
        </p>
        <button type="button" className="btn btn--primary" onClick={onDone}>
          Zamknij
        </button>
      </div>
    );
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (msg.trim().length < 10) {
      setErr("Napisz przynajmniej jedno zdanie - realizator musi wiedzieć, o co pytasz.");
      return;
    }
    setErr(null);
    addThread({
      kind: "pytanie",
      title: `Kontakt w sprawie: ${innovation.name}`,
      body: `Pytanie do realizatora (${d.org}, ${d.powiat}):\n\n${msg.trim()}`,
      powiat: d.powiat,
      innovationId: innovation.id,
    });
    setSent(true);
  };

  return (
    <form className="stack" onSubmit={submit}>
      <p className="hint" style={{ marginTop: 0 }}>
        <strong>Dane demo.</strong> Instytucje i adresy poniżej są fikcyjne. Prototyp
        nie używa prawdziwych danych osobowych z materiałów ROPS.
      </p>

      {innovation.deployments.length > 1 && (
        <div className="field">
          <label htmlFor="realizer">Wybierz realizatora</label>
          <select
            id="realizer"
            value={idx}
            onChange={(e) => setIdx(Number(e.target.value))}
          >
            {innovation.deployments.map((x, i) => (
              <option key={i} value={i}>
                {x.org} - {x.powiat} ({x.year})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="card card--flat">
        <dl className="fiszka__fields">
          <div>
            <dt>Instytucja</dt>
            <dd>{d.org}</dd>
          </div>
          <div>
            <dt>Powiat</dt>
            <dd>{d.powiat}</dd>
          </div>
          <div>
            <dt>Rok wdrożenia</dt>
            <dd>{d.year}</dd>
          </div>
          <div>
            <dt>Kontakt</dt>
            <dd className="mono">
              {d.email}
              <br />
              tel. {d.phone}
            </dd>
          </div>
        </dl>
      </div>

      <div className="field">
        <label htmlFor="contact-msg">O co chcesz zapytać?</label>
        <textarea
          id="contact-msg"
          rows={5}
          value={msg}
          onChange={(e) => setMsg(e.target.value)}
          aria-describedby="contact-hint"
          aria-invalid={err ? true : undefined}
          placeholder="Np. ile osób obsługuje to rozwiązanie u Państwa i co okazało się najtrudniejsze przy starcie?"
        />
        <p id="contact-hint" className="hint">
          Najwięcej wnoszą pytania o koszty utrzymania, obsadę i to, co poszło nie tak.
        </p>
        {err && <p className="error">{err}</p>}
      </div>

      <div className="row">
        <button type="submit" className="btn btn--primary">
          Wyślij zapytanie
        </button>
        <button type="button" className="btn btn--ghost" onClick={onDone}>
          Anuluj
        </button>
      </div>
    </form>
  );
}
