import { ShoppingBag, Truck } from "lucide-react";
import { C } from "../../lib/theme";
import { useCatalog } from "../../context/CatalogContext";
import { euro, fmtDate } from "../../lib/format";
import { FilterToggle } from "../ui/FilterToggle";
import { PeriodFilter } from "../ui/PeriodFilter";
import { SortSelect } from "../ui/SortSelect";
import { Badge } from "../ui/Badge";
import { PhotoThumb } from "../ui/Photo";

export function SalesSection({
  totalRevenue, costOfSoldKnown, marginKnown, revenueUnknownCost,
  sortedSoldUnits,
  showSalesFilters, setShowSalesFilters,
  period, setPeriod, customFrom, setCustomFrom, customTo, setCustomTo,
  sortSales, setSortSales,
  onSelectSaleUnit,
}) {
  const { GAME_META } = useCatalog();
  return (
    <>
      <div className="grid grid-cols-3 lg:max-w-md gap-2 mb-2">
        <div className="p-3 rounded-xl text-center" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="text-[10.5px] uppercase" style={{ color: C.textFaint }}>Ricavi</div>
          <div className="text-sm font-bold mt-0.5">{euro(totalRevenue)}</div>
        </div>
        <div className="p-3 rounded-xl text-center" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="text-[10.5px] uppercase" style={{ color: C.textFaint }}>Costo noto</div>
          <div className="text-sm font-bold mt-0.5">{euro(costOfSoldKnown)}</div>
        </div>
        <div className="p-3 rounded-xl text-center" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="text-[10.5px] uppercase" style={{ color: C.textFaint }}>Margine</div>
          <div className="text-sm font-bold mt-0.5" style={{ color: marginKnown >= 0 ? C.teal : C.crimson }}>{marginKnown >= 0 ? "+" : ""}{euro(marginKnown)}</div>
        </div>
      </div>
      {revenueUnknownCost > 0 && (
        <div className="text-[11.5px] mb-3" style={{ color: C.amber }}>+ {euro(revenueUnknownCost)} da vendite con costo non specificato (escluse dal margine)</div>
      )}
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[11.5px] flex-shrink-0" style={{ color: C.textFaint }}>{sortedSoldUnits.length} vendite</span>
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

      {sortedSoldUnits.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.textFaint }}>
          <ShoppingBag size={24} className="mx-auto mb-2" />
          <div className="text-sm">Ancora nessuna vendita registrata.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
          {sortedSoldUnits.map((u) => {
            const m = u.cost != null ? u.sale.price - u.cost : null;
            const meta = GAME_META[u.game] || GAME_META.altro;
            return (
              <button key={u.id} onClick={() => onSelectSaleUnit(u)} className="w-full flex items-center gap-3 p-3 rounded-xl text-left" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                <PhotoThumb photoKey={u.photoKey} size={44} rounded="8px" iconSize={14} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{u.name}</div>
                  <div className="text-[11px] flex items-center gap-1.5 mt-0.5" style={{ color: C.textFaint }}>
                    <Badge color={meta.color} bg={meta.bg}>{meta.label}</Badge>{fmtDate(u.sale.date)}
                    {u.sale.tracking && <Truck size={11} color={C.textFaint} title={`${u.sale.carrier || "Corriere"}: ${u.sale.tracking}`} />}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[13px] font-bold">{euro(u.sale.price)}</div>
                  <div className="text-[11px]" style={{ color: m === null ? C.amber : m >= 0 ? C.teal : C.crimson }}>{m === null ? "costo n.d." : `${m >= 0 ? "+" : ""}${euro(m)}`}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
