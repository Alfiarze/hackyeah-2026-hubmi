---
marp: true
paginate: true
size: 16:9
header: "HubMI — Małopolski Hub Innowacji Społecznych"
footer: "HackYeah 2026 · Województwo Małopolskie / ROPS Kraków"
style: |
  /* Paleta wzięta z aplikacji (app/src/styles/tokens.css), żeby slajdy i
     zrzuty ekranu nie wyglądały jak dwa różne produkty. */
  :root {
    --ink: #10343a;
    --ink-2: #4a6266;
    --brand: #16756c;
    --mist: #eaf6f4;
    --line: #cfe4e0;
  }
  section {
    background: #ffffff;
    color: var(--ink);
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    font-size: 21px;
    line-height: 1.4;
    padding: 46px 60px 60px;
  }
  header, footer { color: #8aa3a6; font-size: 13px; }
  h1 { font-size: 40px; font-weight: 800; letter-spacing: -0.02em; margin: 0 0 10px; }
  h2 { font-size: 29px; font-weight: 800; color: var(--ink); margin: 0 0 14px;
       border-bottom: 3px solid var(--brand); padding-bottom: 8px; display: inline-block; }
  h3 { font-size: 20px; color: var(--brand); margin: 0 0 6px; }
  strong { color: var(--ink); }
  em { color: var(--brand); font-style: normal; font-weight: 700; }
  ul, ol { margin: 6px 0 10px; padding-left: 24px; }
  li { margin-bottom: 6px; }
  .lead { font-size: 24px; line-height: 1.35; }
  .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 22px; align-items: start; }
  .grid-3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 16px; }
  .card { background: var(--mist); border: 1px solid var(--line);
          border-radius: 12px; padding: 14px 16px; }
  .card h3 { margin-bottom: 4px; }
  .card p { margin: 0; font-size: 16px; color: var(--ink-2); line-height: 1.35; }
  .kpi { font-size: 34px; font-weight: 800; color: var(--brand); line-height: 1.1; }
  .kpi-label { font-size: 14px; color: var(--ink-2); text-transform: uppercase;
               letter-spacing: 0.06em; font-weight: 700; }
  .note { font-size: 15px; color: var(--ink-2); }
  .quote { border-left: 4px solid var(--brand); background: var(--mist);
           padding: 12px 18px; border-radius: 0 10px 10px 0; font-size: 19px; margin: 14px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 16px; }
  th { text-align: left; color: var(--brand); border-bottom: 2px solid var(--line); padding: 7px 8px; }
  td { border-bottom: 1px solid var(--line); padding: 7px 8px; vertical-align: top; }
  img { border-radius: 10px; border: 1px solid var(--line); }
  .shot-right { display: grid; grid-template-columns: 1fr 1.25fr; gap: 24px; align-items: center; }
  .tick { color: var(--brand); font-weight: 800; }
  .gap-sm { margin-top: 22px; }
  .gap-lg { margin-top: 32px; }
  .diagram { margin: 2px 0 16px; }
  .diagram img { width: 100%; height: auto; display: block; border: 0; border-radius: 0; }
  .strip { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 14px; margin: 0 0 18px; }
  .strip img { width: 100%; height: 150px; object-fit: cover; display: block;
               border-radius: 10px; border: 1px solid var(--line); }
  section.lead-slide { background: var(--mist); }
---

<!-- _class: lead-slide -->
<!-- _paginate: false -->

# HubMI — Małopolski Hub Innowacji Społecznych

<p class="lead">
<strong>Opisz problem. Pokażemy, co już zadziałało.</strong>
</p>


<div class="grid-3" style="margin-top: 28px;">
  <div class="card"><div class="kpi">7/7</div><div class="kpi-label">modułów zadania</div></div>
  <div class="card"><div class="kpi">115</div><div class="kpi-label">innowacji z testem</div></div>
  <div class="card"><div class="kpi">0</div><div class="kpi-label">naruszeń WCAG (axe)</div></div>
</div>

---

## Problem: wiedza jest, tylko nikt do niej nie trafia

<div class="strip">
  <img src="screenshots/story/s1-mama.jpg" alt="Starsza osoba idzie sama pustą uliczką, z laską i wózkiem na zakupy." />
  <img src="screenshots/story/s2-anna.jpg" alt="Dłonie na klawiaturze laptopa, wieczorem, w półmroku." />
  <img src="screenshots/story/s3-urzad.jpg" alt="Sesja rady gminy — mieszkanka przemawia przy mównicy." />
</div>

<div class="grid-2">
<div>

**21:40, kuchnia w gminie pod Nowym Sączem.** Anna szuka pomocy dla mamy, która zaczęła wychodzić z domu i nie pamięta drogi powrotnej. Wpisuje to, co naprawdę czuje: *„boimy się, że wyjdzie z domu i nie wróci”*.

Rejestr odpowiada w swoim języku: *„deinstytucjonalizacja”*, *„izolacja społeczna na obszarach peryferyjnych”*.

**Zero trafień.** Anna zamyka laptopa.

A rozwiązanie **istnieje** — trzy gminy dalej, z opisanym wynikiem testu i realizatorem, który odbiera telefon.

</div>
<div class="card">

### Ta sama ściana, druga strona biurka

Wójt wchodzi na sesję Rady Gminy z wnioskiem o grant na pomysł, który **sąsiednia gmina wdrożyła dwa lata temu**. Nie wie o tym, bo ta wiedza leży w PDF-ach.

ROPS przez dekadę przetestował **115 innowacji**. W **111 ze 115** kart jest wprost napisane, co zadziałało — i ani jedna nie dociera do Anny.

</div>
</div>

**Nie brakuje innowacji. Brakuje warstwy, która tłumaczy język człowieka na język instytucji — i odwrotnie.**

---

## Moduł I — matchmaking: rozmowa zamiast formularza

<div class="shot-right">
<div>

Mieszkanka pisze **zwykłym językiem** albo dyktuje głosem. Asystent dopytuje **najwyżej dwa razy** — nie przesłuchuje.

System rozpoznaje obszary (*osoby starsze, samotność, obszary wiejskie*) i porównuje zgłoszenie z bazą przetestowanych innowacji.

</div>

![w:620](screenshots/pitch/p2-wyniki.png)

</div>

---

## Zaufanie: każde trafienie jest rozliczone

<div class="shot-right">
<div>

Nie pokazujemy liczby z czarnej skrzynki, tylko **dlaczego**:

- ile wątków pokrywa i **których nie pokrywa**
- w którym polu karty się zgadza
- **jakie słowa** to uruchomiły — podświetlone w tekście
- cytat z pola *„czy to działa”* — realny wynik testu

**Karta bez wyników testu dostaje niższy wynik** i jest to napisane wprost.

</div>

![w:640](screenshots/pitch/p3-dlaczego-pasuje.png)

</div>

---

## Gdy nic nie pasuje — luka staje się policzalnym popytem

<div class="shot-right">
<div>

Brak dopasowania **nie jest błędem — jest pomiarem**. Każde zapytanie bez trafienia zapisuje się w panelu ROPS z kompletem liczb:

- **ile razy** szukano tego samego rozwiązania, którego nie ma
- **kiedy i jak często** — rozkład w czasie, sezonowość, trend tydzień po tygodniu
- **jakimi słowami** — pojęcia, których Bibliotece brakuje
- **skąd** — w których gminach potrzeba narasta

<div class="quote" style="font-size: 17px;">
To jest <strong>zmierzony popyt na rozwiązanie, które jeszcze nie powstało</strong>: ROPS widzi, co ogłosić w kolejnym naborze, a inwestor albo NGO — jak duży jest rynek, zanim ktokolwiek wyda złotówkę na pilotaż.
</div>

</div>

![w:600](screenshots/pitch/p6-admin-trendy.png)

</div>

---

## Dla gminy: innowacja przeliczona na usługę, nie inspiracja

<div class="shot-right">
<div>

**Middleman** bierze innowację i profil instytucji — typ, liczbę mieszkańców, budżet, obsadę — i zwraca:

- **kroki wdrożenia** z budżetem pilotażu
- **co trzeba zmienić** przy tej skali
- **ryzyka** (np. finansowanie po projekcie)
- **wymogi formalne**: zamówienia publiczne, licencja, granica świadczenia zdrowotnego

To dokument, z którym wójt wchodzi na sesję Rady Gminy.

</div>

![w:620](screenshots/pitch/p5-middleman.png)

</div>

---

## Jak to dowozimy: model decyzyjny, nie generatywny

<div class="grid-3">
<div class="card">

### Ranking liczy nasz kod

BM25 po 7 polach karty plus mostek pojęciowy z 22 wątkami. Wynik jest **deterministyczny**: to samo zapytanie zawsze daje ten sam wynik, a „dlaczego” da się pokazać. Model dostaje krótką listę kandydatów i **dopisuje werdykt obok**, a nie zamiast.

</div>
<div class="card">

### Uruchamialne u ROPS

Odpowiedź w **~300 ms**, bez generowania prozy — nie ma w czym halucynować. Gdy model milczy, **ranking i uzasadnienia zostają te same**. Kev liczy się na **naszym GB10**, więc czas odpowiedzi nie zależy od cudzej kolejki ani limitu zapytań.

</div>
<div class="card">

### Nikt wam tego nie wyłączy

Liczy się **lokalnie**, więc nie zależymy od cennika ani roadmapy dużej firmy. Modele bywają wycofywane kilka dni po premierze — u nas to nie awaria, bo nie ma czego migrować i nie ma zewnętrznego dostawcy, którego trzeba pilnować.

</div>
</div>

<div class="quote">
<strong>Suwerenność danych:</strong> on-premise nie jest tańsze — kupuje się nim kontrolę. Dane mieszkańców Małopolski <em>nie opuszczają Małopolski</em> — Kev liczy się na tym samym komputerze, co baza i API. Żadne zdanie wpisane przez mieszkankę nie trafia do zewnętrznego dostawcy.
</div>

---

## Architektura: trzy kontenery na jednym komputerze GB10

<div class="diagram">
<img src="diagrams/architektura.svg" alt="Schemat: przeglądarka mieszkańca łączy się z Django REST na komputerze GB10 w serwerowni ROPS; tam działa silnik rankingu BM25, baza PostgreSQL z pgvector i model decyzyjny Kev. Nic nie wychodzi poza serwerownię." />
</div>

<div class="grid-3">
<div class="card">

### Ranking: deterministyczny

BM25 po 7 polach karty — od *opisu problemu* (waga 3,0) po *wyniki testu* (0,9) — plus mostek 22 wątków. Te same wagi liczy Django i `match.ts`, więc **przeglądarka daje identyczny wynik nawet bez backendu**.

</div>
<div class="card">

### Kev: pytania, nie prompt

Dostaje kandydatów i **pytania typowane** — tak/nie, wybór z listy, ocena po rubryce — i oddaje odpowiedzi z prawdopodobieństwem w jednej passie. Żadnego generowania tekstu, żadnego klucza do cudzego API.

</div>
<div class="card">

### Awaria modelu ≠ awaria usługi

Klient AI zwraca `None` zamiast wyjątku. Gdy Kev nie odpowie, endpoint **oddaje ten sam ranking i te same uzasadnienia** — znika tylko werdykt obok. Polski stemmer i indeks GIN też są nasze, bez zewnętrznych zależności.

</div>
</div>

---

## Wartość — cztery grupy odbiorców z zadania

| Odbiorca | Co dostaje | Czego dziś nie ma |
|---|---|---|
| **Mieszkańcy i NGO** | opis własnymi słowami lub głosem → rozwiązania **z udokumentowanym testem** i instytucja do kontaktu | pusta lista i wymóg znajomości urzędowego słownika |
| **JST — wójt, OPS, CUS** | wdrożenie policzone na **ich** skali: koszt, obsada, ryzyka, wymogi formalne | inspiracja w PDF-ie, z której nie zrobi się uchwały |
| **Pracownicy ROPS** | skrzynka zgłoszeń, odpowiedzi i **żywe zestawienie niezaspokojonych potrzeb** | diagnoza regionu zamawiana jako osobne badanie |
| **Eksperci branżowi** | wątki z autorami pomysłów, ocena testerska 1–5 z wymaganym komentarzem | brak kanału między doradcą a innowatorem |

<div class="quote">
Dostępność nie jest dopiskiem: baza <strong>18 px</strong> (nie 16 — odbiorcą są seniorzy) z przełącznikiem do 27 px, prosty język, kontrast do <strong>21:1</strong>, mapa z odpowiednikiem tabelarycznym, pełna obsługa klawiaturą.
</div>

---

## Koszty: mniej niż jeden grant — i rachunek, który nie rośnie

<div class="grid-3 gap-sm">
  <div class="card"><div class="kpi">30 tys. zł</div><div class="kpi-label">wdrożenie jednorazowo</div><p><strong>Ćwierć</strong> jednego grantu z naboru IWS 2.0</p></div>
  <div class="card"><div class="kpi">~63 tys. zł</div><div class="kpi-label">utrzymanie rocznie</div><p>Ćwierć etatu koordynatora + utrzymanie techniczne</p></div>
  <div class="card"><div class="kpi">~950 zł</div><div class="kpi-label">sama infrastruktura / rok</div><p>Prąd i backup — bez licencji i bez chmury</p></div>
</div>

<div class="grid-2 gap-lg">
<div class="card">

### Rachunek przewidywalny, nie zmienny

Kev stoi na GB10, więc **nie ma rachunku za tokeny ani limitu zapytań** — koszt zmienny to prąd. 50 tys. zapytań rocznie kosztuje tyle samo, co 5 tys. Budżet na kolejny rok da się zaplanować dziś i **nie zmieni go niczyja decyzja cenowa**.

</div>
<div class="card">

### Zwrot po jednym uniknięciu

Wystarczy, że w ciągu roku **nie** powtórzymy *jednego* już sfinansowanego pomysłu albo *jedna* gmina wdroży gotowe rozwiązanie zamiast projektować je od zera. Przy **182 gminach** to minimum, nie optymizm.

</div>
</div>

<div class="quote gap-lg">
Wracając do Anny: ona nie potrzebuje kolejnego naboru ani kolejnego raportu. Potrzebuje jednego zdania — <em>„to już zadziałało trzy gminy dalej, zadzwoń tutaj”</em>. Tyle kosztuje to jedno zdanie — i stoi na komputerze w serwerowni ROPS, a nie na czyimś API.
</div>
