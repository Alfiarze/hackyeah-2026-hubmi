---
marp: true
theme: default
paginate: true
header: "HubMI — Małopolski Hub Innowacji Społecznych"
footer: "HackYeah 2026 · Województwo Małopolskie / ROPS Kraków"
style: |
  section {
    background-color: #0A0A0B;
    color: #FAFAF9;
    font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
    padding: 38px 55px;
    font-size: 21px;
    line-height: 1.35;
  }
  h1 {
    color: #FAFAF9;
    font-size: 38px;
    margin-bottom: 12px;
    font-weight: 800;
    letter-spacing: -0.02em;
  }
  h2 {
    color: #E3B341;
    font-size: 28px;
    margin-bottom: 14px;
    font-weight: 700;
  }
  h3 {
    color: #FAFAF9;
    font-size: 22px;
    margin-bottom: 10px;
  }
  p {
    margin-top: 6px;
    margin-bottom: 10px;
    color: #D1D5DB;
  }
  ul, ol {
    margin-top: 6px;
    margin-bottom: 10px;
    padding-left: 26px;
  }
  li {
    margin-bottom: 5px;
    color: #D1D5DB;
  }
  strong {
    color: #FAFAF9;
    font-weight: 700;
  }
  em {
    color: #E3B341;
    font-style: normal;
  }
  .accent {
    color: #E3B341;
  }
  .badge {
    background: #1F1F24;
    color: #E3B341;
    border: 1px solid #3F3F46;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 14px;
    font-weight: 600;
    display: inline-block;
    margin-right: 6px;
  }
  .badge-ok {
    background: #064E3B;
    color: #34D399;
    border: 1px solid #059669;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 14px;
    font-weight: 600;
    display: inline-block;
    margin-right: 6px;
  }
  .grid-2 {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    margin-top: 10px;
  }
  .grid-3 {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 14px;
    margin-top: 10px;
  }
  .card {
    background: #16161A;
    border: 1px solid #26262C;
    border-radius: 10px;
    padding: 14px 16px;
  }
  .card h4 {
    color: #E3B341;
    margin: 0 0 6px 0;
    font-size: 18px;
    font-weight: 700;
  }
  .card p {
    font-size: 15px;
    margin: 0;
    color: #A1A1AA;
    line-height: 1.35;
  }
  .highlight-box {
    background: #16161A;
    border-left: 4px solid #E3B341;
    padding: 10px 16px;
    border-radius: 0 8px 8px 0;
    margin: 12px 0;
    font-size: 18px;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 15px;
    margin-top: 8px;
  }
  th {
    background: #1F1F24;
    color: #E3B341;
    text-align: left;
    padding: 6px 10px;
    border-bottom: 2px solid #27272A;
  }
  td {
    padding: 6px 10px;
    border-bottom: 1px solid #1F1F24;
    color: #D1D5DB;
  }
  header, footer {
    font-size: 12px;
    color: #71717A;
  }
---

<!-- _class: lead -->
<!-- _paginate: false -->
# HubMI.pl
## Małopolski Hub Innowacji Społecznych

<div class="highlight-box">
  <em>„Opisz problem własnymi słowami. Pokażemy, co już zadziałało w Małopolsce.”</em>
</div>

Platforma łącząca 10 lat wiedzy **ROPS Kraków** z oddolną energią mieszkańców, samorządów (JST) i NGO.

<div style="margin-top: 24px;">
  <span class="badge-ok">✓ 7/7 Modułów z zadania</span>
  <span class="badge">Model Decyzyjny Jev AI (~300 ms)</span>
  <span class="badge">PostgreSQL 17 + pgvector</span>
  <span class="badge">WCAG 2.1 AA (0 błędów axe)</span>
</div>

<p style="margin-top: 35px; font-size: 14px; color: #71717A;">
  HackYeah 2026 · Zadanie partnerskie Województwa Małopolskiego & ROPS Kraków · Prezentacja konkursowa
</p>

---

## 1. Wyzwanie: Mikro-rozwiązania są. Brakuje warstwy łączącej.

ROPS Kraków w ciągu dekady przetestował **ponad 200 innowacji społecznych**. Jednak do tej pory:

<div class="grid-2">
  <div class="card">
    <h4>Bariera dla mieszkańców i JST</h4>
    <p>Wiedza leży w 76 raportach PDF i tabelach. Obywatel lub wójt szukający pomocy trafia na biurokratyczny język lub nie wie, że sąsiednia gmina rozwiązała ten problem 2 lata temu.</p>
  </div>
  <div class="card">
    <h4>Dublowanie pomysłów</h4>
    <p>Innowatorzy i NGO składają wnioski o granty na rozwiązania, które już zostały sfinansowane i sprawdzone. Brakuje natychmiastowego mechanizmu weryfikacji nowości.</p>
  </div>
</div>

<div class="highlight-box">
  <strong>Nasza teza:</strong> HubMI nie jest kolejnym statycznym katalogiem. To <em>inteligentny mostek</em> — od potocznego opisu trudności życiowej do zweryfikowanego rozwiązania, gotowego partnera i grantu.
</div>

---

## 2. Moduł I: Matchmaking Społeczny (Obowiązkowy)

Użytkownik nie musi znać terminologii urzędowej. Wpisuje np.:
> *„Mama ma początki demencji, mieszka sama na wsi i boimy się, że wyjdzie z domu.”*

<div class="grid-2">
  <div class="card">
    <h4>1. Silnik Leksykalny BM25 + Mostek Pojęciowy</h4>
    <p>22 wątki domenowe wyekstrahowane z realnych 115 kart ROPS. Wagi pól: <strong>problem (3.0)</strong>, <strong>grupa docelowa (2.6)</strong>, <strong>opis (2.0)</strong>. Natychmiastowe ucięcie zapytań spoza domeny.</p>
  </div>
  <div class="card">
    <h4>2. Szybki Model Decyzyjny Jev AI</h4>
    <p>Nie generuje halucynacji: <strong>TypeSafe Decisions API via OpenRouter</strong> ocenia kandydatów w jednej passie (primitiv <code>noul</code>, <code>choice</code>, <code>score</code>) w <strong>~300 ms</strong>, wyliczając prawdopodobieństwo i pewność.</p>
  </div>
</div>

<div class="card" style="margin-top: 14px;">
  <h4>Prawdziwy atut danych ROPS: „Czy to działa?”</h4>
  <p>Aż <strong>111 ze 115 kart</strong> w HubMI posiada udokumentowane wyniki testu laboratoryjnego/terenowego w Małopolsce. Użytkownik widzi czarno na białym, jak innowacja sprawdziła się w praktyce.</p>
</div>

---

## 3. Zaufanie: Pełna wytłumaczalność werdyktu

Jury zapyta: *„Skąd pewność, że wynik jest trafny, a model nie konfabuluje?”*

<div class="highlight-box">
  Odpowiedź: <strong>U nas widać dokładnie, DLACZEGO dana karta pasuje.</strong> Wynik to nie czarna skrzynka LLM, lecz transparentne rozliczenie kryteriów.
</div>

<div class="grid-3">
  <div class="card">
    <h4>Wątki i słowa klucze</h4>
    <p>Podświetlamy rozpoznane wątki (<em>osoby starsze</em>, <em>demencja</em>, <em>wieś</em>) oraz konkretne słowa, które uruchomiły regułę.</p>
  </div>
  <div class="card">
    <h4>Karta i metryka testu</h4>
    <p>Wprost cytujemy fragment pola <em>„Czy to działa?”</em> z karty ROPS, np. wskaźnik poprawy samodzielności.</p>
  </div>
  <div class="card">
    <h4>Werdykt i pewność Jev AI</h4>
    <p>Jev AI zwraca kalibrowaną pewność (np. 88%) oraz zwięzłe uzasadnienie związania problemu z rozwiązaniem.</p>
  </div>
</div>

<p style="margin-top: 14px; font-size: 16px;">
  Automatyczny test regresyjny (<code>npm run test:match</code>): <strong>7 na 7 zapytań walidacyjnych przechodzi w 100%</strong>.
</p>

---

## 4. Gdy nic nie pasuje: Luka staje się cenną daną

Zapytanie skrajne: *„Potrzebuję pomysłu na hodowlę pstrąga w stawie”*
$\rightarrow$ Mostek nie rozpoznaje wątków społecznych, scoring ucięty do **30/100 (LUKA)**.

<div class="grid-2">
  <div class="card">
    <h4>Dla Mieszkańca</h4>
    <p>Brak sztucznego dopasowywania na siłę. Zamiast pustej strony „brak wyników” — przycisk: <em>„Zgłoś to jako potrzebę na tablicę Hubu”</em>. Mieszkaniec inicjuje dyskusję w 1 kliknięcie.</p>
  </div>
  <div class="card">
    <h4>Dla Pracownika ROPS (Admin)</h4>
    <p>Każde niezaspokojone zapytanie trafia do <strong>Panelu Trendów</strong>. System analizuje słowa, których baza nie zna, wskazując luki w usługach społecznych Małopolski.</p>
  </div>
</div>

<div class="highlight-box">
  <strong>Zamknięcie pętli:</strong> Zgłoszona luka $\rightarrow$ dyskusja mieszkańców $\rightarrow$ inspiracja do **nowego naboru grantowego ROPS**.
</div>

---

## 5. Kompletność: Ekosystem 7 Modułów HubMI

<div class="grid-3">
  <div class="card">
    <h4>II. Zasobnik Wiedzy</h4>
    <p><strong>115 innowacji + 76 publikacji</strong> ROPS (Canwy, raporty). Hybrydowe wyszukiwanie: <em>tsvector</em> + <em>pgvector</em> (LSA 48D) + Q&A Jev AI.</p>
  </div>
  <div class="card">
    <h4>III. Kreator Pomysłów</h4>
    <p>Generator fiszek i wniosków grantowych pod <strong>nabór IWS 2.0 (do 120 000 zł)</strong>. Jev AI bada nowość i sugeruje ścieżkę inkubacji.</p>
  </div>
  <div class="card">
    <h4>IV. Tester Innowacji</h4>
    <p>Oceny 1–5, recenzje praktyków, deklaracje pilotażu przez placówki DPS, CUS i WTZ w Małopolsce.</p>
  </div>
  <div class="card">
    <h4>V. Komunikacja</h4>
    <p>Wątki: <em>Mieszkaniec ↔ ROPS ↔ Ekspert</em>. Walidacja problemu („Mam ten problem”), diagnoza pilności przez Jev AI.</p>
  </div>
  <div class="card">
    <h4>VI. Panel Admina</h4>
    <p>Geografia zgłoszeń (22 powiaty), wykresy potrzeb, detekcja nierozpoznanych pojęć i luki usług.</p>
  </div>
  <div class="card">
    <h4>VII. Middleman</h4>
    <p>Kalkulator wdrożenia dla wójtów/NGO, kosztorys obronny przed Radą Gminy + ocena ryzyka Jev AI.</p>
  </div>
</div>

<div class="highlight-box" style="margin-top: 10px; padding: 6px 14px; font-size: 16px;">
  <strong>100% pokrycia specyfikacji UMWM:</strong> Wszystkie 7 modułów działa w interfejsie i posiada dedykowane endpointy API w Django.
</div>

---

## 6. Dostępność (WCAG 2.1 AA) — 20% Oceny Projektu

Dostępność w HubMI to fundament architektoniczny, a nie nakładka:

<div class="grid-3">
  <div class="card">
    <h4>0 naruszeń axe-core</h4>
    <p>Zautomatyzowany audyt Playwright + axe na wszystkich 8 widokach. Baza typograficzna <strong>18px</strong>.</p>
  </div>
  <div class="card">
    <h4>Kontrast 18.95:1</h4>
    <p>Ciemny motyw z głęboką czernią i złotym akcentem Małopolski (norma AA wymaga 4.5:1, my mamy 18.95:1).</p>
  </div>
  <div class="card">
    <h4>Interaktywna Mapa SVG</h4>
    <p>22 powiaty Małopolski w ultralekkim, w pełni dostępnym SVG z klawiatury (bez ociężałego Leafleta).</p>
  </div>
</div>

### 3 Przełączniki Dostępności w pasku górnym:
1. **Prosty język** — przełącza opisy i nagłówki na uproszczony język polski (dla seniorów i osób z niepełnosprawnością poznawczą).
2. **Wysoki kontrast** — profil WCAG AAA o maksymalnej czytelności.
3. **Większy tekst** — skalowanie interfejsu o +25% bez utraty responsywności.

---

## 7. Architektura i Gotowość Wdrożeniowa

<div class="grid-2">
  <div class="card">
    <h4>Ścieżka Demo (100% Offline)</h4>
    <ul>
      <li>Działa bez serwera w przeglądarce (Vite + React 18)</li>
      <li>Baza kart i dokumentów skompilowana statycznie</li>
      <li>Pełna symulacja w <em>localStorage</em></li>
      <li><strong>Zero ryzyka wpadki braku Wi-Fi na prezentacji!</strong></li>
    </ul>
  </div>
  <div class="card">
    <h4>Ścieżka Produkcyjna (Backend)</h4>
    <ul>
      <li><strong>PostgreSQL 17 + pgvector</strong> (wektory LSA 48D)</li>
      <li><strong>Django REST Framework</strong> (7 aplikacji modułowych)</li>
      <li><strong>Jev AI (TypeSafe Decisions API)</strong> — 300 ms</li>
      <li>9/9 testów jednostkowych przechodzi na zielono</li>
    </ul>
  </div>
</div>

<div class="highlight-box">
  <strong>Bezpieczeństwo danych:</strong> Brak gromadzenia danych wrażliwych. Zapytania anonimizowane przed analizą trendów. Gotowość do integracji z węzłem krajowym (login.gov.pl).
</div>

---

## 8. Kosztorys i Utrzymanie: Dlaczego to ma sens dla ROPS?

| Komponent | Wariant Statyczny (MVP) | Wariant Produkcyjny (Skalowanie) |
|---|---|---|
| **Hosting i CDN** | Cloudflare Pages / Netlify: **0 zł** | Serwer VPS (np. OVHcloud / GovCloud): **~500 zł / rok** |
| **Baza danych** | Statyczny JSON w aplikacji: **0 zł** | PostgreSQL 17 + pgvector na VPS: **w cenie serwera** |
| **Silnik AI (Jev)** | Reguły BM25 w przeglądarce: **0 zł** | Jev Decisions API: **~$0.042 / 1M tokenów** (~50 zł / rok) |
| **Kwartalna aktualizacja** | Skrypty scrapujące ROPS: **~15 min pracy** | Panel admina lub auto-sync: **~400 zł / rok** |
| **SUMA ROCZNA** | **0 zł / rok** | **~950 zł / rok** (nie dziesiątki tysięcy!) |

<div class="highlight-box">
  <em>Kluczowa przewaga ekonomiczna:</em> Wybór modelu decyzyjnego <strong>Jev AI</strong> zamiast generatywnego GPU sprawia, że koszty zmienne platformy są niemal zerowe, a system nie wymaga własnej infrastruktury serwerowej AI za setki tysięcy złotych.
</div>

---

<!-- _class: lead -->
## Podsumowanie: Cyfrowe Serce Małopolskiego Hubu

<div class="grid-2">
  <div class="card">
    <h4>Co dowieźliśmy na HackYeah:</h4>
    <ul>
      <li>Kompletne <strong>7 modułów</strong> zgodnych z wytycznymi UMWM</li>
      <li>Działający backend z <strong>PostgreSQL, pgvector i Jev AI</strong></li>
      <li>115 zweryfikowanych kart innowacji z dowodami testów</li>
      <li>Wzorcową dostępność <strong>WCAG 2.1 AA</strong> (0 błędów axe)</li>
    </ul>
  </div>
  <div class="card">
    <h4>Kolejne kroki (Wdrożenie w ROPS):</h4>
    <ul>
      <li><strong>Miesiąc 1:</strong> Pilotaż z 3 wybranymi gminami i CUS</li>
      <li><strong>Miesiąc 2:</strong> Integracja z profilem zaufanym (JST)</li>
      <li><strong>Miesiąc 3:</strong> Start I naboru mikrograntów przez HubMI</li>
    </ul>
  </div>
</div>

<div style="text-align: center; margin-top: 30px;">
  <h3 style="color: #E3B341; margin-bottom: 8px;">Dziękujemy za uwagę! Zapraszamy do testu na żywo.</h3>
  <p style="font-size: 16px; color: #A1A1AA;">Repozytorium: github.com/hackyeah-2026-hubmi · HubMI.pl</p>
</div>
