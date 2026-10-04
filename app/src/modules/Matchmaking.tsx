/**
 * Moduł I - Matchmaking społeczny (obowiązkowy).
 *
 * Rozmowa zamiast formularza: użytkownik opisuje problem potocznie albo
 * dyktuje go głosem, asystent dopytuje najwyżej dwa razy, dopiero potem
 * dopasowuje. Każde trafienie ma rozliczenie „dlaczego to pasuje”, a brak
 * trafienia nie kończy się pustą listą - zgłoszenie staje się luką w ofercie
 * Hubu i trafia do panelu ROPS.
 *
 * Wyniki, analiza zapytania, flaga luki i werdykty Jev pochodzą wyłącznie
 * z `POST /api/match/search/`. Nie ma tu drugiego, przeglądarkowego rankingu:
 * backend przy okazji zapisuje zapytanie jako sygnał potrzeby (z tego powstają
 * trendy w panelu ROPS), więc wynik policzony lokalnie rozjechałby się z tym,
 * co widzi koordynator. Gdy backend milczy, moduł mówi to wprost.
 */
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import {
  advance,
  applyChip,
  initConversation,
  type Chip,
  type ConvState,
  type Turn,
} from "../lib/conversation";
import { fetchMatches, reportGap as postGap, type MatchResponse } from "../lib/matchApi";
import { LOOSE_EMOJIS } from "../lib/emojis";
import { ScanFallback } from "../components/ScanFallback";
import { useEmojiPicks } from "../lib/useEmojiPicks";
import { INNOVATIONS, type Innovation, byId } from "../lib/data";
import { analyzeQuery } from "../lib/match";
import {
  getWatchState,
  isWatched,
  markNoticesRead,
  seekersBeforeYou,
  similarSearches,
  subscribeWatch,
  unwatchNeed,
  watchNeed,
  watchKey,
  type WatchNotice,
} from "../lib/watch";
import { plural } from "../lib/text";
import { addLocalThread } from "../lib/store";
import { useSpeech } from "../lib/useSpeech";
import { useA11y } from "../lib/a11y";
import { InnovationCard } from "../components/InnovationCard";
import { MalopolskaMap } from "../components/MalopolskaMap";
import { Modal } from "../components/Modal";
import { Hero } from "../components/Hero";
import { SearchPill } from "../components/SearchPill";
import { SearchLoader } from "../components/SearchLoader";
import "./matchmaking.css";

interface Props {
  onAdapt: (inn: Innovation) => void;
  onTest: (inn: Innovation) => void;
}

type Phase = "idle" | "loading" | "ready" | "error";

export function Matchmaking({ onAdapt, onTest }: Props) {
  const { t } = useA11y();
  const [conv, setConv] = useState<ConvState>(initConversation);
  const [draft, setDraft] = useState("");
  const [powiatFilter, setPowiatFilter] = useState<string | null>(null);
  // Domyślnie wyłączone: zadanie dotyczy innowacji przetestowanych w Małopolsce,
  // a karty z innych baz to inspiracja, o którą użytkownik prosi świadomie.
  const [external, setExternal] = useState(false);
  const [phase, setPhase] = useState<Phase>("idle");
  const [data, setData] = useState<MatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [gapSent, setGapSent] = useState(false);
  const [gapError, setGapError] = useState<string | null>(null);
  const [gapOpen, setGapOpen] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const liveRef = useRef<HTMLDivElement>(null);

  // --- pętla powrotu potrzeby: obserwacje i powiadomienia (lib/watch.ts) ---
  // Stan żyje poza komponentem, żeby przeżył przełączanie ról i odświeżenie
  // strony - dla demo w jednym oknie przeglądarki to wystarcza.
  const watchState = useSyncExternalStore(subscribeWatch, getWatchState, getWatchState);
  const unreadNotices = watchState.notices.filter((n) => !n.read);
  const [noticeOpen, setNoticeOpen] = useState<string | null>(null);

  // O doborze emotek decyduje wyłącznie Jev (`POST /api/match/emojis/`).
  // Hook sam pilnuje ciszy przed pytaniem, więc krążek nie wylatuje i nie
  // wraca przy każdej literze — a lot trwa teraz 1,5 s.
  const { picks } = useEmojiPicks(draft);
  const pickedEmojiSet = useMemo(() => new Set(picks.map((p) => p.emoji)), [picks]);

  // „Instant": wątki rozpoznawane W TRAKCIE pisania, tym samym silnikiem,
  // którym backend policzy dopasowanie (`analyzeQuery`). Zero API, zero
  // opóźnień — użytkownik widzi, że system rozumie, zanim kliknie „Szukaj".
  // Debounce 140 ms, żeby chipsy nie migotały przy każdym klawiszu.
  const [liveDraft, setLiveDraft] = useState("");
  useEffect(() => {
    const id = window.setTimeout(() => setLiveDraft(draft), 140);
    return () => window.clearTimeout(id);
  }, [draft]);
  const liveConcepts = useMemo(
    () =>
      liveDraft.trim().length >= 4
        ? analyzeQuery(liveDraft).concepts.slice(0, 4)
        : [],
    [liveDraft],
  );

  const speech = useSpeech((text) => {
    // dyktowanie od razu wysyła wypowiedź - senior nie musi szukać przycisku
    setConv((c) => advance(c, text));
    setDraft("");
  });

  // Jedyne zapytanie o wyniki — rusza natychmiast, bez odczekiwania ciszy.
  //
  // Wcześniej czekało QUIET_MS, żeby klikanie po mapie nie wysyłało serii
  // żądań (każde zapisuje się jako sygnał potrzeby w panelu ROPS). Zrezygnowano
  // z tego świadomie: opis jest już zatwierdzony, więc opóźnienie dawało tylko
  // wrażenie ociągania się. Odpowiedź z nieaktualnego zapytania nadal odrzucamy,
  // żeby wolniejsze żądanie nie nadpisało świeższego.
  useEffect(() => {
    if (!conv.done || !conv.problem) {
      setPhase("idle");
      setData(null);
      setError(null);
      return;
    }
    let active = true;
    // „Szukam…” pokazujemy od razu - czekanie w ciszy wygląda jak zawieszenie.
    setPhase("loading");
    setError(null);

    void (async () => {
      try {
        const res = await fetchMatches(conv.problem, {
          limit: 6,
          powiat: powiatFilter,
          external,
        });
        if (!active) return;
        setData(res);
        setPhase("ready");
      } catch (err) {
        if (!active) return;
        setData(null);
        setError(
          err instanceof Error ? err.message : "Nie udało się połączyć z serwerem HubMI.",
        );
        setPhase("error");
      }
    })();

    return () => {
      active = false;
    };
  }, [conv.done, conv.problem, powiatFilter, external, retryKey]);

  const results = data?.results ?? [];
  const analysis = data?.analysis;
  const gap = data?.gap.isGap ? data.gap : null;

  // Obserwowana potrzeba = bieżący problem rozmowy. Klucz jest normalizowany
  // (lib/watch.ts), więc ta sama potrzeba po powrocie nie mnoży wpisów.
  const watchActive = isWatched(conv.done ? conv.problem : null);

  const toggleWatch = () => {
    if (watchActive) {
      const entry = watchState.watches.find((w) => w.id === watchKey(conv.problem));
      if (entry) unwatchNeed(entry.id);
      return;
    }
    // Zapytanie bez rozpoznanych wątków też da się obserwować - wtedy liczy
    // wspólne słowa (lib/watch.ts), więc luka nigdy nie jest „nieobserwowalna".
    watchNeed(conv.problem, analysis?.concepts ?? []);
  };

  const extCount = useMemo(
    () => results.filter((r) => r.innovation.ext).length,
    [results],
  );

  /** Ile wdrożeń ma każdy powiat - ale tylko wśród dopasowanych innowacji. */
  const counts = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of results) {
      for (const d of r.innovation.deployments) {
        m.set(d.powiat, (m.get(d.powiat) ?? 0) + 1);
      }
    }
    return m;
  }, [results]);

  // Po dopasowaniu przenosimy uwagę czytnika na podsumowanie wyników.
  useEffect(() => {
    if (phase === "ready" || phase === "error") liveRef.current?.focus();
  }, [phase, results.length]);

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
    setGapError(null);
    setData(null);
    setError(null);
    setPhase("idle");
  };

  const retry = useCallback(() => setRetryKey((k) => k + 1), []);

  // Lukę zakłada backend - tylko ta ścieżka wiąże zgłoszenie z zapytaniem,
  // więc koordynator ROPS widzi, skąd się wzięło i co użytkownik wpisał.
  const reportGap = async (extra: string) => {
    if (!data) return;
    setGapError(null);
    const title = conv.problem.slice(0, 90) + (conv.problem.length > 90 ? "…" : "");
    const body = conv.problem + (extra ? `\n\nDopisek zgłaszającego: ${extra}` : "");
    try {
      const threadId = await postGap({
        queryId: data.queryId,
        title,
        body,
        powiat: conv.powiat,
      });
      addLocalThread({
        id: threadId,
        kind: "luka",
        title,
        body,
        powiat: conv.powiat ?? undefined,
        concepts: (analysis?.concepts ?? []).map((c) => c.label),
        unknownTerms: analysis?.unknown ?? [],
        topScore: results[0]?.score ?? 0,
      });
      setGapSent(true);
      setGapOpen(false);
    } catch (err) {
      setGapError(
        err instanceof Error ? err.message : "Nie udało się zapisać zgłoszenia w ROPS.",
      );
    }
  };

  // Ostatnie pytanie asystenta może mieć gotowe odpowiedzi do kliknięcia.
  const lastChips = [...conv.turns]
    .reverse()
    .find((x): x is Extract<Turn, { role: "assistant" }> =>
      x.role === "assistant" && !!x.chips)?.chips;

  return (
    <div className="page--hero">
      {/* --- domknięcie pętli: powiadomienia z obserwowanych potrzeb ---
           Pokaże się tu, bo mieszkańcy zaczynają i kończą podróż w tym widoku.
           Rozwinięcie „Pokaż fiszkę" renderuje pełna kartę na miejscu, więc
           użytkownik od razu może przejść do Middlemana lub zgłoszenia testu. */}
      {unreadNotices.length > 0 && (
        <section
          className="mm__notice card"
          role="region"
          aria-label="Nowe innowacje pasujące do obserwowanych potrzeb"
        >
          <p className="page__mod">Twoje obserwacje</p>
          <h2>Do zgłoszonych potrzeb pasują nowe innowacje</h2>
          <ul className="mm__notice-list">
            {unreadNotices.map((n) => (
              <NoticeRow
                key={n.id}
                notice={n}
                open={noticeOpen === n.id}
                onToggle={() =>
                  setNoticeOpen((v) => (v === n.id ? null : n.id))
                }
                onAdapt={onAdapt}
                onTest={onTest}
              />
            ))}
          </ul>
          <div className="row">
            <button type="button" className="btn" onClick={markNoticesRead}>
              Zamknij powiadomienia
            </button>
          </div>
        </section>
      )}

      <Hero receded={conv.done}>
        <h1>
          {t("Opisz problem.", "Napisz, co się dzieje.")}{" "}
          {/* Wyróżnione słowa niosą tezę produktu, nie są ozdobą: cała obietnica
              HubMI to „już zadziałało” - rozwiązanie z udokumentowanym testem. */}
          <span className="hero__accent">
            {t("Pokażemy, co już zadziałało.", "Pokażemy pomoc, która działa.")}
          </span>
        </h1>
        <p className="hero__lede">
          {t(
            "Piszesz po swojemu — my tłumaczymy to na język Biblioteki ROPS i pokazujemy rozwiązania, które mają udokumentowany test.",
            "Piszesz, co się dzieje. My szukamy pomocy, która już komuś zadziałała.",
          )}
        </p>
        {/* Uwaga honestowa: liczymy TYLKO karty małopolskie (bez baz
            zewnętrznych) - „przetestowane" to obietnica dotycząca ROPS. */}
        <div className="hero__stats">
          <HeroStat value={INNOVATIONS.filter((i) => !i.ext).length} label="przetestowanych innowacji ROPS" suffix="" />
          <HeroStat value={111} label="kart z dowodem testu" suffix="" />
          <HeroStat value={22} label="wątków mostka pojęciowego" suffix="" />
        </div>

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
            liveConcepts={liveConcepts}
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
                aria-label="Wyzwania społeczne Małopolski - kliknij, by wpisać do wyszukiwarki"
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
                      title={`${item.label} - kliknij, by wpisać: „${item.sampleQuery}”`}
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

        {/* --- „jak to działa": trzy kroki, żeby od wejścia było wiadomo,
               czego szukamy i skąd biorą się wyniki --- */}
        {!conv.done && (
          <div className="mm__how" data-reveal>
            <ol className="mm__how-steps">
              <li>
                <span className="mm__how-num" aria-hidden="true">1</span>
                <span>
                  {t("Opisujesz problem — słowami albo głosem.", "Piszesz albo mówisz, co jest nie tak.")}
                </span>
              </li>
              <li>
                <span className="mm__how-num" aria-hidden="true">2</span>
                <span>
                  {t(
                    `Dopasowujemy go do ${INNOVATIONS.filter((i) => !i.ext).length} przetestowanych rozwiązań Biblioteki ROPS.`,
                    `Szukamy w ${INNOVATIONS.filter((i) => !i.ext).length} rozwiązaniach, które już zadziałały.`,
                  )}
                </span>
              </li>
              <li>
                <span className="mm__how-num" aria-hidden="true">3</span>
                <span>
                  {t(
                    "AI weryfikuje każde trafienie i mówi, czy pasuje — i dlaczego.",
                    "Sprawdzamy każdy wynik. Mówimy, dlaczego pasuje.",
                  )}
                </span>
              </li>
            </ol>
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
              {phase === "loading" && <SearchLoader />}

              {phase === "error" && (
                <>
                  <h2>Nie udało się pobrać wyników</h2>
                  <p className="muted">{error}</p>
                </>
              )}

              {phase === "ready" && (
                <>
                  <h2>
                    {gap
                      ? "Nie mamy na to gotowego rozwiązania"
                      : `${results.length} ${plural(
                          results.length,
                          "rozwiązanie",
                          "rozwiązania",
                          "rozwiązań",
                        )}${extCount > 0 ? "" : " z Biblioteki"}`}
                  </h2>
                  {extCount > 0 && (
                    <p className="muted">
                      {extCount} z nich pochodzi z baz poza Małopolską - każda taka karta
                      jest tak opisana i ma niżej ważony wynik.
                    </p>
                  )}
                  <p className="muted">
                    {gap
                      ? gap.text
                      : analysis && analysis.concepts.length > 0
                        ? `Rozpoznane wątki: ${analysis.concepts
                            .map((c) => c.label)
                            .join(", ")}.`
                        : "Dopasowanie oparte na słowach z Twojego opisu."}
                  </p>
                  {!gap && analysis && analysis.concepts.length > 0 && (
                    <p className="mm__alone">
                      <strong>Nie jesteś sam.</strong> Podobną potrzebę szukało w
                      tym tygodniu w regionie {similarSearches(analysis.concepts)}{" "}
                      osób.
                    </p>
                  )}
                </>
              )}
            </div>

            <div className="row">
              {phase === "error" && (
                <button type="button" className="btn btn--primary" onClick={retry}>
                  Spróbuj ponownie
                </button>
              )}
              {(phase === "ready" || phase === "idle") && (
                <button
                  type="button"
                  className="btn"
                  aria-pressed={external}
                  onClick={() => setExternal((v) => !v)}
                >
                  {external ? "Szukaj tylko w Małopolsce" : "Dodaj bazy spoza Małopolski"}
                </button>
              )}
              {phase === "ready" && !gap && (
                <button
                  type="button"
                  className="btn"
                  aria-pressed={watchActive}
                  onClick={toggleWatch}
                >
                  {watchActive ? "Obserwujesz" : "Obserwuj tę potrzebę"}
                </button>
              )}
              <button type="button" className="btn" onClick={restart}>
                Zacznij od nowa
              </button>
            </div>
            {phase === "ready" && (
              <p className="hint">
                {watchActive
                  ? "Obserwujesz tę potrzebę - powiadomimy Cię, gdy w bazie pojawi się pasująca innowacja."
                  : "Obserwacja to powiadomienie: damy znać, gdy w bazie pojawi się innowacja pasująca do tego problemu."}
              </p>
            )}
          </div>

          {phase === "error" && (
            <section className="mm__gap card" data-reveal>
              <p className="page__mod">Brak połączenia z serwerem</p>
              <h3>Nie pokazujemy wyników, których nie policzył serwer</h3>
              <p>
                Dopasowanie liczy backend HubMI - tam jest baza innowacji, tam
                zapisuje się zgłoszenie jako sygnał potrzeby i stamtąd pochodzi
                weryfikacja każdego trafienia. Wynik udawany po stronie
                przeglądarki nie trafiłby do panelu ROPS, więc go nie pokazujemy.
              </p>
              <p className="hint">
                Jeśli uruchamiasz projekt lokalnie: backend powinien odpowiadać na{" "}
                <span className="mono">http://localhost:8000/api/health/</span>.
              </p>
            </section>
          )}

          {/* --- zanim uznamy to za lukę: niech model przejrzy całą bazę --- */}
          {phase === "ready" && gap && conv.problem && (
            <ScanFallback
              query={conv.problem}
              kind="both"
              onAdapt={onAdapt}
              onTest={onTest}
            />
          )}

          {/* --- luka: problem bez rozwiązania staje się zadaniem dla Hubu --- */}
          {phase === "ready" && gap && (
            <section className="mm__gap card" data-reveal>
              <p className="page__mod">Luka w ofercie Hubu</p>
              <h3>Na ten problem nie ma jeszcze rozwiązania w bazie</h3>
              <p>
                Problem, na który nikt jeszcze nie odpowiedział, jest dla ROPS
                informacją o tym, czego w regionie brakuje. Po zgłoszeniu trafi do
                panelu koordynatora w zestawieniu „niezaspokojone potrzeby i trendy”
                - i może stać się tematem kolejnego naboru grantowego.
              </p>
              {analysis && analysis.unknown.length > 0 && (
                <p className="hint">
                  Słowa, których nie rozpoznaliśmy jako znanego obszaru:{" "}
                  <span className="mono">{analysis.unknown.slice(0, 8).join(", ")}</span>.
                  Te właśnie zasilają zestawienie trendów.
                </p>
              )}
              {analysis && analysis.concepts.length > 0 && (
                <p className="mm__alone">
                  <strong>Nie jesteś sam.</strong> Jesteś{" "}
                  {seekersBeforeYou(analysis.concepts)}. osobą z podobnym problemem
                  w tym tygodniu — Twoje zgłoszenie wzmacnia ten sygnał w trendach
                  ROPS.
                </p>
              )}
              {gapSent ? (
                <p className="mm__sent" role="status">
                  <strong>Zgłoszone.</strong> Koordynator ROPS widzi już powiadomienie
                  w panelu - zajrzyj do modułu VI, żeby zobaczyć je z drugiej strony.
                </p>
              ) : (
                <>
                  {gapError && (
                    <p className="error" role="alert">
                      {gapError}
                    </p>
                  )}
                  <div className="row">
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => setGapOpen(true)}
                    >
                      Zgłoś tę potrzebę do ROPS
                    </button>
                    <button
                      type="button"
                      className="btn"
                      aria-pressed={watchActive}
                      onClick={toggleWatch}
                    >
                      {watchActive ? "Obserwujesz" : "Obserwuj tę potrzebę"}
                    </button>
                  </div>
                </>
              )}
            </section>
          )}

          {phase === "ready" && results.length > 0 && (
            <>
              <section className="mm__map" data-reveal>
                <h2>Gdzie podobny problem już rozwiązano</h2>
                <MalopolskaMap
                  counts={counts}
                  selected={powiatFilter}
                  onSelect={setPowiatFilter}
                  caption={
                    "Im ciemniejszy powiat, tym więcej dopasowanych innowacji zostało " +
                    "tam wdrożonych. Kliknij powiat, aby zawęzić wyniki - a potem użyj " +
                    "przycisku „Skontaktuj się z realizatorem” na fiszce, żeby napisać " +
                    "do instytucji, która to samo już u siebie zrobiła."
                  }
                />
              </section>

              <section className="results" data-reveal="stagger" aria-label="Dopasowane innowacje">
                {results.map((r, idx) => (
                  <InnovationCard
                    key={r.innovation.id}
                    result={r}
                    aiVerdict={data?.verdicts[r.innovation.id]}
                    verdictDelay={500 + idx * 280}
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
  onSubmit: (extra: string) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [extra, setExtra] = useState("");
  const [sending, setSending] = useState(false);
  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        setSending(true);
        try {
          await onSubmit(extra.trim());
        } finally {
          setSending(false);
        }
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
        Nie podawaj danych osobowych - ani swoich, ani osób, o których piszesz.
        Zgłoszenie służy do zliczania potrzeb, nie do prowadzenia sprawy.
      </p>
      <div className="row">
        <button type="submit" className="btn btn--primary" disabled={sending}>
          {sending ? "Wysyłam…" : "Wyślij do ROPS"}
        </button>
        <button type="button" className="btn btn--ghost" onClick={onCancel}>
          Anuluj
        </button>
      </div>
    </form>
  );
}

/**
 * Liczba w pasku zaufania hero: nadjeżdża od 0 do wartości (ease-out cubic).
 * Przy prefers-reduced-motion pokazuje się od razu — ruch ma ozdabiać,
 * nie opóźniać informację.
 */
function HeroStat({ value, label, suffix = "" }: { value: number; label: string; suffix?: string }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    const reduce =
      typeof window.matchMedia === "function" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || typeof requestAnimationFrame !== "function") {
      setN(value);
      return;
    }
    let raf = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 900);
      setN(Math.round(value * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  return (
    <p className="hero__stat">
      <strong>
        {n}
        {suffix}
      </strong>
      <span>{label}</span>
    </p>
  );
}

/**
 * Jeden wiersz powiadomienia z obserwacji: tekst + rozwinięcie do pełnej
 * fiszki. Fiszka jest tu z celowego założenia ta sama komponenta co w
 * wynikach - powiadomienie nie jest martwą karteczką, tylko wejściem
 * do tego samego katalogu, z Middlemanem i zgłoszeniem testu w zasięgu ręki.
 */
function NoticeRow({
  notice,
  open,
  onToggle,
  onAdapt,
  onTest,
}: {
  notice: WatchNotice;
  open: boolean;
  onToggle: () => void;
  onAdapt: (inn: Innovation) => void;
  onTest: (inn: Innovation) => void;
}) {
  const inn = byId(notice.innovationId);
  return (
    <li className="mm__notice-row">
      <p>
        Pasuje do obserwowanej potrzeby{" "}
        <strong>„{notice.watchText}"</strong>: nowa innowacja{" "}
        <strong>„{notice.innovationName}"</strong>.
      </p>
      {inn && (
        <div className="row">
          <button
            type="button"
            className="btn"
            aria-expanded={open}
            onClick={onToggle}
          >
            {open ? "Zwiń fiszkę" : "Pokaż fiszkę"}
          </button>
        </div>
      )}
      {open && inn && <InnovationCard innovation={inn} onAdapt={onAdapt} onTest={onTest} />}
    </li>
  );
}
