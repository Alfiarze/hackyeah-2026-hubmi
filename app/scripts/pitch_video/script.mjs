/**
 * Scenariusz filmu pitchowego (2:30-3:00) - jedno źródło prawdy dla całego
 * pipeline'u: `tts.mjs` czyta z niego zdania, `record.mjs` kręci sceny
 * zsynchronizowane z lektorem, `build.mjs` skleja.
 *
 * Zasada: narracja jest nadrzędna. Każde zdanie dostaje własny plik audio,
 * zmierzoną długość i własny napis na ekranie; akcje w aplikacji są przypinane
 * do początków zdań (`at(i)`), więc obraz nie rozjedzie się z głosem niezależnie
 * od tego, jak szybko odpowie backend.
 */

export const VOICE = process.env.PITCH_VOICE ?? "pl-PL-ZofiaNeural";
export const RATE = process.env.PITCH_RATE ?? "+8%";

/** Przerwa po zdaniu i dodatkowy ogon na końcu sceny (sekundy). */
export const GAP = 0.3;
export const SCENE_TAIL = 0.5;

/** Kadr nagrania. 1440x810 (16:9), skalowane w montażu do 1080p - przy
 *  nagrywaniu wprost w 1920 tekst aplikacji robi się za drobny na rzutniku. */
export const SIZE = { width: 1440, height: 810 };
export const BASE = process.env.PITCH_URL ?? "http://localhost:5173";

/** Zapytanie demo - potoczne, dokładnie takie, jakiego rejestr nie rozumie. */
export const QUERY = "boimy się, że mama z demencją wyjdzie z domu i nie wróci";

const kpi = (v, l) => `<div class="pv-kpi"><b>${v}</b><span>${l}</span></div>`;

export const SCENES = [
  // ---------------------------------------------------------------- intro --
  {
    id: "01-intro",
    kind: "card",
    lines: [
      "HubMI — Małopolski Hub Innowacji Społecznych.",
      "Opisz problem zwykłym językiem. Pokażemy, co już zadziałało.",
    ],
    card: `
      <p class="pv-eyebrow pv-rv" data-at="0">HackYeah 2026 · Województwo Małopolskie / ROPS Kraków</p>
      <h1 class="pv-rv" data-at="0">HubMI</h1>
      <p class="pv-sub pv-rv" data-at="0">Małopolski Hub Innowacji Społecznych</p>
      <p class="pv-lead pv-rv" data-at="1">Opisz problem. <mark>Pokażemy, co już zadziałało.</mark></p>
      <div class="pv-kpis pv-rv" data-at="1">
        ${kpi("7/7", "modułów zadania")}
        ${kpi("115", "innowacji z testem")}
        ${kpi("0", "naruszeń WCAG")}
      </div>`,
  },

  // -------------------------------------------------------------- problem --
  {
    id: "02-problem",
    kind: "card",
    lines: [
      "Regionalny Ośrodek Polityki Społecznej przez dekadę przetestował sto piętnaście innowacji społecznych i opisał, co zadziałało.",
      "Tylko że ta wiedza leży w PDF-ach. Córka wpisuje: boimy się, że mama wyjdzie z domu i nie wróci. Rejestr ma: izolacja społeczna na obszarach peryferyjnych. Zero trafień.",
      "Nie brakuje innowacji. Brakuje warstwy, która łączy język człowieka z językiem instytucji.",
    ],
    card: `
      <p class="pv-eyebrow pv-rv" data-at="0">Problem</p>
      <h2 class="pv-rv" data-at="0">Wiedza jest. Nikt do niej nie trafia.</h2>
      <div class="pv-split">
        <div class="pv-quote pv-rv" data-at="1">
          <span class="pv-tag">człowiek</span>
          <p>„boimy się, że mama wyjdzie z domu i&nbsp;nie wróci”</p>
        </div>
        <div class="pv-quote pv-quote--cold pv-rv" data-at="1">
          <span class="pv-tag">rejestr</span>
          <p>„izolacja społeczna na obszarach peryferyjnych”</p>
        </div>
      </div>
      <p class="pv-zero pv-rv" data-at="1">= 0 trafień</p>
      <p class="pv-lead pv-rv" data-at="2">Brakuje warstwy, która <mark>łączy język człowieka z językiem instytucji</mark>.</p>`,
  },

  // -------------------------------------------------- moduł I: matchmaking --
  {
    id: "03-matchmaking",
    kind: "app",
    lines: [
      "Moduł pierwszy, obowiązkowy: matchmaking. Mieszkanka pisze własnymi słowami albo dyktuje głosem.",
      "Asystent dopytuje najwyżej dwa razy — o gminę, nie o życiorys.",
      "System rozpoznaje wątki: osoby starsze, demencja i pamięć — i zestawia zgłoszenie z bazą przetestowanych innowacji. Sześć trafień w trzy sekundy.",
    ],
  },

  // ------------------------------------------------------- dlaczego pasuje --
  {
    id: "04-dlaczego",
    kind: "app",
    lines: [
      "Każde trafienie jest rozliczone — zamiast liczby z czarnej skrzynki.",
      "Jest cytat z pola „czy to działa” i podświetlone słowa karty, które uruchomiły dopasowanie.",
      "Niżej: które wątki karta pokrywa, w którym polu się zgadza i werdykt modelu obok. Karta bez wyników testu dostaje niższy wynik i jest to napisane wprost.",
    ],
  },

  // ------------------------------------------------------------------ mapa --
  {
    id: "05-mapa",
    kind: "app",
    lines: [
      "Mapa pokazuje, gdzie już to wdrożono, i daje kontakt do realizatora. Dla czytników ekranu jest równoważna tabela.",
    ],
  },

  // ------------------------------------------------- moduł VII: middleman --
  {
    id: "06-middleman",
    kind: "app",
    lines: [
      "Moduł siódmy, Middleman: bierze innowację i profil instytucji — typ, liczbę mieszkańców, budżet, obsadę.",
      "Zwraca kroki wdrożenia z kosztem pilotażu, ryzyka i wymogi formalne. To dokument, z którym wójt wchodzi na sesję rady gminy.",
    ],
  },

  // ------------------------------------------------------- panel ROPS / AI --
  {
    id: "07-admin",
    kind: "app",
    lines: [
      "Gdy nic nie pasuje, luka nie jest błędem — staje się diagnozą regionu.",
      "Zgłoszenia bez pokrycia i słowa, których silnik nie rozpoznał, trafiają do panelu ROPS jako żywe zestawienie niezaspokojonych potrzeb.",
      "Nikt nie wypełnia dodatkowej ankiety — analityka powstaje z samych zapytań.",
    ],
  },

  // ------------------------------------------------------------ dostępność --
  {
    id: "08-dostepnosc",
    kind: "app",
    lines: [
      "Dostępność nie jest dopiskiem: baza osiemnaście pikseli, przełącznik do dwudziestu siedmiu, wysoki kontrast, pełna obsługa klawiaturą.",
      "Zero naruszeń WCAG w audycie axe na ośmiu widokach.",
    ],
  },

  // ---------------------------------------------------------------- silnik --
  {
    id: "09-silnik",
    kind: "card",
    lines: [
      "Ranking liczy nasz kod: BM25 po siedmiu polach karty plus mostek pojęciowy. Wynik jest deterministyczny i wytłumaczalny.",
      "Model decyzyjny odpowiada w trzysta milisekund i tylko dopisuje werdykt obok — nie generuje prozy, więc nie ma w czym halucynować.",
      "Cały stos to trzy kontenery na jednym komputerze GB10 w serwerowni ROPS.",
    ],
    card: `
      <p class="pv-eyebrow pv-rv" data-at="0">Jak to dowozimy</p>
      <h2 class="pv-rv" data-at="0">Model decyzyjny, nie generatywny</h2>
      <div class="pv-split">
        <div class="pv-box pv-rv" data-at="0">
          <h3>Ranking liczy nasz kod</h3>
          <p>BM25 po 7 polach karty + mostek pojęciowy z 22 wątkami. Ten sam opis zawsze daje ten sam wynik — i da się pokazać dlaczego.</p>
        </div>
        <div class="pv-box pv-rv" data-at="1">
          <h3>AI dopisuje werdykt obok</h3>
          <p>~300 ms, bez generowania prozy. Gdy model milczy, ranking i uzasadnienia zostają te same.</p>
        </div>
      </div>
      <div class="pv-arch pv-rv" data-at="2">
        <span class="pv-arch-box">Przeglądarka<small>React + Vite</small></span>
        <span class="pv-arch-arrow">&rarr;</span>
        <span class="pv-arch-box">Django REST<small>7 modułów pod /api/</small></span>
        <span class="pv-arch-arrow">&rarr;</span>
        <span class="pv-arch-box">Silnik rankingu<small>BM25 + 22 wątki</small></span>
        <span class="pv-arch-arrow">&rarr;</span>
        <span class="pv-arch-box pv-arch-box--ai">Kev — lokalnie<small>werdykt obok rankingu</small></span>
      </div>
      <p class="pv-note pv-rv" data-at="2">PostgreSQL 17 + pgvector · 3 kontenery Docker Compose · jeden komputer GB10 w serwerowni ROPS — poza tę ramkę nie wychodzi ani jedno zapytanie mieszkanki.</p>`,
  },

  // ----------------------------------------------------------------- outro --
  {
    id: "10-outro",
    kind: "card",
    lines: [
      "Wdrożenie: trzydzieści tysięcy złotych, czwarta część jednego grantu. Utrzymanie: około sześćdziesięciu trzech tysięcy rocznie.",
      "Siedem z siedmiu modułów zadania, sto piętnaście innowacji z udokumentowanym testem, zero naruszeń dostępności.",
      "HubMI. Opisz problem — pokażemy, co już zadziałało.",
    ],
    card: `
      <p class="pv-eyebrow pv-rv" data-at="0">Business case</p>
      <div class="pv-kpis pv-kpis--wide pv-rv" data-at="0">
        ${kpi("30 tys. zł", "wdrożenie — ćwierć jednego grantu")}
        ${kpi("~63 tys. zł", "utrzymanie rocznie, z ludźmi")}
        ${kpi("~950 zł", "sama infrastruktura / rok")}
      </div>
      <div class="pv-kpis pv-rv" data-at="1">
        ${kpi("7/7", "modułów zadania")}
        ${kpi("115", "innowacji z testem")}
        ${kpi("0", "naruszeń WCAG")}
      </div>
      <p class="pv-wordmark pv-rv" data-at="2">HubMI</p>
      <p class="pv-lead pv-end pv-rv" data-at="2">Opisz problem. <mark>Pokażemy, co już zadziałało.</mark></p>`,
  },
];
