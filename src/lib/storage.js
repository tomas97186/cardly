// ---------- Storage ----------
// Two backends live behind this single module, chosen at runtime (not at build time):
// - Supabase (Postgres + Storage), used by the PWA build once VITE_SUPABASE_URL/ANON_KEY
//   are configured (see supabaseClient.js).
// - window.storage, the Claude Artifact platform's own key-value store — still used
//   whenever Supabase isn't configured, which is always true in the artifact build
//   (esbuild never sees VITE_* env vars). This keeps the artifact target working
//   exactly as before, untouched by the Supabase migration.
import { supabase, isSupabaseConfigured } from "./supabaseClient";
import { uid } from "./format";

const PHOTO_BUCKET = "photos";

// ================= window.storage (legacy / Claude Artifact) =================

async function legacyLoadItems() {
  try {
    const res = await window.storage.get("inventory-items", false);
    return res && res.value ? JSON.parse(res.value) : [];
  } catch (e) { return []; }
}
async function legacyPersistItems(items) {
  try { await window.storage.set("inventory-items", JSON.stringify(items), false); }
  catch (e) { console.error("Errore salvataggio inventario", e); }
}
async function legacySavePhoto(key, dataUrl) {
  try { await window.storage.set(key, dataUrl, false); } catch (e) { console.error(e); }
  return key;
}
async function legacyLoadPhotoValue(key) {
  try { const res = await window.storage.get(key, false); return res ? res.value : null; }
  catch (e) { return null; }
}
async function legacyDeletePhotoKey(key) {
  try { await window.storage.delete(key, false); } catch (e) { /* ignore */ }
}
async function legacyLoadCatalogSettings() {
  try {
    const res = await window.storage.get("catalog-settings", false);
    return res && res.value ? JSON.parse(res.value) : null;
  } catch (e) { return null; }
}
async function legacySaveCatalogSettings(settings) {
  try { await window.storage.set("catalog-settings", JSON.stringify(settings), false); }
  catch (e) { console.error("Errore salvataggio impostazioni catalogo", e); }
}

// ================= Supabase: row <-> app-shape mapping =================

function rowToSale(row) {
  if (!row) return null;
  const sale = {
    id: row.id, price: row.price, date: row.sale_date,
    buyer: row.buyer || "", carrier: row.carrier || "", tracking: row.tracking || "", notes: row.notes || "",
  };
  if (row.group_total != null) {
    sale.groupId = row.id;
    sale.groupTotal = row.group_total;
    sale.groupSize = row.group_size;
  }
  return sale;
}
function saleToRow(sale) {
  const isGroup = sale.groupId != null;
  return {
    id: sale.id,
    price: isGroup ? null : sale.price,
    group_total: isGroup ? sale.groupTotal : null,
    group_size: isGroup ? sale.groupSize : null,
    sale_date: sale.date,
    buyer: sale.buyer || null, carrier: sale.carrier || null, tracking: sale.tracking || null, notes: sale.notes || null,
  };
}
function rowToListing(row) {
  if (row.listing_price == null) return null;
  return { price: row.listing_price, platform: row.listing_platform, link: row.listing_link, listedDate: row.listing_date, notes: row.listing_notes };
}
function listingToRow(listing) {
  return {
    listing_price: listing ? listing.price : null,
    listing_platform: listing ? listing.platform : null,
    listing_link: listing ? listing.link : null,
    listing_date: listing ? listing.listedDate : null,
    listing_notes: listing ? listing.notes : null,
  };
}
function rowToItem(row) {
  return {
    id: row.id, kind: "singola", game: row.game, name: row.name, setName: row.set_name || "",
    cardNumber: row.card_number || "", condition: row.condition, category: row.category,
    gradingCompany: row.grading_company, grade: row.grade,
    unitCost: row.unit_cost, purchaseDate: row.purchase_date, source: row.source || "",
    purchaseNotes: row.purchase_notes || "", photoKeys: row.photo_paths || [],
    status: row.status, sale: rowToSale(row.sales), listing: rowToListing(row),
    createdAt: new Date(row.created_at).getTime(),
  };
}
function itemToRow(item) {
  return {
    id: item.id, game: item.game, name: item.name, set_name: item.setName || null,
    card_number: item.cardNumber || null, condition: item.condition, category: item.category,
    grading_company: item.gradingCompany || null, grade: item.grade || null,
    unit_cost: item.unitCost, purchase_date: item.purchaseDate || null, source: item.source || null,
    purchase_notes: item.purchaseNotes || null, photo_paths: item.photoKeys || [],
    status: item.status, sale_id: item.sale ? item.sale.id : null,
    ...listingToRow(item.listing),
  };
}
function rowToLot(row) {
  return {
    id: row.id, kind: "lotto", lotName: row.lot_name, game: row.game,
    totalCost: row.total_cost, quantity: row.quantity,
    purchaseDate: row.purchase_date, source: row.source || "", purchaseNotes: row.purchase_notes || "",
    photoKeys: row.photo_paths || [], createdAt: new Date(row.created_at).getTime(), cards: [],
  };
}
function lotToRow(lot) {
  return {
    id: lot.id, lot_name: lot.lotName, game: lot.game, total_cost: lot.totalCost, quantity: lot.quantity,
    purchase_date: lot.purchaseDate || null, source: lot.source || null, purchase_notes: lot.purchaseNotes || null,
    photo_paths: lot.photoKeys || [],
  };
}
function rowToLotCard(row) {
  return {
    id: row.id, name: row.name || "", game: row.game, setName: row.set_name || "",
    cardNumber: row.card_number || "", condition: row.condition, category: row.category,
    gradingCompany: row.grading_company, grade: row.grade, assignedCost: row.assigned_cost,
    photoKeys: row.photo_paths || [], status: row.status, sale: rowToSale(row.sales), listing: rowToListing(row),
    createdAt: new Date(row.created_at).getTime(),
  };
}
function lotCardToRow(card) {
  return {
    id: card.id, lot_id: card.lot_id, name: card.name || null, game: card.game || null,
    set_name: card.setName || null, card_number: card.cardNumber || null, condition: card.condition || null,
    category: card.category || null, grading_company: card.gradingCompany || null, grade: card.grade || null,
    assigned_cost: card.assignedCost, photo_paths: card.photoKeys || [], status: card.status,
    sale_id: card.sale ? card.sale.id : null,
    ...listingToRow(card.listing),
  };
}

// ================= Supabase: inventory (items / lots / lot_cards / sales) =================

async function supabaseLoadItems() {
  try {
    const [itemsRes, lotsRes, lotCardsRes] = await Promise.all([
      supabase.from("items").select("*, sales(*)"),
      supabase.from("lots").select("*"),
      supabase.from("lot_cards").select("*, sales(*)"),
    ]);
    if (itemsRes.error) throw itemsRes.error;
    if (lotsRes.error) throw lotsRes.error;
    if (lotCardsRes.error) throw lotCardsRes.error;

    const items = itemsRes.data.map(rowToItem);
    const lots = lotsRes.data.map(rowToLot);
    const cardsByLot = {};
    for (const row of lotCardsRes.data) {
      (cardsByLot[row.lot_id] ||= []).push(rowToLotCard(row));
    }
    for (const lot of lots) lot.cards = cardsByLot[lot.id] || [];

    return [...items, ...lots];
  } catch (e) {
    console.error("Errore caricamento inventario", e);
    return [];
  }
}

async function supabasePersistItems(items) {
  try {
    const flatItems = items.filter((i) => i.kind === "singola");
    const flatLots = items.filter((i) => i.kind === "lotto");
    const flatLotCards = flatLots.flatMap((lot) => lot.cards.map((c) => ({ ...c, lot_id: lot.id })));

    const salesMap = new Map();
    for (const it of [...flatItems, ...flatLotCards]) {
      if (it.sale && it.sale.id) salesMap.set(it.sale.id, it.sale);
    }

    const [curItemsRes, curLotsRes, curLotCardsRes, curSalesRes] = await Promise.all([
      supabase.from("items").select("id"),
      supabase.from("lots").select("id"),
      supabase.from("lot_cards").select("id"),
      supabase.from("sales").select("id"),
    ]);

    const curItemIds = new Set((curItemsRes.data || []).map((r) => r.id));
    const curLotIds = new Set((curLotsRes.data || []).map((r) => r.id));
    const curLotCardIds = new Set((curLotCardsRes.data || []).map((r) => r.id));
    const curSaleIds = new Set((curSalesRes.data || []).map((r) => r.id));

    const newItemIds = new Set(flatItems.map((i) => i.id));
    const newLotIds = new Set(flatLots.map((l) => l.id));
    const newLotCardIds = new Set(flatLotCards.map((c) => c.id));
    const newSaleIds = new Set(salesMap.keys());

    // Upserts, FK-safe order: sales -> lots -> items -> lot_cards.
    if (salesMap.size) {
      const { error } = await supabase.from("sales").upsert([...salesMap.values()].map(saleToRow), { onConflict: "id" });
      if (error) throw error;
    }
    if (flatLots.length) {
      const { error } = await supabase.from("lots").upsert(flatLots.map(lotToRow), { onConflict: "id" });
      if (error) throw error;
    }
    if (flatItems.length) {
      const { error } = await supabase.from("items").upsert(flatItems.map(itemToRow), { onConflict: "id" });
      if (error) throw error;
    }
    if (flatLotCards.length) {
      const { error } = await supabase.from("lot_cards").upsert(flatLotCards.map(lotCardToRow), { onConflict: "id" });
      if (error) throw error;
    }

    // Deletes, reverse-ish order so nothing dangles mid-sequence.
    const toDeleteLotCards = [...curLotCardIds].filter((id) => !newLotCardIds.has(id));
    if (toDeleteLotCards.length) await supabase.from("lot_cards").delete().in("id", toDeleteLotCards);

    const toDeleteItems = [...curItemIds].filter((id) => !newItemIds.has(id));
    if (toDeleteItems.length) await supabase.from("items").delete().in("id", toDeleteItems);

    const toDeleteLots = [...curLotIds].filter((id) => !newLotIds.has(id));
    if (toDeleteLots.length) await supabase.from("lots").delete().in("id", toDeleteLots);

    const toDeleteSales = [...curSaleIds].filter((id) => !newSaleIds.has(id));
    if (toDeleteSales.length) await supabase.from("sales").delete().in("id", toDeleteSales);
  } catch (e) {
    console.error("Errore salvataggio inventario", e);
  }
}

// ================= Supabase: photos (Storage bucket) =================

function toStoragePath(key, userId) {
  return key.startsWith(`${userId}/`) ? key : `${userId}/${key.replace(/[:/]/g, "-")}`;
}

async function supabaseSavePhoto(key, dataUrl) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return key;
    const path = toStoragePath(key, user.id);
    const blob = await (await fetch(dataUrl)).blob();
    const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, blob, { contentType: blob.type || "image/jpeg", upsert: true });
    if (error) throw error;
    return path;
  } catch (e) {
    console.error(e);
    return key;
  }
}
async function supabaseLoadPhotoValue(key) {
  try {
    const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(key, 3600);
    if (error) throw error;
    return data.signedUrl;
  } catch (e) { return null; }
}
async function supabaseDeletePhotoKey(key) {
  try { await supabase.storage.from(PHOTO_BUCKET).remove([key]); } catch (e) { /* ignore */ }
}
async function supabaseDeletePhotoKeys(keys) {
  if (!keys || !keys.length) return;
  try { await supabase.storage.from(PHOTO_BUCKET).remove(keys); } catch (e) { /* ignore */ }
}

// ================= Supabase: catalog settings (games / platforms / grading companies) ==

async function supabaseLoadCatalogSettings() {
  try {
    const [gamesRes, platformsRes, gradingRes] = await Promise.all([
      supabase.from("catalog_games").select("*").order("created_at", { ascending: true }),
      supabase.from("catalog_platforms").select("*").order("created_at", { ascending: true }),
      supabase.from("catalog_grading_companies").select("*").order("created_at", { ascending: true }),
    ]);
    if (gamesRes.error) throw gamesRes.error;
    if (platformsRes.error) throw platformsRes.error;
    if (gradingRes.error) throw gradingRes.error;
    return {
      games: gamesRes.data.map((r) => ({ key: r.key, label: r.label, color: r.color })),
      platforms: platformsRes.data.map((r) => r.name),
      gradingCompanies: gradingRes.data.map((r) => r.name),
    };
  } catch (e) { return null; }
}

// Diffs the three small catalog lists against their tables and applies just the
// delta — same spirit as supabasePersistItems, at a much smaller scale.
async function supabaseSaveCatalogSettings(settings) {
  try {
    const [curGamesRes, curPlatformsRes, curGradingRes] = await Promise.all([
      supabase.from("catalog_games").select("key"),
      supabase.from("catalog_platforms").select("name"),
      supabase.from("catalog_grading_companies").select("name"),
    ]);
    const curGameKeys = new Set((curGamesRes.data || []).map((r) => r.key));
    const curPlatformNames = new Set((curPlatformsRes.data || []).map((r) => r.name));
    const curGradingNames = new Set((curGradingRes.data || []).map((r) => r.name));

    const games = settings.games || [];
    const platforms = settings.platforms || [];
    const gradingCompanies = settings.gradingCompanies || [];
    const newGameKeys = new Set(games.map((g) => g.key));
    const newPlatformNames = new Set(platforms);
    const newGradingNames = new Set(gradingCompanies);

    if (games.length) {
      const { error } = await supabase.from("catalog_games")
        .upsert(games.map((g) => ({ key: g.key, label: g.label, color: g.color })), { onConflict: "user_id,key" });
      if (error) throw error;
    }
    const staleGameKeys = [...curGameKeys].filter((k) => !newGameKeys.has(k));
    if (staleGameKeys.length) await supabase.from("catalog_games").delete().in("key", staleGameKeys);

    const newPlatforms = platforms.filter((p) => !curPlatformNames.has(p));
    if (newPlatforms.length) await supabase.from("catalog_platforms").insert(newPlatforms.map((name) => ({ name })));
    const stalePlatforms = [...curPlatformNames].filter((p) => !newPlatformNames.has(p));
    if (stalePlatforms.length) await supabase.from("catalog_platforms").delete().in("name", stalePlatforms);

    const newGrading = gradingCompanies.filter((g) => !curGradingNames.has(g));
    if (newGrading.length) await supabase.from("catalog_grading_companies").insert(newGrading.map((name) => ({ name })));
    const staleGrading = [...curGradingNames].filter((g) => !newGradingNames.has(g));
    if (staleGrading.length) await supabase.from("catalog_grading_companies").delete().in("name", staleGrading);
  } catch (e) {
    console.error("Errore salvataggio impostazioni catalogo", e);
  }
}

// ================= Public API (dispatches to the active backend) =================

export async function loadItemsFromStorage() {
  return isSupabaseConfigured ? supabaseLoadItems() : legacyLoadItems();
}
export async function persistItems(items) {
  return isSupabaseConfigured ? supabasePersistItems(items) : legacyPersistItems(items);
}
export async function savePhoto(key, dataUrl) {
  return isSupabaseConfigured ? supabaseSavePhoto(key, dataUrl) : legacySavePhoto(key, dataUrl);
}
export async function loadPhotoValue(key) {
  return isSupabaseConfigured ? supabaseLoadPhotoValue(key) : legacyLoadPhotoValue(key);
}
export async function deletePhotoKey(key) {
  return isSupabaseConfigured ? supabaseDeletePhotoKey(key) : legacyDeletePhotoKey(key);
}
export async function loadCatalogSettings() {
  return isSupabaseConfigured ? supabaseLoadCatalogSettings() : legacyLoadCatalogSettings();
}
export async function saveCatalogSettings(settings) {
  return isSupabaseConfigured ? supabaseSaveCatalogSettings(settings) : legacySaveCatalogSettings(settings);
}

// ---------- Multi-photo helpers ----------
// Each photo gets its own key (prefix + random suffix) so cards can hold several.
// savePhoto may return a different key than it was given (Supabase remaps to a
// user-namespaced storage path) — savePhotos always records whatever key was
// actually used, since that's what later loadPhotoValue calls need to match.
export async function savePhotos(prefix, dataUrls) {
  const keys = [];
  for (const dataUrl of dataUrls) {
    const key = `${prefix}:${uid()}`;
    const savedKey = await savePhoto(key, dataUrl);
    keys.push(savedKey);
  }
  return keys;
}
export async function loadPhotoValues(keys) {
  const values = await Promise.all((keys || []).map((k) => loadPhotoValue(k)));
  return values.filter(Boolean);
}
export async function deletePhotoKeys(keys) {
  if (isSupabaseConfigured) return supabaseDeletePhotoKeys(keys);
  for (const key of keys || []) await legacyDeletePhotoKey(key);
}
