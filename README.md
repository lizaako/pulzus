

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
