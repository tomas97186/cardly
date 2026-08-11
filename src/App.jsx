import { useState, useEffect, useCallback, lazy, Suspense } from "react";
import {
  Package, Plus, Search, LayoutGrid, ShoppingBag, Megaphone, User,
} from "lucide-react";

import { useAuth } from "./hooks/useAuth";
import { useAndroidBackButton } from "./hooks/useAndroidBackButton";
import { useAsyncRecord, useAsyncLotCard } from "./hooks/useAsyncRecord";
import { LoginScreen } from "./components/auth/LoginScreen";
import { CatalogProvider, useCatalog } from "./context/CatalogContext";
import { LanguageProvider, useLanguage } from "./context/LanguageContext";
import { ThemeProvider } from "./context/ThemeContext";
import { CurrencyProvider } from "./context/CurrencyContext";
import { EbayMarketProvider } from "./context/EbayMarketContext";
import { EntitlementProvider, useEntitlement } from "./context/EntitlementContext";
import { C } from "./lib/theme";
import { FREE_TIER_ITEM_LIMIT } from "./lib/appConfig";
import { uid, todayISO, cardDisplayName } from "./lib/format";
import { getPeriodRange, makeInRange } from "./lib/period";
import { buildAllSaleUnits } from "./lib/saleUnits";
import {
  loadFinancialSummary, loadRecentSales, loadItemById, loadLotWithCards, loadGroupSaleDetail,
  loadCataloguedCardCount,
  savePhotos, deletePhotoKeys,
  upsertItem, upsertLot, upsertLotCard,
  sellItemRecord, cancelItemSaleRecord, listItemRecord, unlistItemRecord,
  sellLotCardRecord, cancelLotCardSaleRecord, listLotCardRecord, unlistLotCardRecord,
  cancelGroupSaleRecord, upsertSaleRecord, updateItemFields, updateLotCardFields,
  deleteItemRecord, deleteLotRecord, deleteLotCardRecord,
  exportInventoryFull, loadListingsForExport,
  upsertBox,
} from "./lib/storage";
import { exportInventoryCSV } from "./lib/csv";
import { generateBoxCode } from "./lib/boxQr";

import { Modal } from "./components/ui/Modal";
import { AddPurchaseForm } from "./components/forms/AddPurchaseForm";
import { EditItemForm } from "./components/forms/EditItemForm";
import { EditLotForm } from "./components/forms/EditLotForm";
import { LotCardForm } from "./components/forms/LotCardForm";
import { SaleForm } from "./components/forms/SaleForm";
import { ListingForm } from "./components/forms/ListingForm";
import { BulkSaleWizard } from "./components/forms/BulkSaleWizard";
import { ExportListingsPdfForm } from "./components/forms/ExportListingsPdfForm";
import { ItemDetail } from "./components/details/ItemDetail";
import { LotCardDetail } from "./components/details/LotCardDetail";
import { GroupSaleDetail } from "./components/details/GroupSaleDetail";
import { LotDetail } from "./components/details/LotDetail";
import { GlobalSearchModal } from "./components/search/GlobalSearchModal";
import { PremiumWelcomeModal } from "./components/PremiumWelcomeModal";
import { DashboardSection } from "./components/sections/DashboardSection";
import { InventorySection } from "./components/sections/InventorySection";
import { BoxesSection } from "./components/sections/BoxesSection";
import { NewBoxForm } from "./components/forms/NewBoxForm";
import { ListingsSection } from "./components/sections/ListingsSection";
import { SalesSection } from "./components/sections/SalesSection";
import { SettingsSection } from "./components/sections/SettingsSection";
// Recharts (~130KB gzip) is only worth loading for people who actually open the
// Report tab — same lazy-loading precedent as jsPDF in lib/pdfExport.js.
const ReportSection = lazy(() => import("./components/sections/ReportSection"));

// Shared between the mobile bottom tab bar and the desktop sidebar nav — labels are
// translation keys, resolved via t() at render time so they react to language changes.
const NAV_ITEMS = [
  ["dashboard", "nav.dashboard", LayoutGrid],
  ["inventory", "nav.inventory", Package],
  ["listings", "nav.listings", Megaphone],
  ["sales", "nav.sales", ShoppingBag],
  ["settings", "nav.settings", User],
];

export default function App() {
  return (
    <ThemeProvider>
      <CurrencyProvider>
        <EbayMarketProvider>
          <LanguageProvider>
            <AppGate />
          </LanguageProvider>
        </EbayMarketProvider>
      </CurrencyProvider>
    </ThemeProvider>
  );
}

function AppGate() {
  const auth = useAuth();
  const { t } = useLanguage();

  if (auth.status === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm" style={{ background: C.bg, color: C.textFaint }}>
        {t("common.loading")}
      </div>
    );
  }
  if (auth.status !== "signed-in") {
    return <LoginScreen auth={auth} />;
  }
  return (
    <CatalogProvider>
      <EntitlementProvider>
        <AppInner auth={auth} />
      </EntitlementProvider>
    </CatalogProvider>
  );
}

function AppInner({ auth }) {
  const catalog = useCatalog();
  const { t } = useLanguage();
  const { isPremium } = useEntitlement();

  const [view, setView] = useState("dashboard");
  // Bumped after every write — every fetch effect (financial summary, recent sales,
  // the per-id detail loaders below, and each section's own paginated fetch) depends
  // on this, so a mutation anywhere refreshes whatever's currently visible without
  // needing per-case optimistic patching of a shared array.
  const [dataVersion, setDataVersion] = useState(0);
  const bumpDataVersion = useCallback(() => setDataVersion((v) => v + 1), []);

  // Shared across Dashboard/Vendite/Report — changing the period in one changes it
  // in all three, same as before.
  const [period, setPeriod] = useState("all");
  const [customFrom, setCustomFrom] = useState(todayISO());
  const [customTo, setCustomTo] = useState(todayISO());

  const [showGlobalSearch, setShowGlobalSearch] = useState(false);

  // Stripe rimanda qui con ?checkout=success dopo un pagamento riuscito (vedi
  // supabase/functions/create-checkout-session) — ripulisce subito l'URL così
  // un refresh/back non ri-mostra il modale.
  const [showPremiumWelcome, setShowPremiumWelcome] = useState(false);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("checkout") === "success") {
      window.history.replaceState(null, "", window.location.pathname);
      setShowPremiumWelcome(true);
    }
  }, []);

  // Sotto-tab della sezione Inventario, solo Premium (le Scatole sono una loro
  // funzione) — i Free vedono sempre e solo "items", niente switcher visibile.
  const [inventoryTab, setInventoryTab] = useState("items"); // "items" | "boxes"

  const [showAdd, setShowAdd] = useState(false);
  const [showNewBox, setShowNewBox] = useState(false);
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
  const [showExportPdf, setShowExportPdf] = useState(false);
  const [exportListings, setExportListings] = useState(null);

  // Android back button: close whatever's on top (a modal/detail, or a nested
  // edit/sell/listing layer within one) instead of exiting the installed PWA. Only
  // falls through to a real exit once every layer below is already closed.
  const navDepth =
    (view !== "dashboard" ? 1 : 0) +
    (showGlobalSearch ? 1 : 0) +
    (showAdd ? 1 : 0) +
    (showNewBox ? 1 : 0) +
    (detailItemId ? 1 : 0) +
    (editItemId || sellItemId || listingItemId ? 1 : 0) +
    (detailLotId ? 1 : 0) +
    (editLotId || addCardLotId ? 1 : 0) +
    (detailLotCard ? 1 : 0) +
    (editLotCard || sellLotCard || listingLotCard ? 1 : 0) +
    (showBulkSale ? 1 : 0) +
    (detailGroupSaleId ? 1 : 0) +
    (showExportPdf ? 1 : 0);

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
    if (showExportPdf) return setShowExportPdf(false);
    if (showBulkSale) return setShowBulkSale(false);
    if (showAdd) return setShowAdd(false);
    if (showNewBox) return setShowNewBox(false);
    if (showGlobalSearch) return setShowGlobalSearch(false);
    if (view !== "dashboard") return setView("dashboard");
  }

  useAndroidBackButton(navDepth, closeTopBackLayer);

  // ---- financial summary (Dashboard / Report / Vendite header stats) ----
  const [financialSummary, setFinancialSummary] = useState({ singolaItems: [], lotItems: [] });
  const [recentSales, setRecentSales] = useState([]);
  const [summaryLoading, setSummaryLoading] = useState(true);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setSummaryLoading(true);
      const [summary, recent] = await Promise.all([loadFinancialSummary(), loadRecentSales(5)]);
      if (cancelled) return;
      setFinancialSummary(summary);
      setRecentSales(recent);
      setSummaryLoading(false);
    })();
    return () => { cancelled = true; };
  }, [dataVersion]);

  // ---- detail-by-id loaders (replace the old items.find(...) lookups) ----
  const detailItem = useAsyncRecord(detailItemId, loadItemById, dataVersion);
  const editItem = useAsyncRecord(editItemId, loadItemById, dataVersion);
  const sellItem = useAsyncRecord(sellItemId, loadItemById, dataVersion);
  const listingItem = useAsyncRecord(listingItemId, loadItemById, dataVersion);
  const detailLot = useAsyncRecord(detailLotId, loadLotWithCards, dataVersion);
  const editLot = useAsyncRecord(editLotId, loadLotWithCards, dataVersion);
  const addCardLot = useAsyncRecord(addCardLotId, loadLotWithCards, dataVersion);
  const detailLotCardResolved = useAsyncLotCard(detailLotCard, dataVersion);
  const editLotCardResolved = useAsyncLotCard(editLotCard, dataVersion);
  const sellLotCardResolved = useAsyncLotCard(sellLotCard, dataVersion);
  const listingLotCardResolved = useAsyncLotCard(listingLotCard, dataVersion);
  const detailGroupSaleRaw = useAsyncRecord(detailGroupSaleId, loadGroupSaleDetail, dataVersion);
  // loadGroupSaleDetail returns bare data (no i18n/formatting) — display name and
  // source label are assembled here, where t()/cardDisplayName are available.
  const detailGroupSaleResolved = detailGroupSaleRaw ? {
    ...detailGroupSaleRaw,
    members: detailGroupSaleRaw.members.map((m) => ({
      ...m,
      name: cardDisplayName(m.name || t("common.unnamedCard"), m.cardNumber),
      sourceLabel: m.kind === "singola" ? t("forms.singleCard") : t("details.groupSaleSourceLabel", { lotName: m.lotName }),
    })),
  } : null;

  useEffect(() => {
    if (!showExportPdf) { setExportListings(null); return; }
    loadListingsForExport().then(setExportListings);
  }, [showExportPdf]);

  // ---- singola item handlers ----
  async function handleAddPurchase(form) {
    if (form.purchaseType === "singola") {
      if (!isPremium && (await loadCataloguedCardCount()) >= FREE_TIER_ITEM_LIMIT) {
        return { error: t("forms.freeTierLimitReached", { limit: FREE_TIER_ITEM_LIMIT }) };
      }
      const id = uid();
      const photoKeys = form.photos && form.photos.length ? await savePhotos(`photo:${id}`, form.photos) : [];
      await upsertItem({
        id, kind: "singola", game: form.game, name: form.name.trim(), setName: form.setName,
        cardNumber: form.cardNumber, condition: form.condition, category: form.category, language: form.language,
        gradingCompany: form.gradingCompany || null, grade: form.grade || null,
        unitCost: parseFloat(form.price) || 0, purchaseDate: form.purchaseDate, source: form.source,
        purchaseNotes: form.notes, photoKeys, boxId: form.boxId || null, status: "in_stock", sale: null, createdAt: Date.now(),
      });
    } else {
      const id = uid();
      const photoKeys = form.photos && form.photos.length ? await savePhotos(`photo:lot:${id}`, form.photos) : [];
      await upsertLot({
        id, kind: "lotto", lotName: form.lotName.trim(), game: form.game,
        totalCost: parseFloat(form.price) || 0, quantity: Math.max(1, parseInt(form.quantity) || 1),
        purchaseDate: form.purchaseDate, source: form.source, purchaseNotes: form.notes,
        photoKeys, boxId: form.boxId || null, createdAt: Date.now(),
      });
    }
    bumpDataVersion();
    setShowAdd(false);
  }

  async function handleAddBox(label) {
    const { error } = await upsertBox({ id: uid(), code: generateBoxCode(), label });
    if (error) return { error: t("boxes.createError") };
    bumpDataVersion();
    setShowNewBox(false);
  }

  async function handleUpdateItem(id, changes) {
    if (!editItem) return;
    await deletePhotoKeys(editItem.photoKeys);
    const photoKeys = changes.photos && changes.photos.length ? await savePhotos(`photo:${id}`, changes.photos) : [];
    await upsertItem({ ...editItem, ...changes, photoKeys, photos: undefined });
    bumpDataVersion();
    setEditItemId(null);
  }

  async function handleDeleteItem(id) {
    const target = editItem || detailItem;
    if (target) await deletePhotoKeys(target.photoKeys);
    await deleteItemRecord(id);
    bumpDataVersion();
    setEditItemId(null); setDetailItemId(null);
  }

  async function handleRegisterSale(id, saleData) {
    await sellItemRecord(id, { id: uid(), ...saleData });
    bumpDataVersion();
    setSellItemId(null);
  }
  async function handleCancelSale(id) {
    await cancelItemSaleRecord(id);
    bumpDataVersion();
  }
  async function handleListItem(id, listing) {
    await listItemRecord(id, listing);
    bumpDataVersion();
    setListingItemId(null);
  }
  async function handleUnlistItem(id) {
    await unlistItemRecord(id);
    bumpDataVersion();
  }

  // ---- lot handlers ----
  async function handleUpdateLot(lotId, changes) {
    if (!editLot) return;
    await deletePhotoKeys(editLot.photoKeys);
    const photoKeys = changes.photos && changes.photos.length ? await savePhotos(`photo:lot:${lotId}`, changes.photos) : [];
    await upsertLot({ ...editLot, ...changes, photoKeys, photos: undefined });
    bumpDataVersion();
    setEditLotId(null);
  }

  async function handleDeleteLot(lotId) {
    const target = editLot || detailLot;
    if (target) {
      await deletePhotoKeys(target.photoKeys);
      for (const c of target.cards) await deletePhotoKeys(c.photoKeys);
    }
    await deleteLotRecord(lotId); // lot_cards cascade-delete with it (FK on delete cascade)
    bumpDataVersion();
    setEditLotId(null); setDetailLotId(null);
  }

  async function handleAddLotCard(lotId, form) {
    if (!isPremium && (await loadCataloguedCardCount()) >= FREE_TIER_ITEM_LIMIT) {
      return { error: t("forms.freeTierLimitReached", { limit: FREE_TIER_ITEM_LIMIT }) };
    }
    const cardId = uid();
    const photoKeys = form.photos && form.photos.length ? await savePhotos(`photo:${cardId}`, form.photos) : [];
    await upsertLotCard({
      id: cardId, name: form.name || `Carta ${(addCardLot?.cards.length || 0) + 1}`,
      game: form.game, setName: form.setName, cardNumber: form.cardNumber, condition: form.condition,
      category: form.category, language: form.language, gradingCompany: form.gradingCompany || null, grade: form.grade || null,
      assignedCost: form.assignedCost, photoKeys, boxId: form.boxId || null, status: "in_stock", sale: null, createdAt: Date.now(),
    }, lotId);
    bumpDataVersion();
    setAddCardLotId(null);
  }

  async function handleUpdateLotCard(lotId, cardId, changes) {
    if (!editLotCardResolved) return;
    await deletePhotoKeys(editLotCardResolved.card.photoKeys);
    const photoKeys = changes.photos && changes.photos.length ? await savePhotos(`photo:${cardId}`, changes.photos) : [];
    await upsertLotCard({ ...editLotCardResolved.card, ...changes, photoKeys, photos: undefined }, lotId);
    bumpDataVersion();
    setEditLotCard(null);
  }

  async function handleDeleteLotCard(lotId, cardId) {
    if (editLotCardResolved) await deletePhotoKeys(editLotCardResolved.card.photoKeys);
    await deleteLotCardRecord(cardId);
    bumpDataVersion();
    setEditLotCard(null); setDetailLotCard(null);
  }

  async function handleSellLotCard(lotId, cardId, saleData) {
    await sellLotCardRecord(cardId, { id: uid(), ...saleData });
    bumpDataVersion();
    setSellLotCard(null);
  }
  async function handleCancelLotCardSale(lotId, cardId) {
    await cancelLotCardSaleRecord(cardId);
    bumpDataVersion();
  }
  async function handleListLotCard(lotId, cardId, listing) {
    await listLotCardRecord(cardId, listing);
    bumpDataVersion();
    setListingLotCard(null);
  }
  async function handleUnlistLotCard(lotId, cardId) {
    await unlistLotCardRecord(cardId);
    bumpDataVersion();
  }

  // ---- bulk sale: sell several cards from anywhere in the inventory together, or
  // cards that don't exist in the inventory yet (catalogs them first, cost optional) ----
  async function handleBulkSell(refs, saleData) {
    const newIds = new Map();
    for (const r of refs) {
      if (r.kind !== "new") continue;
      const id = uid();
      await upsertItem({
        id, kind: "singola", game: r.game, name: r.name, setName: r.setName || "",
        cardNumber: r.cardNumber || "", condition: r.condition, category: r.category, language: r.language,
        gradingCompany: r.gradingCompany || null, grade: r.grade || null,
        unitCost: r.cost, purchaseDate: todayISO(), source: "", purchaseNotes: "",
        photoKeys: [], status: "in_stock", sale: null, createdAt: Date.now(),
      });
      newIds.set(r, id);
    }
    const resolvedRefs = refs.map((r) => (r.kind === "new" ? { kind: "singola", id: newIds.get(r) } : r));

    if (resolvedRefs.length === 1) {
      const [ref] = resolvedRefs;
      const sale = { id: uid(), ...saleData };
      if (ref.kind === "singola") await sellItemRecord(ref.id, sale);
      else await sellLotCardRecord(ref.id, sale);
      bumpDataVersion();
      setShowBulkSale(false);
      return;
    }

    const groupId = uid();
    const sale = {
      id: groupId, groupId, groupTotal: saleData.price, groupSize: resolvedRefs.length,
      date: saleData.date, buyer: saleData.buyer, carrier: saleData.carrier, tracking: saleData.tracking, notes: saleData.notes,
      price: null,
    };
    const singolaIds = resolvedRefs.filter((r) => r.kind === "singola").map((r) => r.id);
    const lotCardIds = resolvedRefs.filter((r) => r.kind === "lotto").map((r) => r.id);
    await upsertSaleRecord(sale);
    await Promise.all([
      ...singolaIds.map((id) => updateItemFields(id, { status: "sold", sale_id: groupId })),
      ...lotCardIds.map((id) => updateLotCardFields(id, { status: "sold", sale_id: groupId })),
    ]);
    bumpDataVersion();
    setShowBulkSale(false);
  }

  async function handleCancelGroupSale(groupId) {
    await cancelGroupSaleRecord(groupId);
    bumpDataVersion();
    setDetailGroupSaleId(null);
  }

  async function handleExportCSV() {
    const items = await exportInventoryFull();
    exportInventoryCSV(items, catalog.GAME_META, t);
  }

  // ---- PDF price list: cover photo + a few useful details + asking price for every
  // currently-listed item (never the purchase cost), grouped by game and optionally
  // restricted to just one ----
  async function handleExportListingsPDF(gameFilter) {
    if (!exportListings) return;
    const byGame = {};
    for (const it of exportListings.singolaItems) {
      if (gameFilter !== "all" && it.game !== gameFilter) continue;
      (byGame[it.game] ||= []).push({
        name: cardDisplayName(it.name, it.cardNumber),
        setName: it.setName, condition: it.condition, language: it.language,
        gradingCompany: it.gradingCompany, grade: it.grade,
        photoKey: it.photoKeys?.[0], price: it.listing?.price,
      });
    }
    for (const c of exportListings.lotCards) {
      const g = c.game || c.lotGame;
      if (gameFilter !== "all" && g !== gameFilter) continue;
      (byGame[g] ||= []).push({
        name: `${c.lotName} › ${cardDisplayName(c.name || t("common.unnamedCard"), c.cardNumber)}`,
        setName: c.setName, condition: c.condition, language: c.language,
        gradingCompany: c.gradingCompany, grade: c.grade,
        photoKey: c.photoKeys && c.photoKeys.length ? c.photoKeys[0] : c.lotPhotoKeys?.[0],
        price: c.listing?.price,
      });
    }

    const sections = catalog.games
      .filter((g) => byGame[g.key]?.length)
      .map((g) => ({ gameLabel: g.label, gameColor: g.color, items: byGame[g.key] }));
    if (sections.length === 0) return;

    const suffix = gameFilter === "all" ? "" : `_${gameFilter}`;
    // jsPDF (~400KB) is only worth loading for the users who actually export a price
    // list, so it's fetched on demand here instead of bloating the main app bundle.
    const { exportListingsPDF } = await import("./lib/pdfExport");
    await exportListingsPDF(sections, t, `${t("pdfExport.filenamePrefix")}${suffix}_${todayISO()}.pdf`);
    setShowExportPdf(false);
  }

  // ---- money math (Dashboard / Vendite header stats) — same logic as before,
  // just fed by the lean financialSummary fetch instead of the full in-memory array ----
  const { singolaItems, lotItems } = financialSummary;
  const inStockSingola = singolaItems.filter((i) => i.status !== "sold");
  const listedSingola = singolaItems.filter((i) => i.status === "listed");
  const allLotCards = lotItems.flatMap((l) => l.cards.map((c) => ({ ...c, lotId: l.id })));
  const listedLotCards = allLotCards.filter((c) => c.status === "listed");
  const allSaleUnitsRaw = buildAllSaleUnits(singolaItems, lotItems);

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

  const allSoldUnits = [...periodSaleUnits].sort((a, b) => new Date(b.sale.date) - new Date(a.sale.date));

  const totalListedValue = listedSingola.reduce((s, i) => s + (i.listing?.price || 0), 0)
    + listedLotCards.reduce((s, c) => s + (c.listing?.price || 0), 0);
  const listedUnitsCount = listedSingola.length + listedLotCards.length;

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
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 3px; }
        input[type="date"]::-webkit-calendar-picker-indicator { filter: invert(0.7); }
        .app-shell { height: 100vh; height: 100dvh; }
        /* 92vh is computed against the layout viewport, which on mobile browsers is
           taller than what's actually visible once the address bar is showing — a
           modal/sheet capped at 92vh can then extend above the real fold, cutting off
           its own header. dvh tracks the visible viewport instead; browsers that don't
           support it just keep the vh fallback above. */
        .modal-sheet { max-height: 92vh; max-height: 92dvh; }

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

        /* Stampa l'etichetta QR di una scatola da sola — usato da BoxDetailPage
           (Inventario > Scatole), non dal resto dell'app. */
        @media print {
          body * { visibility: hidden; }
          #box-qr-print, #box-qr-print * { visibility: visible; }
          #box-qr-print { position: fixed; top: 40px; left: 0; right: 0; }
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
              <Icon size={18} /> {t(label)}
            </button>
          ))}
        </nav>
        <div className="px-3 pb-6 space-y-1">
          <button
            onClick={() => setShowGlobalSearch(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13.5px] font-medium"
            style={{ color: C.textDim }}
          >
            <Search size={18} /> {t("nav.search")}
          </button>
        </div>
      </aside>

      <div key={view} className="anim-fade-in flex-1 min-w-0 min-h-0 overflow-y-auto px-5 py-5 pb-24 lg:px-10 lg:py-8 lg:pb-10">
        <div className="lg:max-w-6xl lg:mx-auto">
        {view === "dashboard" ? (
          summaryLoading ? (
            <div className="text-center py-16 text-sm" style={{ color: C.textFaint }}>{t("common.loadingInventory")}</div>
          ) : (
            <DashboardSection
              period={period} setPeriod={setPeriod} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo}
              totalInvested={totalInvested} inStockCount={inStockCount} valueInStock={valueInStock}
              totalRevenue={totalRevenue} marginKnown={marginKnown} roiKnown={roiKnown} revenueOfSoldKnown={revenueOfSoldKnown} revenueUnknownCost={revenueUnknownCost}
              listedUnitsCount={listedUnitsCount} totalListedValue={totalListedValue} setView={setView}
              allSoldUnits={allSoldUnits} recentSales={recentSales} onSelectSaleUnit={openSaleUnit}
            />
          )
        ) : view === "inventory" ? (
          <>
            {isPremium && (
              <div className="flex gap-2 mb-4 p-1 rounded-xl" style={{ background: C.surfaceAlt, maxWidth: 280 }}>
                {[["items", t("boxes.itemsTab")], ["boxes", t("boxes.boxesTab")]].map(([val, label]) => (
                  <button
                    key={val} onClick={() => setInventoryTab(val)}
                    className="flex-1 py-2 rounded-lg text-sm font-semibold transition-colors"
                    style={{ background: inventoryTab === val ? C.gold : "transparent", color: inventoryTab === val ? C.goldText : C.textDim }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {inventoryTab === "boxes" && isPremium ? (
              <BoxesSection
                dataVersion={dataVersion}
                onOpenItem={(id) => setDetailItemId(id)} onOpenLot={(id) => setDetailLotId(id)}
                onOpenLotCard={(lotId, cardId) => setDetailLotCard({ lotId, cardId })}
              />
            ) : (
              <InventorySection
                games={catalog.games} dataVersion={dataVersion}
                onOpenItem={(id) => setDetailItemId(id)} onOpenLot={(id) => setDetailLotId(id)}
              />
            )}
          </>
        ) : view === "listings" ? (
          <ListingsSection
            dataVersion={dataVersion}
            onOpenUnit={openListedUnit} onExportPdf={() => setShowExportPdf(true)}
          />
        ) : view === "sales" ? (
          <SalesSection
            dataVersion={dataVersion}
            totalRevenue={totalRevenue} costOfSoldKnown={costOfSoldKnown} marginKnown={marginKnown} revenueUnknownCost={revenueUnknownCost}
            period={period} setPeriod={setPeriod} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo}
            onSelectSaleUnit={openSaleUnit}
          />
        ) : view === "report" ? (
          <Suspense fallback={<div className="text-center py-16 text-sm" style={{ color: C.textFaint }}>{t("common.loading")}</div>}>
            <ReportSection
              singolaItems={singolaItems} lotItems={lotItems} games={catalog.games}
              period={period} setPeriod={setPeriod} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo}
            />
          </Suspense>
        ) : (
          <SettingsSection auth={auth} catalog={catalog} onExportCSV={handleExportCSV} />
        )}
        </div>
      </div>

      {view === "inventory" && (
        <button
          onClick={() => (inventoryTab === "boxes" && isPremium ? setShowNewBox(true) : setShowAdd(true))}
          style={{ background: C.gold, color: C.goldText }} className="absolute right-5 bottom-[84px] lg:bottom-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-30"
        >
          <Plus size={24} />
        </button>
      )}
      {view === "sales" && (
        <button onClick={() => { setBulkSaleCount(0); setShowBulkSale(true); }} title="Vendi carte" style={{ background: C.teal, color: C.tealText }} className="absolute right-5 bottom-[84px] lg:bottom-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center z-30">
          <Plus size={24} />
        </button>
      )}

      <div className="lg:hidden flex items-center justify-around py-2.5 relative z-20" style={{ background: C.surface, borderTop: `1px solid ${C.border}` }}>
        {NAV_ITEMS.map(([val, label, Icon]) => (
          <button key={val} onClick={() => setView(val)} className="flex flex-col items-center gap-1 px-3 py-1" style={{ color: view === val ? C.gold : C.textFaint }}>
            <Icon size={19} /><span className="text-[10.5px] font-medium">{t(label)}</span>
          </button>
        ))}
      </div>

      {/* ---- Modals ---- */}
      {showPremiumWelcome && <PremiumWelcomeModal onClose={() => setShowPremiumWelcome(false)} />}
      {showGlobalSearch && (
        <GlobalSearchModal
          onClose={() => setShowGlobalSearch(false)}
          onOpenItem={(id) => setDetailItemId(id)}
          onOpenLotCard={(lotId, cardId) => setDetailLotCard({ lotId, cardId })}
          onOpenLot={(id) => setDetailLotId(id)}
        />
      )}
      {showAdd && (
        <Modal title={t("app.newPurchase")} onClose={() => setShowAdd(false)} wide>
          <AddPurchaseForm onCancel={() => setShowAdd(false)} onSubmit={handleAddPurchase} />
        </Modal>
      )}
      {showNewBox && (
        <Modal title={t("boxes.newBox")} onClose={() => setShowNewBox(false)}>
          <NewBoxForm onCancel={() => setShowNewBox(false)} onSubmit={handleAddBox} />
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
        <Modal title={t("app.editCard")} onClose={() => setEditItemId(null)} wide>
          <EditItemForm item={editItem} onCancel={() => setEditItemId(null)} onSubmit={(changes) => handleUpdateItem(editItem.id, changes)} onDelete={() => handleDeleteItem(editItem.id)} />
        </Modal>
      )}
      {sellItem && (
        <Modal title={t("forms.registerSale")} onClose={() => setSellItemId(null)}>
          <SaleForm item={sellItem} onCancel={() => setSellItemId(null)} onSubmit={(saleData) => handleRegisterSale(sellItem.id, saleData)} />
        </Modal>
      )}
      {listingItem && (
        <Modal title={listingItem.listing ? t("app.editListing") : t("app.newListing")} onClose={() => setListingItemId(null)}>
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
        <Modal title={t("app.editLot")} onClose={() => setEditLotId(null)} wide>
          <EditLotForm lot={editLot} onCancel={() => setEditLotId(null)} onSubmit={(changes) => handleUpdateLot(editLot.id, changes)} onDelete={() => handleDeleteLot(editLot.id)} />
        </Modal>
      )}
      {addCardLot && (
        <Modal title={t("app.addCardToLot")} onClose={() => setAddCardLotId(null)} eyebrow={addCardLot.lotName} wide>
          <LotCardForm lot={addCardLot} onCancel={() => setAddCardLotId(null)} onSubmit={(form) => handleAddLotCard(addCardLot.id, form)} />
        </Modal>
      )}
      {showBulkSale && (
        <Modal title={bulkSaleCount > 1 ? t("app.bulkSale") : t("forms.registerSale")} onClose={() => setShowBulkSale(false)} eyebrow={t("app.bulkSaleEyebrow")} wide>
          <BulkSaleWizard onCancel={() => setShowBulkSale(false)} onSubmit={(refs, saleData) => handleBulkSell(refs, saleData)} onSelectionChange={setBulkSaleCount} />
        </Modal>
      )}
      {showExportPdf && (
        <Modal title={t("pdfExport.menuButton")} onClose={() => setShowExportPdf(false)}>
          <ExportListingsPdfForm
            gamesAvailable={exportListings ? catalog.games.filter((g) => exportListings.singolaItems.some((i) => i.game === g.key) || exportListings.lotCards.some((c) => (c.game || c.lotGame) === g.key)) : []}
            onCancel={() => setShowExportPdf(false)} onSubmit={handleExportListingsPDF}
          />
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
        <Modal title={t("app.editCard")} onClose={() => setEditLotCard(null)} eyebrow={editLotCardResolved.lot.lotName} wide>
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
        <Modal title={t("forms.registerSale")} onClose={() => setSellLotCard(null)} eyebrow={sellLotCardResolved.lot.lotName}>
          <SaleForm
            item={{ name: sellLotCardResolved.card.name || t("common.unnamedCard"), unitCost: sellLotCardResolved.card.assignedCost, photoKey: sellLotCardResolved.card.photoKeys?.[0] || sellLotCardResolved.lot.photoKeys?.[0], listing: sellLotCardResolved.card.listing }}
            onCancel={() => setSellLotCard(null)}
            onSubmit={(saleData) => handleSellLotCard(sellLotCardResolved.lot.id, sellLotCardResolved.card.id, saleData)}
          />
        </Modal>
      )}
      {listingLotCardResolved && (
        <Modal title={listingLotCardResolved.card.listing ? t("app.editListing") : t("app.newListing")} onClose={() => setListingLotCard(null)} eyebrow={listingLotCardResolved.lot.lotName}>
          <ListingForm
            item={{ name: listingLotCardResolved.card.name || t("common.unnamedCard"), photoKey: listingLotCardResolved.card.photoKeys?.[0] || listingLotCardResolved.lot.photoKeys?.[0] }}
            initial={listingLotCardResolved.card.listing}
            onCancel={() => setListingLotCard(null)}
            onSubmit={(form) => handleListLotCard(listingLotCardResolved.lot.id, listingLotCardResolved.card.id, form)}
          />
        </Modal>
      )}
    </div>
  );
}
