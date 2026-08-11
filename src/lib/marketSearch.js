// eBay ha un sito separato per paese (ebay.it, ebay.com, ebay.de, ...) — quale usare
// è una preferenza dell'utente (vedi EbayMarketContext), non deducibile da lingua o
// valuta dell'app (es. l'inglese non implica il mercato USA). "it" resta il default
// per chi non la tocca, stesso comportamento di prima.
// Niente label qui: sono testo d'interfaccia, tradotto in settings.ebayMarket*
// nei dizionari (it.js/en.js), non dati — stesso principio delle altre opzioni
// di UI in questo file.
export const EBAY_MARKET_OPTIONS = [
  { code: "it", domain: "ebay.it" },
  { code: "com", domain: "ebay.com" },
  { code: "de", domain: "ebay.de" },
  { code: "co.uk", domain: "ebay.co.uk" },
  { code: "fr", domain: "ebay.fr" },
  { code: "es", domain: "ebay.es" },
];
const DEFAULT_EBAY_MARKET = "it";

export function ebayDomainForMarket(code) {
  return EBAY_MARKET_OPTIONS.find((m) => m.code === code)?.domain
    || EBAY_MARKET_OPTIONS.find((m) => m.code === DEFAULT_EBAY_MARKET).domain;
}

// Cardmarket runs a separate marketplace per game under its own URL path (e.g.
// /it/Pokemon/..., /it/OnePiece/...) — only games with a known, confirmed Cardmarket
// category are mapped directly. Any other game (custom ones the user adds, or "Altro")
// falls back to a site-scoped Google search so the link still lands somewhere useful.
const CARDMARKET_GAME_PATH = { pokemon: "Pokemon", onepiece: "OnePiece", magic: "Magic", riftbound: "Riftbound", lorcana: "Lorcana" };

function searchQuery(name, cardNumber) {
  return [name, cardNumber].filter(Boolean).join(" ").trim();
}

export function ebaySearchUrl(name, cardNumber, ebayMarket) {
  const q = searchQuery(name, cardNumber);
  const domain = ebayDomainForMarket(ebayMarket);
  return `https://www.${domain}/sch/i.html?_nkw=${encodeURIComponent(q)}`;
}

// Cardmarket ha anche un prefisso di lingua nel path (/it/, /en/, ...) — a
// differenza del mercato eBay (un vero paese/valuta diverso, serve una scelta
// esplicita), qui è solo la lingua dell'interfaccia del sito: ha senso farla
// seguire automaticamente la lingua scelta nell'app, nessuna preferenza separata.
export function cardmarketSearchUrl(name, cardNumber, gameKey, lang) {
  const q = searchQuery(name, cardNumber);
  const gamePath = CARDMARKET_GAME_PATH[gameKey];
  const langPath = lang === "it" ? "it" : "en";
  if (gamePath) return `https://www.cardmarket.com/${langPath}/${gamePath}/Products/Search?searchString=${encodeURIComponent(q)}`;
  return `https://www.google.com/search?q=${encodeURIComponent(`site:cardmarket.com ${q}`)}`;
}
