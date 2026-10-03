/**
 * Moduł II — Zasobnik wiedzy.
 *
 * Trzy rzeczy w jednym miejscu, bo z punktu widzenia użytkownika to jedna
 * potrzeba („czego mam szukać i czym to poprzeć"): Biblioteka 115 innowacji
 * z filmami, 76 dokumentów ROPS (raporty, diagnozy, Mapa Wyzwań Społecznych,
 * wzory wniosków) i materiały prototypingowe.
 *
 * Wymóg z zadania „szybkie pozyskanie konkretnej informacji" realizuje
 * jedno pole filtrujące działające od pierwszej litery, bez przycisku
 * „szukaj" i bez przeładowania.
 */
import { useEffect, useMemo, useState } from "react";
import { INNOVATIONS, LIBRARY, CATEGORIES, subscribeCatalog, type Innovation } from "../lib/data";
import { foldDiacritics } from "../lib/text";
import { InnovationCard } from "../components/InnovationCard";
import { api } from "../lib/api";
import "./library.css";

type Tab = "innowacje" | "dokumenty" | "pytanie";

interface Props {
  onAdapt: (inn: Innovation) => void;
  onTest: (inn: Innovation) => void;
}

export function Library({ onAdapt, onTest }: Props) {
  const [tab, setTab] = useState<Tab>("innowacje");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [onlyVideo, setOnlyVideo] = useState(false);
  // Zasobnik domyślnie pokazuje Małopolskę; karty i dokumenty z innych baz
  // wchodzą na życzenie, bo to inny poziom wiarygodności dla ROPS.
  const [onlyMalopolska, setOnlyMalopolska] = useState(true);
  const [section, setSection] = useState<string>("");
  const [innovations, setInnovations] = useState(INNOVATIONS);
  const [library, setLibrary] = useState(LIBRARY);
  const [question, setQuestion] = useState("");
  const [qaLoading, setQaLoading] = useState(false);
  const [qaResult, setQaResult] = useState<{
    answer: string;
    source: string;
    sources: { title: string; type: string; url: string; snippet?: string }[];
    latency_ms?: number;
  } | null>(null);

  useEffect(() => {
    return subscribeCatalog(() => {
      setInnovations([...INNOVATIONS]);
      setLibrary([...LIBRARY]);
    });
  }, []);

  const handleAsk = async (userQ?: string) => {
    const prompt = (userQ || question).trim();
    if (!prompt) return;
    setQaLoading(true);
    try {
      const res = await api.match.askAI(prompt);
      if (res.ok && res.data) {
        setQaResult(res.data);
      }
    } catch {
      setQaResult({
        source: "offline",
        answer: "Połączenie z serwerem asystenta ROPS jest chwilowo niedostępne. Sprawdź wyszukiwarkę w zakładce „Innowacje” lub „Dokumenty”.",
        sources: [],
      });
    } finally {
      setQaLoading(false);
    }
  };

  const needle = foldDiacritics(q.trim().toLowerCase());

  const inns = useMemo(() => {
    return innovations.filter((i) => {
      if (cat && i.cat !== cat) return false;
      if (onlyMalopolska && i.ext) return false;
      if (onlyVideo && !i.video) return false;
      if (!needle) return true;
      const hay = foldDiacritics(
        `${i.name} ${i.problem} ${i.desc} ${i.target} ${i.benef} ${i.catName}`.toLowerCase(),
      );
      return hay.includes(needle);
    });
  }, [innovations, needle, cat, onlyVideo, onlyMalopolska]);

  const sections = useMemo(
    () => [...new Set(library.map((d) => d.section))],
    [library],
  );

  const docs = useMemo(() => {
    return library.filter((d) => {
      if (onlyMalopolska && d.ext) return false;
      if (section && d.section !== section) return false;
      if (!needle) return true;
      return foldDiacritics(`${d.title} ${d.desc}`.toLowerCase()).includes(needle);
    });
  }, [library, needle, section, onlyMalopolska]);

  const videoCount = innovations.filter((i) => i.video && !i.ext).length;
  const localCount = innovations.filter((i) => !i.ext).length;
  const extCount = innovations.length - localCount;
  const localDocs = library.filter((d) => !d.ext).length;
  const extDocs = library.length - localDocs;

  return (
    <div className="page wrap">
      <div className="page__head" data-reveal>
        <p className="page__mod">Moduł II · Zasobnik wiedzy</p>
        <h1>Co już wiemy o Małopolsce</h1>
        <p>
          {localCount} przetestowanych innowacji z Małopolski, {videoCount} z filmem,
          oraz {localDocs} dokumentów ROPS — raporty, diagnozy, Mapa Wyzwań
          Społecznych i wzory wniosków grantowych.
        </p>
        <p className="hint">
          Obok tego {extCount} innowacji i {extDocs} dokumentów z baz spoza regionu
          (PO WER, ROPS Poznań, ESF+). Są wyłączone z widoku, dopóki nie włączysz ich
          przyciskiem „Dołącz bazy spoza Małopolski” — i każda taka pozycja jest
          oznaczona źródłem.
        </p>
      </div>

      <div className="lib__tabs" role="tablist" aria-label="Rodzaj zasobu" data-reveal>
        {[
          { id: "innowacje", label: `Biblioteka innowacji (${inns.length})` },
          { id: "dokumenty", label: `Dokumenty i raporty (${docs.length})` },
          { id: "pytanie", label: "Zapytaj bazę ze źródłami (Jev AI)" },
        ].map((x) => (
          <button
            key={x.id}
            type="button"
            role="tab"
            id={`tab-${x.id}`}
            aria-selected={tab === x.id}
            aria-controls={`panel-${x.id}`}
            className="btn"
            onClick={() => setTab(x.id as Tab)}
          >
            {x.label}
          </button>
        ))}
      </div>

      {tab !== "pytanie" && (
        <>
          <div className="lib__filters" data-reveal>
            <div className="field lib__search">
              <label htmlFor="lib-q">Szukaj w treści</label>
              <input
                id="lib-q"
                type="search"
                autoComplete="off"
                spellCheck={false}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={
                  tab === "innowacje" ? "np. demencja, wózek, PJM…" : "np. deinstytucjonalizacja…"
                }
                aria-describedby="lib-q-hint"
              />
              <p id="lib-q-hint" className="hint">
                Filtruje od pierwszej litery. Działa bez polskich znaków.
              </p>
            </div>

            {tab === "innowacje" ? (
              <>
                <div className="field">
                  <label htmlFor="lib-cat">Obszar</label>
                  <select id="lib-cat" value={cat} onChange={(e) => setCat(e.target.value)}>
                    <option value="">Wszystkie obszary</option>
                    {CATEGORIES.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="btn"
                  aria-pressed={onlyVideo}
                  onClick={() => setOnlyVideo((v) => !v)}
                >
                  Tylko z filmem
                </button>
                <button
                  type="button"
                  className="btn"
                  aria-pressed={!onlyMalopolska}
                  onClick={() => setOnlyMalopolska((v) => !v)}
                >
                  {onlyMalopolska ? "Dołącz bazy spoza Małopolski" : "Tylko Małopolska"}
                </button>
              </>
            ) : (
              <div className="field">
                <label htmlFor="lib-sec">Rodzaj dokumentu</label>
                <select id="lib-sec" value={section} onChange={(e) => setSection(e.target.value)}>
                  <option value="">Wszystkie rodzaje</option>
                  {sections.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <p className="lib__count" role="status">
            {tab === "innowacje"
              ? `${inns.length} z ${onlyMalopolska ? localCount : INNOVATIONS.length} innowacji`
              : `${docs.length} z ${onlyMalopolska ? localDocs : LIBRARY.length} dokumentów`}
          </p>
        </>
      )}

      {tab === "pytanie" && (
        <div id="panel-pytanie" role="tabpanel" aria-labelledby="tab-pytanie" className="lib__qa" data-reveal>
          <form
            className="lib__qa-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleAsk();
            }}
          >
            <div className="field">
              <label htmlFor="lib-question">Zadaj pytanie do bazy 76 dokumentów i 115 innowacji ROPS</label>
              <textarea
                id="lib-question"
                rows={3}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder="Np. Gdzie szukać wsparcia dla opiekunów osób starszych? Jakie są procedury naboru IWS 2.0?"
              />
            </div>

            <div className="lib__qa-chips">
              {[
                "Jakie innowacje wspierają seniorów z demencją w Małopolsce?",
                "Jak przygotować wniosek o grant na innowację w naborze IWS 2.0?",
                "Czym jest Canwa Innowacji Społecznych (Social Canvas)?",
                "Gdzie szukać wsparcia dla opiekunów osób niesamodzielnych?",
              ].map((sug) => (
                <button
                  key={sug}
                  type="button"
                  className="lib__qa-chip"
                  onClick={() => {
                    setQuestion(sug);
                    handleAsk(sug);
                  }}
                >
                  {sug}
                </button>
              ))}
            </div>

            <div className="row" style={{ marginTop: "var(--sp-4)" }}>
              <button
                type="submit"
                className="btn btn--primary"
                disabled={qaLoading || !question.trim()}
              >
                {qaLoading ? "Przeszukiwanie bazy ze źródłami..." : "Zapytaj asystenta ROPS (AI)"}
              </button>
            </div>
          </form>

          {qaResult && (
            <div className="lib__qa-result" role="status">
              <div className="lib__qa-head">
                <span className="eyebrow">
                  {qaResult.source === "jev"
                    ? "Odpowiedź modelu decyzyjnego Jev"
                    : "Odpowiedź ze źródeł ROPS"}
                  {qaResult.latency_ms ? ` · ${qaResult.latency_ms} ms` : ""}
                </span>
                <span className="mono">Źródła: {qaResult.sources.length}</span>
              </div>

              <p className="lib__qa-answer">{qaResult.answer}</p>

              {qaResult.sources.length > 0 && (
                <ul className="lib__qa-sources">
                  {qaResult.sources.map((s, idx) => (
                    <li key={idx} className="lib__qa-source-item">
                      <h4>
                        <a href={s.url} target="_blank" rel="noreferrer">
                          {s.title}
                        </a>
                      </h4>
                      <p className="eyebrow">{s.type}</p>
                      {s.snippet && <p>{s.snippet}</p>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {tab === "innowacje" && (
        <div id="panel-innowacje" role="tabpanel" aria-labelledby="tab-innowacje">
          {inns.length === 0 ? (
            <Empty onReset={() => { setQ(""); setCat(""); setOnlyVideo(false); }} />
          ) : (
            <div className="results results--two" data-reveal="stagger">
              {inns.map((i) => (
                <InnovationCard key={i.id} innovation={i} onAdapt={onAdapt} onTest={onTest} />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === "dokumenty" && (
        <div id="panel-dokumenty" role="tabpanel" aria-labelledby="tab-dokumenty">
          {docs.length === 0 ? (
            <Empty onReset={() => { setQ(""); setSection(""); }} />
          ) : (
            <ul className="lib__docs" data-reveal="stagger">
              {docs.map((d) => (
                <li key={d.url} className="lib__doc">
                  <div className="lib__doc-meta">
                    <span className="chip">{d.type.toUpperCase()}</span>
                    {d.year && <span className="mono">{d.year}</span>}
                    {d.bytes && (
                      <span className="mono muted">{(d.bytes / 1e6).toFixed(1)} MB</span>
                    )}
                  </div>
                  <h3>
                    <a href={d.url} target="_blank" rel="noreferrer">
                      {d.title}
                      <span className="sr-only"> (pobiera plik {d.type.toUpperCase()})</span>
                    </a>
                  </h3>
                  <p className="eyebrow">{d.section}</p>
                  {d.ext && d.origin?.source && (
                    <p className="lib__doc-origin">
                      Spoza Małopolski — {d.origin.source}
                    </p>
                  )}
                  {d.desc && <p className="lib__doc-desc">{d.desc}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** Pusty ekran jest zaproszeniem do działania, nie komunikatem o porażce. */
function Empty({ onReset }: { onReset: () => void }) {
  return (
    <div className="card lib__empty" data-reveal>
      <h3>Nic nie pasuje do tych filtrów</h3>
      <p>
        Spróbuj krótszego słowa albo zdejmij jeden filtr. Jeśli szukasz rozwiązania
        konkretnego problemu, lepiej zadziała opisanie go zwykłym językiem w module
        Matchmaking — tam szukamy po znaczeniu, nie po dosłownym słowie.
      </p>
      <button type="button" className="btn btn--primary" onClick={onReset}>
        Wyczyść filtry
      </button>
    </div>
  );
}
