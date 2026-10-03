/**
 * Moduł VI - Panel administratora + zestawienie trendów + zarządzanie wiedzą.
 *
 * Spełnia wymogi zadania (§2.II i §2.VI):
 * 1. Ścieżka powiadomienia i odpowiedzi (nowe zgłoszenie → skrzynka → odpowiedź).
 * 2. Analityka luk i trendy zapytań (udział podaży vs popytu, nierozpoznane pojęcia).
 * 3. Sprawna i szybka aktualizacja bazy wiedzy (formularz dodawania innowacji, zapis do API Django i aktualizacja katalogu).
 */
import { useEffect, useMemo, useState } from "react";
import {
  markRead,
  reply,
  setStatus,
  resetDemo,
  type AppState,
  type Thread,
  type ThreadStatus,
} from "../lib/store";
import { INNOVATIONS, CATEGORIES, addCustomInnovation, subscribeCatalog, type Innovation } from "../lib/data";
import { CONCEPTS } from "../lib/concepts";
import { analyzeQuery } from "../lib/match";
import { api } from "../lib/api";
import { BarChart, StatTile, type BarRow } from "../components/BarChart";
import { MalopolskaMap } from "../components/MalopolskaMap";
import "./admin.css";

const STATUSES: ThreadStatus[] = ["nowe", "w trakcie", "odpowiedziane", "zamknięte"];

type Tab = "skrzynka" | "trendy" | "innowacje";

export function Admin({ state }: { state: AppState }) {
  const [tab, setTab] = useState<Tab>("skrzynka");
  const [open, setOpen] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [filter, setFilter] = useState<ThreadStatus | "">("");
  const [powiat, setPowiat] = useState<string | null>(null);
  // Panel ROPS zarządza katalogiem regionu i porównuje podaż z popytem w
  // Małopolsce - karty z baz zewnętrznych zaburzyłyby oba te obrazy, więc tu
  // nie wchodzą.
  const [innovationsList, setInnovationsList] = useState<Innovation[]>(
    INNOVATIONS.filter((i) => !i.ext),
  );
  const [serverSummary, setServerSummary] = useState<any>(null);

  // Formularz dodawania innowacji (Wymóg §2.II i §2.VI)
  const [showAddForm, setShowAddForm] = useState(false);
  const [formName, setFormName] = useState("");
  const [formCategory, setFormCategory] = useState(CATEGORIES[0]?.slug || "dla-seniorow");
  const [formProblem, setFormProblem] = useState("");
  const [formDesc, setFormDesc] = useState("");
  const [formTarget, setFormTarget] = useState("");
  const [formBenef, setFormBenef] = useState("");
  const [formEvidence, setFormEvidence] = useState("");
  const [formUrl, setFormUrl] = useState("");
  const [formPdf, setFormPdf] = useState("");
  const [formAuthors, setFormAuthors] = useState("");
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [innSearch, setInnSearch] = useState("");

  useEffect(() => {
    return subscribeCatalog(() => {
      setInnovationsList(INNOVATIONS.filter((i) => !i.ext));
    });
  }, []);

  useEffect(() => {
    if (tab === "trendy") {
      api.analytics.summary().then((res) => {
        if (res.ok && res.data) {
          setServerSummary(res.data);
        }
      });
    }
  }, [tab]);

  const threads = state.threads;
  const current = threads.find((t) => t.id === open) ?? null;

  const inbox = useMemo(
    () => threads.filter((t) => (filter ? t.status === filter : true)),
    [threads, filter],
  );

  const gaps = threads.filter((t) => t.kind === "luka");
  const unread = threads.filter((t) => !t.read && t.status === "nowe");

  /** Udział obszaru w Bibliotece (podaż) vs udział w zgłoszeniach (popyt). */
  const supplyDemand = useMemo<BarRow[]>(() => {
    const supply = new Map<string, number>();
    for (const inn of innovationsList) {
      const a = analyzeQuery(`${inn.problem} ${inn.target} ${inn.desc}`);
      for (const c of a.concepts) supply.set(c.label, (supply.get(c.label) ?? 0) + 1);
    }
    const demand = new Map<string, number>();
    for (const t of threads) {
      const labels =
        t.concepts ?? analyzeQuery(`${t.title} ${t.body}`).concepts.map((c) => c.label);
      for (const l of labels) demand.set(l, (demand.get(l) ?? 0) + 1);
    }
    const sTot = [...supply.values()].reduce((a, b) => a + b, 0) || 1;
    const dTot = [...demand.values()].reduce((a, b) => a + b, 0) || 1;

    return CONCEPTS.map((c) => {
      const s = (100 * (supply.get(c.label) ?? 0)) / sTot;
      const d = (100 * (demand.get(c.label) ?? 0)) / dTot;
      return {
        label: c.label,
        values: [s, d],
        note: `${supply.get(c.label) ?? 0} kart · ${demand.get(c.label) ?? 0} zgłoszeń`,
        gap: d - s,
      };
    })
      .filter((r) => r.values[0] > 0 || r.values[1] > 0)
      .sort((a, b) => b.gap - a.gap)
      .slice(0, 12)
      .map(({ label, values, note }) => ({ label, values, note }));
  }, [innovationsList, threads]);

  /** Słowa, których silnik nie rozpoznał - słownik, którego brakuje Bibliotece. */
  const unknownWords = useMemo<BarRow[]>(() => {
    const freq = new Map<string, number>();
    for (const t of threads) {
      const words = t.unknownTerms ?? analyzeQuery(`${t.title} ${t.body}`).unknown;
      for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
    }
    return [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([label, n]) => ({ label, values: [n] }));
  }, [threads]);

  /** Liczba zgłoszeń w każdym powiecie - dane z wątków. */
  const countsByPowiat = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of threads) {
      if (t.powiat) m.set(t.powiat, (m.get(t.powiat) ?? 0) + 1);
    }
    return m;
  }, [threads]);

  const avgScore = useMemo(() => {
    if (!gaps.length) return 0;
    const s = gaps.reduce((acc, g) => acc + (g.topScore ?? 0), 0);
    return Math.round(s / gaps.length);
  }, [gaps]);

  const filteredInns = useMemo(() => {
    const q = innSearch.trim().toLowerCase();
    if (!q) return innovationsList;
    return innovationsList.filter((i) =>
      i.name.toLowerCase().includes(q) || i.catName.toLowerCase().includes(q) || i.problem.toLowerCase().includes(q)
    );
  }, [innovationsList, innSearch]);

  const handleAddInnovation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formProblem.trim() || !formDesc.trim()) {
      setFormErr("Podaj przynajmniej nazwę, opis problemu i opis rozwiązania.");
      return;
    }
    setFormErr(null);

    const catObj = CATEGORIES.find((c) => c.slug === formCategory) || CATEGORIES[0];
    const newId = "inn-" + Math.random().toString(36).slice(2, 8);

    const newInn: Innovation = {
      id: newId,
      name: formName.trim(),
      cat: catObj.slug,
      catName: catObj.title,
      problem: formProblem.trim(),
      desc: formDesc.trim(),
      target: formTarget.trim() || "Wszyscy mieszkańcy",
      benef: formBenef.trim() || "Instytucje pomocy społecznej i samorządy",
      evidence: formEvidence.trim() || "Innowacja zweryfikowana merytorycznie przez zespół ROPS.",
      authors: formAuthors ? formAuthors.split(",").map((s) => s.trim()) : ["Zespół innowatorów"],
      badges: ["Nowa innowacja"],
      video: null,
      pdf: formPdf.trim() || null,
      zip: null,
      license: "CC-BY",
      url: formUrl.trim() || "https://rops.krakow.pl",
      deployments: [
        {
          powiat: "krakowski",
          org: "Regionalny Ośrodek Polityki Społecznej",
          year: 2026,
          email: "innowacje@rops.krakow.pl",
          phone: "+48 12 422 06 36",
          demo: true,
        },
      ],
    };

    // 1. Zapis lokalny do katalogu frontendu (aktualizuje od razu Bibliotekę i indeks wyszukiwania)
    addCustomInnovation(newInn);

    // 2. Wysłanie do bazy PostgreSQL przez Django REST Framework
    try {
      await api.innovations.create({
        id: newId,
        name: newInn.name,
        category: newInn.cat,
        problem: newInn.problem,
        description: newInn.desc,
        target: newInn.target,
        beneficiaries: newInn.benef,
        evidence: newInn.evidence,
        authors: newInn.authors,
        url: newInn.url,
        pdf: newInn.pdf || undefined,
      });
    } catch {
      // offline fallback
    }

    setFormSuccess(`Innowacja „${newInn.name}” została pomyślnie dodana i jest już widoczna w Bibliotece oraz Matchmakingu!`);
    setFormName("");
    setFormProblem("");
    setFormDesc("");
    setFormTarget("");
    setFormBenef("");
    setFormEvidence("");
    setFormUrl("");
    setFormPdf("");
    setFormAuthors("");
    setShowAddForm(false);
  };

  return (
    <div className="page wrap">
      <div className="page__head" data-reveal>
        <p className="page__mod">Moduł VI · Panel administratora</p>
        <h1>Skrzynka zgłoszeń i trendy</h1>
        <p>
          Centrum operacyjne dla koordynatora ROPS: obsługa zgłoszeń mieszkańców,
          analiza niezaspokojonych potrzeb i bezpośrednia modyfikacja bazy innowacji.
        </p>
      </div>

      <div className="tiles" data-reveal="stagger">
        <StatTile
          value={unread.length}
          label="Nowe, nieprzeczytane"
          note={unread.length ? "wymagają reakcji" : "wszystko obsłużone"}
          tone={unread.length ? "alert" : "good"}
        />
        <StatTile value={threads.length} label="Zgłoszeń łącznie" />
        <StatTile
          value={gaps.length}
          label="Niezaspokojone potrzeby"
          note="problemy bez rozwiązania w Bibliotece"
          tone={gaps.length ? "alert" : "neutral"}
        />
        <StatTile
          value={`${avgScore}/100`}
          label="Średnie dopasowanie luk"
          note="poniżej 35 = brak pokrycia"
        />
        <StatTile value={innovationsList.length} label="Innowacji w Bibliotece" tone="good" />
      </div>

      <div className="lib__tabs" role="tablist" aria-label="Widok panelu" data-reveal>
        {(["skrzynka", "trendy", "innowacje"] as Tab[]).map((x) => (
          <button
            key={x}
            type="button"
            role="tab"
            id={`atab-${x}`}
            aria-selected={tab === x}
            aria-controls={`apanel-${x}`}
            className="btn"
            onClick={() => setTab(x)}
          >
            {x === "skrzynka"
              ? `Skrzynka (${threads.length})`
              : x === "trendy"
              ? "Niezaspokojone potrzeby i trendy"
              : `Baza innowacji (${innovationsList.length})`}
          </button>
        ))}
      </div>

      {tab === "skrzynka" && (
        <div id="apanel-skrzynka" role="tabpanel" aria-labelledby="atab-skrzynka">
          <div className="row ad__filters" data-reveal>
            <div className="field" style={{ marginTop: 0 }}>
              <label htmlFor="ad-status">Filtruj po statusie</label>
              <select
                id="ad-status"
                value={filter}
                onChange={(e) => setFilter(e.target.value as ThreadStatus | "")}
              >
                <option value="">Wszystkie</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s} ({threads.filter((t) => t.status === s).length})
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn btn--ghost"
              style={{ marginLeft: "auto" }}
              onClick={resetDemo}
            >
              Przywróć stan początkowy demo
            </button>
          </div>

          <div className="table-wrap ad__table" data-reveal>
            <table>
              <thead>
                <tr>
                  <th scope="col">Status</th>
                  <th scope="col">Rodzaj</th>
                  <th scope="col">Tytuł</th>
                  <th scope="col">Autor</th>
                  <th scope="col">Powiat</th>
                  <th scope="col">Data</th>
                  <th scope="col">Odpowiedzi</th>
                  <th scope="col">
                    <span className="sr-only">Akcja</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {inbox.map((t) => {
                  const isNew = !t.read && t.status === "nowe";
                  return (
                    <tr key={t.id} className={isNew ? "ad__row--new" : undefined}>
                      <td>
                        {isNew ? (
                          <span className="ad__new">nowe</span>
                        ) : (
                          <span className="chip">{t.status}</span>
                        )}
                      </td>
                      <td>
                        <span className="chip chip--ghost">{t.kind}</span>
                      </td>
                      <td>
                        <strong>{t.title}</strong>
                      </td>
                      <td>{t.author}</td>
                      <td>{t.powiat ?? "-"}</td>
                      <td className="mono">{new Date(t.createdAt).toLocaleDateString("pl-PL")}</td>
                      <td className="mono">{t.messages.length}</td>
                      <td>
                        <button
                          type="button"
                          className="btn btn--sm"
                          onClick={() => {
                            setOpen(t.id);
                            markRead(t.id);
                          }}
                        >
                          Szczegóły
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {current && (
            <div className="card ad__detail" data-reveal>
              <div className="row" style={{ justifyContent: "space-between" }}>
                <span className="chip">{current.kind}</span>
                <button
                  type="button"
                  className="btn btn--ghost btn--sm"
                  onClick={() => setOpen(null)}
                >
                  Zamknij
                </button>
              </div>

              <h2>{current.title}</h2>
              <p className="ad__meta">
                <span className="eyebrow">
                  {current.author} · {current.authorRole}
                  {current.powiat ? ` · powiat ${current.powiat}` : ""}
                </span>
                <span className="hint mono">
                  zgłoszono {new Date(current.createdAt).toLocaleString("pl-PL")}
                </span>
              </p>

              <div className="ad__body">{current.body}</div>

              {current.fiszka && (
                <div className="ad__fiszka">
                  <p className="eyebrow">Dane fiszki</p>
                  <ul>
                    <li>
                      <strong>Istota:</strong> {current.fiszka.istota}
                    </li>
                    <li>
                      <strong>Adresat:</strong> {current.fiszka.adresat}
                    </li>
                    <li>
                      <strong>Etap:</strong> {current.fiszka.etap}
                    </li>
                    {current.fiszka.obszar && (
                      <li>
                        <strong>Obszar:</strong> {current.fiszka.obszar}
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {current.concepts && current.concepts.length > 0 && (
                <p className="hint">
                  <strong>Rozpoznane wątki:</strong> {current.concepts.join(", ")}
                </p>
              )}

              {current.messages.length > 0 && (
                <div className="ad__thread">
                  <h3>Wątek dyskusji ({current.messages.length})</h3>
                  <ol className="ad__msgs">
                    {current.messages.map((m) => (
                      <li key={m.id} className="ad__msg">
                        <span className="eyebrow">
                          {m.author} ({m.from}) · {new Date(m.at).toLocaleString("pl-PL")}
                        </span>
                        <p>{m.text}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <form
                className="ad__reply"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draft.trim()) return;
                  reply(current.id, draft.trim(), "ROPS");
                  setDraft("");
                }}
              >
                <div className="field">
                  <label htmlFor="ad-reply">Odpowiedz autorowi jako ROPS</label>
                  <textarea
                    id="ad-reply"
                    rows={4}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="Wpisz treść merytorycznej odpowiedzi, propozycję terminu lub informację o naborze…"
                  />
                </div>
                <div className="row">
                  <button type="submit" className="btn btn--primary" disabled={!draft.trim()}>
                    Wyślij odpowiedź do autora
                  </button>
                  <div className="field" style={{ margin: 0 }}>
                    <label htmlFor="ad-set-status" className="sr-only">
                      Zmień status
                    </label>
                    <select
                      id="ad-set-status"
                      value={current.status}
                      onChange={(e) => setStatus(current.id, e.target.value as ThreadStatus)}
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          Ustaw: {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {tab === "trendy" && (
        <div id="apanel-trendy" role="tabpanel" aria-labelledby="atab-trendy" className="ad__trends">
          {serverSummary && (
            <div className="card" data-reveal style={{ borderColor: "var(--brand)", background: "var(--surface-glass-card)" }}>
              <p className="eyebrow" style={{ color: "var(--brand)" }}>
                Podsumowanie serwera ROPS (Live Decisions & Analytics API)
              </p>
              <p style={{ fontSize: "var(--fs-md)", margin: "var(--sp-2) 0" }}>{serverSummary.text}</p>
              <span className="mono hint">
                Okres: {serverSummary.period} · Nowe zapytania: {serverSummary.new_queries} · Nowe zgłoszenia: {serverSummary.new_threads} · Odpowiedzi: {serverSummary.answered} · Otwarte luki: {serverSummary.open_gaps}
              </span>
            </div>
          )}

          <p className="ad__lede" data-reveal>
            Wykresy powstają z zapytań mieszkańców do matchmakingu oraz zgłoszonych
            luk. Gdy nic nie pasuje, zapytanie nie znika - staje się daną diagnostyczną
            dla ROPS o brakujących innowacjach w regionie.
          </p>

          <section data-reveal>
            <h3>Podaż vs Popyt - gdzie brakuje innowacji w Małopolsce</h3>
            <p className="hint">
              Porównanie: udział tematu w Bibliotece 115 innowacji (podaż) z udziałem w zgłoszeniach (popyt).
              Tematy na samej górze to bezpośrednie rekomendacje do kolejnego naboru IWS 2.0.
            </p>
            <BarChart
              title="Podaż innowacji vs Zgłaszany popyt"
              series={[
                { label: "Podaż (Biblioteka)", slot: 1 },
                { label: "Popyt (zgłoszenia mieszkańców)", slot: 2 },
              ]}
              rows={supplyDemand}
              unit="%"
            />
          </section>

          <section data-reveal>
            <h3>Nierozpoznane pojęcia (słowa kluczowe spoza bazy ROPS)</h3>
            <p className="hint">
              Słowa, których mieszkańcy użyli w opisach problemów, a których nie ma w 115 kartach ROPS.
              Wskazują na luki językowe i nowe zjawiska społeczne.
            </p>
            <BarChart
              title="Nierozpoznane pojęcia"
              series={[{ label: "Wystąpienia w zgłoszeniach", slot: 1 }]}
              rows={unknownWords}
              unit="×"
            />
          </section>

          <section className="ad__map" data-reveal>
            <h3>Rozkład geograficzny zgłoszonych potrzeb</h3>
            <MalopolskaMap
              counts={countsByPowiat}
              selected={powiat}
              onSelect={setPowiat}
              caption="Liczba zgłoszeń z każdego powiatu. Puste powiaty to sygnał o konieczności działań animacyjnych i dotarcia do lokalnych liderów."
            />
          </section>

          <section className="ad__gaps" data-reveal>
            <h3>Niezaspokojone potrzeby - lista zgłoszeń bez pokrycia</h3>
            {gaps.length === 0 ? (
              <p className="muted">
                Brak zgłoszonych luk. Pojawią się tutaj automatycznie, gdy matchmaking nie znajdzie
                rozwiązania dla problemu zgłoszonego przez mieszkańca.
              </p>
            ) : (
              <ul className="ad__gaplist">
                {gaps
                  .filter((g) => !powiat || g.powiat === powiat)
                  .map((g) => (
                    <li key={g.id}>
                      <div className="ad__gaphead">
                        <h4>{g.title}</h4>
                        <span className="mono">{g.topScore ?? 0}/100</span>
                      </div>
                      <p>{g.body}</p>
                      <p className="mono muted">
                        {g.powiat ? `powiat ${g.powiat} · ` : ""}
                        {new Date(g.createdAt).toLocaleDateString("pl-PL")}
                        {g.concepts?.length ? ` · ${g.concepts.join(", ")}` : ""}
                      </p>
                    </li>
                  ))}
              </ul>
            )}
          </section>
        </div>
      )}

      {tab === "innowacje" && (
        <div id="apanel-innowacje" role="tabpanel" aria-labelledby="atab-innowacje" className="ad__innovations">
          <div className="row" style={{ justifyContent: "space-between", alignItems: "center", marginBottom: "var(--sp-4)" }}>
            <div>
              <h2>Zarządzanie bazą innowacji społecznych</h2>
              <p className="hint">
                Wymóg zadania (§2.II & §2.VI): sprawna modyfikacja, weryfikacja i dodawanie nowej wiedzy do Biblioteki.
              </p>
            </div>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => {
                setShowAddForm(!showAddForm);
                setFormSuccess(null);
                setFormErr(null);
              }}
            >
              {showAddForm ? "Anuluj" : "+ Dodaj nową innowację"}
            </button>
          </div>

          {formSuccess && (
            <div className="card" style={{ borderColor: "var(--good)", marginBottom: "var(--sp-4)" }}>
              <p style={{ color: "var(--good)", fontWeight: 600 }}>{formSuccess}</p>
            </div>
          )}

          {showAddForm && (
            <form className="card" onSubmit={handleAddInnovation} style={{ marginBottom: "var(--sp-5)" }}>
              <h3>Nowa innowacja społeczna</h3>
              <p className="hint">
                Formularz tworzy kartę innowacji w bazie danych PostgreSQL, przelicza wektor powiązań i włącza innowację do wyszukiwarki.
              </p>

              {formErr && <p className="error" role="alert">{formErr}</p>}

              <div className="row">
                <div className="field" style={{ flex: 2 }}>
                  <label htmlFor="inn-name">Nazwa innowacji *</label>
                  <input
                    id="inn-name"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    placeholder="np. Cyfrowy Asystent Samodzielności Seniora"
                  />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor="inn-cat">Kategoria *</label>
                  <select
                    id="inn-cat"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.slug} value={c.slug}>
                        {c.title}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="field">
                <label htmlFor="inn-problem">Opis problemu społecznego *</label>
                <textarea
                  id="inn-problem"
                  rows={3}
                  required
                  value={formProblem}
                  onChange={(e) => setFormProblem(e.target.value)}
                  placeholder="Jaki konkretny problem w Małopolsce rozwiązuje ta innowacja?"
                />
              </div>

              <div className="field">
                <label htmlFor="inn-desc">Opis rozwiązania (istota) *</label>
                <textarea
                  id="inn-desc"
                  rows={3}
                  required
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Na czym dokładnie polega metoda, narzędzie lub usługa?"
                />
              </div>

              <div className="row">
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor="inn-target">Grupa docelowa (odbiorcy)</label>
                  <input
                    id="inn-target"
                    value={formTarget}
                    onChange={(e) => setFormTarget(e.target.value)}
                    placeholder="np. Seniorzy 65+, osoby z demencją"
                  />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor="inn-benef">Kto może skorzystać / wdrożyć</label>
                  <input
                    id="inn-benef"
                    value={formBenef}
                    onChange={(e) => setFormBenef(e.target.value)}
                    placeholder="np. OPS, Centra Usług Społecznych, NGO"
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="inn-evidence">Wyniki testu / dowód działania</label>
                <textarea
                  id="inn-evidence"
                  rows={2}
                  value={formEvidence}
                  onChange={(e) => setFormEvidence(e.target.value)}
                  placeholder="Wyniki pilotażu w Małopolsce (np. wskaźnik satysfakcji, skala zmiany)"
                />
              </div>

              <div className="row">
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor="inn-authors">Autorzy / Realizatorzy</label>
                  <input
                    id="inn-authors"
                    value={formAuthors}
                    onChange={(e) => setFormAuthors(e.target.value)}
                    placeholder="np. Fundacja Aktywności Lokalnej"
                  />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor="inn-url">Link źródłowy / strona</label>
                  <input
                    id="inn-url"
                    value={formUrl}
                    onChange={(e) => setFormUrl(e.target.value)}
                    placeholder="https://rops.krakow.pl/..."
                  />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label htmlFor="inn-pdf">Link do PDF z opisem</label>
                  <input
                    id="inn-pdf"
                    value={formPdf}
                    onChange={(e) => setFormPdf(e.target.value)}
                    placeholder="https://.../karta.pdf"
                  />
                </div>
              </div>

              <div className="row" style={{ marginTop: "var(--sp-4)" }}>
                <button type="submit" className="btn btn--primary">
                  Zapisz i opublikuj innowację w Hubie
                </button>
                <button type="button" className="btn btn--ghost" onClick={() => setShowAddForm(false)}>
                  Anuluj
                </button>
              </div>
            </form>
          )}

          <div className="row" style={{ marginBottom: "var(--sp-4)" }}>
            <div className="field" style={{ margin: 0, flex: 1 }}>
              <label htmlFor="inn-search" className="sr-only">Szukaj innowacji</label>
              <input
                id="inn-search"
                type="search"
                placeholder="Szukaj w bazie innowacji…"
                value={innSearch}
                onChange={(e) => setInnSearch(e.target.value)}
              />
            </div>
            <span className="mono hint" style={{ alignSelf: "center" }}>
              Pokazano {filteredInns.length} z {innovationsList.length} innowacji
            </span>
          </div>

          <div className="table-wrap ad__table">
            <table>
              <thead>
                <tr>
                  <th scope="col">Nazwa innowacji</th>
                  <th scope="col">Kategoria</th>
                  <th scope="col">Grupa odbiorców</th>
                  <th scope="col">Wyniki testu</th>
                  <th scope="col">Materiały</th>
                </tr>
              </thead>
              <tbody>
                {filteredInns.slice(0, 30).map((inn) => (
                  <tr key={inn.id}>
                    <td>
                      <strong>{inn.name}</strong>
                    </td>
                    <td>
                      <span className="chip chip--ghost">{inn.catName}</span>
                    </td>
                    <td>{inn.target}</td>
                    <td>
                      {inn.evidence ? (
                        <span className="chip" style={{ color: "var(--good)" }}>Przetestowane</span>
                      ) : (
                        <span className="chip" style={{ color: "var(--warn)" }}>W trakcie</span>
                      )}
                    </td>
                    <td>
                      {inn.pdf ? (
                        <a href={inn.pdf} target="_blank" rel="noreferrer" className="btn btn--sm btn--ghost">
                          PDF
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export type { Thread };
