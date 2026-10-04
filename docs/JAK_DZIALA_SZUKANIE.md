# Jak działa szukanie w HubMI

Ściąga do prezentacji i do pytań jury. Wszystkie liczby pochodzą z uruchomienia
silnika na 115 kartach Biblioteki ROPS — nie są wymyślone na slajd.

Kod, o którym tu mowa:

| Plik | Co robi |
|---|---|
| `app/src/lib/text.ts` | tokenizacja, diakrytyki, stopwords, stemmer |
| `app/src/lib/concepts.ts` | mostek „język potoczny ↔ język ROPS" (wątki) |
| `app/src/lib/match.ts` | BM25 + pokrycie wątków + uzasadnienia (front) |
| `backend/matchmaking/engine.py` | ten sam silnik po stronie backendu — liczy produkcyjnie |
| `backend/catalog/search.py` | warstwa tsvector + pgvector (szukanie poza modułem I) |
| `scripts/build_embeddings.py` | wektory LSA 48D → `app/src/data/vectors.json` |

## 1. Ścieżka jednego zapytania

```
tekst użytkownika („mama mieszka sama na wsi i zapomina")
  │
  ├─ 1. tokenizacja + stemming          text.ts          "wsi" → rdzeń "wsi"
  ├─ 2. rozpoznanie wątków              concepts.ts      "wsi" → wątek „obszary wiejskie"
  ├─ 3. BM25 po 7 polach karty          match.ts         siła leksykalna (lex)
  ├─ 4. pokrycie wątków                 match.ts         coverage 0–1
  ├─ 5. wynik 0–100 + poziom + uzasadnienie + podświetlenia
  ├─ 6. Jev ocenia TOP-N: „czy to w ogóle powiązane"
  └─ 7. zapytanie zapisuje się jako sygnał potrzeby → trendy w panelu ROPS
```

**Najważniejsze zdanie na prezentację:** ranking liczy nasz deterministyczny
silnik, a model AI jest **drugą opinią**, nie sędzią. Dlatego na pytanie
„dlaczego ta karta jest trzecia" mamy odpowiedź inną niż „bo model tak policzył".

## 2. Tokenizacja i stemmer (`text.ts`)

Silnik nie porównuje słów, tylko **rdzenie**. Po kolei:

1. **Diakrytyki w dół** — `niepełnosprawność` → `niepelnosprawnosc`, żeby „samotnosc"
   bez ogonków trafiało tam, gdzie „samotność".
2. **Stopwords do kosza** — `a, aby, jest, nie, moja…`, a na liście są też czasowniki
   ramowe („potrzebuję", „szukam"), bo w każdym zgłoszeniu są i tylko rozmywają wynik.
3. **Zdjęcie jednej końcówki** (najdłuższej pasującej, i tylko gdy zostanie ≥ 4 znaki):

```
mama      → mama        wsi       → wsi
mieszka   → mieszk      zapomina  → zapomin
pogadać   → pogad
```

To **celowo lekki stemmer, nie morfologia**. Zadanie: skleić „niepełnosprawnością"
z „niepełnosprawnościami". Czemu nie Morfologik / spaCy: 115 dokumentów, zero
zależności, działa offline w przeglądarce. Spójność rdzeni między frontem (TS)
a backendem (Python) pilnuje `scripts/check_stemmer.py`.

## 3. Wątki — to jest właściwy pomysł, nie sam BM25 (`concepts.ts`)

Problem, którego BM25 sam nie rozwiąże: mieszkanka pisze „mama mieszka sama na wsi".
Karta ROPS mówi „osoby w podeszłym wieku", „osamotnienie", „obszary wiejskie".
Zero wspólnych słów → zero trafień.

`concepts.ts` to słownik-mostek: etykieta wątku + lista słów potocznych i urzędowych.

```
samotnosc  → sama, samotny, osamotnienie, izolacja, pogadać, nikogo…
senior     → senior, starszy, emeryt, mama, tata, babcia, podeszły…
wies       → wieś, wsi, gmina, sołectwo, peryferie, daleko…
demencja   → demencja, otępienie, alzheimer, zapomina, pamięć, udar…
```

Dla zapytania „mama mieszka sama na wsi i zapomina, nie ma z kim pogadać" silnik
rozpoznaje **4 wątki**: osoby starsze, samotność i izolacja, obszary wiejskie,
demencja i pamięć — i mówi wprost, czego nie zrozumiał (`mieszka`).

Rdzenie z rozpoznanych wątków **dopisują się do zapytania**, ale słabszą wagą:

```
7 rdzeni wpisanych przez człowieka  → waga 1.0
50 rdzeni dociągniętych z wątków    → waga 0.55   (CONCEPT_WEIGHT)
```

Jedno potoczne zdanie staje się 57-rdzeniowym zapytaniem w języku ROPS. 0.55 a nie
1.0, bo rozszerzenie ma pomagać, a nie przegłosować to, co człowiek naprawdę napisał.

## 4. BM25 — ile warte jest jedno trafienie

```
bm25 = idf × [ tf × (K1+1) ] / [ tf + K1 × (1 − B + B × długość_pola / średnia_długość) ]
K1 = 1.2     B = 0.75
```

Trzy intuicje, które trzeba umieć opowiedzieć:

### (a) IDF — rzadkie słowo jest cenne, częste jest bezwartościowe

```
idf = log(1 + (N − n + 0.5) / (n + 0.5))        N = 115 kart, n = w ilu kartach jest rdzeń
```

| rdzeń | w ilu kartach | idf |
|---|---|---|
| `sama` | 1 | **4.35** |
| `wsi` | 3 | **3.50** |
| `mama`, `zapomin`, `pogad` | 0 | 0.08 (podłoga) |
| `innowacj` | ~115 | 0.08 (podłoga) |

Trafienie w „sama" jest warte ~54× więcej niż w „innowacj". Dlatego wyszukiwarka
nie zwraca losowych kart tylko dlatego, że wszystkie mówią „innowacja społeczna".
Podłoga `0.08` istnieje po to, żeby słowo obecne wszędzie nie wyszło na wartość
**ujemną** i nie zaczęło odejmować punktów.

### (b) TF z nasyceniem — 10 powtórzeń nie jest 10× lepsze niż jedno

Licznik `tf × (K1+1)` razem z `tf` w mianowniku daje krzywą, która płaszczeje.
Przy `K1 = 1.2` pierwsze wystąpienie daje dużo, trzecie prawie nic. Karta, która
20 razy powtarza „senior", nie wygrywa z kartą, która faktycznie jest o seniorach.

### (c) Normalizacja długości (B = 0.75) — trafienie w krótkim polu waży więcej

Pole dłuższe od średniej → mianownik rośnie → wynik spada. „senior"
w jednowyrazowej nazwie kategorii to mocny sygnał; to samo słowo w 300-wyrazowym
opisie to przypadek.

### (d) Wagi pól (`FIELDS` w `match.ts`)

```
problem   3.0   ← „jakiego problemu dotyczy" waży najwięcej
target    2.6
desc      2.0
name      1.8
benef     1.5
catName   1.4
evidence  0.9
```

Siła leksykalna karty: `lex = Σ waga_pola × waga_rdzenia × bm25(...)`

Prawdziwa rozbiórka zwycięzcy („BaWita"):

```
problem   waga 3.0 | 17 słów (średnio 19) | podeszl, wiek, otepienn  → +15.45
target    waga 2.6 | 10 słów (średnio 10) | otepienn, udar, wylew    → +16.15
desc      waga 2.0 | 21 słów (średnio 45) | dementywn                →  +5.39
benef     waga 1.5 | 16 słów (średnio 14) | senior                   →  +1.33
catName   waga 1.4 |  1 słowo (średnio 2) | senior                   →  +1.71
evidence  waga 0.9 | 32 słowa (średnio 45)| starsz                   →  +0.77
                                                          lex = 40.80
```

Żadne z tych słów nie było w zapytaniu — wszystkie weszły przez wątki (waga 0.55).
To najlepszy dowód, że mostek pojęciowy robi robotę.

## 5. Pokrycie wątków — waży więcej niż BM25

BM25 mówi „ile słów się zgadza". Pokrycie mówi „czy karta jest **o tym samym**".

```
siła wątku = (najmocniejsze pole, w którym wątek wystąpił) × (0.65 + 0.35 × min(1, tf/3))
```

Moc pola (`CONCEPT_FIELD_STRENGTH`):

```
problem 1.0 | target 0.85 | name 0.7 | desc 0.6 | evidence 0.3 | catName 0.25 | benef 0.15
```

**`benef = 0.15` to najważniejsza liczba w tym pliku.** Pole „kto może skorzystać"
w prawie każdej karcie ma ten sam szablon („urzędy miast i gmin, ośrodki pomocy
społecznej, organizacje pozarządowe"), więc trafienie tam nie mówi nic o temacie.
Zanim to zbiliśmy, „Chlap Pro" (ochrona protezy przed zamoknięciem) wychodził na
**99/100** dla pytania o schody w urzędzie.

`coverage` = średnia sił wątków zapytania:

```
BaWita            starsze 1.0 + demencja 1.0, brak samotności i wsi      → 2.00/4 = 0.500
Mobilne centrum   starsze 1.0 + wieś 0.85 + samotność 0.77, brak demencji → 2.62/4 = 0.654
```

## 6. Wynik końcowy

```
score = round( 100 × (0.65 × coverage + 0.35 × lex / maxLex) )
```

`maxLex` to najwyższa siła leksykalna **w tym zapytaniu** — część leksykalna jest
więc relatywna, nie absolutna. Rachunek na naszym przykładzie:

```
BaWita            0.65×0.500 + 0.35×(40.80/40.80) = 0.325 + 0.350 = 0.675 → 68
Kody QR           0.65×0.500 + 0.35×0.843         = 0.325 + 0.295 = 0.620 → 62
Mobilne centrum   0.65×0.654 + 0.35×0.557         = 0.425 + 0.195 = 0.620 → 62
```

Proporcja **65/35** jest tezą produktu: zgodność tematu bije liczbę powtórzeń słowa.

Korekty na koniec:

```
brak rozpoznanych wątków → score = min(score, 30)   nie udajemy pewności
brak wyników testu       → × 0.88   UNTESTED_PENALTY
karta spoza Małopolski   → × 0.90   EXTERNAL_PENALTY
```

Poziom (`tier`) **nie jest zwykłym progiem punktów**:

```
wysokie  gdy coverage ≥ 0.60 ORAZ score ≥ 55
średnie  gdy score ≥ 35
niskie   reszta
```

Dlatego „Mobilne centrum" z 62 pkt ma poziom **wysokie**, a „Kody QR" z tymi samymi
62 pkt — **średnie**. Punkty mierzą siłę dopasowania, poziom mierzy, czy pokryliśmy
*cały* opisany problem.

## 7. Luka — gdy nic nie pasuje, to też jest wynik

```
GAP_SCORE_THRESHOLD = 35      GAP_COVERAGE_THRESHOLD = 0.25
powody: brak-watkow | brak-trafien | slabe-pokrycie
```

Zgłoszenie idzie wtedy do panelu ROPS jako **niezaspokojona potrzeba**, a słowa,
których nie rozpoznaliśmy, zasilają zestawienie trendów. Pusta lista zamienia się
w informację dla regionu — to feature, nie obsługa błędu.

## 8. Trzy warstwy szukania w bazie — po co każda

Moduł I (dopasowanie problem → innowacja) stoi **wyłącznie** na warstwie 1.
Pozostałe dwie obsługują inne pytania w aplikacji. Komentarz źródłowy:
`backend/catalog/models.py`.

### Warstwa 1 — BM25 + wątki (`matchmaking/engine.py`)

- **Po co:** główny, wytłumaczalny ranking. Dla każdego trafienia wiemy, który wątek
  się zgadza, w którym polu i jakimi słowami — i to pokazujemy użytkownikowi.
- **Gdzie:** `POST /api/match/search/` — moduł I, Kreator (sprawdzenie, czy pomysł
  już istnieje), diagnoza luk.
- **Ograniczenie:** wymaga **wspólnego rdzenia** albo wejścia przez słownik wątków.

### Warstwa 2 — `search_vector`: tsvector + indeks GIN (`catalog/search.py`)

- **Po co:** szybkie szukanie pełnotekstowe po stronie SQL — na liście dokumentów
  i jako wyszukiwanie źródeł do odpowiedzi asystenta. Skaluje się indeksem
  (`catalog_search_gin`), a nie pętlą w Pythonie.
- **Haczyk, który warto znać:** Postgres w tym obrazie **nie ma polskiego stemmera**
  (nie ma konfiguracji `polish`, a kompilatora do dorzucenia słownika też nie).
  Dlatego kolumna trzyma oryginalne słowa (`config="simple"`), a polskie odmiany
  obsługujemy **zapytaniem prefiksowym z naszych rdzeni**:
  `„samotność" → samotn:*` trafia w „samotność", „samotni", „osamotnienie".
  Mamy więc i indeks w SQL, i polskie końcówki, bez żadnej dodatkowej zależności.
- **Gdzie:** `GET /api/search/?mode=text`, źródła do „Zapytaj bazę" (moduł II).
- **Odświeżanie:** sygnał `post_save` przelicza `search_vector` po każdej zmianie
  karty, więc karta dodana w panelu ROPS jest wyszukiwalna natychmiast
  (`backend/catalog/signals.py`).
- **Zapasowe wyjście:** gdy tsvector jest niedostępny, `_stem_search` liczy pokrycie
  rdzeni w Pythonie — wynik gorszy, ale demo nie pada.

### Warstwa 3 — `embedding`: LSA 48D w pgvector (`scripts/build_embeddings.py`)

- **Po co:** **generalizacja bez wspólnego rdzenia.** BM25 nie połączy
  „wytchnieniowy" z „zastępstwo" — nie mają wspólnego korzenia. Rozkład SVD
  na macierzy termy×dokumenty ustawia blisko siebie słowa, które w 115 kartach
  występują w podobnych kontekstach, więc te dwa trafiają w sąsiedztwo.
- **Jak liczone:** macierz term-dokument z tymi samymi wagami pól co BM25 → SVD →
  48 wymiarów, słownik do 2400 rdzeni, `min_df = 2`, kwantyzacja do int8
  (błąd ~0.4%, nieistotny przy cosinusie). Wynik: `app/src/data/vectors.json`,
  ładowany do kolumny `embedding` komendą `load_vectors`.
- **Dlaczego LSA, a nie API modelu:** zero złotówek kosztu zmiennego, działa bez
  internetu, wynik odtwarzalny (ten sam korpus → ten sam wektor). To argument
  w kryterium wdrożeniowym, nie oszczędność na jakości.
- **Gdzie:** `GET /api/innovations/{id}/similar/` („co jeszcze jest blisko tego
  tematu"), `GET /api/search/?mode=vector`, oraz `mode=hybrid`, które bierze
  **maksimum** ze znormalizowanych rankingów warstwy 2 i 3.
- **Zakres:** wektory liczymy **tylko na 115 kartach ROPS**. Wrzucenie tam kilkuset
  kart z baz zewnętrznych (w tym angielskich) zajęłoby miejsce w 2400-rdzeniowym
  słowniku i rozmyło przestrzeń, w której generalizują polskie zapytania modułu
  obowiązkowego. Karty zewnętrzne łapią się przez BM25 i wątki, a `embedding`
  mają `NULL`.
- Karta dodana w panelu ROPS dostaje wektor przy zapisie (ta sama macierz `U`),
  więc jest wyszukiwalna semantycznie od razu.

**Jednym zdaniem:** BM25 odpowiada „dlaczego to pasuje", tsvector „gdzie w tekście
to jest", a LSA „co jest podobne, choć nazwane inaczej".

## 9. Gdzie siedzi Jev

Jev dostaje **już policzone** TOP-N kart i odpowiada na jedno pytanie: czy karta
jest powiązana z opisanym problemem (+ pewność + uzasadnienie). To pokazujemy jako
„Weryfikacja Jev Decisions". Jeśli Jev nie odpowie, wyniki są nadal — bez werdyktu.
Kolejności nie zmienia.

## 10. Pięć pytań, na które trzeba odpowiedzieć bez zastanowienia

**„Czym to się różni od Ctrl+F?"** — Ctrl+F wymaga wspólnego słowa. Tu „mama mieszka
sama na wsi" znajduje kartę mówiącą „osoby w podeszłym wieku, obszary wiejskie,
osamotnienie" — zero wspólnych słów, 4 rozpoznane wątki.

**„Dlaczego nie embeddingi z API / LLM jako ranker?"** — bo wynik musi być
wytłumaczalny i tani. Przy modelu jedyną odpowiedzią na „dlaczego to trafienie"
jest „bo tak policzył". Tutaj widać wątek, pole i konkretne słowa. Zero wywołań
API w rankingu = demo działa bez internetu i bez kosztu zmiennego.

**„To BM25 z Elasticsearcha?"** — ten sam wzór (K1 = 1.2, B = 0.75, standard), ale
liczony per pole z wagami i połączony z warstwą pojęciową. Elastic dałby BM25 bez
mostka potoczny→urzędowy, czyli bez tego, co tu faktycznie działa.

**„Skąd wiecie, że to działa?"** — `node app/scripts/test_match.mjs` przechodzi po
potocznych zapytaniach bez przeglądarki; tak znaleźliśmy „Chlap Pro" na 99/100
i stąd wzięło się zbicie wagi pola `benef` do 0.15.

**„A jak ktoś napisze coś, czego nie znacie?"** — pokazujemy nierozpoznane słowa,
ścinamy wynik do 30 i zgłaszamy lukę do ROPS.

## 11. Słabe punkty — lepiej powiedzieć samemu niż dać się przyłapać

1. **Karty angielskie (ESF+) łapią się słabo** — stemmer i wątki są polskie.
   Dlatego bazy zewnętrzne są domyślnie wyłączone i opisane jako inspiracja.
2. **IDF liczy się po całym indeksie.** Po dołączeniu baz zewnętrznych statystyka
   rzadkości słów powstaje na szerszym zbiorze, a filtr „tylko Małopolska" działa
   dopiero na etapie punktowania. Efekt jest mały; czyste rozwiązanie to osobny
   indeks per tryb.
3. **Słownik wątków jest ręczny.** To zaleta (kontrola, wytłumaczalność) i wada
   (nowy obszar trzeba dopisać). Terminy dobrane pod rzeczywiste słownictwo
   115 kart, nie zgadnięte.
4. **Stemmer zdejmuje jedną końcówkę**, więc skrajne odmiany mogą się rozjechać.
   Świadomy kompromis przy tej wielkości korpusu.

## 12. Jak odtworzyć liczby z tego dokumentu

```bash
node app/scripts/test_match.mjs       # potoczne zapytania na całym zbiorze
node app/scripts/test_external.mjs    # warstwa „spoza Małopolski": filtr i uzasadnienia
```

Rozbiórka pojedynczego zapytania (tabela z pkt. 4) powstała ze skryptu liczącego
`idf`, `tf`, długości pól i `bm25` dokładnie tymi samymi wzorami co `match.ts`.
Jeśli ma być w repo na stałe — do zrobienia jako `app/scripts/explain_match.mjs`.
