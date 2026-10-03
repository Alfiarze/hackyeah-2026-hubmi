# HubMI — checklista zespołu

Lista działań zespołu, pozycja po pozycji, ze stanem w kodzie. Źródłem prawdy
jest `app/src/`, nie `README.md`. Wymogi zadania: `ZADANIE_UMWM_HubMI.md`.
Plan priorytetów i uzasadnienia decyzji: `docs/PLAN.md`.

Legenda: **[x]** zrobione i sprawdzone · **[~]** zrobione inaczej niż w planie
(powód przy pozycji) · **[ ]** zostaje do zrobienia człowiekiem (deploy, submit).

Ostatnia aktualizacja: 2026-10-03.

---

## I. Matchmaking (obowiązkowy)

- [x] Pole „opisz problem" + wejście głosowe — `modules/Matchmaking.tsx`, `lib/useSpeech.ts`
- [x] AI dopytuje o 1–2 brakujące informacje (gmina, kogo dotyczy) — `lib/conversation.ts`
- [x] Wyszukiwanie hybrydowe: pełnotekstowe + wektorowe — `lib/match.ts` (BM25 po 7 polach) + `lib/vectors.ts` (wektory PPMI+SVD liczone offline); pgvector jako ścieżka produkcyjna w `data/sql/`
- [x] 3–5 wyników z % dopasowania i „dlaczego pasuje" — `components/WhyMatch.tsx`
- [x] Gdzie już działa (pinezka na mapie) + kontakt z realizatorem — `components/MalopolskaMap.tsx`, `components/ContactRealizer.tsx`
- [x] Przycisk „Dostosuj do mojej instytucji" → Middleman — `App.tsx: toMiddleman`
- [x] Brak dopasowania → „Dodaj na tablicę pomysłów" — `lib/match.ts: gapReason` → zgłoszenie luki
- [x] Zapis każdego zapytania jako sygnału potrzeby (trendy) — `lib/store.ts: logQuery`

## II. Zasobnik wiedzy

- [x] Katalog innowacji z filtrami (obszar, typ, koszt, typ gminy) — `modules/Library.tsx`; pola `typ`/`koszt`/`gmina` są **wyliczone** przez HubMI z treści kart (ROPS ich nie publikuje) i tak opisane w interfejsie
- [x] Karta innowacji: opis, film, realizator, efekty, wymagania — `components/InnovationCard.tsx`
- [x] Mapa Wyzwań Małopolski — dwie rzeczy pod jedną nazwą: dokument ROPS („Mapa Wyzwań Społecznych", zał. 2 do naboru IWS 2.0) wyróżniony w Bibliotece **oraz** klikalna mapa 22 jednostek
- [~] Mapa na Leaflet — zrobione własnym SVG z GeoJSON GUS (`components/MalopolskaMap.tsx`). Powód: zero zależności, obsługa klawiaturą i tabelaryczny odpowiednik, których Leaflet nie daje bez obejść
- [x] Materiały edukacyjne + Canwy do pobrania — sekcja „Materiały do pobrania" w Bibliotece, Canwa też w Kreatorze
- [x] Pytania do bazy ze źródłami — `lib/answers.ts`: odpowiedź złożona z fragmentów 76 dokumentów i 115 kart, każdy z linkiem do źródła

## III. Kreator pomysłów

- [x] Fiszka w 4 krokach: problem, istota, adresat, etap — `modules/Creator.tsx`
- [x] Asystent AI rozwijający pomysł — `modules/Creator.tsx`, sprawdza też, czy pomysł już jest w Bibliotece
- [x] Generator wniosku grantowego pod wybrany nabór + eksport PDF — `lib/grant.ts`, dwa nabory, eksport przez `window.print()`
- [x] Wizualizacja pomysłu obrazkiem — `lib/poster.ts`: generowany plakat SVG do pobrania
- [x] Po zapisie → kolejka admina — `lib/store.ts: addThread`

## IV. Tester → Tablica pomysłów

- [x] Publiczna tablica fiszek — `modules/Tester.tsx`, karta „Tablica pomysłów"
- [x] Walidacja: „Mam ten problem" / „Chcę testować" / „Mogę pomóc" — `lib/store.ts: vote`
- [x] Ocena i feedback istniejących innowacji — `modules/Tester.tsx`, ocena 1–5 z wymaganym komentarzem
- [x] Komentarze + streszczenie dyskusji — `lib/digest.ts`
- [x] Statusy: zgłoszony → walidowany → w testach → wdrożony — `lib/store.ts: Stage`

## V. Komunikacja

- [x] Szybkie pytanie do ROPS — `modules/Comms.tsx`
- [x] „Poproś eksperta" + plakietka eksperta — `modules/Comms.tsx`
- [x] „Szukam partnera" (JST ↔ NGO) — `modules/Comms.tsx`, karta ogłoszeń partnerskich
- [x] Powiadomienia w aplikacji (dzwoneczek) — `components/Bell.tsx`
- [x] Opcjonalnie e-mail — podgląd kolejki wysyłki w panelu admina (treść maila, odbiorca, moment); wysyłka wymaga backendu i jest opisana w kosztorysie

## VI. Panel admina

- [x] Kolejka zgłoszeń: akceptuj / odrzuć / odpowiedz — `modules/Admin.tsx`
- [x] Dodawanie i edycja innowacji (auto-embedding) — `modules/Admin.tsx`, karta „Baza wiedzy”; wektor liczony przy zapisie, karta od razu wyszukiwalna
- [x] Trendy: wykres potrzeb, mapa zgłoszeń, luki bez rozwiązań — `modules/Admin.tsx`, karta „Trendy"
- [x] Podsumowanie tygodnia — `lib/digest.ts: weekSummary`, liczone ze zgłoszeń
- [x] Role: mieszkaniec/NGO, JST, ekspert, admin — `components/Shell.tsx`

## VII. Middleman

- [x] Profil instytucji (typ, wielkość, budżet, kadra) — `modules/Middleman.tsx`
- [x] Karta wdrożenia od AI: usługa, zasoby, koszt, harmonogram, ryzyka — `lib/middleman.ts`
- [x] Eksport do PDF — `window.print()` z arkuszem `@media print`

## Dostępność (WCAG 2.1 AA)

- [x] Kontrast min. 4.5:1 — najsłabsza para tekstowa 4.75:1, policzone skryptem (`DESIGN.md`)
- [x] Pełna obsługa klawiaturą + widoczny focus
- [x] Aria, etykiety pól, alt dla obrazów, napisy do filmów — filmy są linkowane do YouTube (napisy po stronie ROPS), co jest opisane przy przycisku
- [x] Przełącznik: duża czcionka / wysoki kontrast / prosty język — `lib/a11y.tsx`, prosty język działa na wszystkich widokach
- [x] Audyt axe ze zrzutem do prezentacji — `npm run audit`, wynik w `app/src/data/audit.json` i w module „Dostępność"

## Dane i technika

- [x] Dataset innowacji z materiałów ROPS (bez danych osobowych) — 115 kart, 76 dokumentów, `data/README.md`
- [x] 8–10 przykładowych pomysłów z dyskusją do demo — seed w `lib/store.ts`
- [x] 1–2 przykładowe nabory grantowe — IWS 2.0 i nabór tematyczny, `lib/grant.ts`
- [x] Embeddingi liczone z góry — `scripts/build_embeddings.py`
- [x] Postgres + pgvector — `data/sql/schema.sql` i `data/sql/seed_innovations.sql`: tabela z `vector(64)`, indeks GIN na `tsvector` (`polish`), gotowe zapytanie hybrydowe. Prototyp liczy to samo w przeglądarce, żeby demo działało offline i bez kosztu zmiennego
- [ ] Deploy demo pod publicznym linkiem — `dist/` jest gotowe (`base: "./"`), wymaga Waszego konta na hostingu
- [x] Repo z README i listą bibliotek — `README.md`, `app/package.json`

## Zgłoszenie

- [x] Nazwa i opis rozwiązania — `README.md`, `docs/PREZENTACJA.md`
- [x] Makiety UX/UI — działający prototyp + 13 zrzutów w `docs/screenshots/`
- [x] Treść prezentacji (10 slajdów, PL) — `docs/PREZENTACJA.md`
- [ ] Prezentacja jako PDF **lub** film do 3 min — treść gotowa, do złożenia w narzędziu prezentacyjnym
- [x] Kosztorys utrzymania + potrzebne zasoby — `README.md`
- [x] Zrzuty ekranu — `docs/screenshots/`
- [ ] Link do demo i repo — po deployu
- [x] Scenariusz demo z jedną personą przez pełną ścieżkę — `docs/DEMO.md` (sołtyska Hanna)
- [ ] Wysłanie przez HackTribe przed terminem

## Wymogi zadania, których nie było na pierwotnej liście

- [x] Bezpieczeństwo danych — sekcja w `README.md`: brak danych osobowych, stan lokalny, ścieżka RODO przy wdrożeniu
- [x] Automatyczne powiadomienia o zmianach w naborach — `lib/store.ts`, kanał „nabory" w dzwonku
- [x] Skalowalność i integracje jako treść zgłoszenia — slajd 10 w `docs/PREZENTACJA.md`
- [x] Jawne wejście dla każdej z 4 grup odbiorców — karta „Dla kogo jest HubMI" na starcie matchmakingu

---

## Zostają trzy rzeczy — wszystkie wymagają Waszych rąk

1. **Deploy** — `cd app && npm run build`, potem `dist/` na Cloudflare Pages / Netlify (wymaga zalogowania na Wasze konto).
2. **Prezentacja PDF albo film** — treść 10 slajdów jest w `docs/PREZENTACJA.md`.
3. **Submit w HackTribe** — z linkiem do demo i repo.
