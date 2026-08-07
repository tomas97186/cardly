import { useState, useEffect, useCallback } from "react";
import {
  Package, Plus, Search, LayoutGrid, ShoppingBag, Megaphone,
  Settings as SettingsIcon,
} from "lucide-react";

import { useAuth } from "./hooks/useAuth";
import { useAndroidBackButton } from "./hooks/useAndroidBackButton";
import { LoginScreen } from "./components/auth/LoginScreen";
import { CatalogProvider, useCatalog } from "./context/CatalogContext";
import { C } from "./lib/theme";
import { uid, todayISO, cardDisplayName } from "./lib/format";
import { getPeriodRange, makeInRange } from "./lib/period";
import { sortUnits } from "./lib/sort";
import { buildAllSaleUnits } from "./lib/saleUnits";
import { loadItemsFromStorage, persistItems, savePhotos, deletePhotoKeys } from "./lib/storage";
import { migrateItems } from "./lib/migrations";
import { exportInventoryCSV } from "./lib/csv";

import { Modal } from "./components/ui/Modal";
import { AddPurchaseForm } from "./components/forms/AddPurchaseForm";
import { EditItemForm } from "./components/forms/EditItemForm";
import { EditLotForm } from "./components/forms/EditLotForm";
import { LotCardForm } from "./components/forms/LotCardForm";
import { SaleForm } from "./components/forms/SaleForm";
import { ListingForm } from "./components/forms/ListingForm";
import { BulkSaleWizard } from "./components/forms/BulkSaleWizard";
import { ItemDetail } from "./components/details/ItemDetail";
import { LotCardDetail } from "./components/details/LotCardDetail";
import { GroupSaleDetail } from "./components/details/GroupSaleDetail";
import { LotDetail } from "./components/details/LotDetail";
import { GlobalSearchModal } from "./components/search/GlobalSearchModal";
import { DashboardSection } from "./components/sections/DashboardSection";
import { InventorySection } from "./components/sections/InventorySection";
import { ListingsSection } from "./components/sections/ListingsSection";
import { SalesSection } from "./components/sections/SalesSection";
import { SettingsSection } from "./components/sections/SettingsSection";

// Shared between the mobile bottom tab bar and the desktop sidebar nav.
const NAV_ITEMS = [
  ["dashboard", "Dashboard", LayoutGrid],
  ["inventory", "Inventario", Package],
  ["listings", "In vendita", Megaphone],
  ["sales", "Vendite", ShoppingBag],
];

export default function App() {
  const auth = useAuth();

  if (auth.status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm" style={{ background: C.bg, color: C.textFaint }}>
        Caricamento...
      </div>
    );
  }
  if (auth.status !== "signed-in") {
    return <LoginScreen auth={auth} />;
  }
  return (
    <CatalogProvider>
      <AppInner auth={auth} />
    </CatalogProvider>
  );
}

function AppInner({ auth }) {
  const catalog = useCatalog();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState("dashboard");
  const [search, setSearch] = useState("");
  const [filterGame, setFilterGame] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterKind, setFilterKind] = useState("all"); // all | singola | lotto
  const [filterGraded, setFilterGraded] = useState("all"); // all | graded | notGraded
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortInventory, setSortInventory] = useState("recent");
  const [period, setPeriod] = useState("all");
  const [customFrom, setCustomFrom] = useState(todayISO());
  const [customTo, setCustomTo] = useState(todayISO());
  const [sortSales, setSortSales] = useState("recent");
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showInventoryFilters, setShowInventoryFilters] = useState(false);
  const [showListingFilters, setShowListingFilters] = useState(false);
  const [showSalesFilters, setShowSalesFilters] = useState(false);
  const [showDashboardFilters, setShowDashboardFilters] = useState(false);

  const [listingSearch, setListingSearch] = useState("");
  const [listingPlatformFilter, setListingPlatformFilter] = useState("all");
  const [listingPriceMin, setListingPriceMin] = useState("");
  const [listingPriceMax, setListingPriceMax] = useState("");
  const [sortListings, setSortListings] = useState("recent");

  const [showAdd, setShowAdd] = useState(false);
  const [detailItemId, setDetailItemId] = useState(null); // singola
  const [editItemId, setEditItemId] = useState(null);
  const [sellItemId, setSellItemId] = useState(null);
  const [listingItemId, setListingItemId] = useState(null);

  const [detailLotId, setDetailLotId] = useState(null);
  const [editLotId, setEditLotId] = useState(null);
  const [addCardLotId, setAddCardLotId] = useState(null);
  const [detailLotCard, setDetailLotCard] = useState(null); // {lotId, cardId}
  const [editLotCard, setEditLotCard] = useState(null); // {lotId, cardId}
  const [sellLotCard, setSellLotCard] = useState(null); // {lotId, cardId}
  const [listingLotCard, setListingLotCard] = useState(null); // {lotId, cardId}

  const [showBulkSale, setShowBulkSale] = useState(false); // sale wizard from the Vendite tab; only a "vendita multipla" once 2+ cards are picked
  const [bulkSaleCount, setBulkSaleCount] = useState(0);
  const [detailGroupSaleId, setDetailGroupSaleId] = useState(null);

  // Android back button: close whatever's on top (a modal/detail, or a nested
  // edit/sell/listing layer within one) instead of exiting the installed PWA. Only
  // falls through to a real exit once every layer below is already closed.
  const navDepth =
    (view !== "dashboard" ? 1 : 0) +
    (showGlobalSearch ? 1 : 0) +
    (showAdd ? 1 : 0) +
    (detailItemId ? 1 : 0) +
    (editItemId || sellItemId || listingItemId ? 1 : 0) +
    (detailLotId ? 1 : 0) +
    (editLotId || addCardLotId ? 1 : 0) +
    (detailLotCard ? 1 : 0) +
    (editLotCard || sellLotCard || listingLotCard ? 1 : 0) +
    (showBulkSale ? 1 : 0) +
    (detailGroupSaleId ? 1 : 0);

  function closeTopBackLayer() {
    if (editLotCard) return setEditLotCard(null);
    if (sellLotCard) return setSellLotCard(null);
    if (listingLotCard) return setListingLotCard(null);
    if (detailLotCard) return setDetailLotCard(null);
    if (editLotId) return setEditLotId(null);
    if (addCardLotId) return setAddCardLotId(null);
    if (detailLotId) return setDetailLotId(null);
    if (editItemId) return setEditItemId(null);
    if (sellItemId) return setSellItemId(null);
    if (listingItemId) return setListingItemId(null);
    if (detailItemId) return setDetailItemId(null);
    if (detailGroupSaleId) return setDetailGroupSaleId(null);
    if (showBulkSale) return setShowBulkSale(false);
    if (showAdd) return setShowAdd(false);
    if (showGlobalSearch) return setShowGlobalSearch(false);
    if (view !== "dashboard") return setView("dashboard");
  }

  useAndroidBackButton(navDepth, closeTopBackLayer);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const raw = await loadItemsFromStorage();
      if (cancelled) return;
      const data = migrateItems(raw);
      setItems(data);
      setLoading(false);
      if (JSON.stringify(raw) !== JSON.stringify(data)) persistItems(data);
    })();
    return () => { cancelled = true; };
  }, []);

  const persist = useCallback(async (next) => {
    await persistItems(next);
    setItems(next);
  }, []);

  // ---- singola item handlers ----
  async function handleAddPurchase(form) {
    let newItem;
    if (form.purchaseType === "singola") {
      const id = uid();
      const photoKeys = form.photos && form.photos.length ? await savePhotos(`photo:${id}`, form.photos) : [];
      newItem = {
        id, kind: "singola", game: form.game, name: form.name.trim(), setName: form.setName,
        cardNumber: form.cardNumber, condition: form.condition, category: form.category, language: form.language,
        gradingCompany: form.gradingCompany || null, grade: form.grade || null,
        unitCost: parseFloat(form.price) || 0, purchaseDate: form.purchaseDate, source: form.source,
        purchaseNotes: form.notes, photoKeys, status: "in_stock", sale: null, createdAt: Date.now(),
      };
    } else {
      const id = uid();
      const photoKeys = form.photos && form.photos.length ? await savePhotos(`photo:lot:${id}`, form.photos) : [];
      newItem = {
        id, kind: "lotto", lotName: form.lotName.trim(), game: form.game,
        totalCost: parseFloat(form.price) || 0, quantity: Math.max(1, parseInt(form.quantity) || 1),
        purchaseDate: form.purchaseDate, source: form.source, purchaseNotes: form.notes,
        photoKeys, createdAt: Date.now(), cards: [],
      };
    }
    await persist([...items, newItem]);
    setShowAdd(false);
  }

  async function handleUpdateItem(id, changes) {
    const target = items.find((i) => i.id === id);
    await deletePhotoKeys(target.photoKeys);
    const photoKeys = changes.photos && changes.photos.length ? await savePhotos(`photo:${id}`, changes.photos) : [];
    const next = items.map((i) => (i.id === id ? { ...i, ...changes, photoKeys, photos: undefined } : i));
    await persist(next);
    setEditItemId(null);
  }

  async function handleDeleteItem(id) {
    const target = items.find((i) => i.id === id);
    if (target) await deletePhotoKeys(target.photoKeys);
    await persist(items.filter((i) => i.id !== id));
    setEditItemId(null); setDetailItemId(null);
  }

  async function handleRegisterSale(id, saleData) {
    const sale = { id: uid(), ...saleData };
    const next = items.map((i) => (i.id === id ? { ...i, status: "sold", sale } : i));
    await persist(next);
    setSellItemId(null);
  }
  async function handleCancelSale(id) {
    const next = items.map((i) => (i.id === id ? { ...i, status: "in_stock", sale: null } : i));
    await persist(next);
  }
  async function handleListItem(id, listing) {
    const next = items.map((i) => (i.id === id ? { ...i, status: "listed", listing } : i));
    await persist(next);
    setListingItemId(null);
  }
  async function handleUnlistItem(id) {
    const next = items.map((i) => (i.id === id ? { ...i, status: "in_stock", listing: null } : i));
    await persist(next);
  }

  // ---- lot handlers ----
  async function handleUpdateLot(lotId, changes) {
    const target = items.find((i) => i.id === lotId);
    await deletePhotoKeys(target.photoKeys);
    const photoKeys = changes.photos && changes.photos.length ? await savePhotos(`photo:lot:${lotId}`, changes.photos) : [];
    const next = items.map((i) => (i.id === lotId ? { ...i, ...changes, photoKeys, photos: undefined } : i));
    await persist(next);
    setEditLotId(null);
  }

  async function handleDeleteLot(lotId) {
    const target = items.find((i) => i.id === lotId);
    if (target) {
      await deletePhotoKeys(target.photoKeys);
      for (const c of target.cards) await deletePhotoKeys(c.photoKeys);
    }
    await persist(items.filter((i) => i.id !== lotId));
    setEditLotId(null); setDetailLotId(null);
  }

  async function handleAddLotCard(lotId, form) {
    const cardId = uid();
    const photoKeys = form.photos && form.photos.length ? await savePhotos(`photo:${cardId}`, form.photos) : [];
    const card = {
      id: cardId, name: form.name || `Carta ${(items.find((i) => i.id === lotId)?.cards.length || 0) + 1}`,
      game: form.game, setName: form.setName, cardNumber: form.cardNumber, condition: form.condition,
      category: form.category, language: form.language, gradingCompany: form.gradingCompany || null, grade: form.grade || null,
      assignedCost: form.assignedCost, photoKeys, status: "in_stock", sale: null, createdAt: Date.now(),
    };
    const next = items.map((i) => (i.id === lotId ? { ...i, cards: [...i.cards, card] } : i));
    await persist(next);
    setAddCardLotId(null);
  }

  async function handleUpdateLotCard(lotId, cardId, changes) {
    const lot = items.find((i) => i.id === lotId);
    const card = lot.cards.find((c) => c.id === cardId);
    await deletePhotoKeys(card.photoKeys);
    const photoKeys = changes.photos && changes.photos.length ? await savePhotos(`photo:${cardId}`, changes.photos) : [];
    const next = items.map((i) => {
      if (i.id !== lotId) return i;
      return { ...i, cards: i.cards.map((c) => (c.id === cardId ? { ...c, ...changes, photoKeys, photos: undefined } : c)) };
    });
    await persist(next);
    setEditLotCard(null);
  }

  async function handleDeleteLotCard(lotId, cardId) {
    const lot = items.find((i) => i.id === lotId);
    const card = lot.cards.find((c) => c.id === cardId);
    if (card) await deletePhotoKeys(card.photoKeys);
    const next = items.map((i) => (i.id === lotId ? { ...i, cards: i.cards.filter((c) => c.id !== cardId) } : i));
    await persist(next);
    setEditLotCard(null); setDetailLotCard(null);
  }

  async function handleSellLotCard(lotId, cardId, saleData) {
    const sale = { id: uid(), ...saleData };
    const next = items.map((i) => {
      if (i.id !== lotId) return i;
      return { ...i, cards: i.cards.map((c) => (c.id === cardId ? { ...c, status: "sold", sale } : c)) };
    });
    await persist(next);
    setSellLotCard(null);
  }
  async function handleCancelLotCardSale(lotId, cardId) {
    const next = items.map((i) => {
      if (i.id !== lotId) return i;
      return { ...i, cards: i.cards.map((c) => (c.id === cardId ? { ...c, status: "in_stock", sale: null } : c)) };
    });
    await persist(next);
  }
  async function handleListLotCard(lotId, cardId, listing) {
    const next = items.map((i) => {
      if (i.id !== lotId) return i;
      return { ...i, cards: i.cards.map((c) => (c.id === cardId ? { ...c, status: "listed", listing } : c)) };
    });
    await persist(next);
    setListingLotCard(null);
  }
  async function handleUnlistLotCard(lotId, cardId) {
    const next = items.map((i) => {
      if (i.id !== lotId) return i;
      return { ...i, cards: i.cards.map((c) => (c.id === cardId ? { ...c, status: "in_stock", listing: null } : c)) };
    });
    await persist(next);
  }

  // ---- bulk sale: sell several cards from anywhere in the inventory together, or
  // cards that don't exist in the inventory yet (catalogs them first, cost optional) ----
  async function handleBulkSell(refs, saleData) {
    const newItems = refs.filter((r) => r.kind === "new").map((r) => ({
      id: uid(), kind: "singola", game: r.game, name: r.name, setName: r.setName || "",
      cardNumber: r.cardNumber || "", condition: r.condition, category: r.category, language: r.language,
      gradingCompany: r.gradingCompany || null, grade: r.grade || null,
      unitCost: r.cost, purchaseDate: todayISO(), source: "", purchaseNotes: "",
      photoKeys: [], status: "in_stock", sale: null, createdAt: Date.now(),
    }));
    let newIdx = 0;
    const resolvedRefs = refs.map((r) => (r.kind === "new" ? { kind: "singola", id: newItems[newIdx++].id } : r));
    const baseItems = newItems.length ? [...items, ...newItems] : items;

    if (resolvedRefs.length === 1) {
      const [ref] = resolvedRefs;
      const sale = { id: uid(), ...saleData };
      const next = baseItems.map((it) => {
        if (ref.kind === "singola") return it.id === ref.id ? { ...it, status: "sold", sale } : it;
        if (it.id !== ref.lotId) return it;
        return { ...it, cards: it.cards.map((c) => (c.id === ref.id ? { ...c, status: "sold", sale } : c)) };
      });
      await persist(next);
      setShowBulkSale(false);
      return;
    }

    const groupId = uid();
    const sale = {
      id: groupId, groupId, groupTotal: saleData.price, groupSize: resolvedRefs.length,
      date: saleData.date, buyer: saleData.buyer, carrier: saleData.carrier, tracking: saleData.tracking, notes: saleData.notes,
      price: null,
    };
    const singolaIds = new Set(resolvedRefs.filter((r) => r.kind === "singola").map((r) => r.id));
    const lotCardIds = {};
    resolvedRefs.filter((r) => r.kind === "lotto").forEach((r) => {
      if (!lotCardIds[r.lotId]) lotCardIds[r.lotId] = new Set();
      lotCardIds[r.lotId].add(r.id);
    });
    const next = baseItems.map((it) => {
      if (it.kind === "singola") {
        return singolaIds.has(it.id) ? { ...it, status: "sold", sale } : it;
      }
      const ids = lotCardIds[it.id];
      if (!ids) return it;
      return { ...it, cards: it.cards.map((c) => (ids.has(c.id) ? { ...c, status: "sold", sale } : c)) };
    });
    await persist(next);
    setShowBulkSale(false);
  }

  async function handleCancelGroupSale(groupId) {
    const next = items.map((it) => {
      if (it.kind === "singola") {
        return it.sale && it.sale.groupId === groupId ? { ...it, status: "in_stock", sale: null } : it;
      }
      return { ...it, cards: it.cards.map((c) => (c.sale && c.sale.groupId === groupId ? { ...c, status: "in_stock", sale: null } : c)) };
    });
    await persist(next);
    setDetailGroupSaleId(null);
  }

  async function handleExportCSV() {
    exportInventoryCSV(items, catalog.GAME_META);
  }

  // ---- derived data ----
  const singolaItems = items.filter((i) => i.kind === "singola");
  const lotItems = items.filter((i) => i.kind === "lotto");
  const allLotCards = lotItems.flatMap((l) => l.cards.map((c) => ({ ...c, lotId: l.id, lotName: l.lotName })));

  const inStockSingola = singolaItems.filter((i) => i.status !== "sold");
  const listedSingola = singolaItems.filter((i) => i.status === "listed");
  const listedLotCards = allLotCards.filter((c) => c.status === "listed");
  const allSaleUnitsRaw = buildAllSaleUnits(singolaItems, lotItems);

  // Carte "in magazzino": include sia le carte singole in stock sia, per ogni lotto,
  // tutte le unità non ancora vendute — comprese quelle non ancora catalogate individualmente.
  const inStockCount =
    inStockSingola.length +
    lotItems.reduce((s, l) => {
      const soldInLot = l.cards.filter((c) => c.status === "sold").length;
      return s + Math.max(0, l.quantity - soldInLot);
    }, 0);

  const valueInStock =
    inStockSingola.reduce((s, i) => s + i.unitCost, 0) +
    lotItems.reduce((s, l) => {
      const soldKnownInLot = l.cards.filter((c) => c.status === "sold" && c.assignedCost != null).reduce((cs, c) => cs + c.assignedCost, 0);
      return s + Math.max(0, l.totalCost - soldKnownInLot);
    }, 0);

  // ---- period filter ----
  const periodRange = getPeriodRange(period, customFrom, customTo);
  const inRange = makeInRange(periodRange);

  const periodSaleUnits = allSaleUnitsRaw.filter((u) => inRange(u.sale.date));
  const periodSaleUnitsKnown = periodSaleUnits.filter((u) => u.cost != null);
  const periodSaleUnitsUnknown = periodSaleUnits.filter((u) => u.cost == null);

  const totalRevenue = periodSaleUnits.reduce((s, u) => s + u.sale.price, 0);
  const costOfSoldKnown = periodSaleUnitsKnown.reduce((s, u) => s + u.cost, 0);
  const revenueOfSoldKnown = periodSaleUnitsKnown.reduce((s, u) => s + u.sale.price, 0);
  const revenueUnknownCost = periodSaleUnitsUnknown.reduce((s, u) => s + u.sale.price, 0);
  const marginKnown = revenueOfSoldKnown - costOfSoldKnown;
  const roiKnown = costOfSoldKnown > 0 ? (marginKnown / costOfSoldKnown) * 100 : 0;

  const totalInvested =
    singolaItems.filter((i) => inRange(i.purchaseDate)).reduce((s, i) => s + i.unitCost, 0) +
    lotItems.filter((l) => inRange(l.purchaseDate)).reduce((s, l) => s + l.totalCost, 0);

  const filtered = items
    .filter((i) => filterGame === "all" || i.game === filterGame)
    .filter((i) => filterKind === "all" || i.kind === filterKind)
    .filter((i) => {
      if (filterGraded === "all") return true;
      const isGraded = i.kind === "singola" ? !!i.gradingCompany : i.cards.some((c) => !!c.gradingCompany);
      return filterGraded === "graded" ? isGraded : !isGraded;
    })
    .filter((i) => {
      if (filterCategory === "all") return true;
      return i.kind === "singola" ? i.category === filterCategory : i.cards.some((c) => c.category === filterCategory);
    })
    .filter((i) => {
      if (filterStatus === "all") return true;
      if (i.kind === "singola") return i.status === filterStatus;
      const hasSold = i.cards.some((c) => c.status === "sold");
      const hasListed = i.cards.some((c) => c.status === "listed");
      const hasStock = i.cards.some((c) => c.status === "in_stock") || i.cards.length < i.quantity;
      if (filterStatus === "sold") return hasSold;
      if (filterStatus === "listed") return hasListed;
      return hasStock;
    })
    .filter((i) => {
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      if (i.kind === "singola") return (i.name || "").toLowerCase().includes(q) || (i.setName || "").toLowerCase().includes(q);
      return (i.lotName || "").toLowerCase().includes(q) || i.cards.some((c) => (c.name || "").toLowerCase().includes(q));
    });
  const sortedFiltered = sortUnits(filtered, sortInventory, {
    getDate: (i) => i.createdAt,
    getPrice: (i) => (i.kind === "singola" ? i.unitCost : i.totalCost),
    getName: (i) => (i.kind === "singola" ? i.name : i.lotName) || "",
  });

  const allSoldUnits = [...periodSaleUnits].sort((a, b) => new Date(b.sale.date) - new Date(a.sale.date));

  const recentSales = allSoldUnits.slice(0, 5);
  const sortedSoldUnits = sortUnits(allSoldUnits, sortSales, {
    getDate: (u) => new Date(u.sale.date).getTime(),
    getPrice: (u) => u.sale.price,
    getName: (u) => u.name || "",
  });

  const rawListedUnits = [
    ...listedSingola.map((i) => ({ id: i.id, kind: "singola", name: cardDisplayName(i.name, i.cardNumber), game: i.game, photoKey: i.photoKeys?.[0], listing: i.listing })),
    ...listedLotCards.map((c) => ({ id: c.id, kind: "lotto", lotId: c.lotId, name: `${c.lotName} › ${cardDisplayName(c.name || "Carta", c.cardNumber)}`, game: c.game, photoKey: c.photoKeys?.[0], listing: c.listing })),
  ];
  const listingPlatforms = [...new Set(rawListedUnits.map((u) => u.listing?.platform).filter(Boolean))].sort();
  const filteredListedUnits = rawListedUnits
    .filter((u) => listingPlatformFilter === "all" || u.listing?.platform === listingPlatformFilter)
    .filter((u) => listingPriceMin === "" || (u.listing?.price ?? 0) >= parseFloat(listingPriceMin))
    .filter((u) => listingPriceMax === "" || (u.listing?.price ?? 0) <= parseFloat(listingPriceMax))
    .filter((u) => !listingSearch.trim() || (u.name || "").toLowerCase().includes(listingSearch.trim().toLowerCase()));
  const allListedUnits = sortUnits(filteredListedUnits, sortListings, {
    getDate: (u) => new Date(u.listing?.listedDate || 0).getTime(),
    getPrice: (u) => u.listing?.price,
    getName: (u) => u.name || "",
  });
  const totalListedValue = allListedUnits.reduce((s, u) => s + (u.listing?.price || 0), 0);

  const detailItem = detailItemId ? items.find((i) => i.id === detailItemId) : null;
  const editItem = editItemId ? items.find((i) => i.id === editItemId) : null;
  const sellItem = sellItemId ? items.find((i) => i.id === sellItemId) : null;
  const detailLot = detailLotId ? items.find((i) => i.id === detailLotId) : null;
  const editLot = editLotId ? items.find((i) => i.id === editLotId) : null;
  const addCardLot = addCardLotId ? items.find((i) => i.id === addCardLotId) : null;

  function resolveLotCard(ref) {
    if (!ref) return null;
    const lot = items.find((i) => i.id === ref.lotId);
    if (!lot) return null;
    const card = lot.cards.find((c) => c.id === ref.cardId);
    if (!card) return null;
    return { lot, card };
  }
  const detailLotCardResolved = resolveLotCard(detailLotCard);
  const editLotCardResolved = resolveLotCard(editLotCard);
  const sellLotCardResolved = resolveLotCard(sellLotCard);
  const listingLotCardResolved = resolveLotCard(listingLotCard);
  const listingItem = listingItemId ? items.find((i) => i.id === listingItemId) : null;

  function resolveGroupSale(groupId) {
    if (!groupId) return null;
    const members = [];
    let sale = null;
    for (const it of items) {
      if (it.kind === "singola") {
        if (it.sale && it.sale.groupId === groupId) {
          sale = it.sale;
          members.push({ id: it.id, kind: "singola", name: cardDisplayName(it.name, it.cardNumber), cost: it.unitCost, photoKey: it.photoKeys?.[0], sourceLabel: "Carta singola" });
        }
      } else {
        for (const c of it.cards) {
          if (c.sale && c.sale.groupId === groupId) {
            sale = c.sale;
            members.push({ id: c.id, kind: "lotto", lotId: it.id, name: cardDisplayName(c.name || "Carta senza nome", c.cardNumber), cost: c.assignedCost, photoKey: c.photoKeys?.[0] || it.photoKeys?.[0], sourceLabel: `Lotto: ${it.lotName}` });
          }
        }
      }
    }
    if (!members.length) return null;
    return { groupId, sale, members };
  }
  const detailGroupSaleResolved = resolveGroupSale(detailGroupSaleId);

  // Opens the right detail modal for a sale "unit" (single card, lot card, or group
  // sale) — shared between the Dashboard's recent sales and the Vendite list.
  function openSaleUnit(u) {
    if (u.kind === "singola") setDetailItemId(u.id);
    else if (u.kind === "group") setDetailGroupSaleId(u.id);
    else setDetailLotCard({ lotId: u.lotId, cardId: u.id });
  }
  function openListedUnit(u) {
    if (u.kind === "singola") setDetailItemId(u.id);
    else setDetailLotCard({ lotId: u.lotId, cardId: u.id });
  }

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: "'Inter', system-ui, sans-serif", position: "relative" }} className="app-shell w-full flex flex-col lg:flex-row rounded-2xl overflow-hidden">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap');
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.7); }
        .app-shell { height: 100vh; height: 100dvh; }

        /* Native-feeling touch scrolling: momentum on iOS (Android already has it
           built in), and each scrollable area bounces on its own instead of the
           scroll "chaining" into whatever is behind it. */
        .overflow-y-auto, .overflow-x-auto {
          -webkit-overflow-scrolling: touch;
          scroll-behavior: smooth;
          overscroll-behavior: contain;
        }

        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.96); } to { opacity: 1; transform: scale(1); } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .anim-fade-in { animation: fadeIn 0.18s ease-out both; }
        .anim-scale-in { animation: scaleIn 0.16s cubic-bezier(0.16,1,0.3,1) both; }
        .anim-slide-up { animation: slideUp 0.2s cubic-bezier(0.16,1,0.3,1) both; }
        @media (prefers-reduced-motion: reduce) {
          .anim-fade-in, .anim-scale-in, .anim-slide-up { animation: none; }
        }
      `}</style>

      {/* ---- Desktop sidebar (hidden below the lg breakpoint, where the bottom tab bar takes over) ---- */}
      <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:flex-shrink-0" style={{ background: C.surface, borderRight: `1px solid ${C.border}` }}>
        <div className="px-6 pt-6 pb-5">
          <h1 style={{ fontFamily: "'Oswald', sans-serif" }} className="text-xl font-semibold">
            <span style={{ color: C.text }}>Card</span><span style={{ color: C.gold }}>ly</span>
          </h1>
        </div>
        <nav className="flex-1 px-3 space-y-1">
          {NAV_ITEMS.map(([val, label, Icon]) => (
            <button
              key={val} onClick={() => setView(val)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium transition-colors"
              style={{ background: view === val ? C.surfaceAlt : "transparent", color: view === val ? C.gold : C.textDim }}
            >
              <Icon size={18} /> {label}
            </button>
          ))}
        </nav>
        <div className="px-3 pb-6 space-y-1">
          <button
            onClick={() => setShowGlobalSearch(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium"
            style={{ color: C.textDim }}
          >
            <Search size={18} /> Cerca
          </button>
          <button
            onClick={() => setView("settings")}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium"
            style={{ background: view === "settings" ? C.surfaceAlt : "transparent", color: view === "settings" ? C.gold : C.textDim }}
          >
            <SettingsIcon size={18} /> Impostazioni
          </button>
        </div>
      </aside>

      <div className="lg:hidden px-5 pt-5 pb-4 flex items-center justify-between" style={{ borderBottom: `1px solid ${C.border}` }}>
        <div>
          {/* <div className="text-[11px] uppercase tracking-[0.2em]" style={{ color: C.gold }}>Gestione Collezione</div> */}
          <h1 style={{ fontFamily: "'Oswald', sans-serif" }} className="text-xl font-semibold -mt-0.5">
            <span style={{ color: C.text }}>Card</span><span style={{ color: C.gold }}>ly</span>
          </h1>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setShowGlobalSearch(true)} title="Cerca ovunque" style={{ color: C.textDim }} className="p-2 rounded-lg"><Search size={18} /></button>
          <button onClick={() => setView("settings")} title="Impostazioni" style={{ color: view === "settings" ? C.gold : C.textDim }} className="p-2 rounded-lg"><SettingsIcon size={18} /></button>
        </div>
      </div>

      <div key={loading ? "loading" : view} className="anim-fade-in flex-1 min-w-0 min-h-0 overflow-y-auto px-5 py-5 pb-24 lg:px-10 lg:py-8 lg:pb-10">
        <div className="lg:max-w-6xl lg:mx-auto">
        {loading ? (
          <div className="text-center py-16 text-sm" style={{ color: C.textFaint }}>Caricamento inventario...</div>
        ) : view === "dashboard" ? (
          <DashboardSection
            period={period} setPeriod={setPeriod} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo}
            showDashboardFilters={showDashboardFilters} setShowDashboardFilters={setShowDashboardFilters}
            totalInvested={totalInvested} inStockCount={inStockCount} valueInStock={valueInStock}
            totalRevenue={totalRevenue} marginKnown={marginKnown} roiKnown={roiKnown} revenueOfSoldKnown={revenueOfSoldKnown} revenueUnknownCost={revenueUnknownCost}
            allListedUnits={allListedUnits} totalListedValue={totalListedValue} setView={setView}
            allSoldUnits={allSoldUnits} recentSales={recentSales} onSelectSaleUnit={openSaleUnit}
          />
        ) : view === "inventory" ? (
          <InventorySection
            search={search} setSearch={setSearch} sortedFiltered={sortedFiltered} itemsCount={items.length}
            showInventoryFilters={showInventoryFilters} setShowInventoryFilters={setShowInventoryFilters}
            filterGame={filterGame} setFilterGame={setFilterGame} filterStatus={filterStatus} setFilterStatus={setFilterStatus}
            filterKind={filterKind} setFilterKind={setFilterKind}
            filterGraded={filterGraded} setFilterGraded={setFilterGraded}
            filterCategory={filterCategory} setFilterCategory={setFilterCategory}
            sortInventory={sortInventory} setSortInventory={setSortInventory}
            games={catalog.games}
            onOpenItem={(id) => setDetailItemId(id)} onOpenLot={(id) => setDetailLotId(id)}
          />
        ) : view === "listings" ? (
          <ListingsSection
            allListedUnits={allListedUnits} totalListedValue={totalListedValue} rawListedUnitsCount={rawListedUnits.length}
            listingSearch={listingSearch} setListingSearch={setListingSearch}
            showListingFilters={showListingFilters} setShowListingFilters={setShowListingFilters}
            listingPlatforms={listingPlatforms} listingPlatformFilter={listingPlatformFilter} setListingPlatformFilter={setListingPlatformFilter}
            listingPriceMin={listingPriceMin} setListingPriceMin={setListingPriceMin} listingPriceMax={listingPriceMax} setListingPriceMax={setListingPriceMax}
            sortListings={sortListings} setSortListings={setSortListings}
            onOpenUnit={openListedUnit}
          />
        ) : view === "sales" ? (
          <SalesSection
            totalRevenue={totalRevenue} costOfSoldKnown={costOfSoldKnown} marginKnown={marginKnown} revenueUnknownCost={revenueUnknownCost}
            sortedSoldUnits={sortedSoldUnits}
            showSalesFilters={showSalesFilters} setShowSalesFilters={setShowSalesFilters}
            period={period} setPeriod={setPeriod} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo}
            sortSales={sortSales} setSortSales={setSortSales}
            onSelectSaleUnit={openSaleUnit}
          />
        ) : (
          <SettingsSection auth={auth} catalog={catalog} itemCount={items.length} onExportCSV={handleExportCSV} />
        )}
        </div>
      </div>

      {view === "inventory" && (
        <button onClick={() => setShowAdd(true)} style={{ background: C.gold, color: "#181305" }} className="absolute right-5 bottom-[84px] lg:bottom-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-30">
          <Plus size={24} />
        </button>
      )}
      {view === "sales" && (
        <button onClick={() => { setBulkSaleCount(0); setShowBulkSale(true); }} title="Vendi carte" style={{ background: C.teal, color: "#0B231D" }} className="absolute right-5 bottom-[84px] lg:bottom-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-30">
          <Plus size={24} />
        </button>
      )}

      <div className="lg:hidden flex items-center justify-around py-2.5 relative z-20" style={{ background: C.surface, borderTop: `1px solid ${C.border}` }}>
        {NAV_ITEMS.map(([val, label, Icon]) => (
          <button key={val} onClick={() => setView(val)} className="flex flex-col items-center gap-1 px-3 py-1" style={{ color: view === val ? C.gold : C.textFaint }}>
            <Icon size={19} /><span className="text-[10.5px] font-medium">{label}</span>
          </button>
        ))}
      </div>

      {/* ---- Modals ---- */}
      {showGlobalSearch && (
        <GlobalSearchModal
          items={items}
          onClose={() => setShowGlobalSearch(false)}
          onOpenItem={(id) => setDetailItemId(id)}
          onOpenLotCard={(lotId, cardId) => setDetailLotCard({ lotId, cardId })}
          onOpenLot={(id) => setDetailLotId(id)}
        />
      )}
      {showAdd && (
        <Modal title="Nuovo acquisto" onClose={() => setShowAdd(false)} wide>
          <AddPurchaseForm onCancel={() => setShowAdd(false)} onSubmit={handleAddPurchase} />
        </Modal>
      )}

      {detailItem && !editItemId && !sellItemId && !listingItemId && (
        <ItemDetail
          item={detailItem}
          onClose={() => setDetailItemId(null)}
          onEdit={() => setEditItemId(detailItem.id)}
          onSell={() => setSellItemId(detailItem.id)}
          onCancelSale={() => (detailItem.sale && detailItem.sale.groupId ? handleCancelGroupSale(detailItem.sale.groupId) : handleCancelSale(detailItem.id))}
          onList={() => setListingItemId(detailItem.id)}
          onEditListing={() => setListingItemId(detailItem.id)}
          onUnlist={() => handleUnlistItem(detailItem.id)}
          onOpenGroup={() => {
            const gid = detailItem.sale && detailItem.sale.groupId;
            if (gid) { setDetailGroupSaleId(gid); setDetailItemId(null); }
          }}
        />
      )}
      {editItem && (
        <Modal title="Modifica carta" onClose={() => setEditItemId(null)} wide>
          <EditItemForm item={editItem} onCancel={() => setEditItemId(null)} onSubmit={(changes) => handleUpdateItem(editItem.id, changes)} onDelete={() => handleDeleteItem(editItem.id)} />
        </Modal>
      )}
      {sellItem && (
        <Modal title="Registra vendita" onClose={() => setSellItemId(null)}>
          <SaleForm item={sellItem} onCancel={() => setSellItemId(null)} onSubmit={(saleData) => handleRegisterSale(sellItem.id, saleData)} />
        </Modal>
      )}
      {listingItem && (
        <Modal title={listingItem.listing ? "Modifica annuncio" : "Metti in vendita"} onClose={() => setListingItemId(null)}>
          <ListingForm item={listingItem} initial={listingItem.listing} onCancel={() => setListingItemId(null)} onSubmit={(form) => handleListItem(listingItem.id, form)} />
        </Modal>
      )}

      {detailLot && !editLotId && !addCardLotId && !detailLotCard && (
        <LotDetail
          lot={detailLot}
          onClose={() => setDetailLotId(null)}
          onEditLot={() => setEditLotId(detailLot.id)}
          onAddCard={() => setAddCardLotId(detailLot.id)}
          onOpenCard={(card) => setDetailLotCard({ lotId: detailLot.id, cardId: card.id })}
        />
      )}
      {editLot && (
        <Modal title="Modifica lotto" onClose={() => setEditLotId(null)} wide>
          <EditLotForm lot={editLot} onCancel={() => setEditLotId(null)} onSubmit={(changes) => handleUpdateLot(editLot.id, changes)} onDelete={() => handleDeleteLot(editLot.id)} />
        </Modal>
      )}
      {addCardLot && (
        <Modal title="Aggiungi carta al lotto" onClose={() => setAddCardLotId(null)} eyebrow={addCardLot.lotName} wide>
          <LotCardForm lot={addCardLot} onCancel={() => setAddCardLotId(null)} onSubmit={(form) => handleAddLotCard(addCardLot.id, form)} />
        </Modal>
      )}
      {showBulkSale && (
        <Modal title={bulkSaleCount > 1 ? "Vendita multipla" : "Registra vendita"} onClose={() => setShowBulkSale(false)} eyebrow="Cerca e aggiungi le carte da vendere insieme" wide>
          <BulkSaleWizard items={items} onCancel={() => setShowBulkSale(false)} onSubmit={(refs, saleData) => handleBulkSell(refs, saleData)} onSelectionChange={setBulkSaleCount} />
        </Modal>
      )}
      {detailGroupSaleResolved && (
        <GroupSaleDetail
          groupId={detailGroupSaleResolved.groupId}
          sale={detailGroupSaleResolved.sale}
          members={detailGroupSaleResolved.members}
          onClose={() => setDetailGroupSaleId(null)}
          onCancelGroupSale={() => handleCancelGroupSale(detailGroupSaleResolved.groupId)}
        />
      )}

      {detailLotCardResolved && !editLotCard && !sellLotCard && !listingLotCard && (
        <LotCardDetail
          lot={detailLotCardResolved.lot}
          card={detailLotCardResolved.card}
          onClose={() => setDetailLotCard(null)}
          onEdit={() => setEditLotCard(detailLotCard)}
          onSell={() => setSellLotCard(detailLotCard)}
          onCancelSale={() => handleCancelLotCardSale(detailLotCardResolved.lot.id, detailLotCardResolved.card.id)}
          onList={() => setListingLotCard(detailLotCard)}
          onEditListing={() => setListingLotCard(detailLotCard)}
          onUnlist={() => handleUnlistLotCard(detailLotCardResolved.lot.id, detailLotCardResolved.card.id)}
          onOpenGroup={() => {
            const gid = detailLotCardResolved.card.sale && detailLotCardResolved.card.sale.groupId;
            if (gid) { setDetailGroupSaleId(gid); setDetailLotCard(null); }
          }}
          onCancelGroupSale={() => {
            const gid = detailLotCardResolved.card.sale && detailLotCardResolved.card.sale.groupId;
            if (gid) handleCancelGroupSale(gid);
          }}
        />
      )}
      {editLotCardResolved && (
        <Modal title="Modifica carta" onClose={() => setEditLotCard(null)} eyebrow={editLotCardResolved.lot.lotName} wide>
          <LotCardForm
            lot={editLotCardResolved.lot}
            initial={editLotCardResolved.card}
            onCancel={() => setEditLotCard(null)}
            onSubmit={(changes) => handleUpdateLotCard(editLotCardResolved.lot.id, editLotCardResolved.card.id, changes)}
            onDelete={() => handleDeleteLotCard(editLotCardResolved.lot.id, editLotCardResolved.card.id)}
          />
        </Modal>
      )}
      {sellLotCardResolved && (
        <Modal title="Registra vendita" onClose={() => setSellLotCard(null)} eyebrow={sellLotCardResolved.lot.lotName}>
          <SaleForm
            item={{ name: sellLotCardResolved.card.name || "Carta senza nome", unitCost: sellLotCardResolved.card.assignedCost, photoKey: sellLotCardResolved.card.photoKeys?.[0] || sellLotCardResolved.lot.photoKeys?.[0], listing: sellLotCardResolved.card.listing }}
            onCancel={() => setSellLotCard(null)}
            onSubmit={(saleData) => handleSellLotCard(sellLotCardResolved.lot.id, sellLotCardResolved.card.id, saleData)}
          />
        </Modal>
      )}
      {listingLotCardResolved && (
        <Modal title={listingLotCardResolved.card.listing ? "Modifica annuncio" : "Metti in vendita"} onClose={() => setListingLotCard(null)} eyebrow={listingLotCardResolved.lot.lotName}>
          <ListingForm
            item={{ name: listingLotCardResolved.card.name || "Carta senza nome", photoKey: listingLotCardResolved.card.photoKeys?.[0] || listingLotCardResolved.lot.photoKeys?.[0] }}
            initial={listingLotCardResolved.card.listing}
            onCancel={() => setListingLotCard(null)}
            onSubmit={(form) => handleListLotCard(listingLotCardResolved.lot.id, listingLotCardResolved.card.id, form)}
          />
        </Modal>
      )}
    </div>
  );
}
