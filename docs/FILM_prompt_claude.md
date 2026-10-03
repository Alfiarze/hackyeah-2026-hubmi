# PROMPT DO CLAUDE → higgsfield.ai/skills (produkcja wideo)

> Jak użyć: wklej całość (od „# ROLA" do końca) do Claude razem z ewentualnymi
> screenshotami z `docs/screenshots/`. Claude ma wygenerować assets/scenopis
> produkcyjny pod higgsfield. Ustawienia bazowe filmu: MP4, 1920×1080, ≤2:50, PL.
> Scenariusz źródłowy: `docs/FILM_scenariusz.md` (dołącz go, jeśli Claude nie ma
> dostępu do repo).

---

# ROLA

Jesteś doświadczonym reżyserem motion-designu i producentem filmów produktowych
(tech / public sector). Przygotuj kompletny pakiet produkcyjny 2-minutowego,
50-sekundowego filmu prezentującego platformę **HubMI.pl** na konkurs
hackathonowy (HackYeah 2026, zadanie Województwa Małopolskiego / ROPS Kraków).
Film będzie renderowany narzędziami AI video (typu Higgsfield) z mockupów UI
i plansz typograficznych — NAGRYWAMY TYLKO MATERIAL PLANSZ I ANIMACJI MOCKUPÓW,
nie prawdziwe demo na żywo.

# PRODUKT (kontekst merytoryczny)

HubMI.pl — „cyfrowe serce" Małopolskiego Hubu Innowacji Społecznych.
Platforma łączy 115 zweryfikowanych innowacji społecznych ROPS Kraków
(111 z udokumentowanymi wynikami testów) z mieszkańcami, samorządami (JST)
i NGO. Kluczowa funkcja: **matchmaking społeczny** — użytkownik opisuje problem
potocznym językiem („Mama ma początki demencji, mieszka sama na wsi i boimy się,
że wyjdzie z domu"), a silnik BM25 + mostek pojęciowy (22 wątki domenowe) dopasowuje
karty innowacji w ~300 ms. Model decyzyjny Jev AI zwraca werdykt z pewnością
(np. 88%) — system pokazuje **dlaczego** wynik pasuje (podświetlone słowa,
wątki, cytat „Czy to działa?"). Gdy nic nie pasuje, zapytanie zasila panel trendów
ROPS (luki usług). 7 modułów łącznie. WCAG 2.1 AA: 0 błędów axe, kontrast do 21:1,
przełączniki prosty język / wysoki kontrast / większy tekst. Cały stos (PostgreSQL
17 + pgvector, Django REST, React) mieści się na jednym komputerze klasy GB10
w serwerowni instytucji — dane nie opuszczają regionu. Koszt utrzymania:
~950 zł/rok infrastruktury.

# IDENTYFIKACJA WIZUALNA (twarda spójność z prezentacją)

- Tło: `#0A0A0B` (głęboka czerń), karty: `#16161A` z obrysami `#26262C`
- Akcent: złoty `#E3B341` (złoto Małopolski), tekst główny `#FAFAF9`, tekst
  pomocniczy `#A1A1AA` / `#D1D5DB`
- Typografia: geometryczny sans (Inter / Segoe UI klasa), nagłówki 800,
  pismo od -0.02em; na planszach max 2 krój i 2 kolory
- Styl: premium public-sector tech — spokojny, ciemny, złote akcenty, dużo
  oddechu; ZERO stockowych uśmiechniętych twarzy, ZERO klimatu startupowego
  confetti, ZERO 3D-blobs
- Ludzie w filmie wyłącznie jako sylwetki/ilustracje bez twarzy (historia córki
  i mamy jest fikcją ilustracyjną)

# ZADANIE 1 — STORYBOARD (7 klatek kluczowych)

Wygeneruj specyfikację 7 klatek 1920×1080 (PNG), każda z opisem kompozycji,
typografii i ruchu (który element, dokąd, w jakim czasie). Klatki odpowiadają
scenom:

1. **0:00–0:18 Hook** — ciemny ekran, wyszukiwarka wpisuje „izolacja społeczna
   na obszarach peryferyjnych" → „0 wyników"; plansza: „115 innowacji.
   76 publikacji. I zero odpowiedzi."
2. **0:18–0:50 Matchmaking** — mockup UI HubMI, pole tekstowe, wpis zdania
   o mamie (potoczny język), spinner ~0,3 s, karty wyników z etykietami wątków
   (osoby starsze / demencja / wieś)
3. **0:50–1:20 Dlaczego to pasuje** — rozwinięta karta: podświetlone słowa
   wyzwalacze, cytat z pola „Czy to działa?", werdykt „88% pewności"
4. **1:20–1:45 Mapa + Middleman** — mapa SVG Małopolski (22 jednostki,
   złote pinezki), klik powiat → kontakt realizatora; przejście do kosztorysu
   wdrożenia dla gminy
5. **1:45–2:05 Luka → trendy** — zapytanie „hodowla pstrąga w stawie" → wynik
   „30/100 · LUKA" → przycisk „Zgłoś jako potrzebę" → panel trendów ROPS
   z rosnącym wykresem
6. **2:05–2:25 7 modułów + WCAG** — siatka 7 kart modułów (7/7 podświetlone),
   potem trzy przełączniki dostępności i licznik „0 błędów axe"
7. **2:25–2:50 Domknięcie** — jedna sylwetka urządzenia (mini-PC) w ciemnej
   serwerowni, licznik „~950 zł / rok", plansza końcowa: „Opisz problem.
   Pokażemy, co już zadziałało." + HubMI.pl

# ZADANIE 2 — PROMPTY RENDEROWE DLA HIGGSFIELD

Dla każdej z 7 klatek napisz samodzielny prompt EN (modele video lepiej rozumieją
EN; teksty NA PLANSZACH zostają po polsku, wprost oznaczone) z parametrami:
`camera` (statyczna lub minimalny push-in ≤5%), `motion` (co się animuje),
`duration` (sceny wyżej), `style` (dark premium tech, gold accent #E3B341),
`aspect 16:9, 1080p`. Dodaj negative prompt: no faces, no hands typing close-ups,
no stock smiles, no confetti, no lens flares, no camera shake.

# ZADANIE 3 — LEKTOR PL (skrypt nagraniowy)

Rozpisz pełny skrypt lektorski PL scena po scenie (docelowo ~340–360 słów
łącznie, spokojne tempo ~130 słów/min), z pauzami [0,5 s] i akcentami.
Ton: rzeczowy, ciepły, pewny — jak dobry prezenter wiadomości publicznych,
nie salesman. Zaznacz miejsca, gdzie liczba musi być wypowiedziana dokładnie
(~300 milisekund, 88%, 115, 76, 111, 22, ~950 złotych rocznie).

# ZADANIE 4 — NAPISY

Wygeneruj plik SRT (PL) zsynchronizowany z timeline'em (kadencja ≤2 linie,
≤42 znaki/linię) + zalecenia czytelności (min 28 px @1080p, kontrast ≥7:1,
tło półprzezroczyste #0A0A0B pod tekstem).

# ZADANIE 5 — PLAN MONTAŻU

Lista cięć z timekodami (scena, start, koniec, przejście ≤0,4 s), rekomendacja
tempa montażu do lektora, muzyka: ambient/cinematic minimal (lista 3 referencji
stylu bez konkretów licencyjnych), poz. dźwiękowe UI (delikatny tick klawiatury,
subtelny whoosh przejścia). Podaj końcową checklistę QA filmu (długość ≤2:50,
MP4 H.264+AAC 1080p, PL everywhere, liczby zgodne z regułami poniżej).

# ZASADY MERYTORYCZNE (twarde, łamanie = odrzucenie)

1. Nigdy nie twierdz, że 300 ms zmierzono na lokalnym sprzęcie — 300 ms to
   odpowiedź modelu Jev przez API.
2. Nie mów, że platforma „działa na GB10 w X ms" — tylko „cały stos uruchamia
   się na jednym komputerze klasy GB10".
3. Pinezki na mapie = rozmieszczenie demonstracyjne (granice prawdziwe). Nie
   nazywaj ich realnymi wdrożeniami.
4. Historia mamy/córki = fikcja ilustracyjna; zero prawdziwych danych osobowych.
5. Używaj wyłącznie tych liczb: 115 kart / 76 publikacji / 111 z wynikami testu /
   22 wątki i 22 jednostki mapy / 7 modułów / ~300 ms / pewność 88% (przykład) /
   30/100 luka (przykład) / 0 błędów axe / 18→27 px / 21:1 / $0,042 za 1M tokenów /
   ~950 zł rocznie / IWS do 120 000 zł.

# FORMAT ODPOWIEDZI

Zwróć wszystko jako jeden dokument markdown w kolejności: STORYBOARD → PROMPTY
HIGGSFIELD (7×) → SKRYPT LEKTORA PL → NAPISY SRT → PLAN MONTAŻU + QA CHECKLIST.
Bez wstępów i dygresji.
