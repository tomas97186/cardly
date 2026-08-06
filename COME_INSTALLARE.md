# Cardly — installazione su Android + Supabase

Questi file formano una **PWA (Progressive Web App)**: una volta pubblicati su un indirizzo
con HTTPS, Chrome per Android ti propone di installarla come un'app vera, con la sua icona
sulla home e senza barra del browser.

I dati (carte, lotti, vendite, foto) vengono salvati su **Supabase**, un backend con
database Postgres, autenticazione e storage per le foto. Il piano gratuito è più che
sufficiente per uso personale (vedi supabase.com/pricing).

---

## Passo 1 — Crea il progetto Supabase (una tantum, gratis, ~5 minuti)

1. Vai su **supabase.com**, crea un account e un **nuovo progetto** (nome libero, scegli
   una password del database — non ti servirà per l'app, tienila da parte comunque).
2. Nel menu **Authentication → Providers**, verifica che **Email** sia abilitato. In
   **Authentication → Settings**, se vuoi evitare la conferma email durante i test, disattiva
   **"Confirm email"** (puoi riattivarla in seguito).
3. Nel menu **SQL Editor**, apri una nuova query, incolla **tutto** il contenuto del file
   [`supabase/schema.sql`](supabase/schema.sql) di questo progetto ed eseguilo. Crea le
   tabelle dell'inventario e il bucket privato per le foto.
4. Nel menu **Project Settings → API**, copia:
   - **Project URL**
   - **anon public key**

## Passo 2 — Genera i file da pubblicare

Il codice sorgente è organizzato in tanti piccoli file (cartella `src/`) per essere facile
da mantenere, ma il sito va pubblicato come un pacchetto già "compilato" in un'unica
cartella `dist/`. Serve **Node.js** installato sul computer (una tantum, gratis, da
[nodejs.org](https://nodejs.org)) solo per generare quel pacchetto — chi userà l'app poi
non ha bisogno di installare nulla.

1. Copia il file **`.env.example`** in un nuovo file chiamato **`.env.local`** (stessa
   cartella) e incolla i due valori copiati al Passo 1.4:
   ```
   VITE_SUPABASE_URL=https://tuoprogetto.supabase.co
   VITE_SUPABASE_ANON_KEY=eyJ...
   ```
2. Apri un terminale nella cartella del progetto ed esegui, una sola volta:
   ```
   npm install
   ```
3. Ogni volta che vuoi pubblicare (la prima volta, e dopo ogni modifica):
   ```
   npm run build
   ```
   Questo crea/aggiorna la cartella **`dist/`** con tutti i file pronti per l'hosting.

## Passo 3 — Metti i file online

1. Vai su **app.netlify.com/drop** dal computer.
2. Trascina il **contenuto della cartella `dist/`** (non l'intero progetto — `dist/` è
   l'unica cartella che serve online).
3. Ottieni un indirizzo tipo `https://nome-a-caso.netlify.app`.
4. (Consigliato) Crea un account Netlify gratuito e clicca "Claim this site" per rendere
   il sito permanente.

Per aggiornamenti successivi: modifica i file in `src/`, esegui di nuovo `npm run build`, e
ritrascina il contenuto di `dist/` su Netlify (o sullo stesso sito già creato, tramite
"Deploys" → trascina la cartella).

## Passo 4 — Crea il tuo account e installa

1. Apri l'indirizzo con **Chrome** sul telefono.
2. Nella schermata di accesso, tocca **"Non hai un account? Registrati"**, inserisci email e
   password.
3. Da qui in poi l'app funziona normalmente. Per installarla come icona sulla home: menu
   (⋮) → **"Aggiungi a schermata Home"** / **"Installa app"**.

## File inclusi

- `src/` — codice sorgente dell'app, diviso in tanti file per componente/funzione
  (non va pubblicato online direttamente: `npm run build` lo compila in `dist/`)
- `.env.local` — **da creare tu** (copiando `.env.example`) con l'URL e la chiave del tuo
  progetto Supabase; non viene mai pubblicato online (è ignorato da git), viene letto solo
  al momento della build
- `supabase/schema.sql` — lo schema del database da eseguire una volta nel progetto Supabase
- `public/manifest.json` — nome, icona e comportamento dell'app per Android
- `public/sw.js` — cache dei file per un avvio più veloce
- `public/icon-192.png`, `public/icon-512.png` — icona dell'app
- `dist/` — **questa è la cartella che vai a pubblicare**, generata da `npm run build`

## Problemi comuni

- **La schermata di accesso non appare / errore di configurazione** → controlla che
  `.env.local` esista e contenga URL e chiave corretti, poi rilancia `npm run build`
  (le variabili d'ambiente vengono lette solo in fase di build, non a runtime).
- **"Invalid login credentials"** → email o password errate, oppure l'account non esiste
  ancora (usa "Registrati" la prima volta).
- **Le foto non si vedono dopo un po'** → gli URL delle foto scadono dopo un'ora; basta
  riaprire la scheda della carta per generarne uno nuovo.
