import { useState, useEffect } from "react";
import { ShoppingBag, Truck } from "lucide-react";
import { C } from "../../lib/theme";
import { useCatalog } from "../../context/CatalogContext";
import { useLanguage } from "../../context/LanguageContext";
import { money, fmtDate } from "../../lib/format";
import { getPeriodRange } from "../../lib/period";
import { searchSales } from "../../lib/storage";
import { FilterToggle } from "../ui/FilterToggle";
import { PeriodFilter } from "../ui/PeriodFilter";
import { SortSelect } from "../ui/SortSelect";
import { Badge } from "../ui/Badge";
import { PhotoThumb } from "../ui/Photo";
import { GhostButton } from "../ui/Buttons";

const PAGE_SIZE = 60;

function isoDate(d) {
  return d ? d.toISOString().slice(0, 10) : null;
}

export function SalesSection({
  totalRevenue, costOfSoldKnown, marginKnown, revenueUnknownCost,
  period, setPeriod, customFrom, setCustomFrom, customTo, setCustomTo,
  dataVersion, onSelectSaleUnit,
}) {
  const { GAME_META } = useCatalog();
  const { t } = useLanguage();
  const [showSalesFilters, setShowSalesFilters] = useState(false);
  const [sortSales, setSortSales] = useState("recent");
  const [rows, setRows] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);

  const range = getPeriodRange(period, customFrom, customTo);
  const from = isoDate(range?.from);
  const to = isoDate(range?.to);

  useEffect(() => {
    setLoading(true);
    searchSales({ from, to, sort: sortSales, page: 0, pageSize: PAGE_SIZE }).then(({ rows: newRows, totalCount: count }) => {
      setRows(newRows);
      setTotalCount(count);
      setPage(0);
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, sortSales, dataVersion]);

  async function loadMore() {
    const nextPage = page + 1;
    setLoading(true);
    const { rows: newRows } = await searchSales({ from, to, sort: sortSales, page: nextPage, pageSize: PAGE_SIZE });
    setRows((prev) => [...prev, ...newRows]);
    setPage(nextPage);
    setLoading(false);
  }

  const hasMore = rows.length < totalCount;

  return (
    <>
      <div className="grid grid-cols-3 lg:max-w-md gap-2 mb-2">
        <div className="p-3 rounded-xl text-center" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="text-[10.5px] uppercase" style={{ color: C.textFaint }}>{t("sales.revenue")}</div>
          <div className="text-sm font-bold mt-0.5">{money(totalRevenue)}</div>
        </div>
        <div className="p-3 rounded-xl text-center" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="text-[10.5px] uppercase" style={{ color: C.textFaint }}>{t("sales.knownCost")}</div>
          <div className="text-sm font-bold mt-0.5">{money(costOfSoldKnown)}</div>
        </div>
        <div className="p-3 rounded-xl text-center" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="text-[10.5px] uppercase" style={{ color: C.textFaint }}>{t("sales.margin")}</div>
          <div className="text-sm font-bold mt-0.5" style={{ color: marginKnown >= 0 ? C.teal : C.crimson }}>{marginKnown >= 0 ? "+" : ""}{money(marginKnown)}</div>
        </div>
      </div>
      {revenueUnknownCost > 0 && (
        <div className="text-[11.5px] mb-3" style={{ color: C.amber }}>{t("sales.unknownCostNote", { amount: money(revenueUnknownCost) })}</div>
      )}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[11.5px] flex-shrink-0" style={{ color: C.textFaint }}>{t("sales.salesCount", { count: totalCount })}</span>
        <div className="flex items-center gap-2">
          <SortSelect value={sortSales} onChange={setSortSales} />
          <FilterToggle
            open={showSalesFilters}
            onToggle={() => setShowSalesFilters((v) => !v)}
            activeCount={period !== "all" ? 1 : 0}
          />
        </div>
      </div>
      {showSalesFilters && (
        <div className="anim-slide-up mb-2 p-3 rounded-xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <PeriodFilter period={period} setPeriod={setPeriod} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} />
        </div>
      )}

      {!loading && rows.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.textFaint }}>
          <ShoppingBag size={24} className="mx-auto mb-2" />
          <div className="text-sm">{t("sales.emptyNone")}</div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
            {rows.map((u) => {
              const m = u.cost != null ? u.sale.price - u.cost : null;
              const meta = GAME_META[u.game] || GAME_META.altro;
              return (
                <button key={u.id} onClick={() => onSelectSaleUnit(u)} className="w-full flex items-center gap-3 p-3 rounded-xl text-left" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                  <PhotoThumb photoKey={u.photoKey} size={44} rounded="8px" iconSize={14} preferThumb />
                  <div className="flex-1 min-w-0">
                    <div className="text-[13px] font-medium truncate">{u.name}</div>
                    <div className="text-[11px] flex items-center gap-1.5 mt-0.5" style={{ color: C.textFaint }}>
                      <Badge color={meta.color} bg={meta.bg}>{meta.label}</Badge>{fmtDate(u.sale.date)}
                      {u.sale.tracking && <Truck size={11} color={C.textFaint} title={`${u.sale.carrier || t("forms.carrier")}: ${u.sale.tracking}`} />}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[13px] font-bold">{money(u.sale.price)}</div>
                    <div className="text-[11px]" style={{ color: m === null ? C.amber : m >= 0 ? C.teal : C.crimson }}>{m === null ? t("common.costNa") : `${m >= 0 ? "+" : ""}${money(m)}`}</div>
                  </div>
                </button>
              );
            })}
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
