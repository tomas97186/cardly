// Il QR di una scatola codifica un link all'app stessa (dominio corrente +
// ?box=CODICE) invece di un testo con schema custom: così una fotocamera
// qualsiasi, fuori dall'app, offre di aprirlo come un link normale invece di
// mostrare solo del testo — vedi l'effetto "?box=" gestito in App.jsx, stesso
// pattern del redirect Stripe (?checkout=success). Il vecchio formato con
// prefisso resta riconosciuto per le etichette già stampate prima di questo
// cambio; se nessuno dei due combacia trattiamo comunque il testo come il
// codice stesso (QR generato altrove, o digitato a mano).
const LEGACY_PREFIX = "cardly-box:";
const QUERY_PARAM = "box";

export function boxQrPayload(code) {
  return `${window.location.origin}${window.location.pathname}?${QUERY_PARAM}=${encodeURIComponent(code)}`;
}

export function parseBoxQrPayload(scanned) {
  if (typeof scanned !== "string") return null;
  const trimmed = scanned.trim();
  if (!trimmed) return null;
  try {
    const url = new URL(trimmed);
    const fromQuery = url.searchParams.get(QUERY_PARAM);
    if (fromQuery) return fromQuery.trim();
  } catch {
    // Non un URL valido: prova gli altri formati sotto.
  }
  return trimmed.startsWith(LEGACY_PREFIX) ? trimmed.slice(LEGACY_PREFIX.length).trim() : trimmed;
}

// Alfabeto senza caratteri facilmente confondibili a mano/a voce (0/O, 1/I/L) —
// il codice è pensato per finire scritto su un'etichetta, non solo scansionato.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateBoxCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return code;
}
