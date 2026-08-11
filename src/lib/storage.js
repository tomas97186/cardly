// ---------- Storage ----------
// All persistence goes through Supabase (Postgres for items/lots/lot_cards/sales/
// catalog_*, Storage for photos, Auth for account + preferences). Nothing loads the
// whole inventory anymore except exportInventoryFull() (used once, on demand, by the
// CSV export) — every section fetches only the page/aggregate it actually needs, via
// the search_inventory/search_global RPCs and the v_listed_units view defined in
// supabase/pagination.sql.
import { supabase } from "./supabaseClient";
import { uid } from "./format";
import { buildAllSaleUnits } from "./saleUnits";
import { resizeDataUrl } from "./image";

const PHOTO_BUCKET = "photos";
const SIGNED_URL_TTL_MS = 3600 * 1000;
// In-memory cache of already-issued signed URLs, keyed by storage path. Without it,
// every PhotoThumb re-mount (switching tabs, scrolling the inventory back into view)
// mints a brand-new signed URL — a different query string each time defeats the
// browser's HTTP cache, so the same thumbnail gets re-downloaded from Storage on
// every view instead of once per session.
const signedUrlCache = new Map(); // key -> { url, expiresAt }

// Loops a query, page by page, until an empty page comes back — instead of relying
// on a single unbounded select. Supabase/PostgREST caps rows per request at the
// project's "Max Rows" setting (1000 by default, but it's a value the user can — and
// per our own advice, might reasonably want to — turn down for API safety); a plain
// `select("*")` would then silently return a truncated result with no error. This
// makes the handful of "fetch everything, once" reads (financial summary, CSV/PDF
// export, listings summary) correct regardless of whatever that setting is, at the
// cost of more roundtrips when it's small.
//
// `pageFactory(offset, limit)` builds the query for one page — a plain table/view
// select uses `.range(offset, offset + limit - 1)`; an RPC with its own p_limit/
// p_offset params (like search_listed_units) passes them there instead, since
// PostgREST's `.range()` slices the RPC's already-limited result rather than
// rewriting the function's internal LIMIT/OFFSET.
async function fetchAllRows(pageFactory) {
  const all = [];
  let offset = 0;
  const chunk = 1000;
  while (true) {
    const { data, error } = await pageFactory(offset, chunk);
    if (error) { console.error("Errore caricamento paginato", error); break; }
    if (!data || data.length === 0) break;
    all.push(...data);
    offset += data.length;
  }
  return all;
}

// ================= Row <-> app-shape mapping =================

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
    cardNumber: row.card_number || "", condition: row.condition, category: row.category, language: row.language || "",
    gradingCompany: row.grading_company, grade: row.grade,
    unitCost: row.unit_cost, purchaseDate: row.purchase_date, source: row.source || "",
    purchaseNotes: row.purchase_notes || "", photoKeys: row.photo_paths || [], boxId: row.box_id || null,
    status: row.status, sale: rowToSale(row.sales), listing: rowToListing(row),
    createdAt: new Date(row.created_at).getTime(),
  };
}
function itemToRow(item) {
  return {
    id: item.id, game: item.game, name: item.name, set_name: item.setName || null,
    card_number: item.cardNumber || null, condition: item.condition, category: item.category, language: item.language || null,
    grading_company: item.gradingCompany || null, grade: item.grade || null,
    unit_cost: item.unitCost, purchase_date: item.purchaseDate || null, source: item.source || null,
    purchase_notes: item.purchaseNotes || null, photo_paths: item.photoKeys || [], box_id: item.boxId || null,
    status: item.status, sale_id: item.sale ? item.sale.id : null,
    ...listingToRow(item.listing),
  };
}
function rowToLot(row) {
  return {
    id: row.id, kind: "lotto", lotName: row.lot_name, game: row.game,
    totalCost: row.total_cost, quantity: row.quantity,
    purchaseDate: row.purchase_date, source: row.source || "", purchaseNotes: row.purchase_notes || "",
    photoKeys: row.photo_paths || [], boxId: row.box_id || null, createdAt: new Date(row.created_at).getTime(), cards: [],
  };
}
function lotToRow(lot) {
  return {
    id: lot.id, lot_name: lot.lotName, game: lot.game, total_cost: lot.totalCost, quantity: lot.quantity,
    purchase_date: lot.purchaseDate || null, source: lot.source || null, purchase_notes: lot.purchaseNotes || null,
    photo_paths: lot.photoKeys || [], box_id: lot.boxId || null,
  };
}
function rowToLotCard(row) {
  return {
    id: row.id, name: row.name || "", game: row.game, setName: row.set_name || "",
    cardNumber: row.card_number || "", condition: row.condition, category: row.category, language: row.language || "",
    gradingCompany: row.grading_company, grade: row.grade, assignedCost: row.assigned_cost,
    photoKeys: row.photo_paths || [], boxId: row.box_id || null, status: row.status, sale: rowToSale(row.sales), listing: rowToListing(row),
    createdAt: new Date(row.created_at).getTime(),
  };
}
function lotCardToRow(card) {
  return {
    id: card.id, lot_id: card.lot_id, name: card.name || null, game: card.game || null,
    set_name: card.setName || null, card_number: card.cardNumber || null, condition: card.condition || null,
    category: card.category || null, language: card.language || null, grading_company: card.gradingCompany || null, grade: card.grade || null,
    assigned_cost: card.assignedCost, photo_paths: card.photoKeys || [], box_id: card.boxId || null, status: card.status,
    sale_id: card.sale ? card.sale.id : null,
    ...listingToRow(card.listing),
  };
}

// search_inventory RPC rows are a flatter, mixed items/lots shape — split back into
// the same singola/lotto app objects the rest of the UI already expects. Lots come
// back with sold_count/listed_count/cards_count instead of a full `cards` array
// (fetched separately, lazily, only when a lot's detail is opened — see loadLotWithCards).
function rpcRowToUnit(row) {
  if (row.kind === "lotto") {
    return {
      id: row.id, kind: "lotto", lotName: row.name, game: row.game,
      totalCost: row.total_cost, quantity: row.quantity,
      purchaseDate: row.purchase_date, source: row.source || "", purchaseNotes: row.purchase_notes || "",
      photoKeys: row.photo_paths || [], createdAt: new Date(row.created_at).getTime(),
      soldCount: row.sold_count || 0, listedCount: row.listed_count || 0, cardsCount: row.cards_count || 0,
    };
  }
  return {
    id: row.id, kind: "singola", game: row.game, name: row.name, setName: row.set_name || "",
    cardNumber: row.card_number || "", condition: row.condition, category: row.category,
    gradingCompany: row.grading_company, grade: row.grade,
    unitCost: row.unit_cost, purchaseDate: row.purchase_date, source: row.source || "",
    purchaseNotes: row.purchase_notes || "", photoKeys: row.photo_paths || [],
    status: row.status,
    sale: row.sale_id ? rowToSale({ id: row.sale_id, price: row.sale_price, group_total: row.sale_group_total, group_size: row.sale_group_size, sale_date: row.sale_date }) : null,
    listing: rowToListing(row),
    createdAt: new Date(row.created_at).getTime(),
  };
}

// ================= Inventory: paginated search (Inventario tab) =================

export async function searchInventory({ search, game, kind, status, graded, category, sort, page = 0, pageSize = 60 }) {
  const { data, error } = await supabase.rpc("search_inventory", {
    p_search: search || null,
    p_game: game && game !== "all" ? game : null,
    p_kind: kind && kind !== "all" ? kind : null,
    p_status: status && status !== "all" ? status : null,
    p_graded: graded && graded !== "all" ? graded : null,
    p_category: category && category !== "all" ? category : null,
    p_sort: sort || "recent",
    p_limit: pageSize,
    p_offset: page * pageSize,
  });
  if (error) { console.error("Errore ricerca inventario", error); return { rows: [], totalCount: 0 }; }
  const rows = (data || []).map(rpcRowToUnit);
  const totalCount = data && data.length ? Number(data[0].total_count) : 0;
  return { rows, totalCount };
}

// ================= Global / bulk-sale picker search =================

export async function searchGlobal(query, limit = 20) {
  const { data, error } = await supabase.rpc("search_global", { p_search: query, p_limit: limit });
  if (error) { console.error("Errore ricerca globale", error); return []; }
  return (data || []).map((row) => ({
    id: row.id, type: row.type, name: row.name, cardNumber: row.card_number || "", subName: row.sub_name || "", lotId: row.lot_id,
    game: row.game, status: row.status, unitCost: row.unit_cost, assignedCost: row.assigned_cost, totalCost: row.total_cost,
    salePrice: row.sale_price, listingPrice: row.listing_price, photoKeys: row.photo_paths || [],
    quantity: row.quantity, catalogedCount: row.cataloged_count, boxId: row.box_id || null,
  }));
}

// ================= Listings: v_listed_units view (In Vendita tab) =================

function listedUnitsRpcArgs({ search, platform, priceMin, priceMax, sort }) {
  return {
    p_search: search || null,
    p_platform: platform && platform !== "all" ? platform : null,
    p_price_min: priceMin !== "" && priceMin != null ? parseFloat(priceMin) : null,
    p_price_max: priceMax !== "" && priceMax != null ? parseFloat(priceMax) : null,
    p_sort: sort || "recent",
  };
}
function rpcRowToListedUnit(row) {
  return {
    id: row.id, kind: row.kind === "lotCard" ? "lotto" : "singola", lotId: row.kind === "lotCard" ? row.lot_id : undefined,
    name: row.kind === "lotCard" ? `${row.lot_name} › ${row.name}` : row.name,
    game: row.game, photoKey: row.photo_paths?.[0],
    listing: rowToListing({ listing_price: row.listing_price, listing_platform: row.listing_platform, listing_link: row.listing_link, listing_date: row.listing_date, listing_notes: row.listing_notes }),
  };
}

export async function searchListedUnits({ search, platform, priceMin, priceMax, sort = "recent", page = 0, pageSize = 60 }) {
  const { data, error } = await supabase.rpc("search_listed_units", {
    ...listedUnitsRpcArgs({ search, platform, priceMin, priceMax, sort }),
    p_limit: pageSize, p_offset: page * pageSize,
  });
  if (error) { console.error("Errore ricerca inserzioni", error); return { rows: [], totalCount: 0 }; }
  const rows = (data || []).map(rpcRowToListedUnit);
  const totalCount = data && data.length ? Number(data[0].total_count) : 0;
  return { rows, totalCount };
}

// Filtered aggregate (count + total asking price) for the header stat — independent
// of how many rows are actually paginated/rendered below it.
export async function loadListedSummary({ search, platform, priceMin, priceMax } = {}) {
  const rows = await fetchAllRows((offset, limit) =>
    supabase.rpc("search_listed_units", { ...listedUnitsRpcArgs({ search, platform, priceMin, priceMax }), p_limit: limit, p_offset: offset })
  );
  return { count: rows.length, total: rows.reduce((s, r) => s + (r.listing_price || 0), 0) };
}

export async function loadListingPlatforms() {
  const rows = await fetchAllRows((offset, limit) => supabase.from("v_listed_units").select("listing_platform").range(offset, offset + limit - 1));
  return [...new Set(rows.map((r) => r.listing_platform).filter(Boolean))].sort();
}

// ================= Sales: paginate `sales`, resolve margin for just that page =====

export async function searchSales({ from, to, sort = "recent", page = 0, pageSize = 60 }) {
  let q = supabase.from("sales").select("id", { count: "exact" });
  if (from) q = q.gte("sale_date", from);
  if (to) q = q.lte("sale_date", to);
  const ascending = sort === "oldest";
  q = q.order("sale_date", { ascending }).range(page * pageSize, page * pageSize + pageSize - 1);

  const { data: saleIdsRes, error, count } = await q;
  if (error) { console.error("Errore ricerca vendite", error); return { rows: [], totalCount: 0 }; }
  const saleIds = (saleIdsRes || []).map((r) => r.id);
  if (!saleIds.length) return { rows: [], totalCount: count || 0 };

  const [itemsRes, lotCardsRes] = await Promise.all([
    supabase.from("items").select("*, sales(*)").in("sale_id", saleIds),
    supabase.from("lot_cards").select("*, sales(*), lots(lot_name, game, photo_paths)").in("sale_id", saleIds),
  ]);
  const singolaItems = (itemsRes.data || []).map(rowToItem);
  const lotItemsMap = new Map();
  for (const row of lotCardsRes.data || []) {
    const lotId = row.lot_id;
    if (!lotItemsMap.has(lotId)) {
      lotItemsMap.set(lotId, { id: lotId, kind: "lotto", lotName: row.lots?.lot_name || "", game: row.lots?.game, photoKeys: row.lots?.photo_paths || [], cards: [] });
    }
    lotItemsMap.get(lotId).cards.push(rowToLotCard(row));
  }
  const lotItems = [...lotItemsMap.values()];

  // buildAllSaleUnits collapses group sales (same sale_id shared by several rows)
  // correctly — reused as-is so the "only known if every member's cost is known"
  // rule never gets reimplemented (and possibly gotten wrong) here.
  const units = buildAllSaleUnits(singolaItems, lotItems);
  const bySort = sortByKey(units, sort, {
    getDate: (u) => new Date(u.sale.date).getTime(),
    getPrice: (u) => u.sale.price,
    getName: (u) => u.name || "",
  });
  return { rows: bySort, totalCount: count || 0 };
}

// Local copy of the sort switch (lib/sort.js) to avoid a circular import — storage.js
// is a leaf module `lib/sort.js` doesn't depend on, but importing it here just for
// this one call isn't worth adding the edge; the six sort keys are simple enough to
// keep in sync by hand if they ever change.
function sortByKey(list, sortKey, { getDate, getPrice, getName }) {
  const arr = [...list];
  switch (sortKey) {
    case "oldest": arr.sort((a, b) => getDate(a) - getDate(b)); break;
    case "price_desc": arr.sort((a, b) => (getPrice(b) ?? -Infinity) - (getPrice(a) ?? -Infinity)); break;
    case "price_asc": arr.sort((a, b) => (getPrice(a) ?? Infinity) - (getPrice(b) ?? Infinity)); break;
    case "name_asc": arr.sort((a, b) => getName(a).localeCompare(getName(b))); break;
    case "name_z": arr.sort((a, b) => getName(b).localeCompare(getName(a))); break;
    case "recent":
    default: arr.sort((a, b) => getDate(b) - getDate(a)); break;
  }
  return arr;
}

// ================= Financial summary: Dashboard / Report / Sales header stats =====
// One unpaginated fetch, but a lean column projection (no photos/notes/condition/
// grading/text) — still O(collection size) because a period sum has to see every
// matching row, but far lighter per row than the full inventory shape.

export async function loadFinancialSummary() {
  const [itemRows, lotRows, lotCardRows] = await Promise.all([
    fetchAllRows((offset, limit) => supabase.from("items").select("id, game, unit_cost, purchase_date, status, listing_price, listing_platform, sales(id, price, group_total, group_size, sale_date)").range(offset, offset + limit - 1)),
    fetchAllRows((offset, limit) => supabase.from("lots").select("id, game, total_cost, quantity, purchase_date").range(offset, offset + limit - 1)),
    fetchAllRows((offset, limit) => supabase.from("lot_cards").select("id, lot_id, assigned_cost, status, listing_price, listing_platform, sales(id, price, group_total, group_size, sale_date)").range(offset, offset + limit - 1)),
  ]);
  // Gated on listing_price (always set once something is listed), not
  // listing_platform (optional — a listing can exist with no platform chosen).
  const singolaItems = itemRows.map((row) => ({
    id: row.id, kind: "singola", game: row.game, unitCost: row.unit_cost, purchaseDate: row.purchase_date,
    status: row.status, listing: row.listing_price != null ? { price: row.listing_price, platform: row.listing_platform } : null,
    sale: rowToSale(row.sales),
  }));
  const cardsByLot = new Map();
  for (const row of lotCardRows) {
    const card = {
      id: row.id, assignedCost: row.assigned_cost, status: row.status,
      listing: row.listing_price != null ? { price: row.listing_price, platform: row.listing_platform } : null,
      sale: rowToSale(row.sales),
    };
    if (!cardsByLot.has(row.lot_id)) cardsByLot.set(row.lot_id, []);
    cardsByLot.get(row.lot_id).push(card);
  }
  const lotItems = lotRows.map((row) => ({
    id: row.id, kind: "lotto", game: row.game, totalCost: row.total_cost, quantity: row.quantity,
    purchaseDate: row.purchase_date, cards: cardsByLot.get(row.id) || [],
  }));
  return { singolaItems, lotItems };
}

// Small, full-row fetch for Dashboard's "recent sales" list (needs photos, unlike
// the lean summary above) — just the most recent N, not the whole history.
export async function loadRecentSales(limit = 5) {
  const { rows } = await searchSales({ sort: "recent", page: 0, pageSize: limit });
  return rows;
}

// Cheap counts, fetched lazily (e.g. when the Account settings panel opens) instead
// of kept around at the App root just for a couple of display numbers.
export async function loadInventoryCount() {
  const [itemsRes, lotsRes] = await Promise.all([
    supabase.from("items").select("id", { count: "exact", head: true }),
    supabase.from("lots").select("id", { count: "exact", head: true }),
  ]);
  return (itemsRes.count || 0) + (lotsRes.count || 0);
}

// Carte effettivamente catalogate (singole + dentro i lotti) — la granularità che
// conta per il limite del piano Free, diversa da loadInventoryCount() sopra: un
// lotto da solo (senza carte ancora catalogate) non vale nulla qui.
export async function loadCataloguedCardCount() {
  const [itemsRes, lotCardsRes] = await Promise.all([
    supabase.from("items").select("id", { count: "exact", head: true }),
    supabase.from("lot_cards").select("id", { count: "exact", head: true }),
  ]);
  return (itemsRes.count || 0) + (lotCardsRes.count || 0);
}

// Full detail of every currently-listed card/lot-card, for the PDF price-list export
// (Impostazioni > Esporta > Listino PDF) — fetched only when that flow starts, not
// kept resident. Mirrors the field set the PDF actually prints (name, set, condition,
// grading, photo, asking price), unlike the leaner v_listed_units used for browsing.
export async function loadListingsForExport() {
  const [itemRows, lotCardRows] = await Promise.all([
    fetchAllRows((offset, limit) => supabase.from("items").select("*").eq("status", "listed").range(offset, offset + limit - 1)),
    fetchAllRows((offset, limit) => supabase.from("lot_cards").select("*, lots(lot_name, game, photo_paths)").eq("status", "listed").range(offset, offset + limit - 1)),
  ]);
  const singolaItems = itemRows.map(rowToItem);
  const lotCards = lotCardRows.map((row) => ({
    ...rowToLotCard(row),
    lotName: row.lots?.lot_name || "", lotGame: row.lots?.game || null, lotPhotoKeys: row.lots?.photo_paths || [],
  }));
  return { singolaItems, lotCards };
}

// ================= Detail-by-id loaders (open a modal without the full array) ====

export async function loadItemById(id) {
  const { data, error } = await supabase.from("items").select("*, sales(*)").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return rowToItem(data);
}

export async function loadLotWithCards(lotId) {
  const [lotRes, cardsRes] = await Promise.all([
    supabase.from("lots").select("*").eq("id", lotId).maybeSingle(),
    supabase.from("lot_cards").select("*, sales(*)").eq("lot_id", lotId).order("created_at", { ascending: true }),
  ]);
  if (lotRes.error || !lotRes.data) return null;
  const lot = rowToLot(lotRes.data);
  lot.cards = (cardsRes.data || []).map(rowToLotCard);
  return lot;
}

// Reassembles one "vendita di gruppo" from its shared sale_id — every items/lot_cards
// row that points at this sale, wherever in the inventory it actually lives.
export async function loadGroupSaleDetail(saleId) {
  const [saleRes, itemsRes, lotCardsRes] = await Promise.all([
    supabase.from("sales").select("*").eq("id", saleId).maybeSingle(),
    supabase.from("items").select("*").eq("sale_id", saleId),
    supabase.from("lot_cards").select("*, lots(lot_name)").eq("sale_id", saleId),
  ]);
  if (saleRes.error || !saleRes.data) return null;
  const sale = rowToSale(saleRes.data);
  const members = [
    ...(itemsRes.data || []).map((row) => ({
      id: row.id, kind: "singola", name: row.name, cardNumber: row.card_number || "",
      cost: row.unit_cost, photoKey: (row.photo_paths || [])[0], lotName: null,
    })),
    ...(lotCardsRes.data || []).map((row) => ({
      id: row.id, kind: "lotto", lotId: row.lot_id, name: row.name || "", cardNumber: row.card_number || "",
      cost: row.assigned_cost, photoKey: (row.photo_paths || [])[0], lotName: row.lots?.lot_name || "",
    })),
  ];
  if (!members.length) return null;
  return { groupId: saleId, sale, members };
}

// ================= Writes: one record at a time =================
// Full-row upsert — used for "add new" and "edit form submit", where the caller
// already has (or has just built) the complete object.
export async function upsertItem(item) {
  const { error } = await supabase.from("items").upsert(itemToRow(item), { onConflict: "id" });
  if (error) console.error("Errore salvataggio carta", error);
  return { error };
}
export async function upsertLot(lot) {
  const { error } = await supabase.from("lots").upsert(lotToRow(lot), { onConflict: "id" });
  if (error) console.error("Errore salvataggio lotto", error);
}
export async function upsertLotCard(card, lotId) {
  const { error } = await supabase.from("lot_cards").upsert(lotCardToRow({ ...card, lot_id: lotId }), { onConflict: "id" });
  if (error) console.error("Errore salvataggio carta del lotto", error);
  return { error };
}
export async function upsertSaleRecord(sale) {
  const { error } = await supabase.from("sales").upsert(saleToRow(sale), { onConflict: "id" });
  if (error) console.error("Errore salvataggio vendita", error);
}

// Targeted column updates — used for simple state transitions (vendi/annulla
// vendita/metti in vendita/rimuovi da vendita) so they never risk overwriting
// unrelated fields the caller doesn't have in hand.
export async function updateItemFields(id, patch) {
  const { error } = await supabase.from("items").update(patch).eq("id", id);
  if (error) console.error("Errore aggiornamento carta", error);
  return { error };
}
export async function updateLotCardFields(id, patch) {
  const { error } = await supabase.from("lot_cards").update(patch).eq("id", id);
  if (error) console.error("Errore aggiornamento carta del lotto", error);
  return { error };
}

export async function deleteItemRecord(id) {
  const { error } = await supabase.from("items").delete().eq("id", id);
  if (error) console.error("Errore eliminazione carta", error);
}
export async function deleteLotRecord(id) {
  const { error } = await supabase.from("lots").delete().eq("id", id);
  if (error) console.error("Errore eliminazione lotto", error);
}
export async function deleteLotCardRecord(id) {
  const { error } = await supabase.from("lot_cards").delete().eq("id", id);
  if (error) console.error("Errore eliminazione carta del lotto", error);
}
export async function deleteSaleRecord(id) {
  const { error } = await supabase.from("sales").delete().eq("id", id);
  if (error) console.error("Errore eliminazione vendita", error);
}

// State-transition helpers (vendi/annulla vendita/metti in vendita/rimuovi) — keep
// App.jsx dealing only in app-shape objects, never raw DB column names.
export async function sellItemRecord(id, sale) {
  await upsertSaleRecord(sale);
  await updateItemFields(id, { status: "sold", sale_id: sale.id });
}
export async function cancelItemSaleRecord(id) {
  await updateItemFields(id, { status: "in_stock", sale_id: null });
}
export async function listItemRecord(id, listing) {
  await updateItemFields(id, { status: "listed", ...listingToRow(listing) });
}
export async function unlistItemRecord(id) {
  await updateItemFields(id, { status: "in_stock", ...listingToRow(null) });
}
export async function sellLotCardRecord(id, sale) {
  await upsertSaleRecord(sale);
  await updateLotCardFields(id, { status: "sold", sale_id: sale.id });
}
export async function cancelLotCardSaleRecord(id) {
  await updateLotCardFields(id, { status: "in_stock", sale_id: null });
}
export async function listLotCardRecord(id, listing) {
  await updateLotCardFields(id, { status: "listed", ...listingToRow(listing) });
}
export async function unlistLotCardRecord(id) {
  await updateLotCardFields(id, { status: "in_stock", ...listingToRow(null) });
}
// Group sales share one `sales` row across several items/lot_cards (matched by
// sale_id) — cancelling resets every member sharing that id back to in_stock.
export async function cancelGroupSaleRecord(saleId) {
  await Promise.all([
    updateItemsFieldsWhereSale(saleId, { status: "in_stock", sale_id: null }),
    updateLotCardsFieldsWhereSale(saleId, { status: "in_stock", sale_id: null }),
  ]);
}

// Bulk status flip used by handleCancelGroupSale/handleBulkSell-style flows, where
// several rows share the same group sale id.
export async function updateItemsFieldsWhereSale(saleId, patch) {
  const { error } = await supabase.from("items").update(patch).eq("sale_id", saleId);
  if (error) console.error("Errore aggiornamento carte", error);
}
export async function updateLotCardsFieldsWhereSale(saleId, patch) {
  const { error } = await supabase.from("lot_cards").update(patch).eq("sale_id", saleId);
  if (error) console.error("Errore aggiornamento carte del lotto", error);
}

// ================= Full export (CSV) — the one deliberate "load everything" path ====
// Used only when the user explicitly clicks "Esporta CSV" in Impostazioni, not on
// every app load.
export async function exportInventoryFull() {
  const [itemRows, lotRows, lotCardRows] = await Promise.all([
    fetchAllRows((offset, limit) => supabase.from("items").select("*, sales(*)").range(offset, offset + limit - 1)),
    fetchAllRows((offset, limit) => supabase.from("lots").select("*").range(offset, offset + limit - 1)),
    fetchAllRows((offset, limit) => supabase.from("lot_cards").select("*, sales(*)").range(offset, offset + limit - 1)),
  ]);
  const items = itemRows.map(rowToItem);
  const lots = lotRows.map(rowToLot);
  const cardsByLot = {};
  for (const row of lotCardRows) (cardsByLot[row.lot_id] ||= []).push(rowToLotCard(row));
  for (const lot of lots) lot.cards = cardsByLot[lot.id] || [];
  return [...items, ...lots];
}

// ================= Photos (Storage bucket) =================

function toStoragePath(key, userId) {
  return key.startsWith(`${userId}/`) ? key : `${userId}/${key.replace(/[:/]/g, "-")}`;
}

// The cover photo (first in photoKeys) gets a small companion thumbnail uploaded
// alongside the full-size version, named by suffix so it doesn't need its own
// tracked field anywhere. Photos saved before this feature existed simply don't
// have one — loadThumbValue() falls back to the full-size image for those.
function thumbKeyFor(key) {
  return `${key}_thumb`;
}

export async function savePhoto(key, dataUrl) {
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
export async function loadPhotoValue(key) {
  const cached = signedUrlCache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.url;
  try {
    const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(key, 3600);
    if (error) throw error;
    // Expire our cache entry a minute before the URL itself does, so we never hand
    // out one that's about to be rejected mid-use.
    signedUrlCache.set(key, { url: data.signedUrl, expiresAt: Date.now() + SIGNED_URL_TTL_MS - 60_000 });
    return data.signedUrl;
  } catch (e) {
    // Cache the miss too (same TTL) — keys are never reused across saves, so a
    // confirmed-missing object (e.g. a cover photo saved before thumbnails existed)
    // stays missing for the rest of the session. Without this, loadThumbValue()
    // would re-request the same nonexistent thumb on every single render.
    signedUrlCache.set(key, { url: null, expiresAt: Date.now() + SIGNED_URL_TTL_MS - 60_000 });
    return null;
  }
}
// Cover-photo loader: prefers the small companion thumbnail, falling back to the
// full-size image for photos saved before thumbnails existed.
export async function loadThumbValue(coverKey) {
  if (!coverKey) return null;
  const thumbUrl = await loadPhotoValue(thumbKeyFor(coverKey));
  return thumbUrl || loadPhotoValue(coverKey);
}
export async function deletePhotoKey(key) {
  try { await supabase.storage.from(PHOTO_BUCKET).remove([key]); } catch (e) { /* ignore */ }
  signedUrlCache.delete(key);
}
export async function deletePhotoKeys(keys) {
  if (!keys || !keys.length) return;
  const allKeys = [...keys, thumbKeyFor(keys[0])];
  try { await supabase.storage.from(PHOTO_BUCKET).remove(allKeys); } catch (e) { /* ignore */ }
  for (const key of allKeys) signedUrlCache.delete(key);
}

// ---------- Multi-photo helpers ----------
// Each photo gets its own key (prefix + random suffix) so cards can hold several.
// savePhoto may return a different key than it was given (Supabase remaps to a
// user-namespaced storage path) — savePhotos always records whatever key was
// actually used, since that's what later loadPhotoValue calls need to match.
export async function savePhotos(prefix, dataUrls) {
  const keys = [];
  for (let i = 0; i < dataUrls.length; i++) {
    const dataUrl = dataUrls[i];
    const key = `${prefix}:${uid()}`;
    const savedKey = await savePhoto(key, dataUrl);
    keys.push(savedKey);
    // Only the cover (first photo) needs a thumbnail — it's the only one shown in
    // list views; the rest are only ever seen full-size, inside the gallery.
    if (i === 0) {
      const thumbDataUrl = await resizeDataUrl(dataUrl);
      await savePhoto(thumbKeyFor(savedKey), thumbDataUrl);
    }
  }
  return keys;
}
export async function loadPhotoValues(keys) {
  const values = await Promise.all((keys || []).map((k) => loadPhotoValue(k)));
  return values.filter(Boolean);
}

// ================= Catalog settings (games / platforms / grading companies) =======

export async function loadCatalogSettings() {
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

// Diffs the three small catalog lists against their tables and applies just the delta.
export async function saveCatalogSettings(settings) {
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

// ================= Language / theme preference (stored on the user) =================

export async function loadLanguagePref() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.user_metadata?.language || null;
  } catch (e) { return null; }
}
export async function saveLanguagePref(lang) {
  try { await supabase.auth.updateUser({ data: { language: lang } }); } catch (e) { /* ignore */ }
}
export async function loadThemePref() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.user_metadata?.theme || null;
  } catch (e) { return null; }
}
export async function saveThemePref(mode) {
  try { await supabase.auth.updateUser({ data: { theme: mode } }); } catch (e) { /* ignore */ }
}
export async function loadCurrencyPref() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.user_metadata?.currency || null;
  } catch (e) { return null; }
}
export async function saveCurrencyPref(currency) {
  try { await supabase.auth.updateUser({ data: { currency } }); } catch (e) { /* ignore */ }
}
export async function loadEbayMarketPref() {
  try {
    const { data } = await supabase.auth.getUser();
    return data?.user?.user_metadata?.ebayMarket || null;
  } catch (e) { return null; }
}
export async function saveEbayMarketPref(ebayMarket) {
  try { await supabase.auth.updateUser({ data: { ebayMarket } }); } catch (e) { /* ignore */ }
}

// ================= Entitlement (piano free/premium) =================
// Riga di `profiles`, scritta SOLO lato server (webhook Stripe/Play con service
// role key) — il client la legge soltanto, mai la scrive. Vedi supabase/entitlements.sql.
export async function loadEntitlement() {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("subscription_tier, premium_until, premium_source")
      .maybeSingle();
    if (error || !data) return null;
    return { tier: data.subscription_tier, premiumUntil: data.premium_until, premiumSource: data.premium_source };
  } catch (e) { return null; }
}

// ================= Boxes (posizione fisica, funzione Premium) =================
// Creare una scatola o assegnarla a un item/lotto/carta è bloccato lato server per
// il piano Free (vedi supabase/boxes.sql) — qui ci limitiamo a propagare l'errore,
// la UI decide come mostrarlo.

function rowToBox(row) {
  return { id: row.id, code: row.code, label: row.label || "", createdAt: new Date(row.created_at).getTime() };
}

export async function loadBoxes() {
  const { data, error } = await supabase.from("boxes").select("*").order("created_at", { ascending: true });
  if (error) { console.error("Errore caricamento scatole", error); return []; }
  return data.map(rowToBox);
}

export async function upsertBox(box) {
  const { error } = await supabase.from("boxes").upsert({ id: box.id, code: box.code, label: box.label || null }, { onConflict: "id" });
  if (error) console.error("Errore salvataggio scatola", error);
  return { error };
}

export async function deleteBoxRecord(id) {
  const { error } = await supabase.from("boxes").delete().eq("id", id);
  if (error) console.error("Errore eliminazione scatola", error);
}

// Risolve un codice scansionato/digitato (es. "A1B2C3") nella scatola corrispondente
// — scoped alla RLS dell'utente corrente, quindi non trova mai la scatola di qualcun
// altro anche indovinando il codice.
export async function loadBoxById(id) {
  if (!id) return null;
  const { data, error } = await supabase.from("boxes").select("*").eq("id", id).maybeSingle();
  if (error || !data) return null;
  return rowToBox(data);
}

export async function loadBoxByCode(code) {
  const { data, error } = await supabase.from("boxes").select("*").eq("code", code).maybeSingle();
  if (error || !data) return null;
  return rowToBox(data);
}

// Tutto ciò che è assegnato a una scatola — carte singole, lotti (nel loro insieme)
// e carte dentro i lotti, per mostrare "cosa c'è qui dentro" dopo una scansione.
export async function loadBoxContents(boxId) {
  const [itemsRes, lotsRes, lotCardsRes] = await Promise.all([
    supabase.from("items").select("*, sales(*)").eq("box_id", boxId),
    supabase.from("lots").select("*").eq("box_id", boxId),
    supabase.from("lot_cards").select("*, sales(*), lots(lot_name)").eq("box_id", boxId),
  ]);
  const items = (itemsRes.data || []).map(rowToItem);
  const lots = (lotsRes.data || []).map(rowToLot);
  const lotCards = (lotCardsRes.data || []).map((row) => ({ ...rowToLotCard(row), lotName: row.lots?.lot_name || "", lotId: row.lot_id }));
  return { items, lots, lotCards };
}

// Assegna una scatola a carte già catalogate (trovate via searchGlobal) — usato
// da "Aggiungi carta esistente" nel dettaglio di una scatola. `selections` è
// `[{ type: "item"|"lotCard", id }]`, stesso `type` restituito da searchGlobal.
export async function assignItemsToBox(boxId, selections) {
  const results = await Promise.all(
    selections.map((s) => (s.type === "lotCard" ? updateLotCardFields(s.id, { box_id: boxId }) : updateItemFields(s.id, { box_id: boxId })))
  );
  return results.find((r) => r?.error)?.error || null;
}
