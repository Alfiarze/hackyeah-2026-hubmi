# Odpowiedzi dla jury — HubMI

Karta pytań i odpowiedzi na prezentację. Każde pytanie ma **odpowiedź w 20 sekund**
(to mówisz na scenie) i **sekcję „gdy dopytają"** (liczby z repo, żebyś nie stracił
wątku, gdy poproszą o dowód).

Źródła: `app/src/lib/match.ts`, `app/src/lib/concepts.ts`, `app/src/data/audit.json`,
`data/README.md`, `README.md` (kosztorys), `backend/`, `docker-compose.yml`.
Wygenerowane z kodu 2026-10-03 — jeśli coś zmienicie, odśwież liczby.

---

## A. Matchmaking — pytania, które padną na 100%

### A1. „Opisz problem własnymi słowami — wpiszę to na żywo."

**Odpowiedź:** „Proszę. Tu wpisuje się albo dyktuje — po polsku, potocznie, bez
formularza. Silnik rozpoznaje wątki, pokazuje 3–5 wyników i przy każdym wypisuje,
dlaczego pasuje: który wątek, które pole karty i jakie słowa to uruchomiły. Jeśli
nic nie pasuje, zgłoszenie idzie do panelu ROPS jako luka, a nie jako pusta lista."

**Demonstracja:** przygotuj 3 zapytania spoza `test_match.mjs`, żeby jury nie
wkroczyło w Wasz wyuczony scenariusz.

---

### A2. „Skąd pewność, że wynik jest trafny? Kto to zwalidował?"

**Odpowiedź:** „Mamy komendę, która odpala silnik bez przeglądarki na 7 zapytaniach
potocznych i pokazuje wynik z uzasadnieniem. Właśnie ją uruchomiłem: 7 na 7 przechodzi.
Siódme — »potrzebuję pomysłu na hodowlę pstrąga« — celowo kończy się luką, bo mostek
nie rozpoznaje żadnego wątku i wynik jest twardo ścinany do 30/100. Pytanie spoza
domeny polityki społecznej nie może wyglądać na trafienie."

**Gdy dopytają — wyniki `npm run test:match`:**

| Zapytanie | Rozpoznane wątki | Najlepszy wynik |
|---|---|---|
| mama mieszka sama na wsi, nie ma z kim pogadać | osoby starsze · samotność i izolacja · obszary wiejskie | 81/100 |
| babcia zapomina, gubi się w domu | osoby starsze · demencja i pamięć | 100/100 |
| w gminie nic dla młodzieży po szkole | obszary wiejskie · instytucje i samorząd · dzieci i młodzież | 69/100 |
| jestem na wózku, wszędzie schody w urzędzie | ograniczona mobilność · bariery architektoniczne | 78/100 |
| syn ma autyzm i boi się wychodzić | autyzm i spektrum | 100/100 |
| głucha pacjentka w przychodni | niepełnosprawność słuchu | 100/100 |
| **hodowla pstrąga w stawie** | **żadnych** | **LUKA, ucięte do 30** |

**Uczciwie:** to jest walidacja na 7 ręcznie wybranych zapytaniach. Nie mów
„przetestowaliśmy na użytkownikach" — mów „mamy odtwarzalny test silnika, a test
z użytkownikami jest pierwszą rzeczą po hackathonie".

---

### A3. „Skąd wagi 0,15 i proporcja 65/35? Skąd to się wzięło?"

**Odpowiedź:** „Z danych, nie z intuicji. Wynik to 65% ważone pokrycie wątków plus
35% siła leksykalna. Pole »kto może skorzystać« waży 0,15, bo w prawie każdej karcie
siedzi ta sama szablonowa lista instytucji — bez tego zbicia ochrona protez przed
zamoknięciem wychodziła 99/100 na pytanie o schody w urzędzie. Wątek »ograniczona
mobilność« jest rozdzielony od »barier architektonicznych«, a słowa »niepełnosprawność«
w ogóle nie ma w mostku, bo występuje w 101 ze 115 kart i jako wyzwalacz jest nic nie
warty."

**Gdy dopytają:** wagi pól: opis problemu 3,0 · grupa docelowa 2,6 · opis rozwiązania
2,0 · nazwa 1,8 · kto skorzysta 0,15 (nb. powyżej: `benef` 1,5 w kodzie, a pole
„kto skorzysta" waży w mostku 0,15 — jeśli pytają o szczegóły, pokaż `FIELDS` w
`backend/matchmaking/engine.py` i `app/src/lib/match.ts`). Karta bez opisanych wyników
testu (4 ze 115) dostaje mnożnik 0,88.

---

### A4. „A co, jak ktoś napisze po angielsku, gwarą, z błędami?"

**Odpowiedź:** „Mostek ma 22 wątki zbudowane ze słownika realnych 115 kart — nie
z listy z gadżetu. Wszystko, czego nie rozpoznamy, jest pokazane wprost jako
»nierozpoznane: mieszka, gubi, wszędzie«. Pytanie, które nie dotyka żadnego z 22
obszarów, dostaje ucięty wynik i trafia na listę niezaspokojonych potrzeb. Wolimy
uczciwą lukę niż wyglądające na trafienie 60 punktów."

**Gdy dopytają:** przy zapytaniu o pstrąga komunikat brzmi „brak wątków" i zgłoszenie
idzie do zakładki „Trendy" w panelu admina.

---

### A5. „Dlaczego 115 kart, skoro ROPS ma około 200 innowacji?"

**Odpowiedź:** „Bo tyle jest opublikowanych w Bibliotece Innowacji Społecznych —
tego się trzymamy, nie zaokrąglamy. To 9 kategorii: seniorzy 20, dzieci i młodzież 21,
ograniczona mobilność 18, niepełnosprawność sensoryczna 20, intelektualna 14,
zdrowie 9, cudzoziemcy 6, rynek pracy 5, kryzys bezdomności 2. Każda karta ma
`problem`, `raw_text` i 111 ze 115 z opisanymi wynikami testu. Portfolio ROPS ma
więcej pozycji, ale niewykorzystane w kartach nie są danymi do dopasowania."

---

### A6. „Widzę BM25. Gdzie tu AI? Zadanie mówi o platformie z AI."

**Odpowiedź (wyucz w tym brzmieniu — to najniebezpieczniejsze pytanie):**

> „Rankingu nie ustala model językowy, tylko silnik BM25 z mostkiem pojęciowym — bo
> wynik musi być wytłumaczalny. Przy samym modelu jedyne pytanie »dlaczego« kończy
> się odpowiedzią »bo model tak policzył«. U nas widać rozpoznany wątek, pole karty
> i podświetlone słowa. AI jest w repo i robi to, do czego się nadaje: kontener
> Ollama lokalnie, offline, dostaje od silnika krótką listę kandydatów i zwraca
> werdykt tak/nie z jednym zdaniem po polsku — nigdy nie czyta 115 kart przy każdym
> zapytaniu. Gdy model się jeszcze pobiera, werdykt schodzi na progi silnika
> (`source=fallback`), więc żaden endpoint się nie wywali. Poza matchmakingiem model
> jest asystentem kreatora i Middlemana."

**Gdy dopytają — gdzie dokładnie jest AI w repo:**

| Miejsce | Co robi |
|---|---|
| `backend/matchmaking/ai.py` | werdykt „czy ta innowacja odpowiada" + 1 zdanie uzasadnienia, JSON |
| `backend/hubmi/ai.py` | transport: lokalny Ollama → ewentualnie OpenAI/Anthropic (klucze opcjonalne) |
| `docker-compose.yml` | 4 kontenery: Postgres+pgvector, Django, Ollama, jednorazowy `pull` modelu |
| `app/src/lib/match.ts` | to samo liczone w przeglądarce, żeby demo działało offline |
| `backend/matchmaking/engine.py` | port `match.ts` — te same wagi i progi, wynik identyczny |

**Ostrzeżenie (sprawdź przed sceną):** frontend **nie woła API** (`app/src` nie ma
żadnego `fetch` do `/api/`). Jeśli na scenie pokażesz backend, to pokażesz go osobno
(`docker compose up --build` + `/api/health/`). Jeśli nie masz go odpalonego — nie
obiecuj go na slajdzie. Wersja statyczna jest demo, backend jest ścieżką produkcyjną.

---

### A7. „Jak rozpoznajecie, że wynik jest zły? Macie metrykę?"

**Odpowiedź:** „Mamy trzy poziomy: (1) test odtwarzalny na 7 zapytaniach z wydrukiem
wątków i uzasadnień, (2) progowanie — bez rozpoznanych wątków wynik jest ucięty do 30
i luka trafia do zestawienia niezaspokojonych potrzeb, (3) po wdrożeniu każdy brak
trafienia staje się daną: panel admina liczy, których słów Biblioteka nie zna. To jest
nasza metryka — nie KPI na wykresie, tylko lista luk do uzupełnienia."

---

## B. Moduły i zakres

### B8. „Który moduł użyjecie realnie w pierwszym kwartalniku, a który jest atrapą?"

**Odpowiedź:** „Realnie trzy, po kolei: matchmaking (obowiązkowy, działa), panel
administratora z zestawieniem luk (dane już się zbierają ze zgłoszeń) i komunikację
— bo to zamyka pętlę zgłoszenie → odpowiedź. Kreator z generatorem wniosku rusza przy
pierwszym naborze, Tester przy pierwszym teście, Middleman przy pierwszym wdrożeniu
w gminie. Nie udajemy, że wszystko rusza naraz — Hub startuje od problemu, nie od
katalogu."

---

### B9. „Panel admina: jak urzędnik doda nową innowację? Pokażcie formularz."

**ODPOWIEDŹ UCZCIWA (nie zmyślaj — tu Was złapią):**

> „Na dziś baza jest odświeżana skryptem, nie formularzem — mamy skrypty pobierające
> karty z ROPS (`scripts/scrape_rops.py`, `build_app_data.py`), które przy przebiegu
> ~15 minut aktualizują dane. Formularz dodawania i edycji w panelu to nasza znana
> luka i kosztuje około 2 godziny. Zadanie wprost wymaga szybkiej aktualizacji wiedzy
> przez admina, więc to jest pozycja numer jeden na liście po prezentacji."

**Jeśli zostanie czas do jutra — zrób to (2 h).** Wymóg §2.II i §2.VI, 5% oceny.
Bez tego pytanie B9 wróci i zaboli.

---

### B10. „Kto aktualizuje dane i jak często?"

**Odpowiedź:** „Skrypty w `scripts/` są idempotentne — mają cache, więc ponowne
uruchomienie tylko dociąga braki. Kwartalny przegląd to około 15 minut pracy
koordynatora, w kosztorysie to 400 zł rocznie. Od strony produkcyjnej to samo robi
formularz w panelu admina, a skrypty zostają jako automatyczne odświeżanie źródła."

---

### B11. „Pokażcie ścieżkę: zgłoszenie → powiadomienie → odpowiedź → wróć do autorki."

**Odpowiedź + demo (to Wasz najlepszy moment):** „Robimy to na żywo, w jednej
przeglądarkce. Wpisuję problem jako mieszkanka → nic nie pasuje → luka leci na
tablicę. Przełączam rolę na ROPS w pasku górnym → widzę powiadomienie w dzwonku
z licznikiem → odpowiadam → wracam do roli mieszkanki i widzę odpowiedź, ze znacznikiem
»nowa«. Cała pętla działa bez serwera, w localStorage — po to, żeby dało się ją
pokazać na sali bez internetu."

**Gdy dopytają o e-mail:** „Powiadomienie mailowe jest w kosztorysie, w demo
pokazujemy podgląd kolejki wysyłki z treścią i odbiorcą, bo wysyłka wymaga backendu."

---

### B12. „Middleman: liczby dla wójta generował model czy reguły? Kto odpowiada za bzdurę?"

**Odpowiedź:** „Reguły, i to jest decyzja, nie brak. Middleman liczy według jawnych
mnożników skali, typu kadry i trybu wdrożenia. Wójt musi przed radą gminy bronić
liczb — nie może dostać prozy z modelu. Model językowy w wersji produkcyjnej może
dopisywać uzasadnienie, ale ramę zostawiamy deterministyczną. Dzięki temu wynik jest
powtarzalny i da się go rozliczyć."

---

### B13. „Generator wniosku: ile realnych nabórów odwzorowaliście?"

**Odpowiedź:** „Jeden — nabór IWS 2.0, i to nie na oko: odwzorowaliśmy realny
formularz aplikacyjny z materiałów ROPS, wraz z kartami oceny formalnej i merytorycznej.
Kryteria z tych kart są tymi, pod które generator pisze wniosek. Po wdrożeniu drugi
nabór to dodanie jednego pliku z parametrami, nie nowa funkcja — generator jest
parametryzowany. Eksport jest przez `window.print()`, czyli PDF bez żadnej usługi
zewnętrznej."

---

### B14. „Cztery grupy odbiorców — gdzie jest wejście dla każdej?"

**Odpowiedź:** „Na starcie matchmakingu jest karta »Dla kogo jest HubMI« z czterema
ścieżkami: mieszkaniec/NGO zgłasza problem, JST szuka katalogu rozwiązań, pracownik
ROPS wchodzi w panel, ekspert w komunikację. W demo przełączanie ról jest w pasku
górnym, żeby pokazać każdą perspektywę bez czterech kont."

**Uczciwie (jeśli zapytają o role w kodzie):** w `store.ts` są trzy role —
`mieszkaniec | ROPS | ekspert`. Samorząd wchodzi ścieżką katalogu, a nie osobną rolą.
Jeśli zapytają wprost „gdzie rola JST?" — powiedz to i dodaj, że to 30 minut roboty.

---

## C. Dane, RODO, prawa

### C15. „Skąd macie 115 kart i 76 dokumentów? Macie licencję na scrapowanie?"

**Odpowiedź:** „Wszystko pochodzi ze stron publicznych ROPS (`rops.krakow.pl`) —
skrypty w `scripts/` pobierają karty i dokumenty, a `data/README.md` opisuje każde
źródło. To zasoby publiczne instytucji samorządowej, udostępniane w celu upowszechniania
innowacji — my je porządkujemy i udostępniamy z linkiem do oryginału. Przy każdej karcie
zostaje adres źródłowy, a pliki PDF i filmy są linkowane, nie skopiowane."

**Gdy dopytają:** 115 innowacji (9 kategorii) + 76 dokumentów = 51 raportów i diagnoz
2010–2026, 16 pozycji naboru IWS 2.0 (w tym Mapa Wyzwań Społecznych, 7,8 MB),
6 publikacji (w tym Canwa Innowacji Społecznych), 3 oceny zasobów. Dodatkowo 33 karty
PDF i 26 filmów YouTube (linkowane, napisy po stronie ROPS).

---

### C16. „Pinezki na mapie to prawdziwe wdrożenia? Bo w README piszecie, że nie."

**Odpowiedź (mów to pierwsi, zanim zapytają):**

> „Granice powiatów są prawdziwe — wycięte z danych GUS, 22 jednostki: 19 powiatów
> i 3 miasta na prawach powiatu, uproszczone do 10% punktów. Samo rozmieszczenie
> wdrożeń jest wygenerowane deterministycznie z charakteru innowacji, bo ROPS nie
> publikuje, gdzie która innowacja była wdrażana. Pod każdą mapą to pisze wprost.
> Wolimy to zaznaczyć niż udawać dane, których nie mamy — zwłaszcza że zadanie
> zabrania używać prawdziwych danych wrażliwych."

---

### C17. „Gdzie są dane osobowe? Co się dzieje ze zgłoszeniami po zamknięciu przeglądarki?"

**Odpowiedź:** „W zbiorze jedyne prawdziwe dane osobowe to nazwiska autorów innowacji —
jawnie publikowane przez ROPS w Bibliotece, nieeksponowane w interfejsie poza pełną
kartą. Kontakty realizatorów na mapie są fikcyjne (domena `example.org`, zero nazwisk),
zgłoszenia w panelu to dane demo. Stan aplikacji siedzi w `localStorage` przeglądarki —
nic nie wychodzi na zewnątrz, nie ma bazy, nie ma wysyłki. Ścieżka RODO przy wdrożeniu:
dane w bazie w UE, role i logowanie, retencja zgłoszeń, umowa powierzenia — to opisujemy
jako etap wdrożenia, nie udajemy, że mamy to w prototypie."

---

### C18. „Wiecie, co podpisujecie? Przeniesienie praw na pola eksploatacji jeszcze nieznane."

**Odpowiedź:** „Wiemy — to warunek nagrody i przeczytaliśmy umowę. W praktyce dla nas
oznacza, że kod i wykaz bibliotek idą do organizatora, a prototyp ma szansę stać się
fundamentem działającego Hubu zamiast leżeć w szufladzie. Dla zespołu to portfolio
i realne wdrożenie, kosztem IP — uznaliśmy, że to dobra zamiana."

---

## D. Koszty i wdrożenie

### D19. „63 000 zł rocznie plus 80–120 000 zł wdrożenia — kto za to zapłaci?"

**Odpowiedź:** „To jest koszt jednego etatu na cztery furtki województwa, nie projektu
IT. Rozbicie: infrastruktura ~6 100 zł rocznie (kontener, baza, pliki, monitoring,
poczta, kopie), koordynator treści 0,25 etatu ~30 000 zł, utrzymanie techniczne ~8 h
miesięcznie ~19 000 zł, coroczny audyt dostępności z użytkownikami ~8 000 zł.
Wdrożenie jednorazowe 80 000–120 000 zł — w granicach jednego grantu z naboru ROPS.
Za to województwo dostaje narzędzie dla 4 grup odbiorców i wszystkie 7 modułów."

---

### D20. „A bez backendu? Bo w README piszecie, że backendu nie ma."

**Odpowiedź (wybierz wariant zależnie od tego, co masz odpalone):**

- **Wariant A — backend jest w repo:** „README opisuje wersję demo, którą pokażemy na
  scenie: statyczną, offline, bez backendu, bo takie demo nie może się wywalić. W repo
  jest pełna wersja produkcyjna — Django, Postgres z pgvector, Ollama lokalnie —
  uruchamiana jednym `docker compose up --build`. Frontend jest przepięty na API przez
  odizolowaną warstwę `store.ts`, więc to przejście nie dotyka reszty aplikacji."
- **Wariant B — backendu nie masz odpalonego:** „Wersja, którą widzicie, jest statyczna
  z pełną świadomością: dane to JSON, stan to `localStorage`, zero zależności, hosting
  0 zł. Backend w repo jest przygotowany pod wdrożenie i tego nie udajemy — ale na
  scenie pokazuję działający prototyp, nie obietnicę."

**Przed sceną:** jeżeli wybierasz wariant A, uruchom `docker compose up --build`
i sprawdź `http://localhost:8000/api/health/`. Zrób to raz, zanim zaczniesz to obiecywać.

---

### D21. „Co się sypie pierwsze przy 100 000 mieszkańców jednocześnie?"

**Odpowiedź:** „Nic, bo to są statyczne pliki z CDN — czytelników skaluje się bez
dolania mocy. Szczyt zainteresowania w naborze grantowym nie kosztuje więcej. Realne
wąskie gardło to baza zgłoszeń przy wdrożeniu i to jest zwykły Postgres — 20 GB
zarządzany, ~2 400 zł rocznie, kopie zapasowe w cenie. Silnik dopasowania liczy się
po stronie klienta, więc nie ma usługi, która mogłaby nie wytrzymać."

---

### D22. „Kto to utrzymuje po Was, jak skończy się grant?"

**Odpowiedź:** „Koordynator w ROPS, 0,25 etatu — obsługa skrzynki i aktualizacja
Biblioteki, bo to jest praca treściowa, nie techniczna. Technicznie 8 godzin
miesięcznie: aktualizacje zależności, poprawki. Cały stos jest otwarty — React, Django,
Postgres, brak licencji do opłacania i brak dostawcy, od którego zależycie. Odświeżanie
danych to skrypty w repo, kwartalnie, 15 minut."

---

### D23. „Zero kosztu zmiennego za AI — marketing czy kalkulacja?"

**Odpowiedź:** „Kalkulacja. Silnik liczy się w przeglądarce, a model w wersji
produkcyjnej stoi lokalnie w kontenerze — 0 zł za zapytanie. Przy 50 tysiącach zapytań
rocznie rozwiązanie oparte na API modelu to dodatkowe kilka–kilkanaście tysięcy złotych
rocznie i zależność od dostawcy. Do tego model można podmienić na chmurowy — klucze są
w `.env.example`, puste = lokalnie. Nigdy nie schodzi do zera, bo jest fallback na progi
silnika."

---

### D24. „Ile to będzie kosztować w pierwszym roku łącznie?"

**Odpowiedź:** „Dwa warianty, oba policzone w zgłoszeniu. Wersja statyczna: ~500 zł
rocznie (hosting 0, domena 80, odświeżanie danych 400) — i obsługuje dowolną liczbę
jednoczesnych czytelników, ale nie prawdziwych zgłoszeń. Wersja produkcyjna:
~63 000 zł rocznie razem z ludźmi, plus 80 000–120 000 zł jednorazowo na wdrożenie.
Dopóki Hub nie zbiera zgłoszeń na serio, wystarcza wariant pierwszy."

---

## E. Dostępność i intuicyjność

### E25. „Włączcie »prosty język« w Bibliotece. Nic się nie zmieniło. Dlaczego?"

**OSTRZEŻENIE — to jest prawdziwa dziura w kodzie.** Przełącznik jest w pasku Shell
i w module Dostępność, ale `t()` jest używany tylko w `Matchmaking.tsx` (3 wywołania).
Na pozostałych widokach przełącznik nic nie zmienia.

**Odpowiedź, jeśli zapytają, a nie zdążysz naprawić:**

> „Szczerze: uproszczony język jest w pełni zaimplementowany na matchmakingu, czyli
> tam, gdzie senior wchodzi pierwszy raz i gdzie bariera jest największa. Na reszcie
> widoków tekst jest napisany prostym językiem od początku, ale nie ma drugiej wersji
> tych samych nagłówków. To jest na naszej liście do zrobienia i zajmie około półtorej
> godziny — nie udajemy, że jest gotowe."

**Zanim wejdź na scenę:** sprawdź sam na 8 widokach. Jeśli masz półtorej godziny —
dodaj `t()` do nagłówków i ledów w Bibliotece, Kreatorze i Adminie. To 20% oceny.

---

### E26. „0 naruszeń axe — ale co to znaczy? Ile problemów łapie axe?"

**Odpowiedź:** „Znaczy dokładnie tyle, ile mówi: zero wykrywalnych automatycznie
naruszeń reguł WCAG 2.1 AA na 8 widokach, włącznie z wynikami, mapą i wykresami —
222 pozytywne reguły w teście. I mówimy wprost: axe-core łapie około jednej trzeciej
problemów z dostępnością. »Zero« znaczy »bez błędów automatycznych», nie »dostępne».
Czy senior zrozumie treść i czy kolejność focusu ma sens — tego żaden skrypt nie
sprawdzi, dlatego test z użytkownikami jest pierwszą rzeczą po hackathonie, z budżetem
8 000 zł w kosztorysie."

**Gdy dopytają o konkretne liczby:** `app/src/data/audit.json`, axe-core 4.13.0,
zregenerowane 2026-10-03. Widoki: matchmaking 29, biblioteka 31, kreator 26, tester 28,
komunikacja 25, admin 30, middleman 26, dostępność 27 — wszystkie `violations: 0`.
Powtarzalne jedną komendą: `npm run audit`.

---

### E27. „Zróbcie to na telefonie, z wysokim kontrastem, bez myszki."

**Odpowiedź (i rób to, nie mów):** „Robimy. Baza tekstu to 18 pikseli, nie 16, bo
grupa docelowa to seniorzy. Tryb wysokiego kontrastu daje 21:1, najsłabsza para
tekstowa w normalnym trybie to 4,75:1 — wszystko policzone skryptem, nie na oko.
Kolor nigdy nie jest jedynym nośnikiem informacji — dochodzi słowo, ikona, belka
albo kreskowanie. Mapa ma tabelaryczny odpowiednik i powiaty są osiągalne tabulatorem.
Przy 390, 768 i 1280 pikseli nie ma przewijania w poziomie."

**Gdy dopytają o mikrofon:** „Mikrofon jest dodatkiem, nie jedyną drogą — obok pola
tekstowego jest zawsze. Web Speech API działa nie w każdej przeglądarce i wymaga
sieci, więc przy błędzie sieci użytkownik dostaje komunikat »wpisz tekst w polu
poniżej«, a nie puste okno. To jest wymóg WCAG 2.1.1, nie przyjemność."

---

### E28. „Senior nie zrozumie 18-pikselowego tekstu, jeśli zdania są urzędowe. Kto to przeczytał?"

**Odpowiedź:** „Nikt — i tego nie udajemy. Na razie mamy: bazę 18 px, przełącznik
powiększenia do 1,5×, uproszczony język na matchmakingu, struktury pytań z odpowiedziami
do kliknięcia (senior nie musi pisać drugi raz) oraz to, że asystent dopytuje
najwyżej dwa razy i tylko o to, czego naprawdę brakuje. Audyt z użytkownikami —
seniorzy, osoby z niepełnosprawnościami — jest zaplanowany jako pierwsza rzecz po
hackathonie i ma budżet w kosztorysie. W zgłoszeniu piszemy to wprost, bo jury i tak
by o to zapytało."

---

## F. Pomysłowość

### F29. „Czym to się różni od wyszukiwarki na stronie ROPS?"

**Odpowiedź:** „Ctery rzeczy. Po pierwsze: nie wpisujesz słów kluczowych, tylko
opisujesz problem własnymi słowami albo go dyktujesz, a asystent dopytuje o brakujące
— bo mieszkaniec nie wie, jak ROPS nazywa jego problem. Po drugie: każde trafienie
ma rozliczenie — pokryte wątki, pole karty, podświetlone słowa i to, czego NIE pokrywa.
Po trzecie: brak trafienia nie jest pustą stroną, tylko danymi — luka trafia do
zestawienia potrzeb i trendów w panelu admina. Po czwarte: mapa pokazuje, gdzie to
już zadziałało, i buduje kontakt z realizatorem. Wyszukiwarka zwraca listę. My
zamykamy pętlę."

---

### F30. „Brak dopasowania to dane — dobre hasło. Ile danych trzeba, żeby wykres coś mówił?"

**Odpowiedź:** „Każde zapytanie jest logowane, więc dane zbierają się same — nikt
nie wypełnia ankiety. Przy demo mamy kilka zgłoszeń i to wystarczy, żeby pokazać
mechanizm: panel admina porównuje, czego potrzebują mieszkańcy (rozpoznane wątki
z zgłoszeń), z czym Biblioteka ma pokrycie, i wypisuje różnice jako luki oraz
nieznane słowa jako listę pojęć do dodania. Skala przychodzi z użyciem: przy
kilkuset zgłoszeniach w miesiącu wykres przestaje być ozdobą. Wczesny sygnał
dostajesz już przy kilkudziesięciu."

---

### F31. „Jaki jest jedyny element, którego nie da się przepisać w tydzień?"

**Odpowiedź:** „Mostek pojęciowy i wagi kalibrowane na realnych kartach. 22 wątki
zbudowane są ze słownika 115 kart ROPS — »osamotnienie« zamiast »mama nie ma z kim
pogadać«, »obszary wiejskie« zamiast »u nas na wsi«. To jest ta warstwa, bez której
dopasowanie leksykalne nie znajduje niczego, i bez niej każda wyszukiwarka zwraca
pustkę. Do tego rozliczenie wyniku: polej wagami 0,15 dla szablonowej listy
instytucji i podziel wątek »ograniczona mobilność« od »barier architektonicznych« —
to wyszło z błędów na realnych danych, nie z podręcznika. W tydzień da się zrobić
kolejny moduł, nie mostek."

---

## G. Pytania niewygodne, ale prawdopodobne

### G32. „Ile osób w zespole i co kto napisał?"

**Odpowiedź:** „Podaj faktycznie. Wspólna praca: analiza zadania i danych ROPS,
silnik dopasowania, 7 modułów, dostępność, kosztorys. Jeśli korzystaliście z narzędzi
AI do kodowania — powiedzcie to wprost; jury to słyszy codziennie i liczy się
uczciwość, nie narzędzie."

---

### G33. „Co zrobilibyście inaczej, gdybyście mieli jeszcze 24 godziny?"

**Odpowiedź (powiedz trzy rzeczy z listy rzeczywistych luk):**

1. Formularz dodawania i edycji innowacji w panelu admina — jawny wymóg zadania, 2 h.
2. Uproszczony język na wszystkich widokach, nie tylko na matchmakingu — 1,5 h.
3. Poprawienie rozjazdów między checklistą a kodem i jedno pełne przejście
   `npm run build && npm run audit && npm run test:match` przed submitem.

---

### G34. „Skąd macie pewność, że ktokolwiek tego użyje?"

**Odpowiedź:** „Nie mamy — i nie twierdzimy, że mamy. Mamy realny problem z zadania:
mikro-rozwiązania są, brakuje warstwy łączącej. Mamy dane ROPS, które pokazują, czego
Biblioteka nie ma (111 ze 115 kart ma wyniki testu, 4 nie — i to oznaczamy). Co
mamy zrobić zaraz po hackathonie, to test z 5–8 użytkownikami z czterech grup i
audyt dostępności z ludźmi. To jest w kosztorysie, z budżetem 8 000 zł."

---

### G35. „Dlaczego akurat Wy?"

**Odpowiedź:** „Bo przeczytaliśmy zadanie punkt po punkcie i mamy wszystkie 7 modułów
z działającym matchmakingiem, a nie makietę trzech. Mamy kosztorys z prawdziwymi
liczbami, wykaz bibliotek, dane pobrane i opisane z licencjami, oraz uczciwie
napisane, czego prototyp nie udaje. I mamy gotową ścieżkę od statycznego demo do
backendu w jednym `docker compose`."

---

## Karta liczb — naucz się ich na pamięć

| Liczba | Znaczenie |
|---|---|
| **7 / 7** | modułów z zadania, w tym obowiązkowy matchmaking |
| **115** | innowacji w Bibliotece, 9 kategorii |
| **76** | dokumentów ROPS (51 raportów + 16 naboru + 6 publikacji + 3 oceny) |
| **111 / 115** | kart z opisanymi wynikami testu (4 bez → mnożnik 0,88) |
| **22** | wątków w mostku pojęciowym |
| **22** | jednostek na mapie (19 powiatów + 3 miasta na prawach powiatu) |
| **65 / 35** | proporcja: pokrycie wątków / siła leksykalna |
| **30** | ucięcie wyniku, gdy nie rozpoznano żadnego wątku |
| **0 naruszeń** | axe-core 4.13.0, 8 widoków, 222 pozytywne reguły |
| **18 px** | baza tekstu (27 px po powiększeniu) |
| **4,75:1** | najsłabsza para tekstowa; tryb kontrastny 21:1 |
| **7 / 7** | zapytań przechodzi w `npm run test:match` |
| **~500 zł** | rocznie, wersja statyczna |
| **~63 000 zł** | rocznie, wersja produkcyjna razem z ludźmi |
| **80–120 tys. zł** | wdrożenie jednorazowo, w granicach jednego grantu ROPS |
| **0 zł** | zmiennego kosztu za AI |
| **~15 min** | kwartalne odświeżanie danych ze skryptów |

---

## Czego nie mówić na scenie (i dlaczego)

| Nie mów | Powód |
|---|---|
| „Prosty język działa na wszystkich widokach" | `t()` jest tylko w `Matchmaking.tsx` — jury kliknie i zobaczy |
| „Admin dodaje innowacje z panelu" | `Admin.tsx` ma tylko `skrzynka \| trendy` — nie ma formularza |
| „Mamy tablicę pomysłów z głosowaniem" | brak `vote` w `store.ts` |
| „Jesteśmy w czterech rolach, w tym JST" | `Role = mieszkaniec \| ROPS \| ekspert` |
| „Dist ma 872 KB" | aktualnie 2865 KB — sprawdź przed slajdem |
| „To są prawdziwe wdrożenia na mapie" | rozmieszczenie jest generowane — powiedz to sam, zanim zapytają |
| „Przetestowaliśmy z użytkownikami" | nie było — mów „test z użytkownikami jest następny" |
| „Mamy RAG / odpowiedzi z dokumentów ze źródłami" | `lib/answers.ts` nie istnieje — nie cytuj ścieżek, których nie ma |
| Ścieżki `vectors.ts`, `digest.ts`, `poster.ts`, `Bell.tsx` | tych plików nie ma w repo |

---

## Ostatnia rada

Trzy rzeczy, które wygrywają tę prezentację, bo są prawdziwe i sprawdzone:

1. **Live: zgłoszenie → luka → panel ROPS → odpowiedź → wróć do autorki.** Pełna
   pętla, jedna przeglądarka, bez serwera. Pokaż, nie opowiadaj.
2. **`npm run test:match` na ekranie** — z pstrągiem na końcu. Uczciwy negatywny
   przypadek jest wart więcej niż dziesięć trafień.
3. **Uczciwe „czego nie udajemy"** — dane mapy, brak backendu w demo, axe = 1/3
   problemów, brak testów z użytkownikami. Jury kupuje uczciwość, nie doskonałość.
