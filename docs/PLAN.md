# Plan domknięcia HubMI — audyt pokrycia + kolejka zadań

Stan na 2026-10-03, ~16:00. Zestawienie trzech rzeczy: wymogów zadania
(`ZADANIE_UMWM_HubMI.md`), listy działań zespołu, i **kodu, który faktycznie
jest w `app/`**. Źródło prawdy o stanie to kod, nie `README.md`.

---

## 1. Wniosek w trzech zdaniach

1. **Moduły: pokrywamy 100%** — wszystkie 7 z zadania ma działający widok, więc
   kryterium 40% jest wysycone po stronie *liczby* modułów (10% + 6×5%). Dalsze
   punkty w tym kryterium idą już tylko z **jakości działania**, nie z nowych funkcji.
2. **Nasza własna lista: pokrywamy ~65%** — 24 pozycje z checklisty nie istnieją
   w kodzie. Większość z nich nie jest wymogiem zadania (sami je sobie dopisaliśmy).
3. **Wymogi formalne zgłoszenia: pokrywamy ~40%** — brakuje publicznego linku do
   demo, prezentacji i commita. To jedyne miejsce, gdzie brak = zero punktów,
   nie „mniej punktów". **Tu zaczynamy.**

---

## 2. Czego zadanie wymaga, a nasza lista o tym nie mówi

| Wymóg z zadania | Gdzie | Stan |
|---|---|---|
| **Bezpieczeństwo danych** (element wymagany #4) | §3 | brak w ogóle — ani w kodzie, ani w materiałach. Potrzebna 1 sekcja: brak danych osobowych, stan w `localStorage`, ścieżka do RODO przy wdrożeniu |
| **Automatyczne powiadomienia o zmianach w naborach** | §5 | mamy powiadomienia o zgłoszeniach, nie o naborach |
| **Skalowalność i integracje jako treść zgłoszenia** | §3, §5 | jest w `README.md`, nie ma na slajdzie |
| **Jawna ścieżka wejścia dla każdej z 4 grup** | §3 | aplikacja startuje od razu w matchmakingu; JST / ekspert / ROPS nie mają „wejścia dla siebie" |

---

## 3. Nasza lista vs. kod — co nie istnieje

### 3a. Wymóg zadania, a nie mamy — to prawdziwe dziury

| Pozycja | Zadanie mówi | Stan w kodzie |
|---|---|---|
| **Admin: dodawanie i edycja innowacji** | §2.II „sprawna i szybka aktualizacja danych"; §2.VI „szybka modyfikacja, weryfikacja i udostępnianie wiedzy" | **zero.** `Admin.tsx` ma tylko skrzynkę i trendy, dane są statycznym JSON-em. Największa rozbieżność z treścią zadania |
| **Prosty język** | §3 „bez barier użytkowych — seniorzy" | przełącznik istnieje (`a11y.tsx: simpleLanguage`), ale `t()` jest użyte **w 1 miejscu** w całej aplikacji (`Matchmaking.tsx`). Obiecujemy w UI coś, co nie działa — to dziś minus, nie plus |

### 3b. Nasza inwencja, nie ma w kodzie — opcje, nie długi

| Pozycja | Stan | Rekomendacja |
|---|---|---|
| Tablica pomysłów: publiczne fiszki, „Mam ten problem / Chcę testować / Mogę pomóc" | brak. `Tester.tsx` ma tylko ocenę 1–5 i zgłoszenie do testów | **najmocniejszy pojedynczy ruch na „pomysłowość"**, ale ~3 h. Tylko po zamknięciu Tier 0 i 1 |
| Komentarze + AI streszczenie dyskusji | brak | pochodna tablicy; razem albo wcale |
| Statusy: zgłoszony → walidowany → w testach → wdrożony | mamy inne (`nowe / w trakcie / odpowiedziane / zamknięte` — to statusy wątku, nie cyklu życia innowacji) | przy tablicy |
| „Szukam partnera" (JST ↔ NGO) | brak (`grep partner` → 0 trafień w UI) | ~1 h, domyka moduł V, tanie |
| „Poproś eksperta" + plakietka eksperta | ekspert jest tylko rolą w `<select>`; brak przycisku i plakietki | ~45 min, razem z partnerem |
| Pytania do bazy (RAG ze źródłami) | brak | bez API zrobimy wyszukiwanie ekstrakcyjne po 76 dokumentach z cytatem i linkiem. Uczciwie nazwać „wyszukiwanie w dokumentach", nie „RAG" |
| Filtry: **koszt**, **typ gminy** | brak — i **dataset ich nie ma**. 115 kart ROPS nie zawiera ani kosztu, ani typu gminy | **wykreślić.** Doliczanie heurystyką = konfabulacja na danych instytucji publicznej. Zamiast tego filtr „ma opisane wyniki testu" (mamy: 111/115) |
| Wizualizacja pomysłu obrazkiem | brak | wykreślić — wymaga API obrazowego, a demo ma działać offline |
| AI-podsumowanie tygodnia (admin) | brak | 30 min jako szablon liczony z wątków, bez modelu. Niski priorytet |
| 1–2 nabory grantowe | mamy **1** (IWS 2.0, odwzorowany z realnego formularza) | drugi nabór = +30 min, pokazuje, że generator jest parametryzowany. Opcja |
| 8–10 pomysłów z dyskusją do demo | mamy **4** wątki seed (2 luki, 1 pomysł, 1 pytanie) | dobić do 8. Jury pyta wprost o ścieżkę „powiadomienie → odpowiedź" |

### 3c. Rozstrzygnięcia techniczne — zmiana planu, nie dług

| Pozycja z listy | Decyzja | Dlaczego |
|---|---|---|
| **Postgres + pgvector, embeddingi z góry** | **nie robimy** | silnik to BM25 po 7 polach + mostek pojęciowy (22 wątki): działa offline, jest wytłumaczalny, 0 zł kosztu zmiennego. Jury pyta „czy trafnie sugeruje" — przy embeddingach odpowiedź brzmi „bo model tak policzył", u nas widać wątek, pole karty i podświetlone słowa. **Ryzyko:** jury może szukać „AI" po słowie-kluczu. Mitygacja: na slajdzie nazwać to wprost i pokazać pgvector jako krok skalowania, nie brak |
| **Mapa: Leaflet + GeoJSON** | **już zrobione inaczej** | `MalopolskaMap.tsx` to własny SVG z uproszczonego GeoJSON GUS (22 jednostki, 10% punktów). Dostępny z klawiatury, z tabelą, zero zależności. Leaflet wykreślić |
| **Mapa Wyzwań Małopolski** | uwaga na pomylenie pojęć | u ROPS „Mapa Wyzwań Społecznych" to **PDF** (zał. 2 do naboru IWS 2.0), nie mapa geograficzna. Mamy go w `resources.json`. Do zrobienia: wypiąć na wierzch Biblioteki jako pozycję wyróżnioną |
| Eksport PDF | **zrobione** przez `window.print()` w Kreatorze i Middlemanie | do sprawdzenia: arkusz `@media print` |

---

## 4. Kolejka zadań

Zakładam submit **do 4.10 rano**, dwie osoby. Jeśli zostaje mniej czasu — ciąć od dołu.

### Tier 0 — bez tego zgłoszenie nie istnieje (~3 h, osoba B)

| # | Zadanie | Czas | Uwaga |
|---|---|---|---|
| 1 | **`git add -A` + commit** | 10 min | całe repo jest dziś nieskomitowane, 1 commit w historii. Laureat ma **obowiązek przekazać kod i wykaz bibliotek** (§8) |
| 2 | **Deploy publiczny** `dist/` → Cloudflare Pages / Netlify | 30 min | `base: "./"` już ustawione, statyk bez przekierowań. **Link do demo jest wymaganym elementem zgłoszenia** (§4) |
| 3 | **Prezentacja PDF, max 10 slajdów, PL** | 2 h | szkielet w §5 |
| 4 | Submit w HackTribe | 20 min | nie zostawiać na ostatnią godzinę |

### Tier 1 — wymogi zadania nieodrobione (~4 h, osoba A)

| # | Zadanie | Czas | Punktuje w |
|---|---|---|---|
| 5 | **Admin: formularz dodania i edycji innowacji** (nowa karta w panelu, zapis do `store`, od razu widoczna w Bibliotece i w wyszukiwaniu) | 2 h | 40% — jawny wymóg §2.II i §2.VI |
| 6 | **Prosty język w całej aplikacji** — `t()` na nagłówkach i lede 8 widoków | 1,5 h | 20% dostępność |
| 7 | **Seed do 8 wątków** + scenariusz demo jednej persony (sołtyska: problem → wyniki → luka → panel ROPS → odpowiedź) | 45 min | 20% + pytania walidacyjne §6 |
| 8 | Sekcja „bezpieczeństwo danych" w README i na slajdzie | 20 min | element wymagany #4 |

### Tier 2 — opłacalne po zamknięciu Tier 0 i 1

| # | Zadanie | Czas |
|---|---|---|
| 9 | „Szukam partnera" + „Poproś eksperta" + plakietka — domknięcie modułu V | 1,5 h |
| 10 | Mapa Wyzwań Społecznych wypięta na wierzch Biblioteki | 30 min |
| 11 | Wyszukiwanie w dokumentach z cytatem i źródłem | 1,5 h |
| 12 | Tablica pomysłów z walidacją społeczną | 3 h |
| 13 | Drugi nabór w generatorze wniosku | 30 min |

### Nie robimy

Leaflet · pgvector · filtry koszt/typ gminy · wizualizacja obrazkiem · powiadomienia e-mail.

---

## 5. Szkielet prezentacji (10 slajdów)

1. Nazwa i jedno zdanie: *„Opisz problem. Pokażemy, co już zadziałało."*
2. Luka: mikro-rozwiązania są, brakuje warstwy łączącej (cytat z zadania §1)
3. Matchmaking na żywo — zapytanie potoczne → 3 trafienia
4. **„Dlaczego to pasuje"** — rozliczenie wątków, podświetlone słowa
5. Brak dopasowania = dane. Luka → trendy admina
6. Mapa: gdzie już zadziałało, plus kontakt z realizatorem
7. Pozostałe 5 modułów, po jednym zdaniu i zrzucie
8. Dostępność: 0 naruszeń axe na 8 widokach, baza 18px, 3 przełączniki, uczciwe „axe łapie 1/3"
9. Koszt: ~500 zł/rok statycznie, ~63 tys. zł/rok produkcyjnie, 0 zł kosztu zmiennego za AI
10. Gotowość: odizolowana warstwa danych, skrypty odświeżania, ścieżka do pgvector

---

## 6. Ryzyka

| Ryzyko | Co z tym |
|---|---|
| Repo nieskomitowane, 1 commit w historii | Tier 0 #1, **teraz** |
| Brak publicznego demo | Tier 0 #2 — bez tego §4 niespełniony |
| „Brak AI" w odbiorze jury | slajd 4 pokazuje wytłumaczalność jako przewagę, nie brak |
| `README.md` twierdzi rzeczy niesprawdzone ponownie (872 KB `dist/`, 13 zrzutów, 0 naruszeń) | przed submitem jeden przebieg: `npm run build && npm run audit && npm run test:match` |
| Przełącznik „prosty język" działa w 1 miejscu | Tier 1 #6 — dziś to obietnica bez pokrycia |
