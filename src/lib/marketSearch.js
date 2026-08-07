// Cardmarket runs a separate marketplace per game under its own URL path (e.g.
// /it/Pokemon/..., /it/OnePiece/...) — only games with a known, confirmed Cardmarket
// category are mapped directly. Any other game (custom ones the user adds, or "Altro")
// falls back to a site-scoped Google search so the link still lands somewhere useful.
const CARDMARKET_GAME_PATH = { pokemon: "Pokemon", onepiece: "OnePiece", magic: "Magic", riftbound: "Riftbound", lorcana: "Lorcana" };

function searchQuery(name, cardNumber) {
  return [name, cardNumber].filter(Boolean).join(" ").trim();
}

export function ebaySearchUrl(name, cardNumber) {
  const q = searchQuery(name, cardNumber);
  return `https://www.ebay.it/sch/i.html?_nkw=${encodeURIComponent(q)}`;
}

export function cardmarketSearchUrl(name, cardNumber, gameKey) {
  const q = searchQuery(name, cardNumber);
  const gamePath = CARDMARKET_GAME_PATH[gameKey];
  if (gamePath) return `https://www.cardmarket.com/it/${gamePath}/Products/Search?searchString=${encodeURIComponent(q)}`;
  return `https://www.google.com/search?q=${encodeURIComponent(`site:cardmarket.com ${q}`)}`;
}
