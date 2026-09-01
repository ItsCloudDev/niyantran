# Niyantran Terminal (React)

This folder **is** the application. Do not go back to `niyantran-v2.html` for product work.

Static Vite + React, **no backend**. Desks, datasets, and the Brain run on the embedded `data/`
snapshot. Live `/api/rss`, `/api/ohlc`, `/api/askai` stay degraded (empty states) until a backend
exists.

## Run

From this folder (after a one-time extract from the repo root):

```bash
cd niyantran-react
npm install
npm run extract   # copies CSS / JS / data from niyantran-v2.html + data/
npm run dev
```

Open http://127.0.0.1:5173

- **User:** `analyst@niyantran`
- **Password:** `12345678#`

## What React owns

Login, boot progress, and mounting. The twelve desks and the Brain keep the original engine
so behaviour matches the HTML terminal. Re-run `npm run extract` after you change `data/` or
`niyantran-v2.html`.
