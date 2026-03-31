# PULZUS

## AI hír-chat backend bekötése

A frontend már tudja hívni a `news-chat` végpontot, de a Groq kulcsot biztonságosan a backendben kell tárolni.

### 1. Supabase CLI használata

Használd `npx`-szel:

```bash
npx supabase login
```

### 2. Jelentkezz be a Supabase-be

```bash
npx supabase login
```

### 3. Linkeld a projektet

```bash
npx supabase link --project-ref vrquxovkptfigrjsmhng
```

### 4. Állítsd be a Groq secretet

```bash
npx supabase secrets set GROQ_API_KEY=ide_ird_a_sajat_groq_kulcsodat
```

Fontos:
- a kulcsot ne tedd `VITE_` változóba
- ne írd bele frontend fájlba
- ne tedd bele `index.html`-be

### 5. Deployold az Edge Functiont

```bash
npx supabase functions deploy news-chat
```

### 6. Opcionális helyi fejlesztés

Helyi function futtatás:

```bash
npx supabase functions serve news-chat --env-file .env.example
```

Ehhez a saját `.env` vagy külön env fájlodban add meg a valódi `GROQ_API_KEY` értéket.

### 7. Frontend végpont

Alapértelmezetten a frontend ezt a Supabase function URL-t próbálja elérni:

```txt
https://vrquxovkptfigrjsmhng.supabase.co/functions/v1/news-chat
```

Ha máshova szeretnéd irányítani, állítsd be:

```bash
VITE_NEWS_CHAT_API_URL=https://sajat-backended.hu/api/news-chat
```

## A létrehozott fájlok

- `supabase/functions/news-chat/index.ts`
- `supabase/functions/news-chat/deno.json`
- `.env.example`

## Mit csinál a function?

- megkapja a kiválasztott cikket és a felhasználó kérdését
- elküldi a Groq modellnek
- mindig magyar válaszra utasítja a modellt
- visszaadja a választ a frontend chatnek

## Élő hírfrissítés 10 percenként

Most már van egy külön hírbetöltő function is:

- `supabase/functions/news-ingest/index.ts`

Ez a function:
- friss híreket kér le a GNews API-ból
- Groq-val elemzi őket
- eltárolja az `articles` táblában
- kihagyja a már létező URL-eket

### Szükséges secretek

```bash
npx supabase secrets set GROQ_API_KEY=ide_a_groq_kulcs
npx supabase secrets set GNEWS_API_KEY=ide_a_gnews_kulcs
```

### Deploy

```bash
npx supabase functions deploy news-ingest
```

### Kézi teszt

```bash
curl -X POST https://vrquxovkptfigrjsmhng.supabase.co/functions/v1/news-ingest
```

### Időzítés 10 percre

Futtasd le a [schedule-news-ingest.sql](/home/lizak/2025-26-js-csharp/projektnapok/pulzus/supabase/sql/schedule-news-ingest.sql) tartalmát a Supabase SQL Editorban.

Ez 10 percenként meghívja a `news-ingest` functiont.
