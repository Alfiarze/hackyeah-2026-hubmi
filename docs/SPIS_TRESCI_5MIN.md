# Spis treści prezentacji 5 min — business case, wartość, pokrycie wymagań

Dokument towarzyszący skryptowi [`PITCH_5MIN.md`](PITCH_5MIN.md). Tam jest, **co mówić**.
Tutaj jest, **w jakiej kolejności i co to punktuje** — żeby każda sekunda pracowała na którąś z wag oceny.

---

## Jedno zdanie, od którego wszystko się wiesza

> *ROPS ma 115 przetestowanych innowacji społecznych, a mieszkaniec dostaje zero wyników, bo nie zna słowa „deinstytucjonalizacja". HubMI jest warstwą, która tłumaczy jedno na drugie — i pokazuje, dlaczego.*

---

## Agenda — 5 minut rozpisane na bloki

| Czas | Blok | Teza w jednym zdaniu | Co punktuje | Dowód na ekranie |
|---|---|---|---|---|
| **0:00–0:40** | **Problem i jego koszt** | Wiedza kupiona za publiczne pieniądze leży w PDF-ach, a gminy płacą drugi raz za to samo | 40% · pomysłowość | — (mów do jury, nie do ekranu) |
| **0:40–1:10** | **Business case** | Jeden niepowtórzony grant rocznie pokrywa koszt całej platformy | **20% wdrożeniowość** | slajd z kosztorysem |
| **1:10–2:40** | **Demo: ścieżka mieszkanki** | Potoczny opis → trafienia z uzasadnieniem → realizator na mapie → kosztorys dla gminy | **40% spełnienie wyzwania** | moduł I → „dlaczego pasuje" → mapa → Middleman |
| **2:40–3:10** | **Pętla danych** | Brak dopasowania nie jest błędem, jest diagnozą regionu | 40% · pomysłowość | panel trendów (moduł VI) |
| **3:10–3:50** | **Jak to dowozimy** | Model decyzyjny zamiast generatywnego: szybkie, tanie, wytłumaczalne, uruchamialne u ROPS na jednym GB10 | **20% wdrożeniowość** | slajd architektury |
| **3:50–4:20** | **Wartość per odbiorca** | Cztery grupy z zadania, po jednym zdaniu każda | 20% dostępność · 40% | slajd 7 modułów |
| **4:20–4:40** | **Pokrycie wymagań** | 7/7 modułów, WCAG 2.1 AA z dowodem, kosztorys, kod | **wszystkie cztery wagi** | tabela pokrycia |
| **4:40–5:00** | **Prośba** | Nie budżet — trzy gminy i jedna skrzynka na miesiąc pilotażu | — | slajd zamykający |

**Zasada cięcia przy braku czasu:** wylatuje blok 3:50 (wartość per odbiorca). **Nigdy** nie wylatuje „dlaczego to pasuje" ani business case — to są odpowiednio 40% i 20% oceny.

---

## 1. Business case — liczby, które mają się obronić

Trzy zdania, w tej kolejności:

**Koszt po stronie ROPS.** Utrzymanie produkcyjne to **~950 zł rocznie infrastruktury** i **~63 tys. zł rocznie razem z ludźmi** (ćwierć etatu koordynatora treści + utrzymanie techniczne + roczny audyt dostępności). Wdrożenie jednorazowo: **80–120 tys. zł**.

**Punkt odniesienia.** Jeden grant w naborze IWS to **do 120 tys. zł**. Czyli całe wdrożenie mieści się w budżecie **jednego** grantu, a roczne utrzymanie w **połowie** jednego grantu.

**Zwrot.** Wystarczy, że platforma w ciągu roku zapobiegnie **jednemu** dublującemu się wnioskowi albo pozwoli **jednej** gminie wdrożyć gotowe rozwiązanie zamiast projektować je od zera — i koszt się zwraca. Przy 182 gminach to nie jest optymistyczne założenie, to minimum.

**Dlaczego to jest tanie i nie zdrożeje.** Ranking liczy nasz kod — koszt zmienny zero. Model dostaje **jedno wywołanie na zapytanie** przy ~$0,042 za milion tokenów, czyli 50 tys. zapytań rocznie to dziesiątki złotych. Nie ma GPU do karmienia, nie ma licencji, odczyt katalogu idzie z CDN.

> **Zdanie do powiedzenia:** *„To nie jest system za setki tysięcy. To koszt jednego grantu na wdrożenie i pół grantu na rok działania — przy czym pierwszy rok sam sobie na siebie zarobi, jeśli choć raz nie powtórzymy już sfinansowanego pomysłu."*

---

## 2. Wartość — po jednym zdaniu na grupę odbiorców

Zadanie wymienia **cztery grupy**. Jury sprawdza, czy każda ma wejście.

| Odbiorca | Co dostaje | Czego dziś nie ma |
|---|---|---|
| **Mieszkańcy i NGO** | opisują trudność swoimi słowami albo głosem, dostają rozwiązania **z udokumentowanym testem** i instytucję do kontaktu | pustą listę wyników i wymóg znajomości urzędowego słownika |
| **JST (wójt, OPS, CUS)** | Middleman przelicza innowację na usługę **ich** gminy: koszt przy ich skali, obsada, kroki, ryzyka, wymogi formalne | inspiracja w PDF-ie, z której nie da się zrobić uchwały |
| **Pracownicy ROPS** | panel zgłoszeń, odpowiedzi i **żywe zestawienie niezaspokojonych potrzeb** powstające z samych zapytań | diagnoza regionu zamawiana jako osobne badanie |
| **Eksperci branżowi** | wątki z autorami pomysłów, ocena testerska 1–5 z wymaganym komentarzem | brak kanału między doradcą a innowatorem |

---

## 3. Pokrycie wymagań — tabela na jeden slajd

**Moduły (40% oceny — matchmaking 10% + 6 × 5%):**

| Moduł | Stan |
|---|---|
| I Matchmaking społeczny (**obowiązkowy**) | ✅ opis potoczny i głosowy, uzasadnienie, mechanizm luki |
| II Zasobnik wiedzy | ✅ 115 innowacji (26 z filmem) + dokumenty ROPS, aktualizacja z panelu, trendy tylko dla admina |
| III Kreator pomysłów | ✅ fiszka + generator wniosku IWS + Canwy + weryfikator nowości |
| IV Tester innowacji | ✅ zgłoszenie do testów, ocena 1–5 z komentarzem |
| V Platforma komunikacji | ✅ wątki ROPS ↔ użytkownik, kontakt z realizatorem |
| VI Panel administratora | ✅ skrzynka, odpowiedzi, niezaspokojone potrzeby i trendy |
| VII Middleman Innowacji | ✅ innowacja → usługa konkretnej instytucji |

**Wymagane elementy rezultatu:**

| Wymóg zadania | Stan |
|---|---|
| Działający prototyp (MVP), nie makieta | ✅ 7 modułów + backend + baza |
| Wizualizacja: minimum makiety UX/UI | ✅ działająca aplikacja + 13 zrzutów |
| **Dostępność WCAG 2.1 AA** | ✅ 0 naruszeń axe na 8 widokach, 18→27 px, kontrast do 21:1, prosty język |
| Skalowalność, integracje, bezpieczeństwo | ✅ Docker + Postgres, warstwa danych odizolowana, brak danych wrażliwych |
| **Koszt utrzymania i niezbędne zasoby** | ✅ policzone w dwóch wariantach |
| Zakaz prawdziwych danych osobowych/wrażliwych | ✅ dane demo opisane wprost w interfejsie |

> **Zdanie do powiedzenia:** *„Zadanie wymagało jednego modułu obowiązkowego. Dowieźliśmy siedem, dostępność z dowodem w postaci powtarzalnego audytu i policzony koszt utrzymania — czyli wszystkie cztery kryteria oceny, nie tylko to najłatwiejsze do pokazania."*

---

## 4. Cztery pytania kontrolne jury — gdzie na nie odpowiadasz

Zadanie podaje je wprost. Każde ma swój moment w prezentacji:

| Pytanie jury | Blok, w którym pada odpowiedź |
|---|---|
| Czy mieszkaniec bez przygotowania technicznego to wypełni? | 1:10 — wpisujesz potoczne zdanie, pokazujesz mikrofon |
| Jak system powiadamia admina i jak wraca odpowiedź do autora? | 2:40 — panel trendów; **przeklikaj pętlę, nie opowiadaj jej** |
| Czy trafnie sugeruje innowacje na podstawie słów z opisu? | 1:40 — „dlaczego to pasuje" + 7/7 testów |
| Nowa jakość czy zlepek funkcji innych portali? | 2:40 i 3:10 — luka jako dana, Middleman, przeszukanie bazy modelem |

---

## 5. Czego nie mówić

- **Nie sprzedawaj GB10 jako oszczędności** — on-premise jest ~100× droższy od API. Sprzedajesz nim **suwerenność danych**, nie koszt.
- **Nie obiecuj modelu lokalnie jako faktu** — obiecujesz ścieżkę i jedną zmienną środowiskową.
- **Nie mów „dostępne"** — mów „zero błędów wykrywalnych automatycznie", bo axe łapie ok. jednej trzeciej problemów.
- **Nie mów o wizualizacji przedmiotu w Kreatorze** — zadanie wymienia ją jako „mile widzianą", nie macie jej, a sam temat otwierasz tylko sobie.
- **Nie obiecuj hybrydowego wyszukiwania w interfejsie** — jest gotowe w API, ale UI z niego nie korzysta.

---

## 6. Zanim wejdziesz — trzy rzeczy do odhaczenia

1. **Backend musi odpowiadać.** Moduł I nie ma trybu offline. Sprawdź `/api/health/` i miej hotspot z telefonu.
2. **Przelicz audyt dostępności** (`npm run audit`) — raport jest starszy niż ostatnie zmiany w interfejsie, a liczba „0 naruszeń" pada na slajdzie.
3. **Zweryfikuj liczbę dokumentów.** Materiały mówią o **76** publikacjach ROPS, a baza zwraca **74**. Podaj tę, którą da się pokazać na ekranie — rozbieżność w liczbie, którą sam wymawiasz, jest najtańszym możliwym sposobem na podkopanie reszty wystąpienia.
