// Il QR di una scatola codifica il suo `code` breve (non l'id interno, vedi
// supabase/boxes.sql) con un prefisso per distinguerlo da un QR qualsiasi
// scansionato per sbaglio — se il prefisso manca (QR generato altrove, o
// digitato a mano) trattiamo comunque il testo come il codice stesso.
const PREFIX = "cardly-box:";

export function boxQrPayload(code) {
  return `${PREFIX}${code}`;
}

export function parseBoxQrPayload(scanned) {
  if (typeof scanned !== "string") return null;
  const trimmed = scanned.trim();
  if (!trimmed) return null;
  return trimmed.startsWith(PREFIX) ? trimmed.slice(PREFIX.length).trim() : trimmed;
}

// Alfabeto senza caratteri facilmente confondibili a mano/a voce (0/O, 1/I/L) —
// il codice è pensato per finire scritto su un'etichetta, non solo scansionato.
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateBoxCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  return code;
}
