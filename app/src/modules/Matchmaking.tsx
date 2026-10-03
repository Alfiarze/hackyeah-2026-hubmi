/**
 * Moduł I — Matchmaking społeczny (obowiązkowy).
 *
 * Rozmowa zamiast formularza: użytkownik opisuje problem potocznie albo
 * dyktuje go głosem, asystent dopytuje najwyżej dwa razy, dopiero potem
 * dopasowuje. Każde trafienie ma rozliczenie „dlaczego to pasuje", a brak
 * trafienia nie kończy się pustą listą — zgłoszenie staje się luką w ofercie
 * Hubu i trafia do panelu ROPS.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import {
  advance,
  applyChip,
  initConversation,
  type Chip,
  type ConvState,
  type Turn,
} from "../lib/conversation";
import { buildIndex, search, gapReason, GAP_REASON_TEXT, type MatchResult } from "../lib/match";
import { LOOSE_EMOJIS, pickEmojis } from "../lib/emojis";
import { INNOVATIONS, type Innovation } from "../lib/data";
import { addThread } from "../lib/store";
import { api } from "../lib/api";
import { useSpeech } from "../lib/useSpeech";
import { useA11y } from "../lib/a11y";
import { InnovationCard } from "../components/InnovationCard";
import { MalopolskaMap } from "../components/MalopolskaMap";
import { Modal } from "../components/Modal";
import { Hero } from "../components/Hero";
import { SearchPill } from "../components/SearchPill";
import "./matchmaking.css";

buildIndex(INNOVATIONS);

interface Props {
  onAdapt: (inn: Innovation) => void;
  onTest: (inn: Innovation) => void;
}

export function Matchmaking({ onAdapt, onTest }: Props) {
  const { t } = useA11y();
  const [conv, setConv] = useState<ConvState>(initConversation);
  const [draft, setDraft] = useState("");
  const [powiatFilter, setPowiatFilter] = useState<string | null>(null);
  const [gapSent, setGapSent] = useState(false);
  const [gapOpen, setGapOpen] = useState(false);
  const [serverVerdicts, setServerVerdicts] = useState<
    Record<string, { related?: boolean; confidence?: number; reason?: string; source?: string }>
  >({});
  const liveRef = useRef<HTMLDivElement>(null);

  const picks = useMemo(() => pickEmojis(draft), [draft]);
  const pickedEmojiSet = useMemo(() => new Set(picks.map((p) => p.emoji)), [picks]);

  const speech = useSpeech((text) => {
    // dyktowanie od razu wysyła wypowiedź — senior nie musi szukać przycisku
    setConv((c) => advance(c, text));
    setDraft("");
  });

  const { analysis, results } = useMemo(
    () =>
      conv.done && conv.problem
        ? search(conv.problem, { limit: 6, powiat: powiatFilter ?? undefined })
        : { analysis: { concepts: [], stems: [], unknown: [] }, results: [] as MatchResult[] },
    [conv.done, conv.problem, powiatFilter],
  );

  // Synchronizacja z backendem DRF: rejestruje SearchQuery w Postgres (zasilając Trendy)
  // oraz pobiera werdykty modelu decyzyjnego Jev dla poszczególnych innowacji
  useEffect(() => {
    if (!conv.done || !conv.problem) return;
    let active = true;
    (async () => {
      try {
        const res = await api.match.search(conv.problem, 6, undefined, powiatFilter ?? undefined);
        if (!active || !res.ok || !res.data) return;
        const vMap: Record<string, { related?: boolean; confidence?: number; reason?: string; source?: string }> = {};
        if (Array.isArray(res.data.results)) {
          for (const item of res.data.results) {
            const id = (item as any).id || (item as any).innovation_id;
            const ai = (item as any).ai;
            if (id && ai) {
              vMap[id] = {
                related: ai.related,
                confidence: typeof ai.confidence === "number" ? ai.confidence : undefined,
                reason: ai.reason,
                source: ai.source,
              };
            }
          }
        }
        setServerVerdicts(vMap);
      } catch {
        // graceful fallback do dopasowania lokalnego
      }
    })();
    return () => {
      active = false;
    };
  }, [conv.done, conv.problem, powiatFilter]);

  const gap = conv.done ? gapReason(analysis, results) : null;

  /** Ile wdrożeń ma każdy powiat — ale tylko wśród dopasowanych innowacji. */
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    const pool = results.length ? results.map((r) => r.innovation) : [];
    for (const inn of pool) {
      for (const d of inn.deployments) m.set(d.powiat, (m.get(d.powiat) ?? 0) + 1);
    }
    return m;
  }, [results]);

  // Po dopasowaniu przenosimy uwagę czytnika na podsumowanie wyników.
  useEffect(() => {
    if (conv.done) liveRef.current?.focus();
  }, [conv.done, results.length]);

  const send = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!draft.trim()) return;
    setConv((c) => advance(c, draft));
    setDraft("");
  };

  const chip = (c: Chip) => setConv((s) => applyChip(s, c));

  const restart = () => {
    setConv(initConversation());
    setDraft("");
    setPowiatFilter(null);
    setGapSent(false);
  };

  const reportGap = (extra: string) => {
    addThread({
      kind: "luka",
      title: conv.problem.slice(0, 90) + (conv.problem.length > 90 ? "…" : ""),
      body: conv.problem + (extra ? `\n\nDopisek zgłaszającego: ${extra}` : ""),
      powiat: conv.powiat ?? undefined,
      concepts: analysis.concepts.map((c) => c.label),
      unknownTerms: analysis.unknown,
      topScore: results[0]?.score ?? 0,
    });
    setGapSent(true);
    setGapOpen(false);
  };

  // Ostatnie pytanie asystenta może mieć gotowe odpowiedzi do kliknięcia.
  const lastChips = [...conv.turns]
    .reverse()
    .find((x): x is Extract<Turn, { role: "assistant" }> =>
      x.role === "assistant" && !!x.chips)?.chips;

  return (
    <div className="page--hero">
      <Hero receded={conv.done}>
        <p className="hero__eyebrow">115 przetestowanych innowacji z Małopolski</p>
        <h1>
          {t("Opisz problem.", "Napisz, co się dzieje.")}{" "}
          {/* Wyróżnione słowa niosą tezę produktu, nie są ozdobą: cała obietnica
              HubMI to „już zadziałało" — rozwiązanie z udokumentowanym testem. */}
          <span className="hero__accent">
            {t("Pokażemy, co już zadziałało.", "Pokażemy pomoc, która działa.")}
          </span>
        </h1>
        <p className="hero__lede">
          Opisz sytuację zwykłym językiem lub podyktuj głosem.
          Wskażemy przetestowane rozwiązania z Małopolski i bezpośredni kontakt do realizatorów.
        </p>

      {/* --- rozmowa --- */}
      <section className="mm__conv" aria-label="Wyszukiwanie rozwiązań">
        <ol className="mm__turns">
          {conv.turns.map((turn) => (
            <li
              key={turn.id}
              className={`mm__turn mm__turn--${turn.role === "user" ? "user" : "bot"}`}
            >
              <span className="mm__who">
                {turn.role === "user" ? "Ty" : "HubMI"}
              </span>
              <p>{turn.text}</p>
            </li>
          ))}
        </ol>

        {lastChips && !conv.done && (
          <div className="mm__chips" role="group" aria-label="Szybkie odpowiedzi">
            {lastChips.map((c) => (
              <button key={c.label} type="button" className="btn" onClick={() => chip(c)}>
                {c.label}
              </button>
            ))}
          </div>
        )}

        {!conv.done && (
          <SearchPill
            value={draft}
            picks={picks}
            interim={speech.interim}
            onChange={setDraft}
            onSubmit={send}
            onClear={() => setDraft("")}
            label={conv.turns.length <= 1 ? "Opisz problem" : "Twoja odpowiedź"}
            placeholder={
              conv.turns.length <= 1
                ? "Opisz sytuację, np. brak windy, samotny senior, dojazd do lekarza…"
                : "Dopisz, co jeszcze warto wiedzieć"
            }
            hintId="mm-hint"
            hint={
              speech.supported
                ? "Wpisz i naciśnij Enter albo naciśnij mikrofon i powiedz."
                : "Naciśnij Enter, żeby szukać. (Ta przeglądarka nie obsługuje dyktowania.)"
            }
            actions={
              <>
                {speech.supported && (
                  <button
                    type="button"
                    className="mm__pillbtn"
                    aria-pressed={speech.listening}
                    onClick={() => (speech.listening ? speech.stop() : speech.start())}
                  >
                    <span aria-hidden="true">{speech.listening ? "■" : "🎤"}</span>
                    <span className="sr-only">
                      {speech.listening ? "Zakończ dyktowanie" : "Dyktuj głosem"}
                    </span>
                  </button>
                )}
                <button
                  type="submit"
                  className="mm__pillgo"
                  disabled={!draft.trim()}
                >
                  Szukaj
                </button>
              </>
            }
            status={
              <>
                {speech.listening && (
                  <p className="mm__listening" role="status">
                    Słucham… {speech.interim && <em>{speech.interim}</em>}
                  </p>
                )}
                {speech.error && (
                  <p className="error" role="alert">
                    {speech.error}
                  </p>
                )}
              </>
            }
          />
        )}

        {conv.turns.length <= 1 && (
          <div className="mm__gravity-section" data-reveal>
            <div className="mm__gravity-floor">
              <div
                className="mm__gravity-pit"
                role="group"
                aria-label="Wyzwania społeczne Małopolski — kliknij, by wpisać do wyszukiwarki"
              >
                {LOOSE_EMOJIS.map((item) => {
                  const isLifted = pickedEmojiSet.has(item.emoji);
                  return (
                    <button
                      key={`${item.conceptId}-${item.emoji}`}
                      type="button"
                      data-pebble={item.emoji}
                      className={`mm__gravity-pebble ${isLifted ? "mm__gravity-pebble--lifted" : ""}`}
                      style={{
                        "--tilt": `${item.tilt}deg`,
                        "--jitter-y": `${item.jitterY}px`,
                        "--scale": `${item.scale}`,
                      } as React.CSSProperties}
                      onClick={() => setDraft(item.sampleQuery)}
                      disabled={isLifted}
                      aria-hidden={isLifted ? "true" : undefined}
                      title={`${item.label} — kliknij, by wpisać: „${item.sampleQuery}”`}
                      aria-label={item.label}
                    >
                      <span className="mm__gravity-emoji" aria-hidden="true">{item.emoji}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </section>
      </Hero>

      <div className="wrap">
      {/* --- wyniki --- */}
      {conv.done && (
        <>
          <div
            className="mm__summary"
            data-reveal
            ref={liveRef}
            tabIndex={-1}
            role="status"
            aria-live="polite"
          >
            <div>
              <h2>
                {gap
                  ? "Nie mamy na to gotowego rozwiązania"
                  : `${results.length} ${
                      results.length === 1 ? "rozwiązanie" : "rozwiązania"
                    } z Biblioteki`}
              </h2>
              <p className="muted">
                {gap
                  ? GAP_REASON_TEXT[gap]
                  : `Szukaliśmy wśród 115 przetestowanych innowacji. ` +
                    `Rozpoznane wątki: ${analysis.concepts.map((c) => c.label).join(", ")}.`}
              </p>
            </div>
            <button type="button" className="btn" onClick={restart}>
              Zacznij od nowa
            </button>
          </div>

          {/* --- luka: problem bez rozwiązania staje się zadaniem dla Hubu --- */}
          {gap && (
            <section className="mm__gap card" data-reveal>
              <p className="page__mod">Luka w ofercie Hubu</p>
              <h3>Twoje zgłoszenie jest tu wartościowe właśnie dlatego, że nic nie pasuje</h3>
              <p>
                Problem, na który nikt jeszcze nie odpowiedział, jest dla ROPS
                informacją o tym, czego w regionie brakuje. Po zgłoszeniu trafi do
                panelu koordynatora w zestawieniu „niezaspokojone potrzeby i trendy"
                — i może stać się tematem kolejnego naboru grantowego.
              </p>
              {analysis.unknown.length > 0 && (
                <p className="hint">
                  Słowa, których nie rozpoznaliśmy jako znanego obszaru:{" "}
                  <span className="mono">{analysis.unknown.slice(0, 8).join(", ")}</span>.
                  Te właśnie zasilają zestawienie trendów.
                </p>
              )}
              {gapSent ? (
                <p className="mm__sent" role="status">
                  <strong>Zgłoszone.</strong> Koordynator ROPS widzi już powiadomienie
                  w panelu — zajrzyj do modułu VI, żeby zobaczyć je z drugiej strony.
                </p>
              ) : (
                <div className="row">
                  <button
                    type="button"
                    className="btn btn--primary"
                    onClick={() => setGapOpen(true)}
                  >
                    Zgłoś tę potrzebę do ROPS
                  </button>
                </div>
              )}
            </section>
          )}

          {results.length > 0 && (
            <>
              <section className="mm__map" data-reveal>
                <h2>Gdzie podobny problem już rozwiązano</h2>
                <MalopolskaMap
                  counts={counts}
                  selected={powiatFilter}
                  onSelect={setPowiatFilter}
                  caption={
                    "Im ciemniejszy powiat, tym więcej dopasowanych innowacji zostało " +
                    "tam wdrożonych. Kliknij powiat, aby zawęzić wyniki — a potem użyj " +
                    "przycisku „Skontaktuj się z realizatorem” na fiszce, żeby napisać " +
                    "do instytucji, która to samo już u siebie zrobiła."
                  }
                />
              </section>

              <section className="results" data-reveal="stagger" aria-label="Dopasowane innowacje">
                {results.map((r) => (
                  <InnovationCard
                    key={r.innovation.id}
                    result={r}
                    aiVerdict={serverVerdicts[r.innovation.id]}
                    onAdapt={onAdapt}
                    onTest={onTest}
                  />
                ))}
              </section>
            </>
          )}
        </>
      )}

      </div>

      <Modal open={gapOpen} onClose={() => setGapOpen(false)} title="Zgłoś niezaspokojoną potrzebę">
        <GapForm problem={conv.problem} onSubmit={reportGap} onCancel={() => setGapOpen(false)} />
      </Modal>
    </div>
  );
}

function GapForm({
  problem,
  onSubmit,
  onCancel,
}: {
  problem: string;
  onSubmit: (extra: string) => void;
  onCancel: () => void;
}) {
  const [extra, setExtra] = useState("");
  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit(extra.trim());
      }}
    >
      <div className="field">
        <label htmlFor="gap-problem">Zgłaszany problem</label>
        <textarea id="gap-problem" rows={4} value={problem} readOnly aria-readonly="true" />
        <p className="hint">To, co opisałeś w rozmowie. Przekazujemy bez zmian.</p>
      </div>
      <div className="field">
        <label htmlFor="gap-extra">Chcesz coś dodać? (opcjonalnie)</label>
        <textarea
          id="gap-extra"
          rows={3}
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          placeholder="Np. ilu osób to dotyczy, co już próbowaliście"
        />
      </div>
      <p className="hint">
        Nie podawaj danych osobowych — ani swoich, ani osób, o których piszesz.
        Zgłoszenie służy do zliczania potrzeb, nie do prowadzenia sprawy.
      </p>
      <div className="row">
        <button type="submit" className="btn btn--primary">
          Wyślij do ROPS
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Anuluj
        </button>
      </div>
    </form>
  );
}
