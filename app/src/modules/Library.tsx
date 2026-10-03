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
import { useMemo, useState } from "react";
import { INNOVATIONS, LIBRARY, CATEGORIES, type Innovation } from "../lib/data";
import { foldDiacritics } from "../lib/text";
import { InnovationCard } from "../components/InnovationCard";
import "./library.css";

type Tab = "innowacje" | "dokumenty";

interface Props {
  onAdapt: (inn: Innovation) => void;
  onTest: (inn: Innovation) => void;
}

export function Library({ onAdapt, onTest }: Props) {
  const [tab, setTab] = useState<Tab>("innowacje");
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("");
  const [onlyVideo, setOnlyVideo] = useState(false);
  const [section, setSection] = useState<string>("");

  const needle = foldDiacritics(q.trim().toLowerCase());

  const inns = useMemo(() => {
    return INNOVATIONS.filter((i) => {
      if (cat && i.cat !== cat) return false;
      if (onlyVideo && !i.video) return false;
      if (!needle) return true;
      const hay = foldDiacritics(
        `${i.name} ${i.problem} ${i.desc} ${i.target} ${i.benef} ${i.catName}`.toLowerCase(),
      );
      return hay.includes(needle);
    });
  }, [needle, cat, onlyVideo]);

  const sections = useMemo(
    () => [...new Set(LIBRARY.map((d) => d.section))],
    [],
  );

  const docs = useMemo(() => {
    return LIBRARY.filter((d) => {
      if (section && d.section !== section) return false;
      if (!needle) return true;
      return foldDiacritics(`${d.title} ${d.desc}`.toLowerCase()).includes(needle);
    });
  }, [needle, section]);

  const videoCount = INNOVATIONS.filter((i) => i.video).length;

  return (
    <div className="page wrap">
      <div className="page__head" data-reveal>
        <p className="page__mod">Moduł II · Zasobnik wiedzy</p>
        <h1>Co już wiemy o Małopolsce</h1>
        <p>
          {INNOVATIONS.length} przetestowanych innowacji, {videoCount} z filmem,
          oraz {LIBRARY.length} dokumentów ROPS — raporty, diagnozy, Mapa Wyzwań
          Społecznych i wzory wniosków grantowych.
        </p>
      </div>

      <div className="lib__tabs" role="tablist" aria-label="Rodzaj zasobu" data-reveal>
        {(["innowacje", "dokumenty"] as Tab[]).map((x) => (
          <button
            key={x}
            type="button"
            role="tab"
            id={`tab-${x}`}
            aria-selected={tab === x}
            aria-controls={`panel-${x}`}
            className="btn"
            onClick={() => setTab(x)}
          >
            {x === "innowacje"
              ? `Biblioteka innowacji (${INNOVATIONS.length})`
              : `Dokumenty i raporty (${LIBRARY.length})`}
          </button>
        ))}
      </div>

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
          ? `${inns.length} z ${INNOVATIONS.length} innowacji`
          : `${docs.length} z ${LIBRARY.length} dokumentów`}
      </p>

      {tab === "innowacje" ? (
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
      ) : (
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
