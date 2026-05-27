# PULZUS
 
> AI-powered news intelligence platform — automated ingestion, conflict mapping, sentiment analysis, and fact-checking in a real-time dashboard.
 
![Dashboard](screenshots/dashboard.png)
![Fact-check](screenshots/factcheck.png)
 
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
git clone https://github.com/[username]/pulzus
cd pulzus
npm install
```
 
Create a `.env` file:
 
```env
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
GNEWS_API_KEY=your_gnews_key
GROQ_API_KEY=your_groq_key
```
 
```bash
npm run dev
```
 
---
 
## About
 
Built independently by a 16-year-old software development student at Biatorbágyi Innovatív Technikum.  
**1st place** at the school's startup competition, judged by executives from Foxpost, CTP Hungary, Vantage Towers, and Provident.
