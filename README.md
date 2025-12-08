# NGO-Chatbot (Next.js)

Barrierearmer Beratungs-Chat (Antidiskriminierung / psychosoziale Hilfe) mit OpenAI Chat Completions.

## Setup

1) `.env` anlegen (siehe `.env.example`):
   - `OPENAI_API_KEY=...`

2) Abhängigkeiten installieren:
   ```bash
   npm install
   ```

3) Entwicklung starten:
   ```bash
   npm run dev
   ```
   Dann `http://localhost:3000` öffnen.

## API
- `POST /api/chat`
  ```json
  {
    "message": "Frag etwas",
    "history": [ {"role":"user","content":"..."}, {"role":"assistant","content":"..."} ]
  }
  ```
  Antwort: `{ "reply": "...", "usage": {...}, "model": "gpt-4o-mini" }`

## Design / UX
- Stark kontrastierendes, klares Layout; Fokus-Styling für Tastatur; Screenreader-Labels.
- Safety-Banner mit Notrufhinweis; Antworten kurz (Systemprompt enforce).

## Deployment (Vercel)
- Repo pushen, Vercel connecten.
- In Vercel Project Settings → Environment Variables `OPENAI_API_KEY` setzen.
- Deploy. Fertig.

## Nächste Schritte
- Verlauf im Local Storage persistieren (optional).
- Rate-Limit/Logging & Hilfelinks-Registry nach Ländern ergänzen.
- Stil-Feinschliff oder Markenfarben hinterlegen.
