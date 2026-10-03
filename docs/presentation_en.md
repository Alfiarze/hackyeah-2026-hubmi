---
marp: true
theme: default
paginate: true
header: "HubMI — Małopolska Social Innovation Hub"
footer: "HackYeah 2026 · Małopolska Region / ROPS Kraków"
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
## Małopolska Social Innovation Hub

<div class="highlight-box">
  <em>“Describe your challenge in your own words. We’ll show you what has already worked in Małopolska.”</em>
</div>

A digital platform connecting 10 years of **ROPS Kraków** institutional knowledge with the grassroots energy of citizens, local governments (JST), and NGOs.

<div style="margin-top: 24px;">
  <span class="badge-ok">✓ 7/7 Challenge Modules</span>
  <span class="badge">Jev AI Decision Model (~300 ms)</span>
  <span class="badge">PostgreSQL 17 + pgvector</span>
  <span class="badge">WCAG 2.1 AA (0 axe violations)</span>
</div>

<p style="margin-top: 35px; font-size: 14px; color: #71717A;">
  HackYeah 2026 · Partner Task: Marshal’s Office of Małopolska Region & ROPS Kraków · Pitch Deck
</p>

---

## 1. The Challenge: Proven Micro-Solutions Exist. The Connecting Layer is Missing.

Over the past decade, ROPS Kraków has verified and tested **over 200 social innovations**. However, until now:

<div class="grid-2">
  <div class="card">
    <h4>Barrier for Citizens & Local Governments</h4>
    <p>Knowledge is locked inside 76 PDF reports and tables. A citizen or village mayor seeking help faces impenetrable bureaucracy and never learns that a neighbouring municipality solved this exact problem 2 years ago.</p>
  </div>
  <div class="card">
    <h4>Duplication of Ideas</h4>
    <p>Innovators and NGOs apply for grants for concepts that have already been funded and proven ineffective. There is no instant verification mechanism for genuine novelty.</p>
  </div>
</div>

<div class="highlight-box">
  <strong>Our Core Thesis:</strong> HubMI is not another static document registry. It is an <em>intelligent bridge</em> — moving from a colloquial description of everyday struggle to a proven solution, a ready partner, and grant funding.
</div>

---

## 2. Module I: Social Matchmaking (Mandatory)

Users do not need to know official legal terms. They simply type or speak:
> *“Mom has early-stage dementia, lives alone in a village, and we’re worried she’ll wander off.”*

<div class="grid-2">
  <div class="card">
    <h4>1. Lexical BM25 Engine + Conceptual Bridge</h4>
    <p>22 domain concepts extracted from 115 real ROPS innovation profiles. Custom field weighting: <strong>problem (3.0)</strong>, <strong>target group (2.6)</strong>, <strong>description (2.0)</strong>. Immediate boundary cutoff for off-domain queries.</p>
  </div>
  <div class="card">
    <h4>2. Fast Jev AI Decision Model</h4>
    <p>Zero hallucinations: <strong>TypeSafe Decisions API via OpenRouter</strong> evaluates candidates in a single forward pass (primitives: <code>noul</code>, <code>choice</code>, <code>score</code>) in <strong>~300 ms</strong>, computing calibrated probability and confidence.</p>
  </div>
</div>

<div class="card" style="margin-top: 14px;">
  <h4>The True Value of ROPS Data: “Did it work?”</h4>
  <p><strong>111 out of 115 cards</strong> in HubMI feature documented real-world laboratory and field test results from Małopolska. Users see hard empirical proof of how the solution performed in practice.</p>
</div>

---

## 3. Trust: Full Explainability of the Verdict

Judges will ask: *“How can we be certain the result is accurate and the model isn’t confabulating?”*

<div class="highlight-box">
  Answer: <strong>HubMI explicitly discloses WHY a specific card matches.</strong> Results are not an LLM black box, but a transparent audit of criteria.
</div>

<div class="grid-3">
  <div class="card">
    <h4>Themes & Keywords</h4>
    <p>We highlight detected social concepts (<em>elderly persons</em>, <em>dementia</em>, <em>rural</em>) and the exact keywords that triggered the rule.</p>
  </div>
  <div class="card">
    <h4>Card & Test Metrics</h4>
    <p>Direct quotations from the <em>“Did it work?”</em> section of the ROPS profile, e.g. documented self-reliance improvement percentages.</p>
  </div>
  <div class="card">
    <h4>Jev AI Verdict & Confidence</h4>
    <p>Jev AI provides a calibrated score (e.g. 88%) and a concise rationale linking the user’s situation to the tested innovation.</p>
  </div>
</div>

<p style="margin-top: 14px; font-size: 16px;">
  Automated regression test suite (<code>npm run test:match</code>): <strong>7 out of 7 validation scenarios pass with 100% precision</strong>.
</p>

---

## 4. When Nothing Matches: A Gap Becomes Invaluable Data

Edge query: *“I need an idea for a trout fish farm in a breeding pond”*
$\rightarrow$ Conceptual bridge identifies zero social themes; scoring cut off to **30/100 (SERVICE GAP)**.

<div class="grid-2">
  <div class="card">
    <h4>For the Citizen</h4>
    <p>No artificial forced matches. Instead of a demoralizing blank “0 results” page, a clear action appears: <em>“Report this as a need to the regional board”</em>. One click initiates a public dialogue.</p>
  </div>
  <div class="card">
    <h4>For ROPS Coordinators (Admin)</h4>
    <p>Every unfulfilled query feeds the <strong>Regional Trends Panel</strong>. The engine tracks unknown keywords, uncovering systemic deficits in regional social services across Małopolska.</p>
  </div>
</div>

<div class="highlight-box">
  <strong>Closing the Loop:</strong> Unmatched gap $\rightarrow$ community discussion $\rightarrow$ empirical justification for a **new ROPS grant call**.
</div>

---

## 5. Completeness: The 7-Module Ecosystem of HubMI

<div class="grid-3">
  <div class="card">
    <h4>II. Knowledge Repository</h4>
    <p><strong>115 innovations + 76 publications</strong> (toolkits, model canvases). Hybrid search: <em>tsvector</em> + <em>pgvector</em> (LSA 48D) + Jev AI Q&A.</p>
  </div>
  <div class="card">
    <h4>III. Idea Creator</h4>
    <p>Interactive brief generator for <strong>IWS 2.0 grant calls (up to 120,000 PLN)</strong>. Jev AI validates novelty and recommends an incubation path.</p>
  </div>
  <div class="card">
    <h4>IV. Innovation Pilot Tester</h4>
    <p>1–5 star reviews, feedback from frontline social workers, and pilot adoption declarations from regional DPS, CUS, and WTZ facilities.</p>
  </div>
  <div class="card">
    <h4>V. Communication Platform</h4>
    <p>Structured threads: <em>Citizen ↔ ROPS ↔ Innovator</em>. Upvote verification (“I face this issue too”) and priority triage by Jev AI.</p>
  </div>
  <div class="card">
    <h4>VI. Admin Panel</h4>
    <p>Geographic map across all 22 powiats, unmet demand heatmaps, and detection of unserved community needs.</p>
  </div>
  <div class="card">
    <h4>VII. Middleman</h4>
    <p>Rollout calculator for mayors and NGOs: implementation cost breakdown, staffing ratios, council defense arguments, and risk matrix.</p>
  </div>
</div>

<div class="highlight-box" style="margin-top: 10px; padding: 6px 14px; font-size: 16px;">
  <strong>100% Coverage of UMWM Criteria:</strong> All 7 modules are operational in the interface and backed by dedicated Django REST API endpoints.
</div>

---

## 6. Accessibility (WCAG 2.1 AA) — 20% of Project Evaluation

In HubMI, accessibility is an architectural pillar, not an afterthought:

<div class="grid-3">
  <div class="card">
    <h4>0 axe-core Violations</h4>
    <p>Automated Playwright + axe-core audit across all 8 views. Senior-optimized <strong>18px baseline</strong> typography.</p>
  </div>
  <div class="card">
    <h4>18.95:1 Contrast Ratio</h4>
    <p>Apple Liquid Glass dark theme with pure white text and regional gold accents (AA requires 4.5:1, HubMI delivers 18.95:1).</p>
  </div>
  <div class="card">
    <h4>Interactive Accessible SVG Map</h4>
    <p>22 Małopolska powiats rendered in ultra-lightweight, 100% keyboard-navigable SVG without heavy third-party map libraries.</p>
  </div>
</div>

### 3 Global Accessibility Toggles in Header:
1. **Plain Language (Elysia)** — Rewrites bureaucratic jargon into simplified Polish for seniors and individuals with cognitive impairments.
2. **High Contrast** — WCAG AAA monochrome profile for maximum legibility.
3. **Larger Typography** — Scales all UI elements by +25% while maintaining fluid responsive layout.

---

## 7. Architecture & Deployment Readiness

<div class="grid-2">
  <div class="card">
    <h4>Demo Track (100% Offline)</h4>
    <ul>
      <li>Runs entirely in-browser without a server (Vite + React 18)</li>
      <li>All 115 cards and 76 documents statically bundled</li>
      <li>Full state simulation in <em>localStorage</em></li>
      <li><strong>Zero risk of live Wi-Fi failure during jury presentations!</strong></li>
    </ul>
  </div>
  <div class="card">
    <h4>Production Track (Full Stack)</h4>
    <ul>
      <li><strong>PostgreSQL 17 + pgvector</strong> (LSA 48D semantic embeddings)</li>
      <li><strong>Django REST Framework</strong> (7 modular applications)</li>
      <li><strong>Jev AI (TypeSafe Decisions API)</strong> — 300 ms response</li>
      <li>Automated test suite passing 100%</li>
    </ul>
  </div>
</div>

<div class="highlight-box">
  <strong>Data Privacy & Security:</strong> No personal or sensitive data is collected. Search queries are stripped of personal identifiers before trend aggregation. Ready for national e-ID (login.gov.pl) integration.
</div>

---

## 8. Budget & Maintenance: Why This Makes Sense for ROPS

| Component | Static MVP Track | Production Scaling Track |
|---|---|---|
| **Hosting & Global CDN** | Cloudflare Pages / Vercel: **$0 / year** | Regional VPS (OVHcloud / GovCloud): **~$120 / year** |
| **Database** | Static JSON in client bundle: **$0** | PostgreSQL 17 + pgvector on VPS: **Included in VPS** |
| **AI Inference (Jev)** | In-browser BM25: **$0** | Jev Decisions API: **~$0.042 / 1M tokens** (~$15 / year) |
| **Catalog Maintenance** | Automated scraper sync scripts: **15 min/quarter** | Admin portal or auto-sync: **~$100 / year** |
| **TOTAL ANNUAL COST** | **$0 / year** | **~$235 / year** (Not hundreds of thousands!) |

<div class="highlight-box">
  <em>Key Economic Advantage:</em> Choosing the <strong>Jev AI Decision Model</strong> over an expensive dedicated GPU cluster keeps variable costs virtually at zero and avoids costly ongoing cloud infrastructure contracts.
</div>

---

<!-- _class: lead -->
## Conclusion: The Digital Heart of the Małopolska Hub

<div class="grid-2">
  <div class="card">
    <h4>What We Delivered at HackYeah:</h4>
    <ul>
      <li>Complete <strong>7 modules</strong> fulfilling 100% of UMWM specifications</li>
      <li>Functional backend with <strong>PostgreSQL, pgvector, and Jev AI</strong></li>
      <li>115 verified innovation profiles with empirical test proofs</li>
      <li>Flawless <strong>WCAG 2.1 AA accessibility</strong> (0 axe violations)</li>
    </ul>
  </div>
  <div class="card">
    <h4>Next Steps (Rollout with ROPS Kraków):</h4>
    <ul>
      <li><strong>Month 1:</strong> Pilot launch with 3 selected municipalities and CUS centres</li>
      <li><strong>Month 2:</strong> Integration with trusted profile (login.gov.pl) for local councils</li>
      <li><strong>Month 3:</strong> Launch of first municipal microgrant competition through HubMI</li>
    </ul>
  </div>
</div>

<div style="text-align: center; margin-top: 30px;">
  <h3 style="color: #E3B341; margin-bottom: 8px;">Thank you for your attention! We invite you to test HubMI live.</h3>
  <p style="font-size: 16px; color: #A1A1AA;">Repository: github.com/Alfiarze/hackyeah-2026-hubmi · HubMI.pl</p>
</div>
