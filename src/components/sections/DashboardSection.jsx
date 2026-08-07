import { TrendingUp, DollarSign, ArrowDownRight, Wallet, Boxes, ChevronRight, AlertCircle, Truck, Megaphone, ShoppingBag } from "lucide-react";
import { C } from "../../lib/theme";
import { euro, fmtDate } from "../../lib/format";
import { PERIOD_OPTIONS } from "../../lib/period";
import { useLanguage } from "../../context/LanguageContext";
import { FilterToggle } from "../ui/FilterToggle";
import { PeriodFilter } from "../ui/PeriodFilter";
import { StatCard } from "../ui/StatCard";
import { PhotoThumb } from "../ui/Photo";

export function DashboardSection({
  period, setPeriod, customFrom, setCustomFrom, customTo, setCustomTo,
  showDashboardFilters, setShowDashboardFilters,
  totalInvested, inStockCount, valueInStock, totalRevenue, marginKnown, roiKnown, revenueOfSoldKnown, revenueUnknownCost,
  allListedUnits, totalListedValue, setView,
  allSoldUnits, recentSales, onSelectSaleUnit,
}) {
  const { t } = useLanguage();
  const periodLabelKey = PERIOD_OPTIONS.find(([v]) => v === period)?.[1];
  return (
    <>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11.5px]" style={{ color: C.textFaint }}>
          {t("dashboard.periodLabel", { period: periodLabelKey ? t(periodLabelKey) : t("period.all") })}
        </span>
        <FilterToggle
          open={showDashboardFilters}
          onToggle={() => setShowDashboardFilters((v) => !v)}
          activeCount={period !== "all" ? 1 : 0}
          label={t("dashboard.periodFilterLabel")}
        />
      </div>
      {showDashboardFilters && (
        <div className="anim-slide-up mb-2 p-3 rounded-xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <PeriodFilter period={period} setPeriod={setPeriod} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} />
        </div>
      )}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
        <StatCard icon={Wallet} label={period === "all" ? t("dashboard.investedTotal") : t("dashboard.investedInPeriod")} value={euro(totalInvested)} />
        <StatCard icon={Boxes} label={t("dashboard.inStockNow")} value={inStockCount} sub={t("dashboard.estimatedValueSub", { value: euro(valueInStock) })} />
        <StatCard icon={DollarSign} label={period === "all" ? t("dashboard.revenueTotal") : t("dashboard.revenueInPeriod")} value={euro(totalRevenue)} accent={C.teal} />
        <StatCard
          icon={marginKnown >= 0 ? TrendingUp : ArrowDownRight}
          label={t("dashboard.marginKnownCost")}
          value={(marginKnown >= 0 ? "+" : "") + euro(marginKnown)}
          accent={marginKnown >= 0 ? C.teal : C.crimson}
          sub={revenueOfSoldKnown > 0 ? t("dashboard.roiSub", { roi: roiKnown.toFixed(1) }) : t("dashboard.noSalesKnownCost")}
        />
      </div>
      {revenueUnknownCost > 0 && (
        <div className="flex gap-2 items-start px-3 py-2.5 rounded-xl mb-4" style={{ background: "rgba(201,138,58,0.1)" }}>
          <AlertCircle size={14} color={C.amber} style={{ marginTop: 1, flexShrink: 0 }} />
          <span className="text-[12px]" style={{ color: C.amber }}>
            {t("dashboard.unknownCostBanner", { amount: euro(revenueUnknownCost) })}
          </span>
        </div>
      )}
      {allListedUnits.length > 0 && (
        <button onClick={() => setView("listings")} className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl mb-4 text-left" style={{ background: "rgba(108,142,239,0.1)" }}>
          <Megaphone size={14} color={C.info} style={{ flexShrink: 0 }} />
          <span className="text-[12px] flex-1" style={{ color: C.info }}>
            {t(allListedUnits.length === 1 ? "dashboard.listedBannerOne" : "dashboard.listedBannerMany", { count: allListedUnits.length, total: euro(totalListedValue) })}
          </span>
          <ChevronRight size={14} color={C.info} />
        </button>
      )}

      <div className="flex items-center justify-between mt-6 mb-3">
        <h3 className="text-sm font-semibold" style={{ color: C.textDim }}>{t("dashboard.recentSales")}</h3>
        {allSoldUnits.length > 5 && <button onClick={() => setView("sales")} className="text-[12px]" style={{ color: C.gold }}>{t("dashboard.seeAll")}</button>}
      </div>
      {recentSales.length === 0 ? (
        <div className="text-center py-10 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.textFaint }}>
          <ShoppingBag size={22} className="mx-auto mb-2" />
          <div className="text-sm">{t("dashboard.noSales")}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
          {recentSales.map((u) => {
            const m = u.cost != null ? u.sale.price - u.cost : null;
            return (
              <button key={u.id} onClick={() => onSelectSaleUnit(u)} className="w-full flex items-center gap-3 p-3 rounded-xl text-left" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                <PhotoThumb photoKey={u.photoKey} size={40} rounded="8px" iconSize={14} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{u.name}</div>
                  <div className="text-[11px] flex items-center gap-1.5" style={{ color: C.textFaint }}>
                    {fmtDate(u.sale.date)}
                    {u.sale.tracking && <Truck size={11} title={`${u.sale.carrier || t("forms.carrier")}: ${u.sale.tracking}`} />}
                  </div>
                </div>
                <div className="text-[13px] font-bold" style={{ color: m === null ? C.amber : m >= 0 ? C.teal : C.crimson }}>
                  {m === null ? t("common.costNa") : `${m >= 0 ? "+" : ""}${euro(m)}`}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
