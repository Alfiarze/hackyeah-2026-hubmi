/**
 * Moduł IV - Tester innowacji.
 *
 * Dwie drogi: zgłoszenie chęci udziału w testach oraz ocena rozwiązania,
 * które ktoś już u siebie uruchomił. Oba kończą się wątkiem w tej samej
 * skrzynce Hubu, więc koordynator ROPS ma jedno miejsce do obsługi.
 *
 * Ocena jest 1-5 z wymaganym komentarzem: sama gwiazdka nic nie mówi
 * autorowi innowacji o tym, co poprawić.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { INNOVATIONS, type Innovation } from "../lib/data";
import { addThread, getState, type Thread } from "../lib/store";
import { api } from "../lib/api";
import { foldDiacritics } from "../lib/text";
import { Stamp } from "../components/Stamp";
import "./tester.css";

interface Props {
  /** innowacja wybrana z innego modułu przyciskiem „Chcę to przetestować" */
  preselected?: Innovation | null;
  onClearPreselect?: () => void;
  threads: Thread[];
}

export function Tester({ preselected, onClearPreselect, threads }: Props) {
  const [picked, setPicked] = useState<Innovation | null>(preselected ?? null);
  const [q, setQ] = useState("");
  const [mode, setMode] = useState<"zgłoszenie" | "ocena">("zgłoszenie");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [role, setRole] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const errorBox = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (err) errorBox.current?.focus();
  }, [err]);

  // preselekcja z innego modułu wygrywa z lokalnym stanem
  const current = preselected ?? picked;

  const needle = foldDiacritics(q.trim().toLowerCase());
  // Małopolska pierwsza: testowanie organizuje ROPS w regionie, karta z innej
  // bazy jest możliwa, ale nie powinna wypychać lokalnej z listy.
  const options = useMemo(() => {
    const local = INNOVATIONS.filter((i) => !i.ext);
    if (!needle) return local.slice(0, 8);
    const hit = (i: Innovation) =>
      foldDiacritics(`${i.name} ${i.catName}`.toLowerCase()).includes(needle);
    return [...local.filter(hit), ...INNOVATIONS.filter((i) => i.ext && hit(i))].slice(0, 12);
  }, [needle]);

  const myTests = threads.filter((t) => t.kind === "test");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) {
      setErr("Wybierz innowację z listy.");
      return;
    }
    if (mode === "ocena" && rating === 0) {
      setErr("Zaznacz ocenę od 1 do 5.");
      return;
    }
    if (comment.trim().length < 15) {
      setErr(
        mode === "ocena"
          ? "Napisz, co konkretnie działa, a co nie - autor innowacji nic nie zrobi z samą gwiazdką."
          : "Napisz dwa zdania o tym, kto i gdzie chce testować.",
      );
      return;
    }
    setErr(null);
    addThread({
      kind: "test",
      title:
        mode === "ocena"
          ? `Ocena ${rating}/5 - ${current.name}`
          : `Zgłoszenie do testów - ${current.name}`,
      body:
        (role.trim() ? `Zgłaszający: ${role.trim()}\n\n` : "") +
        comment.trim(),
      innovationId: current.id,
      rating: mode === "ocena" ? rating : undefined,
    });

    if (mode === "ocena") {
      api.ratings.create(current.id, rating, comment.trim(), role.trim() || undefined);
    }

    setDone(true);
  };

  const reset = () => {
    setDone(false);
    setComment("");
    setRating(0);
    setRole("");
    setPicked(null);
    onClearPreselect?.();
  };

  if (done) {
    return (
      <div className="page wrap">
        <div className="card ts__done" data-reveal>
          <p className="page__mod">Przyjęte</p>
          <h1>{mode === "ocena" ? "Dziękujemy za ocenę" : "Zgłoszenie przyjęte"}</h1>
          <p>
            {mode === "ocena"
              ? "Ocena trafiła do koordynatora ROPS i do zestawienia opinii o tej innowacji."
              : "Koordynator ROPS skontaktuje się w sprawie udziału w testach. " +
                "Odpowiedź zobaczysz w module Komunikacja."}
          </p>
          <button type="button" className="btn btn--primary" onClick={reset}>
            Zgłoś coś jeszcze
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page wrap">
      <div className="page__head" data-reveal>
        <p className="page__mod">Moduł IV · Tester innowacji</p>
        <h1>Przetestuj albo oceń</h1>
        <p>
          Zgłoś gotowość do przetestowania innowacji albo opisz, jak
          sprawdziło się rozwiązanie, które już u siebie uruchomiliście.
        </p>
      </div>

      <div className="ts__grid">
        <form className="ts__form" data-reveal="left" onSubmit={submit} noValidate>
          <div className="ts__mode" role="group" aria-label="Rodzaj zgłoszenia">
            {(["zgłoszenie", "ocena"] as const).map((m) => (
              <button
                key={m}
                type="button"
                className="btn"
                aria-pressed={mode === m}
                onClick={() => {
                  setMode(m);
                  setErr(null);
                }}
              >
                {m === "zgłoszenie" ? "Chcę testować" : "Chcę ocenić"}
              </button>
            ))}
          </div>

          {current ? (
            <div className="ts__picked">
              <div>
                <p className="eyebrow">{current.catName}</p>
                <h3>{current.name}</h3>
              </div>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => {
                  setPicked(null);
                  onClearPreselect?.();
                }}
              >
                Zmień
              </button>
            </div>
          ) : (
            <div className="field">
              <label htmlFor="ts-search">Której innowacji to dotyczy?</label>
              <input
                id="ts-search"
                type="search"
                autoComplete="off"
                spellCheck={false}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Wpisz nazwę, np. BaWita…"
                aria-describedby="ts-list-hint"
              />
              <p id="ts-list-hint" className="hint">
                {needle ? `${options.length} dopasowań` : "Pokazujemy pierwsze 8 - zacznij pisać, aby filtrować."}
              </p>
              <ul className="ts__options">
                {options.map((i) => (
                  <li key={i.id}>
                    <button type="button" className="btn ts__option" onClick={() => setPicked(i)}>
                      <span>{i.name}</span>
                      <span className="eyebrow">
                        {i.catName}
                        {i.ext && ` · spoza Małopolski (${i.origin?.region ?? "inna baza"})`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {mode === "ocena" && (
            <fieldset className="ts__rating">
              <legend>Jak sprawdziło się rozwiązanie?</legend>
              <div className="ts__stars">
                {[1, 2, 3, 4, 5].map((n) => (
                  <label key={n} className="ts__star">
                    <input
                      type="radio"
                      name="rating"
                      value={n}
                      checked={rating === n}
                      onChange={() => setRating(n)}
                    />
                    <span aria-hidden="true">{n}</span>
                    <span className="sr-only">
                      {n} na 5
                      {n === 1 ? " - nie zadziałało" : n === 5 ? " - zadziałało bardzo dobrze" : ""}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
          )}

          <div className="field">
            <label htmlFor="ts-role">Kto zgłasza? (opcjonalnie)</label>
            <input
              id="ts-role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="np. CUS w gminie wiejskiej, 3 tys. mieszkańców…"
            />
            <p className="hint">Nie podawaj imienia i nazwiska - wystarczy typ instytucji.</p>
          </div>

          <div className="field">
            <label htmlFor="ts-comment">
              {mode === "ocena"
                ? "Co działa, a co nie?"
                : "Kto i gdzie chce testować?"}
            </label>
            <textarea
              id="ts-comment"
              rows={5}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={
                mode === "ocena"
                  ? "Np. uczestnicy chętnie korzystają, ale instrukcja jest za trudna dla osób z demencją."
                  : "Np. 12 uczestników dziennego domu pomocy, od marca, 3 miesiące."
              }
              aria-invalid={err ? true : undefined}
            />
          </div>

          {err && (
            <p className="error" role="alert" ref={errorBox} tabIndex={-1}>
              {err}
            </p>
          )}

          <button type="submit" className="btn btn--primary">
            {mode === "ocena" ? "Wyślij ocenę" : "Zgłoś się do testów"}
          </button>
        </form>

        <aside className="ts__side" data-reveal="right">
          {current ? (
            <>
              <p className="page__mod">Co już wiemy o tej innowacji</p>
              <Stamp evidence={current.evidence} />
              <dl className="fiszka__fields" style={{ marginTop: "var(--sp-4)" }}>
                <div>
                  <dt>Na czym polega</dt>
                  <dd>{current.desc}</dd>
                </div>
                <div>
                  <dt>Kto może wdrożyć</dt>
                  <dd>{current.benef}</dd>
                </div>
              </dl>
            </>
          ) : (
            <>
              <p className="page__mod">Zgłoszenia w Hubie</p>
              {myTests.length === 0 ? (
                <p className="muted">
                  Nikt jeszcze nie zgłosił się do testów. Twoje zgłoszenie będzie pierwsze.
                </p>
              ) : (
                <ul className="ts__recent">
                  {myTests.slice(0, 6).map((t) => (
                    <li key={t.id}>
                      <strong>{t.title}</strong>
                      <span className="mono muted">
                        {new Date(t.createdAt).toLocaleDateString("pl-PL")} · {t.status}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

export { getState };
