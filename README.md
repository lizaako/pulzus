# PULZUS

## AI hír-chat backend bekötése

A frontend már tudja hívni a `news-chat` végpontot, de a Groq kulcsot biztonságosan a backendben kell tárolni.

### 1. Supabase CLI telepítése

Ha még nincs telepítve:

```bash
npm install -g supabase
```

### 2. Jelentkezz be a Supabase-be

```bash
supabase login
```

### 3. Linkeld a projektet

```bash
supabase link --project-ref vrquxovkptfigrjsmhng
```

### 4. Állítsd be a Groq secretet

```bash
supabase secrets set GROQ_API_KEY=ide_ird_a_sajat_groq_kulcsodat
```

Fontos:
- a kulcsot ne tedd `VITE_` változóba
- ne írd bele frontend fájlba
- ne tedd bele `index.html`-be

### 5. Deployold az Edge Functiont

```bash
supabase functions deploy news-chat
```

### 6. Opcionális helyi fejlesztés

Helyi function futtatás:

```bash
supabase functions serve news-chat --env-file .env.example
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
