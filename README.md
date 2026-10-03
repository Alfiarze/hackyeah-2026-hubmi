# HubMI — Małopolski Hub Innowacji Społecznych

Prototyp na **HackYeah 2026**, zadanie Województwa Małopolskiego, realizator **ROPS Kraków**.
Treść zadania: [`ZADANIE_UMWM_HubMI.md`](ZADANIE_UMWM_HubMI.md).

> **Opisz problem. Pokażemy, co już zadziałało.**
>
> Mieszkanka albo urzędnik opisuje problem zwykłym językiem — albo dyktuje go głosem.
> HubMI dopasowuje przetestowane innowacje społeczne z Biblioteki ROPS, pokazuje
> **dlaczego** każda z nich pasuje, wskazuje na mapie, gdzie podobny problem już
> rozwiązano, i łączy z realizatorem. A kiedy nic nie pasuje — zgłoszenie staje się
> zadaniem dla Hubu, nie pustą listą.

---

## Co to robi

Wszystkie **7 modułów** z zadania, w tym obowiązkowy matchmaking.

| # | Moduł | Co działa |
|---|---|---|
| **I** | **Matchmaking społeczny** (obowiązkowy) | Rozmowa zamiast formularza: opis potoczny lub dyktowanie głosem, asystent dopytuje najwyżej 2 razy, dopasowanie do 115 przetestowanych innowacji z rozliczeniem „dlaczego to pasuje" |
| II | Zasobnik wiedzy | 115 innowacji (26 z filmem) + 76 dokumentów ROPS: raporty, diagnozy, Mapa Wyzwań Społecznych, wzory wniosków. Filtrowanie od pierwszej litery |
| III | Kreator pomysłów | Fiszka (4 pola) · asystent sprawdzający nowość w Bibliotece · generator wniosku grantowego wg realnego formularza ROPS · Canwa Innowacji Społecznych |
| IV | Tester innowacji | Zgłoszenie do testów i ocena 1–5 z wymaganym komentarzem |
| V | Platforma komunikacji | Wątki ROPS ↔ użytkownik, wskaźnik „nowa odpowiedź" |
| VI | Panel administratora | Skrzynka z powiadomieniami, odpowiedzi, **zestawienie niezaspokojonych potrzeb i trendów** |
| VII | Middleman Innowacji | Przerabia innowację na usługę konkretnej instytucji: koszt przy jej skali, obsada, kroki, ryzyka, wymogi formalne |

### Pięć rzeczy, które wyróżniają to rozwiązanie

**1. „Dlaczego to pasuje" zamiast samej liczby.** Każde trafienie pokazuje, ile wątków
pokrywa (i których **nie** pokrywa), w którym polu karty się zgadza i jakie konkretnie
słowa to uruchomiły — podświetlone w tekście. Jury nie musi wierzyć w trafność, widzi ją.

**2. Brak dopasowania to dane, nie błąd.** Gdy nic nie pasuje, zgłoszenie trafia do
adminowego zestawienia „niezaspokojone potrzeby i trendy". Słowa, których silnik nie
rozpoznał, tworzą listę pojęć, których Bibliotece brakuje. Moduł analityczny powstaje
z samych zgłoszeń — nikt nie wypełnia dodatkowej ankiety.

**3. Mapa na prawdziwej geometrii.** 22 jednostki (19 powiatów + 3 miasta na prawach
powiatu), wycięte z danych GUS-owych i uproszczone do 10% punktów. Klikalna,
dostępna z klawiatury, z tabelarycznym odpowiednikiem. Przycisk „skontaktuj się
z realizatorem" buduje realne partnerstwa międzysektorowe.

**4. Zamknięta pętla na żywo.** Zgłoś pomysł → przełącz rolę na „pracownik ROPS" →
zobacz powiadomienie w panelu → odpowiedz → wróć i zobacz odpowiedź jako autorka.
Cała ścieżka działa w demo, bez serwera.

**5. Dostępność z dowodem.** Przełączniki „prosty język / duża czcionka / wysoki
kontrast" i **0 naruszeń axe-core** na wszystkich 8 widokach, powtarzalne jedną komendą.

---

## Demo

```bash
cd app
npm install
npm run dev          # http://localhost:5173
```

Wersja produkcyjna:

```bash
npm run build && npm run preview   # http://localhost:4173
```

`dist/` to statyczne pliki (872 KB, w tym fonty) — można je wrzucić na dowolny
hosting bez konfiguracji przekierowań. Ścieżki są względne (`base: "./"`).

### Weryfikacja

```bash
npm run audit        # axe-core na 8 widokach (wymaga działającego preview)
npm run test:match   # silnik dopasowania na 7 potocznych zapytaniach
npm run typecheck
```

Zrzuty ekranu: [`docs/screenshots/`](docs/screenshots/) — 13 sztuk, w tym wysoki
kontrast, bardzo duża czcionka i widok mobilny.

---

## Jak działa matchmaking

**Bez wywołań API i bez embeddingów.** To świadomy wybór, nie ograniczenie:

- **Wynik musi być wytłumaczalny.** Jury pyta wprost, czy narzędzie skutecznie sugeruje
  innowacje na podstawie opisu potrzeb. Przy embeddingach jedyną odpowiedzią jest
  „bo model tak policzył". Tu dla każdego trafienia widać rozpoznany wątek, pole karty
  i konkretne słowa.
- **Demo działa bez internetu** — na sali hackathonowej i w gminie ze słabym łączem.
- **Zero kosztu zmiennego** (zob. kalkulacja niżej).

Silnik: **BM25 po 7 polach karty** + **mostek pojęciowy** z 22 wątkami tematycznymi,
który tłumaczy język potoczny na język Biblioteki ROPS. Bez niego zapytanie „mama
mieszka sama na wsi i nie ma z kim pogadać" nie znajdzie niczego — ROPS nazywa to
„osamotnieniem", „izolacją społeczną" i „obszarami wiejskimi".

Wynik = **65% ważone pokrycie wątków + 35% siła leksykalna**. Pokrycie jest ważone:
wzmianka rzucona raz w słabym polu liczy się ułamkowo, nie jako pełne trafienie.

Trzy decyzje, które wyszły z testów na realnych danych:

- Pole „kto może skorzystać" waży **0.15**, bo w prawie każdej karcie zawiera tę samą
  szablonową listę instytucji. Bez tego zbicia ochrona protez przed zamoknięciem
  wychodziła na 99/100 dla pytania o schody w urzędzie.
- Wątek „ograniczona mobilność" jest **rozdzielony** od „barier architektonicznych",
  i nie zawiera słowa „niepełnosprawność" — występuje ono w 101 ze 115 kart, więc
  jako wyzwalacz jest bezwartościowe.
- Karta **bez opisanych wyników testu** (4 ze 115) dostaje mnożnik 0.88, a powód jest
  wypisany w uzasadnieniu. Obietnica modułu brzmi „pokażemy, co już zadziałało".

Gdy **żaden wątek nie zostanie rozpoznany**, wynik jest twardo ścinany i zgłoszenie
staje się luką — pytanie spoza domeny polityki społecznej nie może dostać wyniku
wyglądającego na trafienie.

---

## Dane

115 innowacji i 76 dokumentów pobranych ze stron publicznych ROPS — szczegóły
i licencje w [`data/README.md`](data/README.md). Kierunek wizualny z policzonymi
kontrastami: [`DESIGN.md`](DESIGN.md).

**Czego prototyp NIE udaje.** Zadanie zabrania używania prawdziwych danych osobowych
i danych wrażliwych z materiałów ROPS. W związku z tym:

- **Lokalizacje wdrożeń na mapie są danymi demo** — ROPS nie publikuje, gdzie która
  innowacja była wdrażana. Granice powiatów są prawdziwe, rozmieszczenie wygenerowane
  deterministycznie z charakteru innowacji. Jest to napisane wprost pod każdą mapą.
- **Kontakty realizatorów są fikcyjne** (domena `example.org`, instytucje opisowe,
  zero nazwisk).
- **Zgłoszenia w panelu** to dane demonstracyjne.

Jedyne prawdziwe dane osobowe w zbiorze to nazwiska autorów innowacji, **jawnie
publikowane** przez ROPS w Bibliotece. Nie są eksponowane w interfejsie poza pełną
kartą innowacji.

---

## Koszt utrzymania i niezbędne zasoby

### Wariant A — prototyp w obecnej postaci (statyczny)

Aplikacja nie ma backendu: dane są statyczne, stan użytkownika siedzi w `localStorage`.

| Pozycja | Koszt roczny |
|---|---|
| Hosting statyczny (Netlify / Cloudflare Pages, plan darmowy wystarcza do ~100 GB transferu) | **0 zł** |
| Domena `.pl` | ~**80 zł** |
| Certyfikat SSL (Let's Encrypt) | 0 zł |
| Odświeżenie danych z ROPS (skrypty w repo, ~15 min pracy kwartalnie) | ~**400 zł** |
| **Razem** | **~500 zł / rok** |

Ten wariant obsługuje dowolną liczbę jednoczesnych czytelników — statyczne pliki
skalują się przez CDN. Nie obsługuje natomiast realnych zgłoszeń.

### Wariant B — wdrożenie produkcyjne dla całego województwa

Potrzebne, żeby zgłoszenia, wątki i panel administratora działały naprawdę.

| Pozycja | Koszt roczny |
|---|---|
| Hosting aplikacji (kontener 1 vCPU / 2 GB albo funkcje bezserwerowe) | ~**1 200 zł** |
| Baza PostgreSQL (zarządzana, 20 GB, z kopiami zapasowymi) | ~**2 400 zł** |
| Magazyn plików na załączniki (S3-kompatybilny, 100 GB) | ~**600 zł** |
| Domena, SSL, monitoring (Uptime + Sentry, plany podstawowe) | ~**900 zł** |
| Poczta transakcyjna (powiadomienia o nowych zgłoszeniach, ~50 tys. maili) | ~**600 zł** |
| Kopie zapasowe i retencja | ~**400 zł** |
| **Infrastruktura razem** | **~6 100 zł / rok** |

**Zasoby ludzkie** (największa pozycja, jak przy każdym systemie publicznym):

| Rola | Wymiar | Koszt roczny |
|---|---|---|
| Koordynator treści w ROPS — obsługa skrzynki, aktualizacja Biblioteki | 0,25 etatu | ~**30 000 zł** |
| Utrzymanie techniczne — aktualizacje zależności, poprawki, drobny rozwój | ~8 h/mies. | ~**19 000 zł** |
| Audyt dostępności z użytkownikami (raz w roku) | — | ~**8 000 zł** |
| **Razem rocznie (infrastruktura + ludzie)** | | **~63 000 zł** |

**Koszt wdrożenia jednorazowo** (dopisanie backendu, uwierzytelnianie, migracja
danych, testy): **~80 000–120 000 zł**, czyli w granicach jednego grantu z naboru ROPS.

### Dlaczego to jest tanie

- **Zero kosztu zmiennego za AI.** Silnik dopasowania działa w przeglądarce. Przy
  rozwiązaniu opartym na API modelu językowego 50 tys. zapytań rocznie to dodatkowe
  kilka–kilkanaście tysięcy złotych i zależność od dostawcy.
- **Brak licencji** — cały stos jest otwarty (React, Vite, fonty na licencji OFL).
- **Statyczny front skaluje się przez CDN**, więc szczyt zainteresowania przy naborze
  grantowym nie wymaga dokładania mocy.

### Gotowość na integracje

Warstwa danych jest odizolowana (`app/src/lib/store.ts`): podmiana `localStorage` na
wywołania API nie dotyka reszty aplikacji. Skrypty w `scripts/` odświeżają dane z ROPS
automatycznie, więc integracja z bazą grantową albo systemem Hubu to dopisanie
kolejnego źródła, nie przepisanie aplikacji.

---

## Dostępność — WCAG 2.1 AA

**0 naruszeń axe-core** (reguły `wcag2a`, `wcag2aa`, `wcag21a`, `wcag21aa`) na
wszystkich 8 widokach, włącznie z widokiem wyników, mapą i wykresami. Wynik jest
wyświetlany w samej aplikacji (moduł „Dostępność") i generowany z pliku, żeby liczby
nie rozjechały się z rzeczywistością.

Konkrety poza automatem:

- **Baza 18px**, nie 16px — grupa docelowa to m.in. seniorzy. Przełącznik podnosi do 27px.
- **Paleta policzona skryptem.** Najsłabsza para tekstowa: 4.75:1. Tryb wysokiego
  kontrastu: 21:1.
- **Kolor nigdy nie jest jedynym nośnikiem** informacji — dochodzi słowo, ikona, belka
  albo tekstura (druga seria na wykresach ma ukośne kreskowanie).
- **Mapa ma tabelaryczny odpowiednik**, powiaty są osiągalne tabulatorem.
- **Mikrofon jest dodatkiem, nie jedyną drogą** — zawsze obok jest pole tekstowe.
- **Brak przewijania w poziomie** przy 390 / 768 / 1280 px.

**Uczciwie:** axe-core wyłapuje ok. jednej trzeciej problemów z dostępnością. Zero
naruszeń znaczy „bez błędów wykrywalnych automatycznie", nie „dostępne". Czy senior
zrozumie treść i czy kolejność focusu ma sens — tego nie sprawdzi żaden skrypt.
Test z użytkownikami jest pierwszą rzeczą do zrobienia po hackathonie.

---

## Struktura repo

```
app/                      aplikacja (React 18 + TypeScript + Vite, bez frameworka CSS)
  src/lib/                silnik dopasowania, mostek pojęciowy, stan, Middleman, wnioski
  src/components/         fiszka, mapa, wykresy, pieczątka dowodu, okno modalne
  src/modules/            7 modułów zadania + strona dostępności
  scripts/                audyt axe, zrzuty ekranu, test silnika
data/                     pobrane dane ROPS + opis (raw/ jest w .gitignore)
scripts/                  scrapery ROPS i budowanie danych aplikacji
docs/screenshots/         13 zrzutów ekranu
DESIGN.md                 kierunek wizualny z policzonymi kontrastami
CLAUDE.md                 reguły pracy nad tym repo
```

## Stos

React 18 · TypeScript · Vite 6 · zero zależności runtime poza Reactem.
Fonty self-hostowane (Bricolage Grotesque, IBM Plex Sans/Mono) z subsetem
`latin-ext` — polskie diakrytyki są wymogiem funkcjonalnym, nie detalem.
