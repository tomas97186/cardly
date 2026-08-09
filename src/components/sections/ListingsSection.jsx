import { useState, useEffect } from "react";
import { Search, Megaphone, Link2, FileDown } from "lucide-react";
import { C } from "../../lib/theme";
import { useCatalog } from "../../context/CatalogContext";
import { useLanguage } from "../../context/LanguageContext";
import { money, fmtDate, currentCurrencySymbol } from "../../lib/format";
import { searchListedUnits, loadListingPlatforms, loadListedSummary } from "../../lib/storage";
import { TextInput } from "../ui/Inputs";
import { FilterToggle } from "../ui/FilterToggle";
import { SortSelect } from "../ui/SortSelect";
import { Badge } from "../ui/Badge";
import { PhotoThumb } from "../ui/Photo";
import { GhostButton } from "../ui/Buttons";

const PAGE_SIZE = 60;

export function ListingsSection({ dataVersion, onOpenUnit, onExportPdf }) {
  const { GAME_META } = useCatalog();
  const { t } = useLanguage();

  const [search, setSearch] = useState("");
  const [showListingFilters, setShowListingFilters] = useState(false);
  const [listingPlatforms, setListingPlatforms] = useState([]);
  const [listingPlatformFilter, setListingPlatformFilter] = useState("all");
  const [listingPriceMin, setListingPriceMin] = useState("");
  const [listingPriceMax, setListingPriceMax] = useState("");
  const [sortListings, setSortListings] = useState("recent");

  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(0);
  const [summary, setSummary] = useState({ count: 0, total: 0 });
  const [rawCount, setRawCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadListingPlatforms().then(setListingPlatforms); }, [dataVersion]);
  useEffect(() => { loadListedSummary().then(({ count }) => setRawCount(count)); }, [dataVersion]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(async () => {
      const filters = { search, platform: listingPlatformFilter, priceMin: listingPriceMin, priceMax: listingPriceMax };
      const [{ rows: newRows }, sum] = await Promise.all([
        searchListedUnits({ ...filters, sort: sortListings, page: 0, pageSize: PAGE_SIZE }),
        loadListedSummary(filters),
      ]);
      setRows(newRows);
      setSummary(sum);
      setPage(0);
      setLoading(false);
    }, search ? 250 : 0);
    return () => clearTimeout(timer);
  }, [search, listingPlatformFilter, listingPriceMin, listingPriceMax, sortListings, dataVersion]);

  async function loadMore() {
    const nextPage = page + 1;
    setLoading(true);
    const { rows: newRows } = await searchListedUnits({
      search, platform: listingPlatformFilter, priceMin: listingPriceMin, priceMax: listingPriceMax,
      sort: sortListings, page: nextPage, pageSize: PAGE_SIZE,
    });
    setRows((prev) => [...prev, ...newRows]);
    setPage(nextPage);
    setLoading(false);
  }

  const hasMore = rows.length < summary.count;

  return (
    <>
      <div className="sticky top-0 z-10 mb-3" style={{ background: C.bg, borderRadius: "10px" }}>
        <div className="relative">
          <Search size={15} style={{ position: "absolute", left: 12, top: 11 }} color={C.textFaint} />
          <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("listings.searchPlaceholder")} style={{ paddingLeft: 34 }} />
        </div>
      </div>
      <div className="flex items-center justify-between mb-3 p-3 rounded-xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
        <div>
          <div className="text-[10.5px] uppercase" style={{ color: C.textFaint }}>{t("listings.headerLabel")}</div>
          <div className="text-sm font-bold mt-0.5">{t(summary.count === 1 ? "listings.itemsCountOne" : "listings.itemsCountMany", { count: summary.count })}</div>
        </div>
        <div className="text-right">
          <div className="text-[10.5px] uppercase" style={{ color: C.textFaint }}>{t("listings.totalAsked")}</div>
          <div className="text-sm font-bold mt-0.5" style={{ color: C.info }}>{money(summary.total)}</div>
        </div>
      </div>

      {rawCount > 0 && (
        <GhostButton full onClick={onExportPdf} style={{ marginBottom: 12 }}>
          <FileDown size={14} /> {t("pdfExport.menuButton")}
        </GhostButton>
      )}

      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[11.5px] flex-shrink-0" style={{ color: C.textFaint }}>{t("listings.results", { count: summary.count })}</span>
        <div className="flex items-center gap-2">
          <SortSelect value={sortListings} onChange={setSortListings} />
          <FilterToggle
            open={showListingFilters}
            onToggle={() => setShowListingFilters((v) => !v)}
            activeCount={(listingPlatformFilter !== "all" ? 1 : 0) + (listingPriceMin !== "" ? 1 : 0) + (listingPriceMax !== "" ? 1 : 0)}
          />
        </div>
      </div>
      {showListingFilters && (
        <div className="anim-slide-up mb-2 p-3 rounded-xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          {listingPlatforms.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
              {[["all", t("listings.allPlatforms")], ...listingPlatforms.map((p) => [p, p])].map(([val, label]) => (
                <button key={val} onClick={() => setListingPlatformFilter(val)} className="px-3 py-1.5 rounded-full text-[12.5px] font-medium whitespace-nowrap"
                  style={{ background: listingPlatformFilter === val ? C.info : C.surfaceAlt, color: listingPlatformFilter === val ? C.infoText : C.textDim }}>
                  {label}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <TextInput type="number" step="0.01" min="0" value={listingPriceMin} onChange={(e) => setListingPriceMin(e.target.value)} placeholder={t("listings.priceMinPlaceholder", { symbol: currentCurrencySymbol() })} />
            <TextInput type="number" step="0.01" min="0" value={listingPriceMax} onChange={(e) => setListingPriceMax(e.target.value)} placeholder={t("listings.priceMaxPlaceholder", { symbol: currentCurrencySymbol() })} />
          </div>
        </div>
      )}

      {!loading && rows.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.textFaint }}>
          <Megaphone size={24} className="mx-auto mb-2" />
          <div className="text-sm">{rawCount === 0 ? t("listings.emptyNone") : t("listings.emptyNoResults")}</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
            {rows.map((u) => {
              const meta = GAME_META[u.game] || GAME_META.altro;
              return (
                <button key={u.id} onClick={() => onOpenUnit(u)} className="w-full flex items-center gap-3 p-3 rounded-xl text-left" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                  <PhotoThumb photoKey={u.photoKey} size={44} rounded="8px" iconSize={14} preferThumb />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate">{u.name}</div>
                    <div className="text-[11px] flex items-center gap-1.5 mt-0.5" style={{ color: C.textFaint }}>
                      <Badge color={meta.color} bg={meta.bg}>{meta.label}</Badge>
                      {u.listing.platform && <span>{u.listing.platform}</span>}
                      {fmtDate(u.listing.listedDate)}
                      {u.listing.link && <Link2 size={11} />}
                    </div>
                  </div>
                  <div className="text-[13px] font-bold" style={{ color: C.info }}>{money(u.listing.price)}</div>
                </button>
              );
            })}
          </div>
          {hasMore && (
            <div className="flex justify-center mt-4">
              <GhostButton onClick={loadMore} disabled={loading}>
                {t("inventory.loadMore", { count: summary.count - rows.length })}
              </GhostButton>
            </div>
          )}
        </>
      )}
    </>
  );
}
