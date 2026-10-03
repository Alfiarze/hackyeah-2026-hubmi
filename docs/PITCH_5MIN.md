# HubMI — pitch 5 minut (skrypt mówiony)

> **Jedno zdanie, jeśli masz tylko 10 sekund:**
> *HubMI zamienia potoczny opis problemu w listę innowacji, które już zadziałały w Małopolsce — z pokazanym „dlaczego to pasuje”, z realizatorem na mapie i z gotowym kosztorysem dla gminy. Całość działa na jednym komputerze GB10 w serwerowni ROPS.*

Legenda: **[MÓW]** — tekst do powiedzenia. **[RÓB]** — co klikasz. ⏱ — budżet czasu.

---

## ⏱ 0:00–0:40 · Hook i problem (40 s)

**[MÓW]**
„ROPS Kraków przez dekadę przetestował **115 innowacji społecznych** i wydał **76 publikacji**. To wiedza kupiona za publiczne pieniądze i sprawdzona na ludziach — w **111 ze 115** kart jest wprost napisane, co zadziałało i jak.

Problem: ta wiedza leży w PDF-ach. Córka, której mama ma początki demencji i mieszka sama na wsi, nie wpisze w wyszukiwarkę *„izolacja społeczna na obszarach peryferyjnych”*. Wpisze: *„boimy się, że wyjdzie z domu i nie wróci”*. I dostanie **zero wyników**.

Dokładnie to samo dzieje się z wójtem. Sąsiednia gmina rozwiązała jego problem dwa lata temu — on o tym nie wie. Więc pisze wniosek o grant na coś, co już zostało sfinansowane i sprawdzone.

**Nie brakuje innowacji. Brakuje warstwy, która łączy język człowieka z językiem instytucji.**”

---

## ⏱ 0:40–2:20 · Demo na żywo — rdzeń wartości (100 s)

**[RÓB]** Moduł I, wpisz (albo wklej z buforu) zdanie:
> „Mama ma początki demencji, mieszka sama na wsi i boimy się, że wyjdzie z domu.”

**[MÓW]** (podczas liczenia)
„Zwykły język. Albo dyktowanie głosem — bo nasza użytkowniczka to często senior albo opiekun w stresie.”

**[RÓB]** Pokaż wyniki → rozwiń **„Dlaczego to pasuje”**.

**[MÓW]**
„I tu jest cała różnica. Nie dajemy liczby z czarnej skrzynki. Pokazujemy rozliczenie:
— **jakie wątki rozpoznaliśmy** — osoby starsze, demencja, obszar wiejski — i **których nie pokrywamy**;
— **konkretne słowa**, które uruchomiły regułę, podświetlone w tekście karty;
— i **cytat z pola „czy to działa”** — czyli realny wynik testu w Małopolsce.

Jury nie musi mi wierzyć, że dopasowanie jest trafne. **Widzi, dlaczego.**”

**[RÓB]** Mapa → klik powiat → „skontaktuj się z realizatorem”.

**[MÓW]**
„Dalej: 22 jednostki Małopolski na prawdziwej geometrii. Gdzie podobny problem już rozwiązano — i jeden przycisk do realizatora. To jest moment, w którym powstaje partnerstwo międzysektorowe, a nie kolejny raport.”

**[RÓB]** Middleman → pokaż kosztorys.

**[MÓW]**
„A dla wójta najważniejszy moduł: **Middleman**. Bierze innowację i przelicza ją na usługę **jego** gminy — koszt przy jego skali, obsada, kroki wdrożenia, ryzyka, wymogi formalne. Czyli dokument, z którym można wejść na sesję Rady Gminy.”

---

## ⏱ 2:20–2:50 · Pętla: brak wyniku to dane, nie błąd (30 s)

**[MÓW]**
„Teraz rzecz, której nie ma nigdzie indziej. Kiedy **nic nie pasuje**, my nie pokazujemy pustej strony. Nie dopasowujemy też na siłę — wynik jest twardo ścinany.

Zgłoszenie trafia do panelu ROPS, do zestawienia **niezaspokojonych potrzeb i trendów**. Słowa, których silnik nie rozpoznał, tworzą listę pojęć, których Bibliotece **brakuje**.

Czyli: **im częściej system nie znajduje odpowiedzi, tym lepiej wie, czego region naprawdę potrzebuje** — i tym trafniejszy jest następny nabór grantowy. Moduł analityczny powstaje z samych zapytań. Nikt nie wypełnia dodatkowej ankiety.”

---

## ⏱ 2:50–3:50 · Jev + GB10 — dlaczego to jest szybkie, tanie i suwerenne (60 s)

**[MÓW]**
„Minuta o technologii, bo tu podjęliśmy dwie nieoczywiste decyzje.

**Pierwsza: Jev zamiast dużego modelu generatywnego.** Jev to model **decyzyjny**, nie gaduła. Dostaje treść i zestaw pytań typowanych — tak/nie, wybór z listy, ocena po rubryce — i w **jednej równoległej passie** zwraca odpowiedzi z kalibrowaną pewnością w **~300 ms**, w praktyce 70–500. Konsekwencje są trzy:
— **nie halucynuje prozy**, bo nie generuje prozy — zwraca werdykt i pewność;
— interfejs odpowiada **w czasie rozmowy**, nie po trzech sekundach mrugających kropek;
— koszt zmienny jest **śmiesznie mały** — rzędu **$0,042 za milion tokenów**, czyli dziesiątki złotych rocznie, nie dziesiątki tysięcy.

Fallback jest wbudowany: **żaden endpoint nie wywala się, gdy AI nie odpowie.** Brak klucza, brak sieci, limit — pole z werdyktem przychodzi puste, a **ranking i uzasadnienia zostają te same**, bo liczy je nasz kod, nie model. To nie jest przypadek, to zasada zapisana w kodzie.

**Druga: całość mieści się na jednym komputerze klasy GB10.**”

**[RÓB]** (jeśli masz mini-PC na stole — połóż na nim dłoń)

**[MÓW]**
„Stos to Docker: PostgreSQL 17 z pgvector, Django REST, front statyczny. Żadnej farmy GPU. To znaczy, że HubMI uruchamia się **w serwerowni ROPS, na sprzęcie wielkości pudełka po butach** — 128 GB pamięci zunifikowanej, rzędu petaflopa w FP4, zasilanie z gniazdka, cena przyzwoitej stacji roboczej.

I to jest argument instytucjonalny, nie tylko techniczny: **dane mieszkańców Małopolski nie muszą wyjeżdżać z Małopolski.** Na takim sprzęcie da się dowieźć także model lokalnie — ta sama aplikacja, zero ruchu na zewnątrz, pełna kontrola instytucji nad danymi wrażliwymi. Zaczynamy od API, bo jest tanie i szybkie; **przejście na on-premise to zmiana jednej zmiennej środowiskowej**, nie przepisanie systemu.”

---

## ⏱ 3:50–4:30 · Wartość — po jednym zdaniu na interesariusza (40 s)

**[MÓW]**
„Co z tego ma kto:

— **Mieszkanka**: opisuje trudność po swojemu — dostaje rozwiązania, które **już komuś pomogły**, i instytucję, do której może zadzwonić.
— **Wójt i OPS**: dostają wdrożenie policzone na swojej skali, zamiast inspiracji w PDF-ie.
— **Innowator**: w minutę sprawdza, czy jego pomysł jest **nowy**, i generuje wniosek pod realny formularz naboru IWS — do 120 tysięcy złotych.
— **ROPS**: ma **żywą diagnozę** regionu — co ludzie zgłaszają, czego brakuje, gdzie rosną trendy — i nie musi na to zamawiać badania.

I rzecz, która w usługach publicznych bywa dopiskiem: **dostępność**. Baza 18 px, nie 16 — bo odbiorcą są seniorzy. Przełączniki prostego języka, dużej czcionki i wysokiego kontrastu do 21:1. **Zero naruszeń axe-core na wszystkich 8 widokach**, powtarzalne jedną komendą. Mapa ma odpowiednik tabelaryczny i działa z klawiatury.”

---

## ⏱ 4:30–5:00 · Domknięcie i prośba (30 s)

**[MÓW]**
„Podsumowując: **wszystkie 7 modułów z zadania**, w tym obowiązkowy matchmaking, działający backend, 115 zweryfikowanych kart, 7 na 7 testów silnika, zero błędów dostępności. Utrzymanie wariantu produkcyjnego: **rzędu tysiąca złotych rocznie infrastruktury** — bo nie karmimy GPU.

Nasza prośba to nie budżet. To **trzy gminy i jedna skrzynka w ROPS na miesiąc pilotażu.** Miesiąc drugi — integracja z profilem zaufanym. Miesiąc trzeci — pierwszy nabór mikrograntów puszczony przez HubMI.

**Opisz problem. Pokażemy, co już zadziałało.** Dziękuję — zapraszam do klikania na żywo.”

---

# Ściąga liczbowa (jedno spojrzenie przed wejściem)

| Liczba | Co znaczy |
|---|---|
| **115 / 76** | innowacji / publikacji ROPS w bazie |
| **111 ze 115** | kart ma udokumentowany wynik testu |
| **22** | wątki mostka pojęciowego · też: jednostki na mapie (19 powiatów + 3 miasta) |
| **7 / 7** | moduły zadania · i testy regresyjne silnika |
| **~300 ms** | odpowiedź Jev (zakres 70–500 ms) |
| **$0,042 / 1M tok.** | koszt zmienny AI |
| **~950 zł / rok** | infrastruktura wariantu produkcyjnego |
| **0** | naruszeń axe-core na 8 widokach |
| **18 px → 27 px** | baza typografii i przełącznik |
| **21:1** | kontrast w trybie wysokiego kontrastu |
| **4,75:1** | najsłabsza para tekstowa w palecie domyślnej |
| **65 / 35** | udział pokrycia wątków vs. siły leksykalnej w wyniku |

---

# Plan B i higiena wejścia

- **UWAGA: moduł I wymaga backendu.** `matchApi.ts` świadomie nie ma trybu offline — bez odpowiedzi serwera matchmaking rzuca błąd. Przed wejściem **sprawdź, że backend odpowiada** (`/api/health/`) i miej **hotspot z telefonu** jako zapas. Offline działają tylko: zasobnik wiedzy, Kreator pomysłów i analiza zapytania (liczone w przeglądarce).
- **Backend padnie w trakcie** → nie walcz z demo na żywo, wejdź w `docs/screenshots/` (13 zrzutów, w tym wyniki z „dlaczego to pasuje") i dokończ narrację na nich.
- **Jev nie odpowie w demo** → **nie milcz**, wykorzystaj to: *„proszę, właśnie widzimy fallback — werdykt AI jest puste, a ranking i uzasadnienia stoją nietknięte, bo liczy je nasz kod”*.
- O GB10 mów **bez przechwałek benchmarkowych**: twierdzenie brzmi *„cały stos mieści się na takim sprzęcie i stawiamy go z Dockera”*, a nie *„zmierzyliśmy tam 300 ms”*. Jeśli ktoś dopyta o pomiary — ~300 ms to czas odpowiedzi Jev przez API, nie wynik lokalnego benchmarku.
- **Zegar**: jeśli po demo masz mniej niż 2 minuty, wycinasz sekcję wartości dla interesariuszy (⏱ 3:50) i wchodzisz prosto w domknięcie. Nigdy nie wycinaj „Dlaczego to pasuje” ani bloku Jev/GB10.
- Ostatnie zdanie wypowiedz **patrząc na jury, nie na ekran**.

---

# ⚠ Zanim użyjesz starego dokumentu

`docs/ODPOWIEDZI_JURY.md` ma 35 rozbudowanych odpowiedzi, ale **trzy rzeczy w nim są nieaktualne wobec kodu** — nie mów tego ze sceny:

| Co tam pisze | Jak jest teraz w kodzie |
|---|---|
| „AI to kontener Ollama lokalnie, opcjonalnie OpenAI/Anthropic” | **Jedyny dostawca to Jev.** Ollama, OpenAI i Anthropic zostały usunięte z repo (`backend/hubmi/ai.py`) |
| „frontend nie woła API, `app/src` nie ma `fetch` do `/api/`” | Front **woła** `POST /api/match/search/` (`app/src/lib/matchApi.ts`) |
| „demo statyczne, offline, nie może się wywalić” | **Moduł I nie ma trybu offline** — bez backendu rzuca `MatchApiError`. Offline działają: Zasobnik, Kreator, analiza zapytania |

Bank poniżej jest zgodny ze stanem kodu na dziś.

---

# BANK PYTAŃ JURY — wszystko, co może paść

Format: **pytanie** → odpowiedź do powiedzenia. Jeśli czegoś nie wiesz — mów „nie wiem, sprawdzę”. To wygrywa więcej punktów niż improwizacja.

## 1. Matchmaking i trafność (to padnie na pewno)

**„Wpiszę coś swojego — pokażcie na żywo.”**
Zgoda, zapraszam. (**Nie odmawiaj nigdy.** Jeśli wynik będzie słaby, powiedz: „to trafia dokładnie w nasz mechanizm luki — proszę zobaczyć, co system zapisał w panelu trendów”.)

**„Skąd pewność, że wynik jest trafny?”**
Każde trafienie jest rozliczone: rozpoznany wątek, pole karty, podświetlone słowa-wyzwalacze i cytat z wyników testu. Plus test regresyjny na 7 potocznych zapytaniach, `npm run test:match`, przechodzi 7/7.

**„Kto zwalidował trafność? Pokażcie metodologię.”**
Nikt zewnętrzny — i mówimy to wprost. Mamy odtwarzalny test na 7 scenariuszach zbudowanych z realnych kart ROPS i progowanie luki. Walidacja z pracownikami ROPS to pierwsza rzecz po hackathonie, bo tylko oni wiedzą, co jest trafieniem.

**„Skąd wagi 3.0 / 0.15 i proporcja 65/35?”**
Z testów na realnych danych, nie z sufitu. Pole „kto może skorzystać” zbiliśmy do 0.15, bo prawie każda karta ma tam tę samą szablonową listę instytucji — bez tego ochrona protez przed zamoknięciem wychodziła 99/100 na pytanie o schody w urzędzie.

**„A jak ktoś napisze z błędami, gwarą, bez polskich znaków?”**
Stemmer obcina końcówki, a wyszukiwanie składa zapytanie z prefiksów rdzeni, więc odmiana nie boli. Diakrytyki są foldowane. Literówka w środku słowa nie zostanie poprawiona — tego nie udajemy.

**„A po angielsku albo ukraińsku?”**
Nie działa i to jest świadome: mostek pojęciowy jest ręcznie napisanym słownikiem polskim. Dodanie drugiego języka to dopisanie słownika, nie przepisanie silnika.

**„Dlaczego 115 kart, skoro ROPS ma około 200 innowacji?”**
115 to te, które ROPS opublikował w Bibliotece w formacie kart z opisem problemu i wynikami testu. Z tego **111 ma udokumentowany wynik** — reszty nie dorabiamy.

**„Co jeśli użytkownik opisze problem jednym słowem?”**
Mostek rozpozna wątek i dostaniemy wynik, ale pokrycie będzie niskie, więc wynik wyląduje w „średnie/niskie”. Dlatego asystent **dopytuje najwyżej dwa razy** — nie przesłuchuje, tylko domyka obraz.

**„Jak rozpoznajecie, że wynik jest ZŁY?”**
Trzy poziomy: test odtwarzalny, twarde progi (`score < 35` lub `coverage < 0.25` → luka) i to, że po wdrożeniu każdy brak trafienia liczy się w panelu. Metryką nie jest KPI na wykresie, a lista pojęć, których Biblioteka nie zna.

**„Czy system kiedykolwiek mówi »nie wiem«?”**
Tak, trzy razy: `brak-watkow`, `brak-trafien`, `slabe-pokrycie`. Przy zapytaniu spoza polityki społecznej wynik jest **ścięty na sztywno do 30** — nie ma scenariusza, w którym pstrągi w stawie dostają 80/100.

## 2. AI — najniebezpieczniejszy blok

**„Gdzie tu w ogóle jest AI? Widzę BM25.”**
Ranking liczy nasz kod, bo musi być wytłumaczalny. Model — **Jev** — dostaje od silnika krótką listę kandydatów i zwraca werdykt „powiązane / nie” z kalibrowaną pewnością i jednym zdaniem uzasadnienia. Nigdy nie czyta 115 kart przy każdym zapytaniu.

**„Czyli AI jest doklejone na końcu?”**
Jest **celowo** na końcu. Odwrotna kolejność znaczyłaby, że o tym, co mieszkanka zobaczy na pierwszym miejscu, decyduje coś, czego nie umiemy wytłumaczyć. W narzędziu publicznym to niedopuszczalne.

**„Dlaczego Jev, a nie GPT czy Claude?”**
Bo Jev jest **modelem decyzyjnym**, nie generatywnym: dostaje pytania typowane (tak/nie, wybór, ocena po rubryce) i odpowiada w jednej równoległej passie w ~300 ms, z pewnością. Nie pisze prozy, więc nie ma w czym halucynować, a koszt zmienny jest rzędu $0,042 za milion tokenów.

**„Czy model może zmyślić, że innowacja pasuje?”**
Może się pomylić w werdykcie — jak każdy klasyfikator. Ale **nie może zmyślić faktu**, bo nie generuje treści: cytaty, wyniki testu i uzasadnienia pochodzą z karty ROPS, a nie od modelu.

**„Ile wywołań modelu na jedno zapytanie?”**
**Jedno.** `judge_related` pakuje wszystkich kandydatów w jeden request — `state` idzie raz, pytań jest tyle, ilu kandydatów. Sześć wyników to nie sześć wywołań.

**„Gdzie jeszcze używacie modelu?”**
W Middlemanie (ocena ryzyka i gotowości wdrożenia), w triażu pilności wątków i w sprawdzaniu nowości pomysłu w Kreatorze. Nigdzie nie generuje treści, którą użytkownik bierze za fakt.

**„A szukanie w Zasobniku wiedzy woła model?”**
Nie — **ani razu**. Zasobnik filtruje dane w przeglądarce. Jedyne pole w całym interfejsie, które woła Jev, to główne pole matchmakingu.

**„Co jeśli model nie odpowie?”**
`evaluate()` zwraca `None` zamiast rzucać wyjątkiem. Lista wyników i całe „dlaczego to pasuje” są **identyczne** — znika tylko dopisany obok werdykt. Żaden endpoint się nie wywala i nie jest to przypadek, a zasada zapisana w kodzie.

**„Wysyłacie dane do zewnętrznego dostawcy. Co z tym?”**
Do Jev leci wyłącznie **treść zapytania i fragmenty publicznych kart ROPS** — zero danych osobowych. I dlatego mówimy o GB10: przy modelu uruchomionym lokalnie nie wyjeżdża nic.

**„Czy to jest trenowane na naszych danych?”**
Nie. Nie trenujemy ani nie dostrajamy żadnego modelu — Jev dostaje pytanie i treść w jednym wywołaniu, bez utrwalania. Nasza „wiedza domenowa” siedzi w jawnym słowniku 22 wątków, który można przeczytać i poprawić.

## 3. Architektura, wektory, pgvector

**„Po co wam pgvector przy 115 rekordach?”**
Dla jednej funkcji, której bez niego nie ma: „podobne innowacje” pod kartą — tam nie ma zapytania tekstowego, od którego dałoby się policzyć frazę. Przy 115 kartach to optymalizacja na zapas, a nie konieczność, i mówimy to otwarcie.

**„Te embeddingi to z jakiegoś modelu?”**
Nie — **LSA, czyli SVD** na macierzy słowo-dokument, policzone lokalnym skryptem. Klasyczna algebra liniowa: zero API, zero kosztu, wynik w 100% odtwarzalny. Daje jedno, czego BM25 nie potrafi — łączy „wytchnieniowy” z „zastępstwem”, choć nie mają wspólnego rdzenia.

**„Dlaczego Postgres bez polskiego stemmera?”**
Bo Postgres nie ma konfiguracji `polish` w rdzeniu. Obeszliśmy to: kolumna trzyma oryginalne słowa, a zapytanie budujemy jako **prefiksy rdzeni** z naszego stemmera — więc „samotn:*” trafia w „samotność”, „samotni” i „osamotnienie” przez indeks GIN.

**„Hybrydowe wyszukiwanie działa w interfejsie?”**
Jest gotowe w API (`/api/search/?mode=hybrid`), ale **interfejs go jeszcze nie używa** — Zasobnik filtruje po stronie przeglądarki. Nie udajemy, że to już klikalne.

**„Ten sam silnik jest dwa razy — po co?”**
Celowo: TypeScript dla przeglądarki i Python dla backendu, te same wagi i progi. Dzięki temu Kreator i analiza zapytania działają bez sieci, a wynik z serwera jest identyczny z wynikiem lokalnym.

**„Czemu nie mikroserwisy / Kubernetes / kolejka?”**
Bo to byłby koszt utrzymania bez korzyści dla 182 gmin. Trzy kontenery w Docker Compose stawia jedna osoba, a stos skaluje się pionowo na długo przed tym, zanim ROPS będzie potrzebował czegoś więcej.

## 4. GB10, on-premise, suwerenność

**„Czym jest ten GB10 i po co mi o tym mówicie?”**
To komputer klasy desktop z 128 GB pamięci zunifikowanej i rzędu petaflopa w FP4. Nasz stos to Docker, więc **całość uruchamia się na jednym takim urządzeniu w serwerowni ROPS** — zasilanie z gniazdka, cena przyzwoitej stacji roboczej, zero farmy GPU.

**„Zmierzyliście to na GB10?”**
Nie. Twierdzenie brzmi: **stos się tam uruchomi i stawiamy go z Dockera** — a nie „zmierzyliśmy tam 300 ms”. Te ~300 ms to czas odpowiedzi Jev przez API.

**„Czyli obiecujecie model lokalnie czy nie?”**
Obiecujemy **ścieżkę**, nie fakt. Dziś działa API, bo jest tanie i szybkie. Na takim sprzęcie da się dowieźć model lokalnie i wtedy dane w ogóle nie opuszczają instytucji — a przejście to zmiana zmiennej środowiskowej, bo cały dostęp do AI idzie przez jedną warstwę transportu.

**„Po co nam suwerenność, jak nie przetwarzacie danych wrażliwych?”**
Dziś nie przetwarzamy. Ale moduł V to wątki mieszkaniec ↔ ROPS i tam **będą** opisy trudnych sytuacji życiowych. Lepiej mieć gotową odpowiedź na to pytanie, niż szukać jej po wdrożeniu.

## 5. Dane, RODO, licencje

**„Skąd macie te dane? Macie prawo?”**
Ze stron publicznych ROPS, pobrane skryptami z repo, źródła i licencje opisane w `data/README.md`. Są to materiały publikowane przez instytucję publiczną w celu upowszechniania.

**„Pinezki na mapie to prawdziwe wdrożenia?”**
Nie — i jest to napisane **wprost pod każdą mapą w aplikacji**. Granice 22 jednostek są prawdziwe (dane GUS), rozmieszczenie jest wygenerowane deterministycznie, bo ROPS nie publikuje, gdzie która innowacja była wdrażana.

**„Gdzie są dane osobowe?”**
Jedyne prawdziwe dane osobowe w zbiorze to **nazwiska autorów innowacji, jawnie publikowane przez ROPS** — i nie eksponujemy ich poza pełną kartą. Kontakty realizatorów są fikcyjne (`example.org`), zgłoszenia w panelu to dane demonstracyjne.

**„Co się dzieje ze zgłoszeniem mieszkanki?”**
Zapisuje się jako sygnał potrzeby z treścią, rozpoznanymi wątkami i wynikiem. Do analityki trendów idzie **zanonimizowane**. Retencję i podstawę prawną trzeba ustalić z IOD ROPS przed wdrożeniem — tego za nikogo nie rozstrzygniemy.

**„Kto jest administratorem danych?”**
W docelowym wdrożeniu ROPS. Dlatego cały stos jest przygotowany do postawienia u nich, a nie w naszej chmurze.

**„Jak zapewnicie, że ktoś nie wpisze tam danych medycznych dziecka?”**
Nie zapewnimy technicznie — pole jest wolnym tekstem i to trzeba powiedzieć uczciwie. Co da się zrobić: komunikat przy polu, brak wymogu rejestracji i krótka retencja surowej treści. Projektowo to decyzja ROPS, nie nasza.

## 6. Koszty, wdrożenie, skalowanie

**„Ile to kosztuje rocznie?”**
Infrastruktura w wariancie produkcyjnym rzędu **950 zł**, bo nie karmimy GPU. Z ludźmi — ćwierć etatu koordynatora treści plus utrzymanie techniczne — rzędu **60 tysięcy złotych rocznie**, czyli mniej niż jeden grant z naboru.

**„A wdrożenie jednorazowo?”**
Rzędu **80–120 tysięcy złotych**: uwierzytelnianie, migracja danych, testy, integracje. W granicach jednego naboru IWS.

**„Zero kosztu zmiennego za AI — marketing czy kalkulacja?”**
Kalkulacja. Ranking liczy się u nas za darmo, a Jev to **jedno wywołanie na zapytanie** przy $0,042 za milion tokenów. 50 tysięcy zapytań rocznie to dziesiątki złotych, nie dziesiątki tysięcy.

**„Co się sypie pierwsze przy dużym ruchu?”**
Indeks silnika jest trzymany w pamięci procesu, więc pierwszym ograniczeniem jest liczba workerów Django, a nie baza. Przy skali wojewódzkiej to kwestia dodania procesów, nie przebudowy — a odczyt katalogu i tak idzie z CDN.

**„Kto to utrzyma po Was, jak skończy się hackathon?”**
Stos jest nudny z wyboru: Django, Postgres, React, Docker. Każda firma, która robi systemy dla samorządu, przejmie to bez szkolenia — i dlatego nie użyliśmy niczego egzotycznego poza samym Jev, który jest wymienialny za jedną warstwę transportu.

**„Dlaczego mielibyście to robić wy, a nie przetarg?”**
Nie licytujemy się o kontrakt. Prosimy o **pilotaż z trzema gminami** — jeśli zadziała, jest to gotowy materiał do przetargu, z policzonym kosztem i działającym prototypem.

## 7. Dostępność

**„0 naruszeń axe — i co z tego?”**
Że nie ma błędów **wykrywalnych automatycznie**, a axe łapie około jednej trzeciej problemów. Nie mówimy „dostępne” — mówimy „bez błędów automatycznych”, a test z seniorami jest pierwszą rzeczą po hackathonie.

**„Zróbcie to na telefonie, bez myszki, z wysokim kontrastem.”**
Proszę. (Przełącznik kontrastu → 21:1, mapa ma odpowiednik tabelaryczny, powiaty osiągalne tabulatorem, brak przewijania w poziomie przy 390 px.)

**„Prosty język zmienia naprawdę treść czy tylko czcionkę?”**
Przełącznik zmienia teksty interfejsu i opisy, ale **nie przepisuje 115 kart ROPS** — to byłoby podrabianie cudzej treści. Przepisanie kart prostym językiem to zadanie dla koordynatora w ROPS i dlatego jest w kosztorysie.

**„Senior nie zrozumie urzędowego zdania, choćby było 18-pikselowe.”**
Zgoda — dlatego matchmaking przyjmuje **jego** język, a nie każe mu uczyć się naszego. Baza 18 px i przełącznik do 27 px to warunek konieczny, nie wystarczający.

**„Mikrofon to gadżet?”**
To **dodatek, nie jedyna droga** — obok zawsze jest pole tekstowe. Dla osoby z drżeniem rąk albo słabym wzrokiem to różnica między „wypełnię” a „zrezygnuję”.

## 8. Produkt, użytkownicy, adopcja

**„Czym to się różni od wyszukiwarki na stronie ROPS?”**
Wyszukiwarka ROPS wymaga, żebyś znał słowo „deinstytucjonalizacja”. My przyjmujemy „boimy się, że mama wyjdzie z domu” — i dodatkowo zapisujemy pytanie, na które nie umieliśmy odpowiedzieć.

**„Skąd pewność, że ktokolwiek tego użyje?”**
Pewności nie ma i nie będziemy jej udawać. Dlatego prosimy o pilotaż: trzy gminy i jedna skrzynka w ROPS to najtańszy możliwy test tej hipotezy.

**„Który moduł jest realny, a który atrapą?”**
Realne od pierwszego dnia: matchmaking, zasobnik, panel trendów. Wymagają pracy organizacyjnej po stronie ROPS, nie kodu: tester innowacji i platforma komunikacji — bo ktoś musi odpowiadać na wątki.

**„Ile danych trzeba, żeby panel trendów coś mówił?”**
Rzędu kilkuset zapytań na kwartał, żeby lista nierozpoznanych pojęć miała sens. Przy pilotażu w trzech gminach to realne — i nawet 50 zgłoszeń daje ROPS więcej niż zero, które ma dziś.

**„Co z innowatorem, który chce zgłosić pomysł?”**
Fiszka na cztery pola, sprawdzenie nowości w Bibliotece i generator wniosku pod realny formularz naboru IWS do 120 tysięcy złotych. Czyli droga od pomysłu do złożonego wniosku w jednym miejscu.

**„Jak urzędnik doda nową innowację?”**
Formularzem w panelu administratora. Nowa karta jest wyszukiwalna **od razu po zapisie** — indeks silnika unieważnia się sygnałem, a wektor liczy się tą samą macierzą.

**„Jaka jest ścieżka od zgłoszenia do odpowiedzi?”**
Zgłoś pomysł → przełącz rolę na pracownika ROPS → powiadomienie w panelu → odpowiedz → wróć jako autorka i zobacz odpowiedź. Cała pętla jest klikalna w demo.

## 9. Pytania zaczepne i uczciwość

**„Co nie działa?”**
Trzy rzeczy mówimy sami: brak walidacji trafności z ROPS, brak testu z użytkownikami, hybrydowe wyszukiwanie gotowe w API ale niepodpięte do interfejsu. Nie ma też trybu offline w module I i jest to decyzja projektowa, nie przeoczenie.

**„Co zrobilibyście z kolejnymi 24 godzinami?”**
Posadzilibyśmy przy tym dwóch pracowników ROPS i policzyli, w ilu z 20 zapytań pierwszy wynik jest według nich trafny. To jedyna liczba, której nam dziś brakuje.

**„Ile osób w zespole?”**
(Odpowiedz prawdą — i powiedz kto co napisał. Jury pyta o to, żeby sprawdzić, czy rozumiesz własny kod. Nie zmyślaj podziału pracy.)

**„Ile z tego powstało na hackathonie?”**
(Odpowiedz prawdą. Jeśli dane były zebrane wcześniej — powiedz to. Złapanie na tym kosztuje więcej niż szczerość.)

**„Czego nie da się przepisać w tygodniu?”**
Mostka pojęciowego — 22 wątków z wagami, wyciągniętych z realnych 115 kart i wystrojonych tak, żeby protezy nie wygrywały pytania o schody. Front da się przepisać w tygodniu. Tego nie.

**„Dlaczego akurat wy?”**
Bo zrobiliśmy nudną część: policzyliśmy wagi na realnych danych, zmierzyliśmy kontrasty, napisaliśmy, czego prototyp nie udaje, i policzyliśmy koszt utrzymania. To nie jest demo na jedno kliknięcie.

## 10. Jeśli nie znasz odpowiedzi

Powiedz dokładnie to: **„Nie wiem, nie sprawdziliśmy tego — zapiszę i odpowiem po prezentacji.”**
Potem **zapisz**. Jury ocenia, czy wie, z kim rozmawia: z kimś, kto rozumie własny system, czy z kimś, kto sprzedaje slajd.
