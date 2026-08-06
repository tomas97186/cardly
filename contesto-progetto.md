# Cardly — contesto del progetto

## Cos'è

App di gestione inventario per un business di carte collezionabili (Pokémon, One Piece,
estendibile ad altro). Copre l'intero ciclo: acquisto (carta singola o lotto) → catalogazione
→ eventuale messa in vendita → vendita (singola o multipla/in blocco) → reportistica su
spesa, incasso e margine.

Esiste in due forme, stesso codice React alla base:
1. **Artifact Claude** — gira dentro claude.ai, dati salvati tramite lo storage persistente di Claude.
2. **PWA installabile su Android** — stessa interfaccia impacchettata come app web installabile
   (icona sulla home, schermo intero), dati salvati su Supabase (Postgres + Auth + Storage),
   con account email/password veri e sync multi-dispositivo. Prima usava Google Drive via OAuth
   client-side: quella integrazione è stata ritirata in favore di un backend vero, anche per
   porre le basi a future funzioni a pagamento.

## Principio guida

**Non inventare mai numeri che non si conoscono.** È il filo conduttore di quasi ogni
decisione di design:
- Un lotto acquistato ha un prezzo totale, ma le carte al suo interno NON vengono divise
  automaticamente per quel prezzo — l'utente le cataloga una per una, assegnando un costo
  solo se/quando lo conosce.
- Se il costo di una carta non è specificato, l'app lo segnala chiaramente invece di
  stimarlo, e la esclude dai calcoli di margine (mostrando comunque l'incasso, separatamente).
- Una vendita "in blocco" (più carte per un prezzo totale unico) non spacca il prezzo tra le
  carte: calcola il margine complessivo solo se il costo di *tutte* le carte coinvolte è noto.

## Modello dati

Due tipi di voci in inventario:
- **Carta singola**: acquisto diretto di una carta, con costo, condizione, categoria, foto.
- **Lotto**: acquisto contenitore (prezzo totale + numero di carte dichiarato). Le carte al
  suo interno si aggiungono in un secondo momento, anche solo alcune, ciascuna con nome,
  condizione, e un costo *opzionale*.

Ogni carta (singola o dentro un lotto) ha uno stato: **in magazzino** → **in vendita**
(opzionale, con prezzo richiesto/piattaforma/link annuncio) → **venduta** (con prezzo reale,
acquirente, corriere, tracciamento).

Le vendite possono essere:
- **individuali** (una carta, un prezzo)
- **di gruppo/in blocco**: più carte selezionate liberamente da tutto l'inventario — anche
  carte singole insieme a carte di lotti diversi — vendute per un prezzo totale unico,
  inserito una sola volta insieme ai dati della vendita.

## Sezioni dell'app

- **Dashboard**: investito, valore in magazzino, incassato, margine (con filtro periodo:
  mese, anno, intervallo personalizzato), vendite recenti.
- **Inventario**: griglia di tutto ciò che si possiede, filtri (gioco/stato), ricerca,
  ordinamento (recenti/prezzo/nome). Da qui si aggiungono nuovi acquisti (carta o lotto) e si
  apre il dettaglio di un lotto per catalogarne le carte.
- **In Vendita**: tutto ciò che è stato messo in vendita, con filtro per piattaforma e fascia
  di prezzo.
- **Vendite**: storico vendite (individuali e di gruppo), statistiche su ricavi/costo
  noto/margine, con pulsante "+" per avviare una vendita multipla cercando le carte da
  includere ovunque si trovino nell'inventario.
- **Ricerca globale**: icona in alto, cerca per nome/set su qualunque carta o lotto
  indipendentemente da stato o sezione, e porta dritti al dettaglio.

L'ordinamento è sempre visibile accanto al contatore risultati; i filtri veri e propri restano
nascosti dietro un pulsante "Filtri" con badge del numero di filtri attivi.

## Altri dettagli implementati

- Più foto per ogni carta/lotto (fino a 6, ridimensionate lato client prima del
  salvataggio) — la prima è la copertina mostrata in griglia e negli elenchi; nei dettagli
  si vedono tutte in una galleria con visualizzatore a schermo intero.
- Esportazione CSV completa (inclusi lotti, quote non assegnate, vendite di gruppo).
- Corriere e numero di tracciamento sulle vendite.
- Migrazione automatica di eventuali dati salvati con lo schema precedente.

## Implementazione tecnica

- **Codice sorgente modulare** sotto `src/`, un file per componente/funzione invece di un
  unico file da migliaia di righe:
  - `src/lib/` — logica pura senza JSX: `theme.js` (design tokens, opzioni), `format.js`,
    `period.js`, `sort.js`, `saleUnits.js` (appiattimento vendite/vendite di gruppo),
    `image.js` (resize foto), `storage.js` (wrapper `window.storage`), `migrations.js`,
    `csv.js` (export).
  - `src/components/ui/` — atomi riutilizzabili (Badge, Field, Inputs, Buttons, Photo,
    Modal, PeriodFilter, SortSelect, FilterToggle, StatCard, ItemCard).
  - `src/components/forms/` — form di acquisto/modifica/vendita/messa in vendita/vendita
    multipla.
  - `src/components/details/` e `src/components/search/` — modali di dettaglio e ricerca
    globale.
  - `src/components/sections/` — le quattro schede (Dashboard, Inventario, In Vendita,
    Vendite), che ricevono dati e handler come props da `src/App.jsx`.
  - `src/App.jsx` — l'orchestratore: stato, handler che leggono/scrivono l'inventario,
    calcoli derivati, e composizione delle sezioni/modali sopra.
- **Build step con Vite** (React + Tailwind via PostCSS) per sviluppare con file separati e
  hot reload (`npm run dev`) e compilare tutto in una manciata di file statici (`npm run
  build` → cartella `dist/`) da pubblicare — nessuna build richiesta lato utente finale, solo
  lato sviluppatore, una volta.
- **Storage**: `src/lib/storage.js` sceglie il backend a runtime in base a `isSupabaseConfigured`
  (`src/lib/supabaseClient.js`). Nella PWA, con le variabili `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY`
  configurate, parla con Supabase (Postgres per items/lots/lot_cards/sales/catalog_*, Storage
  per le foto, Auth per account email/password — schema in `supabase/schema.sql`). Senza
  configurazione (build artifact, dove non esistono variabili `VITE_*` sotto esbuild) usa invece
  il vecchio percorso `window.storage`, fornito dalla piattaforma Claude. `src/hooks/useAuth.js`
  gestisce la sessione Supabase e fa da gate a tutta l'app PWA (schermata di login se non
  autenticati); l'integrazione Google Drive è stata rimossa.
- **Versione Artifact Claude**: generata automaticamente da `src/` con
  `npm run build:artifact` (script in `scripts/build-artifact.mjs`, basato su esbuild) — unisce
  tutti i moduli locali in un unico file `artifact/gestione-carte.jsx`, lasciando `react` e
  `lucide-react` come import esterni e il JSX intatto (li fornisce la piattaforma). Il file
  generato va incollato così com'è come Artifact React; non va modificato a mano, va rigenerato
  dal sorgente.
- Installabile su Android come PWA (manifest + service worker) dopo essere stata pubblicata
  su un host qualsiasi con HTTPS (es. Netlify Drop, gratuito, drag & drop della cartella
  `dist/`).

## Limiti noti / possibili sviluppi futuri

- Nessuna sincronizzazione multi-dispositivo nella versione artifact-only (storage legato
  alla singola conversazione Claude); nella versione PWA la sincronizzazione è invece reale
  (account Supabase, sessione persistente con refresh automatico).
- Nessun collegamento a prezzi di mercato reali (TCGplayer/Cardmarket) — i valori sono solo
  quelli inseriti manualmente dall'utente.
- Nessuna gestione multi-utente/collaboratori con permessi separati.
