# FILM — scenariusz (MP4, max 3:00, PL)

> Cel: film do zgłoszenia HackTribe (RULES §4.9: film **MP4 ≤3 min** jest OBOWIĄZKOWY,
> obok PDF-a). Język polski. Story bazuje na `docs/prezentacja.md` + `docs/PITCH_5MIN.md`.
> Produkcja: Claude + higgsfield.ai/skills (prompt: `docs/FILM_prompt_claude.md`).

## Spec techniczny

- **Format:** MP4 (H.264 + AAC), **1920×1080, 16:9**, 25/30 fps
- **Długość:** ≤ **2:50** (celowo 10 s bufora przed limitem 3:00)
- **Lektor:** PL (TTS lub człowiek), tempo spokojne, zrozumiałe dla seniora
- **Napisy PL:** tak (plik SRT + wypalone w obrazie) — spójne z naszym przekazem WCAG
- **Styl:** ciemne tło `#0A0A0B`, akcent złoty `#E3B341`, tekst `#FAFAF9`
  (identycznie jak prezentacja — spójna identyfikacja), typografia bezszeryfowa,
  duże napisy (min. 28 px przy 1080p), wysoki kontrast w kaście

## Timeline (2:50)

### Scena 1 · 0:00–0:18 · Hook: problem
- **Obraz:** ciemny ekran; wpisanie w zwykłą wyszukiwarkę: *„izolacja społeczna na
  obszarach peryferyjnych"* → **0 wyników**. Cięcie: córka z telefonem (stylizowana
  ilustracja/aktor w sylwetce, bez twarzy — unikamy stockowych twarzy).
- **Tekst na ekranie:** „115 innowacji. 76 publikacji. I zero odpowiedzi."
- **Lektor:** „ROPS Kraków przetestował przez dekadę 115 innowacji społecznych.
  W 111 na 115 kartach jest zapisane, co zadziałało. Ale ta wiedza leży w PDF-ach.
  Córka, której mama ma początki demencji i mieszka sama na wsi, nie wpisze
  »izolacji społecznej na obszarach peryferyjnych«."

### Scena 2 · 0:18–0:50 · Matchmaking: jej język
- **Obraz:** UI HubMI (stylizowany mockup 1:1 z aplikacji), pole tekstowe;
  wpisywanie: *„Mama ma początki demencji, mieszka sama na wsi i boimy się,
  że wyjdzie z domu."* → kręcący się wskaźnik ~0,3 s → wyniki.
- **Tekst:** „Opisz problem własnymi słowami."
- **Lektor:** „HubMI przyjmuje jej język. Bez urzędowych haseł. W 300 milisekund
  silnik BM25 z mostkiem pojęciowym rozpoznaje wątki: osoby starsze, demencja,
  wieś — i dopasowuje karty innowacji, które już przeszły testy w Małopolsce."

### Scena 3 · 0:50–1:20 · „Dlaczego to pasuje" (wytłumaczalność)
- **Obraz:** rozwinięcie karty wyniku: podświetlone słowa-wyzwalacze, rozpoznane
  wątki, cytat z pola „Czy to działa?", werdykt z pewnością **88%**.
- **Lektor:** „Nie dajemy liczby z czarnej skrzynki. Pokazujemy, dlaczego to pasuje:
  rozpoznane wątki, konkretne słowa, które uruchomiły regułę, i cytat z realnego
  testu. Model decyzyjny Jev ocenia kandydatów i podaje pewność — nie generuje
  zmyślonej prozy."
- **Tekst:** „Nie czarna skrzynka. Rozliczenie kryteriów."

### Scena 4 · 1:20–1:45 · Mapa: od pomysłu do partnerstwa
- **Obraz:** mapa SVG Małopolski, 22 jednostki; klik w powiat → kontakt
  z realizatorem; przejście na kosztorys Middlemana (kroki wdrożenia, ryzyka).
- **Lektor:** „Gdzie podobny problem już rozwiązano? 22 jednostki Małopolski na
  prawdziwej geometrii — i jeden przycisk do realizatora. A Middleman przelicza
  innowację na usługę konkretnej gminy: koszt, obsada, kroki. Dokument, z którym
  wójt wejdzie na sesję Rady."

### Scena 5 · 1:45–2:05 · Luka → trendy (pstrąg)
- **Obraz:** zapytanie o pstrągi → wynik ścięty do 30/100 („LUKA") → przycisk
  „Zgłoś jako potrzebę" → panel ROPS: rosnące trendy, lista pojęć, których baza
  nie zna.
- **Lektor:** „A gdy nic nie pasuje — nie dostajemy pustej strony. Nie pasujące
  zapytania budują panel trendów. Im częściej system nie znajduje odpowiedzi,
  tym lepiej wie, czego region naprawdę potrzebuje. Moduł analityczny powstaje
  z samych zapytań."

### Scena 6 · 2:05–2:25 · Ekosystem 7 modułów + WCAG
- **Obraz:** szybki rzut kartami modułów (7/7), potem przełączniki dostępności:
  prosty język / wysoki kontrast 21:1 / tekst +25%; licznik „0 błędów axe".
- **Lektor:** „Siedem modułów z zadania — wszystkie działają. Dostępność to
  fundament, nie dodatek: baza 18 pikseli, prosty język, wysoki kontrast, zero
  naruszeń axe na wszystkich widokach."

### Scena 7 · 2:25–2:50 · Koszty, GB10, domknięcie
- **Obraz:** jedna skrzynka (mini-PC/GB10) w serwerowni; licznik kosztów:
  „~950 zł / rok"; plansza: pilotaż → 3 gminy; logo/CTA.
- **Lektor:** „Cały stos — Postgres z pgvector, Django, React — mieści się na
  jednym komputerze wielkości pudełka po butach. Dane Małopolski nie muszą
  opuszczać Małopolski. Utrzymanie: rzędu tysiąca złotych rocznie, bo nie
  karmimy GPU. Zaczynamy od pilotażu w trzech gminach. **Opisz problem.
  Pokażemy, co już zadziałało.**"
- **Karta końcowa:** HubMI.pl · HackYeah 2026 · repo: github.com/Alfiarze/hackyeah-2026-hubmi

## Zasady merytoryczne (NIE łamać w materiale)

1. **~300 ms** = czas odpowiedzi Jev przez API — mówimy „odpowiedź w ~300 ms",
   nie „działa na GB10 w 300 ms".
2. **GB10** = „cały stos uruchamia się na jednym komputerze klasy GB10" — bez
   benchmarków, których nie robiliśmy.
3. **Mapa** — rozmieszczenie innowacji demonstracyjne (prawdziwe granice);
   w filmie nie twierdzimy, że pinezki to realne wdrożenia.
4. **Brak prawdziwych danych osobowych / wrażliwych.** Historia córki = fikcja
   ilustracyjna.
5. Liczby tylko ze ściągki: 115/76/111, 22, 7/7, ~300 ms, $0,042/1M tok.,
   ~950 zł/rok, 0 błędów axe, 18→27 px, 21:1.

## Produkcja — checklist

- [ ] Storyboard: 7 klatek kluczowych (sceny wyżej) — PNG 1920×1080
- [ ] Lektor: TTS PL (np. higgsfield/głos) LUB człowiek; czytamy z timeline
- [ ] Animacje: mockupy UI jako motion (zoom/pan/przejścia) — NIE kręcimy
      prawdziwego demo na żywo (bez ryzyka wpadki)
- [ ] Napisy: SRT + burned-in, test czytelności na 1080p z 2 m
- [ ] Montaż: cięcia w rytm lektora, transitions ≤0,4 s, bez latania kamery
      bez sensu
- [ ] QA: długość ≤2:50, PL w całym materiale, liczby zgodne ze ściągą,
      MP4 H.264 1080p, plik < 500 MB
- [ ] Upload: HackTribe + (opcjonalnie) YouTube unlisted do linku w zgłoszeniu
