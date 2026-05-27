# PULZUS(ENGLISH)
 
> AI-powered news intelligence platform — automated ingestion, conflict mapping, sentiment analysis, and fact-checking in a real-time dashboard.
 
[![Dashboard](screenshots/dashboard.png)](https://github.com/lizaako/pulzus/blob/main/fo.png)
[![Fact-check](screenshots/factcheck.png)](https://github.com/lizaako/pulzus/blob/main/elemzes.png)
 
---
 
## What it does
 
**PULZUS** aggregates news from external sources, processes them with AI, and presents the results in an interactive dashboard. It is designed for journalists, analysts, and readers who need to quickly understand what is happening in the world and whether a given article can be trusted.
 
### Core features
 
- **Live news feed** — automatically fetches and stores articles on a schedule
- **3D conflict globe** — interactive globe with color-coded conflict zones, ranked by severity score
- **Sentiment analysis** — average sentiment score across all articles in the selected time window
- **Szonda (fact-check)** — paste any article URL and get an AI verdict: verified/unverified, source credibility rating, political leaning, clickbait index, manipulation score, and psychological technique detection
- **Market view** — market-related news and impact scores per country
- **PDF export** — export the current dashboard state as a PDF report
- **Time filtering** — 24h / 1 week / 1 month views
- **Country filter** — focus the dashboard on a specific country's news impact
---
 
## Tech stack
 
| Layer | Technology |
|---|---|
| Frontend | JavaScript, HTML, CSS |
| Backend | Supabase Edge Functions |
| Database | PostgreSQL (via Supabase) |
| AI / LLM | Groq API |
| News source | GNews API |
| Automation | GitHub Actions (scheduled ingestion) |
| Visualization | 3D globe, real-time charts |
 
---
 
## Architecture
 
```
Frontend (dashboard)
    ↕
Supabase Edge Functions
    ↕                    ↕
GNews API           Groq LLM
    ↓
PostgreSQL (articles table)
```
 
News is ingested on a schedule via GitHub Actions → stored in Postgres → served to the frontend through Edge Functions → AI processing happens on demand (chat, fact-check, sentiment).
 
---
 
## Screenshots
 
### Dashboard — conflict globe + live feed
Real-time conflict zones plotted on a 3D globe, ranked by a composite severity score (article count × sentiment weight). Side panel shows the top active conflict zones in the last 72 hours.
 
### Szonda — AI fact-check
Paste an article link. The system returns:
- **Verdict** (verified / unverified) with reasoning
- **Confidence score** (0–100%)
- **Source credibility rating** and political leaning
- **Title analysis** — clickbait index + accuracy score
- **Manipulation index** — breakdown by technique (sensationalism, emotional amplification, etc.)
---
 
## Setup
 
```bash
git clone https://github.com/lizaako/pulzus
cd pulzus
npm install
```
 
Create a `.env` file:
 
```env
SUPABASE_URL=my_supabase_url
SUPABASE_ANON_KEY=my_anon_key
GNEWS_API_KEY=my_gnews_key
GROQ_API_KEY=my_groq_key
```
 
```bash
npm run dev
```
 
---
 
## About
 
Built independently by a 16-year-old software development student at Biatorbágyi Innovatív Technikum.  
**1st place** at the school's startup competition, judged by executives from Foxpost, CTP Hungary, Vantage Towers, and Provident.

# PULZUS(MAGYAR)

> AI-alapú hírintelligencia platform — automatizált hírgyűjtés, konfliktustérkép, hangulatelemzés és fact-check valós idejű dashboardon.


[![Dashboard](screenshots/dashboard.png)](https://github.com/lizaako/pulzus/blob/main/fo.png)
[![Fact-check](screenshots/factcheck.png)](https://github.com/lizaako/pulzus/blob/main/elemzes.png)

---

## Mit csinál?

A **PULZUS** külső forrásokból gyűjti a híreket, AI segítségével feldolgozza őket, és az eredményeket interaktív dashboardon jeleníti meg. Újságíróknak, elemzőknek és olvasóknak készült, akiknek gyorsan kell átlátniuk a világban zajló eseményeket — és azt, hogy egy adott cikknek mennyire lehet hinni.

### Főbb funkciók

- **Élő hírfolyam** — automatikusan, ütemezetten gyűjti és tárolja a cikkeket
- **3D konfliktuszgömb** — interaktív földgömb, színkódolt konfliktuszónákkal, súlyossági pontszám alapján rangsorolva
- **Hangulatelemzés** — átlagos szentiment-pontszám a kiválasztott időablak összes cikkére
- **Szonda (fact-check)** — illessz be egy cikklinket, és az AI visszaad egy ítéletet: igazolt/nem igazolt, forrás-megbízhatóság, politikai besorolás, clickbait-index, manipulációs pontszám és pszichológiai technikák elemzése
- **Piacok nézet** — gazdasági hírek és országonkénti hatáspontszámok
- **PDF export** — a dashboard aktuális állapotának exportálása PDF riportként
- **Időszűrő** — 24 óra / 1 hét / 1 hónap nézetek
- **Országszűrő** — fókuszálás egy adott ország hírhatására

---

## Tech stack

| Réteg | Technológia |
|---|---|
| Frontend | JavaScript, HTML, CSS |
| Backend | Supabase Edge Functions |
| Adatbázis | PostgreSQL (Supabase) |
| AI / LLM | Groq API |
| Hírforrás | GNews API |
| Automatizáció | GitHub Actions (ütemezett hírgyűjtés) |
| Vizualizáció | 3D földgömb, valós idejű grafikonok |

---

## Architektúra

```
Frontend (dashboard)
        ↕
Supabase Edge Functions
    ↕               ↕
GNews API       Groq LLM
    ↓
PostgreSQL (articles tábla)
```

A hírgyűjtés GitHub Actions segítségével fut ütemezetten → Postgres-be kerül → Edge Functions-ön keresztül jut el a frontendre → az AI feldolgozás igény szerint történik (chat, fact-check, hangulatelemzés).

---

## Képernyőképek

### Dashboard — konfliktuszgömb + élő hírfolyam
Valós idejű konfliktuszónák egy 3D-s földgömbön ábrázolva, összetett súlyossági pontszám alapján rangsorolva (cikkszám × szentiment-súly). A jobb oldali panel az utolsó 72 óra legaktívabb konfliktuszónáit mutatja.

### Szonda — AI fact-check
Illessz be egy cikklinket. A rendszer visszaadja:
- **Ítélet** (igazolt / nem igazolt) indoklással
- **Bizonyossági pontszám** (0–100%)
- **Forrás-megbízhatósági értékelés** és politikai besorolás
- **Cíelemzés** — clickbait-index és pontossági pontszám
- **Manipulációs index** — technikánkénti bontás (szenzációhajhászás, érzelmi felerősítés stb.)

---

## Telepítés

```bash
git clone https://github.com/lizaako/pulzus
cd pulzus
npm install
```

Hozz létre egy `.env` fájlt:

```env
SUPABASE_URL=supabase_url
SUPABASE_ANON_KEY=anon_kulcs
GNEWS_API_KEY=gnews_kulcs
GROQ_API_KEY=groq_kulcs
```

```bash
npm run dev
```

---

## A projektről

Önállóan fejlesztette egy 16 éves szoftverfejlesztő-tanuló, a Biatorbágyi Innovatív Technikum diákja.  
**1. helyezés** az iskola startup versenyén — a zsűriben: Bengyel Ádám (Foxpost társalapítója), Gondi Ferenc (CTP Magyarország ügyvezető igazgatója), Budai J. Gergő (Vantage Towers regionális vezérigazgatója) és Mikola Gergely (Provident vállalati kapcsolatok igazgatója).
