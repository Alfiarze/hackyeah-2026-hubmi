# TODO — HubMI.pl · plan zadania na hackathon

> **Twarde deadline'y (RULES §2, §4):**
> - **4.10.2026, 11:00** — submit NA HackTribe (po tym terminie = brak oceny, bez wyjątków)
> - 4.10.2026, ~17:45 — rozstrzygnięcie
> - Zgłoszenie po polsku: tytuł + identyfikator zespołu + opis + **PDF ≤10 slajdów ORAZ film MP4 ≤3 min** (RULES §4.9 mówi „oraz" — robimy OBA, opis zadania mówił „lub")
> - Rok temu problem z oddawaniem — **submitujemy najpóźniej 4.10, 08:00** (3h bufora)

Legenda: **P0** = bez tego nie ma gry · **P1** = punkty/przewaga · **P2** = nice-to-have
Właściciele: **J** Janusz · **M** Mati · **P** pecor (infra/deploy) · **AI** Hermes/agent

---

## 1. Dane do bazy matchmakingu — P0 (bez danych matchmaking jest pusty)

- [ ] **P0·AI** Przekopiować przykładowe dane od ROPS (Biblioteka Innowacji, Mapa Wyzwań) → jeden wspólny format JSON/CSV: `{tytuł, opis, kategoria, adresat, etap, źródło}`
- [ ] **P0·M** Wyciągnąć kilka/kilkanaście postów z krakowskich grup miejskich (FB) jako „dane oddolne" — **anonimizacja autorów** (imiona → „Mieszkaniec #1"; zakaz prawdziwych DOWYCH/wrażliwych obowiązuje przy materiałach ROPS, przy FB po prostu nie ryzykujemy)
- [ ] **P1·J** Spróbować pozyskać listę projektów ze zeszłorocznych hackathonów (kontakt: „traczyk") — jak nie wyjdzie do 16:00, odpuszczamy
- [ ] **P2·AI** Skrót z GitHub open-source: projekty civic-tech/obywatelskie jako dodatkowe pozycje bazy
- [ ] **P0·AI** Skrypt seedujący: `data/seed.json` → baza demo (cel: **min. 60–80 pozycji**)

## 2. Matchmaking społeczny (obowiązkowy = 10%) — P0

- [ ] **P0·AI** Input: textarea „opisz swój problem/pomysł" (min. długość, placeholder z przykładem „chcę odbierać śmieci w mieście…")
- [ ] **P0·AI** Silnik dopasowania: słowa kluczowe + proste podobieństwo (PL stemming/stopwords → cosine na TF-IDF albo lokalne embeddingi na mini-PC) → wynik z **% podobieństwa** („30% / 90%")
- [ ] **P0·AI** Wynik wyszukiwania: karta dopasowania + „sieć powiązanych" (inspiracje, gdy strict-match słaby) — przykład do demo: „ratowanie jedzenia" ↔ „dowóz jedzenia seniorom"
- [ ] **P0·AI** CTA na karcie: „Połącz się z autorem" (mock: formularz → zgłoszenie do admina) + „Dlaczego to nie wypaliło?" (konsultacja)
- [ ] **P0·AI** Ścieżka: brak dopasowania → zachęta do zgłoszenia pomysłu (fiszka)
- [ ] **P0·AI** Powiadomienie admina o nowym zgłoszeniu (kryterium „szybkość komunikacji"!) — choćby widoczne badge/panel + e-mail/HTTP hook

## 3. Moduły dodatkowe (+5% każdy; cel: **min. 3**)

- [ ] **P1·AI** **Zasobnik wiedzy** — strona z raportami/mapą wyzwań/Biblioteką Innowacji; szybka aktualizacja = dane z JSON; forma „ciekawa" (filmy/osadzone)
- [ ] **P1·AI** **Kreator pomysłów** — fiszka: krótki opis / istota / adresat / etap realizacji (formularz + lista fiszek)
- [ ] **P1·AI** **Panel administratora + trendy** — widok agregacji zgłoszeń po kategoriach (tylko admin, prosty login) → wykres trendów („gdzie kierować budżet")
- [ ] **P2·AI** **Tester innowacji** — zgłoszenie chęci testów + ocena rozwiązania (gwiazdki + komentarz)
- [ ] **P2·AI** **Komunikacja** — wątek pytań ROPS↔user (mock na demo)
- [ ] **P2·AI** **Middleman** — prompt AI dostosowujący wybraną innowację do formy usługi (może być stub z pregenerowanym przykładem)
- [ ] **P2·AI** Asystent kreatora (podpowiada rozwinięcie pomysłu + wizualizacja) — tylko jeśli starczy czasu

## 4. Landing + formularz — P1

- [ ] **P1·AI** Formularz zgłoszenia problemu/pomysłu na `landing/` (zgłoszenie zatwierdzone przez J) → POST do API/demo-storage
- [ ] **P1·AI** Podpiąć landing jako wejście do platformy (CTA „Zgłoś problem")

## 5. Infra / demo — P (pecor), wsparcie AI

- [ ] **P0·P** Deploy MVP: repo → Coolify/traefik (wzorem landing), domena demo
- [ ] **P0·J+P** **Demo na mini-PC (~2 tys. zł)**: cała platforma chodzi lokalnie na maszynce — pokaz „niskie stałe koszty, skalowanie = dokładka klocka"; przygotować backup plan (nagranie ekranu z mini-PC, gdyby internet padł)
- [ ] **P1·P** Kalkulacja kosztów utrzymania (do prezentacji): hosting ~0 (własny sprzęt) + domena + prąd; architektura skalowalna (kontenery)

## 6. Materiały do zgłoszenia — P0 (wymagane formalnie!)

- [ ] **P0·AI+J** Nazwa platformy (roboczo HubMI.pl; wymyślić własną, chwytliwą) + opis PL
- [ ] **P0·AI** **Prezentacja PDF ≤10 slajdów** (PL): problem → rozwiązanie → demo → matchmaking na danych → moduły → WCAG → koszty → rozwój
- [ ] **P0·AI+J** **Film MP4 ≤3 min** (PL): nagranie ekranu + voiceover; scenariusz: 30s problem / 60s matchmaking na żywo / 45s moduły / 30s koszty+mini-PC / 15s cięcie do ceny
- [ ] **P0·AI** **Makiety UX/UI** (minimum wymagane!) — przynajmniej 3 ekrany: zgłoszenie problemu → dopasowania → panel admina/trendy (Figma/excalidraw/PNG)
- [ ] **P0·J** Identyfikator zespołu + komplet danych na HackTribe
- [ ] **P0·J** **SUBMIT na HackTribe — cel: 4.10, 08:00** (nie 11:00!)

## 7. WCAG 2.1 AA + jakość (20% oceny)

- [ ] **P1·AI** Checklist: kontrast AA, focus-visible, skip-link, aria-labels, `lang="pl"`, klawiaturowość 100%, formularze z labelami + komunikatami błędów, `prefers-reduced-motion`, czytelna typografia (14px+)
- [ ] **P1·M** Test „intuicyjności": osoba spoza zespołu wykonuje zadanie „zgłoś problem i znajdź rozwiązanie" bez instrukcji

## 8. Testy zgodności z kryteriami jury (z CRITERIA §6)

- [ ] Łatwość zgłoszenia problemu — ≤3 kroki od wejścia do wysłania
- [ ] Trafność dopasowania — 3 skryptowane scenariusze demo dają sensowne wyniki
- [ ] Powiadomienie admina — widoczne natychmiast na demo
- [ ] Pomysłowość — wyróżnić na demo to, czego nie ma u konkurencji (FB-dane, % podobieństwa, sieć inspiracji, mini-PC)

---

## Harmonogram orientacyjny (start: sob 3.10 ~13:00)

| Godziny | Co |
|---|---|
| 13–15 | Dane: seed + FB + ROPS (równolegle: nazwa, makiety) |
| 15–19 | Matchmaking end-to-end + powiadomienia; moduł Zasobnik |
| 19–22 | Kreator fiszek + panel admina/trendy; landing formularz |
| 22–02 | Moduł bonusowy (tester/komunikacja); WCAG pass; mini-PC setup |
| 02–06 | PDF + makiety + nagranie filmu; testy scenariuszy demo |
| **06–08** | **SUBMIT HackTribe (bufor!)** + repo porządki |
| 11–17 | Przygotowanie prezentacji przed Jury (PL) |

## Ryzyka

1. **Puste dane = martwy matchmaking** → sekcja 1 jest P0, nie schodzi z haka.
2. **Film/PDF na ostatnią chwilę** → robić równolegle od 20:00, nie po kodowaniu.
3. **Mini-PC nie wstanie na sieci** → backup: video nagrane wcześniej.
4. **Submit po 11:00 = zero** → cel 08:00, dwie osoby znają login do HackTribe.
5. Prawa autorskie: nagroda = umowa przeniesienia praw na PROIDEA (świadoma decyzja zespołu; za to realna szansa wdrożenia z ROPS).
