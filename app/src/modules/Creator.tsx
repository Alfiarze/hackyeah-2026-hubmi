/**
 * Moduł III — Kreator pomysłów.
 *
 * Trzy warstwy, w kolejności rosnącego zobowiązania:
 *  1. fiszka — cztery pola, dostępna cały czas, niski próg wejścia;
 *  2. asystent kreatora — sprawdza pomysł przez Bibliotekę i podpowiada,
 *     czy to nie jest już zrobione (to samo, czego wymaga ocena nowości);
 *  3. generator wniosku — rozpisuje fiszkę na strukturę realnego formularza
 *     ROPS z naboru IWS 2.0, z podpowiedziami z kart oceny.
 *
 * Asystent nie udaje, że wymyśli innowację za użytkownika. Robi to, co
 * naprawdę jest trudne i czego człowiek nie zrobi ręcznie: przeszukuje
 * 115 istniejących rozwiązań i mówi, gdzie pomysł się już pojawił.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { search } from "../lib/match";
import { addThread, type Fiszka } from "../lib/store";
import { generateGrant, MAX_GRANT, type GrantDraft } from "../lib/grant";
import { LIBRARY } from "../lib/data";
import { POWIATY } from "../lib/data";
import { Modal } from "../components/Modal";
import { ScoreDial } from "../components/WhyMatch";
import "./creator.css";

import { api } from "../lib/api";

const ETAPY: Fiszka["etap"][] = ["pomysł", "prototyp", "testowanie", "gotowe do skalowania"];

const EMPTY: Fiszka = { istota: "", adresat: "", etap: "pomysł", obszar: "" };

export function Creator() {
  const [title, setTitle] = useState("");
  const [problem, setProblem] = useState("");
  const [f, setF] = useState<Fiszka>(EMPTY);
  const [powiat, setPowiat] = useState("");
  const [amount, setAmount] = useState(60_000);
  const [sent, setSent] = useState<string | null>(null);
  const [grant, setGrant] = useState<GrantDraft | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeveloping, setIsDeveloping] = useState(false);
  const [aiFeedback, setAiFeedback] = useState<{
    source?: string;
    sugestie?: string[];
    obszar?: string;
    rekomendacja?: string;
  } | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const errorBox = useRef<HTMLDivElement>(null);

  // Po nieudanej wysyłce focus ląduje na podsumowaniu błędów — inaczej osoba
  // korzystająca z czytnika nie dowie się, że cokolwiek się stało.
  useEffect(() => {
    if (errors.length) errorBox.current?.focus();
  }, [errors]);

  /** Asystent: szuka w Bibliotece tego, co użytkownik właśnie opisuje. */
  const probe = useMemo(() => {
    const text = `${title} ${problem} ${f.istota} ${f.adresat}`.trim();
    if (text.replace(/\s/g, "").length < 15) return null;
    return search(text, { limit: 3 });
  }, [title, problem, f.istota, f.adresat]);

  const canvas = LIBRARY.find((d) => d.title.toUpperCase().includes("SOCIAL CANVAS"));

  const validate = (): string[] => {
    const e: string[] = [];
    if (!title.trim()) e.push("Podaj nazwę pomysłu.");
    if (f.istota.trim().length < 20) e.push("Opisz istotę rozwiązania — przynajmniej dwa zdania.");
    if (!f.adresat.trim()) e.push("Wskaż, do kogo rozwiązanie jest skierowane.");
    return e;
  };

  const submitFiszka = (e: React.FormEvent) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if (errs.length) return;
    const th = addThread({
      kind: "pomysł",
      title: title.trim(),
      body: problem.trim() || f.istota.trim(),
      powiat: powiat || undefined,
      fiszka: f,
    });
    setSent(th.id);
  };

  const handleDevelopIdea = async () => {
    const text = `${title} ${problem} ${f.istota}`.trim();
    if (text.length < 5) {
      setErrors(["Wpisz chociaż nazwę lub zarys problemu, aby asystent AI mógł go przeanalizować."]);
      return;
    }
    setErrors([]);
    setIsDeveloping(true);
    try {
      const res = await api.grants.developIdea({
        problem: text,
        fiszka: f,
      });
      if (res.ok && res.data) {
        const data = res.data;
        setF((prev) => ({
          ...prev,
          istota: prev.istota || data.istota || "",
          adresat: prev.adresat || data.adresat || "",
          obszar: prev.obszar || data.obszar || "",
        }));
        setAiFeedback({
          source: data.source,
          sugestie: data.sugestie,
          obszar: data.obszar,
          rekomendacja: data.jev_decisions?.rekomendacja?.choice,
        });
      }
    } catch {
      // offline fallback
    } finally {
      setIsDeveloping(false);
    }
  };

  const makeGrant = async () => {
    const errs = validate();
    setErrors(errs);
    if (errs.length) return;

    setIsGenerating(true);
    try {
      const res = await api.grants.generate({
        title,
        problem: problem || f.istota,
        amount,
        powiat: powiat || null,
        fiszka: f,
      });
      if (res.ok && res.data && res.data.sections) {
        setGrant(res.data);
        setIsGenerating(false);
        return;
      }
    } catch {
      // fallback to client-side generator below
    } finally {
      setIsGenerating(false);
    }

    setGrant(
      generateGrant({
        title,
        fiszka: f,
        problem,
        powiat: powiat || null,
        nearest: probe?.results ?? [],
        amount,
      }),
    );
  };

  if (sent) {
    return (
      <div className="page wrap">
        <div className="card cr__done" data-reveal>
          <p className="page__mod">Zgłoszone</p>
          <h1>Fiszka trafiła do Hubu</h1>
          <p>
            Koordynator ROPS widzi już powiadomienie w panelu administratora.
            Odpowiedź pojawi się w module <strong>Komunikacja</strong> — i tam też
            zobaczysz kropkę „nowa odpowiedź", kiedy przyjdzie.
          </p>
          <p className="hint">
            Chcesz zobaczyć drugą stronę tej pętli? Przełącz rolę na „pracownik ROPS"
            w pasku na górze i wejdź do modułu VI.
          </p>
          <div className="row">
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                setSent(null);
                setTitle("");
                setProblem("");
                setF(EMPTY);
              }}
            >
              Zgłoś kolejny pomysł
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page wrap">
      <div className="page__head" data-reveal>
        <p className="page__mod">Moduł III · Kreator pomysłów</p>
        <h1>Masz pomysł? Zacznij od fiszki</h1>
        <p>
          Cztery konkretne pola. Sprawdzimy nowość w bazie ROPS i wygenerujemy
          roboczy szkic wniosku o grant do 120 000 zł.
        </p>
      </div>

      <div className="cr__grid">
        <form className="cr__form" data-reveal="left" onSubmit={submitFiszka} noValidate>
          <div className="field">
            <label htmlFor="cr-title">Nazwa pomysłu</label>
            <input
              id="cr-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="np. Sąsiedzka skrzynka leków…"
            />
          </div>

          <div className="field">
            <label htmlFor="cr-problem">Jaki problem to rozwiązuje?</label>
            <textarea
              id="cr-problem"
              rows={3}
              value={problem}
              onChange={(e) => setProblem(e.target.value)}
              placeholder="Opisz, co dziś nie działa i kogo to dotyka."
            />
          </div>

          <div className="field">
            <label htmlFor="cr-istota">Istota rozwiązania</label>
            <textarea
              id="cr-istota"
              rows={4}
              value={f.istota}
              onChange={(e) => setF({ ...f, istota: e.target.value })}
              placeholder="Co konkretnie powstanie i jak będzie działać?"
              aria-describedby="cr-istota-hint"
            />
            <p id="cr-istota-hint" className="hint">
              Najmocniejsze fiszki opisują mechanizm, nie intencję. „Punkt w sołectwie,
              gdzie sąsiedzi zostawiają leki, a pielęgniarka je wydaje" mówi więcej niż
              „poprawa dostępu do leków".
            </p>
          </div>

          <div className="field">
            <label htmlFor="cr-adresat">Do kogo jest skierowane?</label>
            <textarea
              id="cr-adresat"
              rows={2}
              value={f.adresat}
              onChange={(e) => setF({ ...f, adresat: e.target.value })}
              placeholder="Kto na tym skorzysta? Im konkretniej, tym lepiej."
            />
          </div>

          <div className="cr__row">
            <div className="field">
              <label htmlFor="cr-etap">Etap realizacji</label>
              <select
                id="cr-etap"
                value={f.etap}
                onChange={(e) => setF({ ...f, etap: e.target.value as Fiszka["etap"] })}
              >
                {ETAPY.map((e, i) => (
                  <option key={e} value={e}>
                    {String(i + 1).padStart(2, "0")} — {e}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="cr-obszar">Obszar</label>
              <input
                id="cr-obszar"
                value={f.obszar}
                onChange={(e) => setF({ ...f, obszar: e.target.value })}
                placeholder="np. zdrowie, seniorzy…"
              />
            </div>
            <div className="field">
              <label htmlFor="cr-powiat">Powiat (opcjonalnie)</label>
              <select id="cr-powiat" value={powiat} onChange={(e) => setPowiat(e.target.value)}>
                <option value="">Nie podaję</option>
                {POWIATY.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {errors.length > 0 && (
            <div className="cr__errors" role="alert" ref={errorBox} tabIndex={-1}>
              <p>
                <strong>Uzupełnij przed zgłoszeniem:</strong>
              </p>
              <ul>
                {errors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          {aiFeedback && (
            <div className="cr__ai-feedback" role="status">
              <div className="cr__ai-head">
                <span className="eyebrow">Asystent Kreatora (Jev Decisions)</span>
                {aiFeedback.obszar && <span className="mono">Obszar: {aiFeedback.obszar}</span>}
              </div>
              {aiFeedback.sugestie && aiFeedback.sugestie.length > 0 && (
                <ul>
                  {aiFeedback.sugestie.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="row cr__actions">
            <button type="submit" className="btn btn--primary">
              Zgłoś fiszkę do ROPS
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={handleDevelopIdea}
              disabled={isDeveloping}
            >
              {isDeveloping ? "Analiza Jev AI..." : "✨ Rozwiń z Jev AI"}
            </button>
            <button
              type="button"
              className="btn"
              onClick={makeGrant}
              disabled={isGenerating}
            >
              {isGenerating ? "Generowanie..." : "Wygeneruj szkic wniosku"}
            </button>
          </div>

          <div className="field">
            <label htmlFor="cr-amount">
              Wnioskowana kwota: {amount.toLocaleString("pl-PL")} zł
            </label>
            <input
              id="cr-amount"
              type="range"
              min={10_000}
              max={MAX_GRANT}
              step={5_000}
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              style={{ minHeight: "44px" }}
            />
            <p className="hint">
              Maksimum w naborze ROPS to {MAX_GRANT.toLocaleString("pl-PL")} zł.
              Wkład własny nie jest wymagany.
            </p>
          </div>
        </form>

        {/* --- asystent kreatora --- */}
        <aside className="cr__assist" data-reveal="right" aria-label="Weryfikacja nowości pomysłu">
          <p className="page__mod">Weryfikator nowości</p>

          {!probe ? (
            <p className="muted">
              Wpisz opis pomysłu. Baza automatycznie zweryfikuje, czy analogiczne
              rozwiązanie było już testowane w Małopolsce i przygotuje argumentację do wniosku.
            </p>
          ) : probe.results.length === 0 ? (
            <div className="cr__verdict cr__verdict--new">
              <h3>Brak analogicznych innowacji w bazie</h3>
              <p>
                Wśród 115 przetestowanych innowacji ROPS nie ma odpowiednika. To kluczowy
                argument potwierdzający nowość rozwiązania — powołaj go w sekcji 5 wniosku.
              </p>
            </div>
          ) : (
            <>
              <div
                className={`cr__verdict ${
                  probe.results[0].score >= 70 ? "cr__verdict--dup" : "cr__verdict--near"
                }`}
              >
                <h3>
                  {probe.results[0].score >= 70
                    ? "Zidentyfikowano podobne rozwiązania w regionie"
                    : "Powiązane innowacje w bazie ROPS"}
                </h3>
                <p>
                  {probe.results[0].score >= 70
                    ? "Kryterium naboru wymaga wykazania unikalności. Przy wysokim podobieństwie " +
                      "wskaż precyzyjnie różnice metodyczne lub rozważ adaptację gotowego modelu."
                    : "Rozwiązania o zbliżonej tematyce. Eksperci oceniający wniosek zwrócą " +
                      "na nie uwagę — warto wskazać różnice i unikalną wartość Twojego pomysłu."}
                </p>
              </div>

              <ul className="cr__near">
                {probe.results.map((r) => (
                  <li key={r.innovation.id}>
                    <div className="cr__near-head">
                      <h4>{r.innovation.name}</h4>
                      <ScoreDial score={r.score} tier={r.tier} />
                    </div>
                    <p className="eyebrow">{r.innovation.catName}</p>
                    <p className="cr__near-why">{r.reasons[0]}</p>
                    <a href={r.innovation.url} target="_blank" rel="noreferrer">
                      Zobacz kartę
                      <span className="sr-only"> (otwiera rops.krakow.pl w nowej karcie)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </>
          )}

          {canvas && (
            <div className="cr__canvas">
              <p className="eyebrow">Materiał prototypingowy</p>
              <a className="btn" href={canvas.url} target="_blank" rel="noreferrer">
                Canwa Innowacji Społecznych (PDF)
                <span className="sr-only"> (pobiera plik)</span>
              </a>
              <p className="hint">
                Plansza SOCIAL CANVAS z zasobów ROPS — pomaga rozpisać pomysł przed
                wypełnieniem wniosku.
              </p>
            </div>
          )}
        </aside>
      </div>

      <Modal
        open={grant !== null}
        onClose={() => setGrant(null)}
        title="Szkic wniosku grantowego"
        wide
      >
        {grant && <GrantView draft={grant} />}
      </Modal>
    </div>
  );
}

function GrantView({ draft }: { draft: GrantDraft }) {
  const [copied, setCopied] = useState(false);
  const total = draft.budget.reduce((s, b) => s + b.amount, 0);

  const asText = () =>
    [
      `WNIOSEK O GRANT NA INNOWACJĘ SPOŁECZNĄ`,
      `Nazwa: ${draft.title}`,
      "",
      ...draft.sections.map(
        (s) => `${s.no}. ${s.heading.toUpperCase()}\n${s.body}\n`,
      ),
      `BUDŻET`,
      ...draft.budget.map((b) => `  ${b.item}: ${b.amount.toLocaleString("pl-PL")} zł`),
      `  RAZEM: ${total.toLocaleString("pl-PL")} zł`,
    ].join("\n");

  return (
    <div className="stack grant">
      <p className="hint" style={{ marginTop: 0 }}>
        Struktura odwzorowuje formularz aplikacyjny ROPS z naboru „Inkubator Włączenia
        Społecznego 2.0". Miejsca oznaczone <strong>[UZUPEŁNIJ]</strong> wymagają Twojej
        wiedzy — generator nie zna liczb z Twojej gminy i nie będzie ich wymyślał.
      </p>

      {draft.warnings.length > 0 && (
        <div className="grant__warn" role="alert">
          <p>
            <strong>Do poprawy przed złożeniem:</strong>
          </p>
          <ul>
            {draft.warnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="row">
        <button
          type="button"
          className="btn btn--primary"
          onClick={async () => {
            await navigator.clipboard?.writeText(asText());
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
          }}
        >
          Kopiuj cały wniosek
        </button>
        <button type="button" className="btn" onClick={() => window.print()}>
          Drukuj / zapisz PDF
        </button>
        {copied && (
          <span role="status" className="grant__copied">
            Skopiowano do schowka
          </span>
        )}
      </div>

      <ol className="grant__sections">
        {draft.sections.map((s) => (
          <li key={s.no}>
            <h3>
              <span className="mono grant__no">
                {String(s.no).padStart(2, "0")}
              </span>{" "}
              {s.heading}
            </h3>
            {s.criterion && <p className="grant__crit">{s.criterion}</p>}
            <p className="grant__body">{s.body}</p>
          </li>
        ))}
      </ol>

      <div className="scroll-x">
        <table>
          <caption className="eyebrow">Propozycja budżetu</caption>
          <thead>
            <tr>
              <th scope="col">Pozycja</th>
              <th scope="col">Kwota</th>
            </tr>
          </thead>
          <tbody>
            {draft.budget.map((b) => (
              <tr key={b.item}>
                <th scope="row">{b.item}</th>
                <td className="mono">{b.amount.toLocaleString("pl-PL")} zł</td>
              </tr>
            ))}
            <tr>
              <th scope="row">
                <strong>Razem</strong>
              </th>
              <td className="mono">
                <strong>{total.toLocaleString("pl-PL")} zł</strong>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
