# Cardly — contesto del progetto

## Cos'è

App di gestione inventario per un business di carte collezionabili (Pokémon, One Piece,
estendibile ad altro). Copre l'intero ciclo: acquisto (carta singola o lotto) → catalogazione
→ eventuale messa in vendita → vendita (singola o multipla/in blocco) → reportistica su
spesa, incasso e margine.

**PWA installabile su Android** — interfaccia impacchettata come app web installabile (icona
sulla home, schermo intero), dati salvati su Supabase (Postgres + Auth + Storage), con account
email/password veri e sync multi-dispositivo. Prima usava Google Drive via OAuth client-side:
quella integrazione è stata ritirata in favore di un backend vero, anche per porre le basi a
future funzioni a pagamento. Esisteva anche una versione Claude Artifact (storage via
`window.storage`, senza account), ritirata per puntare tutto su un'unica base dati reale e
interrogabile via query invece di un blob caricato per intero ad ogni avvio.

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

- Più foto per ogni carta/lotto (fino a 3, ridimensionate lato client prima del
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
    `image.js` (resize foto), `storage.js` (accesso dati Supabase), `migrations.js`,
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
- **Storage**: `src/lib/storage.js` parla sempre e solo con Supabase (Postgres per
  items/lots/lot_cards/sales/catalog_*, Storage per le foto, Auth per account email/password —
  schema in `supabase/schema.sql` + `supabase/pagination.sql`). `VITE_SUPABASE_URL`/
  `VITE_SUPABASE_ANON_KEY` sono obbligatorie: senza, l'app non parte (`src/lib/supabaseClient.js`
  lancia un errore esplicito all'avvio invece di degradare silenziosamente). `src/hooks/useAuth.js`
  gestisce la sessione e fa da gate a tutta l'app (schermata di login se non autenticati).
- **Caricamento dati**: niente più "carica tutto l'inventario ad ogni avvio". Ogni sezione
  interroga solo ciò che le serve — Inventario/In Vendita/Vendite paginano (60 righe alla volta,
  filtri/ordinamento/ricerca fatti da Postgres via la funzione `search_inventory` e la vista
  `v_listed_units`); Dashboard/Report usano un fetch unico ma con sole colonne numeriche/data
  (niente foto, note, testo) per calcolare i totali su tutto il periodo; le carte di un lotto si
  caricano solo quando il lotto viene aperto. Le scritture (aggiungi/modifica/vendi/elimina)
  toccano solo la riga interessata, non l'intera collezione.
- Installabile su Android come PWA (manifest + service worker) dopo essere stata pubblicata
  su un host qualsiasi con HTTPS (es. Netlify Drop, gratuito, drag & drop della cartella
  `dist/`).

## Limiti noti / possibili sviluppi futuri

- Nessun collegamento a prezzi di mercato reali (TCGplayer/Cardmarket) — i valori sono solo
  quelli inseriti manualmente dall'utente.
- Nessuna gestione multi-utente/collaboratori con permessi separati.
