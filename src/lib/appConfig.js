// App-wide config read from Vite env vars, same optional-chaining pattern as
// supabaseClient.js: import.meta.env doesn't exist at all under esbuild (the Claude
// Artifact build), so this must stay a safe `undefined`/"" there instead of crashing.
export const SUPPORT_EMAIL = import.meta.env?.VITE_SUPPORT_EMAIL || "";

// Deve restare in sync col limite imposto lato server dal trigger
// enforce_free_tier_item_limit in supabase/entitlements.sql — questo valore è solo
// per il controllo lato client (UX rapida), l'enforcement reale è nel database.
export const FREE_TIER_ITEM_LIMIT = 300;

// Numero di foto per carta/lotto e qualità di ridimensionamento (vedi lib/image.js).
// I limiti numerici devono restare in sync col trigger enforce_photo_limit in
// supabase/entitlements.sql, stesso motivo di FREE_TIER_ITEM_LIMIT sopra.
export const FREE_TIER_PHOTO_LIMIT = 1;
export const PREMIUM_PHOTO_LIMIT = 5;
export const FREE_PHOTO_RESIZE = { maxDim: 700, quality: 0.72 };
export const PREMIUM_PHOTO_RESIZE = { maxDim: 1600, quality: 0.88 };

// Politica annunciata all'utente (vedi il testo in Impostazioni > Account): dopo la
// disdetta di Premium, le foto oltre il limite Free vengono rimosse trascorsi questi
// giorni di grazia. Per ora è solo comunicata in UI — nessun job la applica ancora
// (serve prima agganciare un vero provider di pagamento per sapere quando una
// disdetta è effettiva). Quando quel job verrà scritto, deve leggere questa stessa
// costante invece di un altro numero inventato lì per lì.
export const PHOTO_DOWNGRADE_GRACE_DAYS = 30;
