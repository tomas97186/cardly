import { useState, useEffect } from "react";
import { Search, Package, Box as BoxIcon, Lock } from "lucide-react";
import { C, CATEGORY_OPTIONS } from "../../lib/theme";
import { useLanguage } from "../../context/LanguageContext";
import { useEntitlement } from "../../context/EntitlementContext";
import { searchInventory } from "../../lib/storage";
import { TextInput } from "../ui/Inputs";
import { FilterToggle } from "../ui/FilterToggle";
import { SortSelect } from "../ui/SortSelect";
import { GhostButton } from "../ui/Buttons";
import { ItemCard } from "../ui/ItemCard";

const PAGE_SIZE = 60;

export function InventorySection({ games, dataVersion, onOpenItem, onOpenLot, onOpenBoxes }) {
  const { t } = useLanguage();
  const { isPremium } = useEntitlement();
  const [search, setSearch] = useState("");
  const [filterGame, setFilterGame] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterKind, setFilterKind] = useState("all"); // all | singola | lotto
  const [filterGraded, setFilterGraded] = useState("all"); // all | graded | notGraded
  const [filterCategory, setFilterCategory] = useState("all");
  const [sortInventory, setSortInventory] = useState("recent");
  const [showInventoryFilters, setShowInventoryFilters] = useState(false);

  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const noFiltersActive = search.trim() === "" && filterGame === "all" && filterStatus === "all"
    && filterKind === "all" && filterGraded === "all" && filterCategory === "all";

  // Search is debounced (server round-trip now, not an in-memory filter); the other
  // filters/sort reset straight to page 0 on change, same as the debounce's own reset.
  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(async () => {
      const { rows: newRows, totalCount: count } = await searchInventory({
        search, game: filterGame, kind: filterKind, status: filterStatus,
        graded: filterGraded, category: filterCategory, sort: sortInventory, page: 0, pageSize: PAGE_SIZE,
      });
      setRows(newRows);
      setTotalCount(count);
      setPage(0);
      setLoading(false);
    }, search ? 250 : 0);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, filterGame, filterStatus, filterKind, filterGraded, filterCategory, sortInventory, dataVersion]);

  async function loadMore() {
    const nextPage = page + 1;
    setLoading(true);
    const { rows: newRows } = await searchInventory({
      search, game: filterGame, kind: filterKind, status: filterStatus,
      graded: filterGraded, category: filterCategory, sort: sortInventory, page: nextPage, pageSize: PAGE_SIZE,
    });
    setRows((prev) => [...prev, ...newRows]);
    setPage(nextPage);
    setLoading(false);
  }

  const hasMore = rows.length < totalCount;

  return (
    <>
      {onOpenBoxes && (
        <div className="lg:hidden flex items-center justify-between mb-3">
          <h2 style={{ fontFamily: "'Oswald', sans-serif", letterSpacing: "0.02em" }} className="text-lg font-semibold">{t("nav.inventory")}</h2>
          <button
            onClick={isPremium ? onOpenBoxes : undefined}
            disabled={!isPremium}
            title={isPremium ? undefined : t("boxes.premiumOnly")}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12.5px] font-semibold flex-shrink-0"
            style={
              isPremium
                ? { background: C.gold, color: C.goldText }
                : { background: C.surfaceAlt, color: C.textFaint, opacity: 0.7, cursor: "not-allowed" }
            }
          >
            <BoxIcon size={13} /> {t("boxes.boxesTab")} {!isPremium && <Lock size={11} />}
          </button>
        </div>
      )}
      <div className="sticky top-0 z-10" style={{ background: C.bg, borderRadius: "10px" }}>
        <div className="relative">
          <Search size={15} style={{ position: "absolute", left: 12, top: 11 }} color={C.textFaint} />
          <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder={t("inventory.searchPlaceholder")} style={{ paddingLeft: 34 }} />
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 mb-3 pt-3">
        <span className="text-[11.5px] flex-shrink-0" style={{ color: C.textFaint }}>{t("inventory.results", { count: totalCount })}</span>
        <div className="flex items-center gap-2">
          <SortSelect value={sortInventory} onChange={setSortInventory} />
          <FilterToggle
            open={showInventoryFilters}
            onToggle={() => setShowInventoryFilters((v) => !v)}
            activeCount={
              (filterGame !== "all" ? 1 : 0) + (filterKind !== "all" ? 1 : 0) + (filterStatus !== "all" ? 1 : 0) +
              (filterGraded !== "all" ? 1 : 0) + (filterCategory !== "all" ? 1 : 0)
            }
          />
        </div>
      </div>
      {showInventoryFilters && (
        <div className="anim-slide-up mb-2 p-3 rounded-xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <FilterChips options={[["all", t("inventory.filterAllGames")], ...games.map((g) => [g.key, g.label])]} value={filterGame} onChange={setFilterGame} activeColor={C.gold} activeText={C.goldText} />
          <FilterChips options={[["all", t("inventory.filterAllKinds")], ["singola", t("inventory.filterSingleCards")], ["lotto", t("inventory.filterLots")]]} value={filterKind} onChange={setFilterKind} activeColor={C.info} activeText={C.infoText} />
          <FilterChips options={[["all", t("inventory.filterAllStatuses")], ["in_stock", t("common.status.inStock")], ["listed", t("common.status.listed")], ["sold", t("common.status.sold")]]} value={filterStatus} onChange={setFilterStatus} activeColor={C.teal} activeText={C.tealText} />
          <FilterChips options={[["all", t("inventory.filterGradedAll")], ["graded", t("inventory.filterGradedOnly")], ["notGraded", t("inventory.filterNotGraded")]]} value={filterGraded} onChange={setFilterGraded} activeColor={C.amber} activeText={C.amberText} />
          <FilterChips options={[["all", t("inventory.filterAllCategories")], ...CATEGORY_OPTIONS.map((c) => [c, c])]} value={filterCategory} onChange={setFilterCategory} activeColor={C.crimson} activeText="#fff" last />
        </div>
      )}

      {!loading && rows.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.textFaint }}>
          <Package size={24} className="mx-auto mb-2" />
          <div className="text-sm">{noFiltersActive ? t("inventory.emptyNoItems") : t("inventory.emptyNoResults")}</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {rows.map((it) => (
              <ItemCard key={it.id} item={it} onClick={() => (it.kind === "lotto" ? onOpenLot(it.id) : onOpenItem(it.id))} />
            ))}
          </div>
          {hasMore && (
            <div className="flex justify-center mt-4">
              <GhostButton onClick={loadMore} disabled={loading}>
                {t("inventory.loadMore", { count: totalCount - rows.length })}
              </GhostButton>
            </div>
          )}
        </>
      )}
    </>
  );
}

function FilterChips({ options, value, onChange, activeColor, activeText, last }) {
  return (
    <div className={`flex gap-2 overflow-x-auto pb-1${last ? "" : " mb-2"}`}>
      {options.map(([val, label]) => (
        <button key={val} onClick={() => onChange(val)} className="px-3 py-1.5 rounded-full text-[12.5px] font-medium whitespace-nowrap"
          style={{ background: value === val ? activeColor : C.surfaceAlt, color: value === val ? activeText : C.textDim }}>
          {label}
        </button>
      ))}
    </div>
  );
}
