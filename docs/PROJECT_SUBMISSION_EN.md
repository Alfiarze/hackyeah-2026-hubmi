# HackYeah 2026 — Project Submission Form

## Project Name
**Alfiarze HubMI**

---

## Challenge
**PARTNER TASK [UMWM]: HubMi.pl**

---

## Status
**Published**

---

## Cover Image
Recommended cover image file from repository:
`docs/screenshots/01-matchmaking-start.png` (or `docs/screenshots/02-matchmaking-wyniki.png`)

---

## Idea Stage
**New Idea** (Conceived and developed entirely during HackYeah 2026)

---

## Problem
Across the Małopolska region (comprising 19 powiats, 3 cities with powiat status, and 182 municipalities), hundreds of proven social initiatives have been created. Over the past decade, the Regional Centre for Social Policy in Kraków (ROPS Kraków) has documented **115 thoroughly tested social innovations** and **76 analytical publications** (social diagnoses, model canvases, and the Social Challenge Map). In practice, however, this invaluable institutional knowledge remains shelved and underutilized.

Four critical barriers prevent this knowledge from solving real-life challenges:
1. **The Conceptual & Linguistic Barrier:** Citizens describe hardships using everyday colloquial language (e.g., *"Mom lives alone in a village and has no one to talk to"*), whereas official municipal registries rely on rigid bureaucratic taxonomy (*"social isolation in peripheral rural areas"*). In traditional search engines, this mismatch yields empty lists (0 results).
2. **Empty Results Instead of Actionable Data:** When conventional searches yield no matches, the user's intent is discarded. Local governments lose a vital grassroots diagnostic signal, blinding regional planners to emerging community needs.
3. **The Municipal Implementation Gap:** Mayors, village leaders (wójtowie), and social work directors (OPS / CUS / DPS) lack practical guidance to adapt an innovation into a local service — struggling with cost calculations, required staffing, legal frameworks, and risk mitigation.
4. **Digital Exclusion:** Public municipal tools frequently fail accessibility standards (WCAG), alienating elderly residents, caregivers under acute stress, and persons with disabilities.

---

## Solution
**HubMI** is an intelligent, fully accessible digital ecosystem that connects citizens, local governments (JST), social innovators, and ROPS Kraków into a closed, self-improving operational loop.

### Key Competitive Advantages:
1. **Explainable Social Matchmaking:** Rather than relying on rigid keyword search, HubMI maps natural language onto an ontological conceptual bridge (22 curated social themes) combined with a tuned BM25 engine and the ultra-fast Jev Decision Model (~300ms inference). Every match delivers an explainable breakdown (**"Why this fits"**) — disclosing identified concepts, highlighted text excerpts from verified ROPS test logs, and field match metrics.
2. **"Unmatched Queries are Data, Not Errors":** Unfulfilled queries do not end in blank pages; they are captured and anonymized to fuel the ROPS Trends & Unmet Needs Panel, providing empirical regional evidence to shape future grant cycles.
3. **All 7 Challenge Modules Fully Implemented:**
   - **Module I — Matchmaking:** Colloquial and speech-to-text input (Web Speech API) with a gravity-physics visual interface.
   - **Module II — Knowledge Repository:** 115 cataloged innovations + 76 ROPS publications with hybrid full-text & vector search (pgvector 48D).
   - **Module III — Idea Creator:** Interactive project brief builder + IWS 2.0 grant application generator with print/PDF export.
   - **Module IV — Innovation Pilot Tester:** Practitioner reviews, 1–5 ratings, and pilot adoption declarations from regional facilities.
   - **Module V — Communication Platform:** Structured threads connecting Citizens ↔ Innovators ↔ ROPS with automated urgency triage.
   - **Module VI — Coordinator & Admin Panel:** Geographic distribution map across 22 powiats and unmet needs analytics.
   - **Module VII — Innovation Middleman:** Feasibility calculator for local governments: budget estimation, staffing, municipal council justification, and risk assessments.
4. **Uncompromising Accessibility (WCAG 2.1 AA):** 0 violations in automated axe-core audits across all 8 views, senior-friendly 18px baseline typography (scalable to 27px), Apple Liquid Glass UI with high-contrast mode (up to 21:1 ratio), and a 1-click Plain Language toggle.
5. **Near-Zero Variable AI Cost & High Deployability:** The client-side demo runs 100% offline (~$120/year total hosting), while the production backend is containerized in Docker (PostgreSQL 17 with pgvector + Django REST Framework + Jev Decisions API).

---

## What's Done So Far and Goal of Your Project

### Before the event:
- **Clean slate / Zero prior code:** The project was planned and initiated from scratch at the hackathon.

### Accomplished during the event:
- **100% Functional Frontend:** Built with React 18, TypeScript, and Vite, featuring an iOS-inspired Liquid Glass design, 40+ physics-based gravity tokens, and seamless animations.
- **Complete 7-Module Scope:** Every module specified in the UMWM challenge criteria is fully built and navigable.
- **Integrated Regional Dataset:** All 115 ROPS social innovations (with verified field-test outcomes in 111 of them) and 76 ROPS publications parsed, cataloged, and indexed.
- **Explainable Matchmaking Engine:** Hybrid pipeline combining BM25 lexical ranking, a 22-concept semantic taxonomy, and Jev Decision Model (~300ms evaluation).
- **Automated Regression Suite:** 7 out of 7 validation scenarios pass with 100% precision (`npm run test:match`).
- **Interactive Accessible SVG Map:** All 22 powiats of Małopolska visualized with keyboard navigation and deployment counts.
- **Accessibility Verification:** Verified with Playwright + axe-core with **0 automated accessibility violations** on all 8 views.
- **Production Backend & Containerization:** Complete Django REST Framework backend with PostgreSQL 17 + pgvector and Docker Compose setup.

### Goal of your project:
To deploy HubMI as the official regional innovation hub for Małopolska, empowering 182 municipalities to discover and adopt battle-tested social solutions while providing ROPS with live diagnostic intelligence on unmet citizen needs.

---

## Team Status
**Looking for team members** (Current team size: 1)

### Needed Skills:
- AI & Data Science
- Backend Developer
- Design & UX
- Frontend Developer
- Project/Product Management
- Software Architecture

### Skills Comment:
We welcome civic-tech developers, accessible design specialists (WCAG), and public sector policy experts interested in scaling HubMI into production across local government units (JST) in Poland and integrating with national digital identity (login.gov.pl).

---

## Code Repository
`https://github.com/Alfiarze/hackyeah-2026-hubmi`

---

## Website
`https://github.com/Alfiarze/hackyeah-2026-hubmi`

---

## Your Video Presentation (YouTube Link)
*(Insert your YouTube unlisted/public video link here)*

---

## Presentation File
`docs/prezentacja.pdf` (or `docs/presentation_en.md`)

---

## Instructions on How to Open Project

### Quickstart — Client Demo (Recommended for Jury Evaluation, 60 seconds)
The frontend includes the complete statically compiled dataset (115 innovations, 76 documents, full BM25 search, Jev AI simulation, interactive map, and all 7 modules) and can be evaluated immediately without external database dependencies:

```bash
# 1. Clone repository
git clone https://github.com/Alfiarze/hackyeah-2026-hubmi.git
cd hackyeah-2026-hubmi/app

# 2. Install dependencies
npm install

# 3. Run validation tests
npm run test:match

# 4. Start local development server
npm run dev
```
Open **`http://localhost:5173`** in your browser.

---

### Option 2 — Full Production Stack with Docker (PostgreSQL 17 + pgvector + Django)
To run the complete containerized stack including the REST API backend and vector database:

```bash
# In the root repository folder:
docker compose up --build
```
- Frontend app: `http://localhost:5173`
- Django REST API & Admin: `http://localhost:8000/api/`
- Documentation & Swagger: `http://localhost:8000/api/docs/`
