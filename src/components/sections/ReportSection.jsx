import { useState } from "react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from "recharts";
import { C } from "../../lib/theme";
import { useLanguage } from "../../context/LanguageContext";
import { money, currentCurrencyCode } from "../../lib/format";
import { getPeriodRange, makeInRange, PERIOD_OPTIONS } from "../../lib/period";
import { buildMonthlyTrend, buildGameBreakdown, buildPlatformBreakdown } from "../../lib/reports";
import { FilterToggle } from "../ui/FilterToggle";
import { PeriodFilter } from "../ui/PeriodFilter";

// Validated against the app's dark card surface (#1B1E2A) with the dataviz skill's
// six-check script (lightness band, chroma floor, CVD + normal-vision separation,
// contrast) — same hues as the app's gold/teal/info accents, stepped darker so they
// pass as bar fills rather than as small text/badge accents. See plan for the run.
const SERIES_COLOR = { invested: "#a27900", revenue: "#008f78", margin: "#5473d2" };

function monthLabel(year, month, locale) {
  return new Date(year, month, 1).toLocaleDateString(locale, { month: "short" });
}

// Compact axis ticks ("1.2K €" / "850 €") — money() is meant for full values in
// lists and tooltips, not cramped chart axes.
function compactMoney(v, locale) {
  return new Intl.NumberFormat(locale, { style: "currency", currency: currentCurrencyCode(), notation: "compact", maximumFractionDigits: 1 }).format(v);
}

function ChartCard({ title, sub, empty, children }) {
  return (
    <div className="p-4 rounded-2xl mb-4" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <div className="flex items-baseline justify-between mb-1">
        <h3 className="text-sm font-semibold">{title}</h3>
        {sub && <span className="text-[11px]" style={{ color: C.textFaint }}>{sub}</span>}
      </div>
      {empty ? (
        <div className="text-center py-12 text-[13px]" style={{ color: C.textFaint }}>{empty}</div>
      ) : (
        <div style={{ width: "100%", height: 260 }}>{children}</div>
      )}
    </div>
  );
}

function LegendSwatches({ items }) {
  return (
    <div className="flex items-center gap-4 mt-2 flex-wrap">
      {items.map(([label, color]) => (
        <div key={label} className="flex items-center gap-1.5">
          <span style={{ width: 9, height: 9, borderRadius: 3, background: color, flexShrink: 0 }} />
          <span className="text-[11.5px]" style={{ color: C.textDim }}>{label}</span>
        </div>
      ))}
    </div>
  );
}

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className="p-2.5 rounded-lg text-[12px]" style={{ background: C.surfaceAlt, border: `1px solid ${C.border}`, color: C.text }}>
      <div className="font-semibold mb-1">{label}</div>
      {payload.map((p) => (
        <div key={p.dataKey} className="flex items-center gap-2 justify-between">
          <span className="flex items-center gap-1.5" style={{ color: C.textDim }}>
            <span style={{ width: 8, height: 8, borderRadius: 2, background: p.color }} />
            {p.name}
          </span>
          <span>{money(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

export function ReportSection({
  singolaItems, lotItems, games,
  period, setPeriod, customFrom, setCustomFrom, customTo, setCustomTo,
}) {
  const { t, lang } = useLanguage();
  const [showReportFilters, setShowReportFilters] = useState(false);
  const locale = lang === "en" ? "en-US" : "it-IT";

  const trend = buildMonthlyTrend(singolaItems, lotItems, 6).map((b) => ({
    label: monthLabel(b.year, b.month, locale), invested: b.invested, revenue: b.revenue, margin: b.margin,
  }));
  const trendEmpty = trend.every((b) => !b.invested && !b.revenue && !b.margin);

  const periodRange = getPeriodRange(period, customFrom, customTo);
  const inRange = makeInRange(periodRange);
  const gameData = buildGameBreakdown(singolaItems, lotItems, games, inRange);
  const platformData = buildPlatformBreakdown(singolaItems, lotItems, inRange, t("reports.unknownPlatform"));
  const periodLabelKey = PERIOD_OPTIONS.find(([v]) => v === period)?.[1];

  const seriesLegend = [
    [t("reports.seriesInvested"), SERIES_COLOR.invested],
    [t("reports.seriesRevenue"), SERIES_COLOR.revenue],
    [t("reports.seriesMargin"), SERIES_COLOR.margin],
  ];

  return (
    <>
      <ChartCard title={t("reports.trendTitle")} sub={t("reports.last6Months")} empty={trendEmpty ? t("reports.emptyTrend") : null}>
        <ResponsiveContainer>
          <BarChart data={trend} barGap={3} barCategoryGap="22%" margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={C.border} />
            <XAxis dataKey="label" tick={{ fill: C.textFaint, fontSize: 11 }} axisLine={{ stroke: C.border }} tickLine={false} />
            <YAxis tick={{ fill: C.textFaint, fontSize: 11 }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => compactMoney(v, locale)} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="invested" name={t("reports.seriesInvested")} fill={SERIES_COLOR.invested} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
            <Bar dataKey="revenue" name={t("reports.seriesRevenue")} fill={SERIES_COLOR.revenue} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
            <Bar dataKey="margin" name={t("reports.seriesMargin")} fill={SERIES_COLOR.margin} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      {!trendEmpty && <LegendSwatches items={seriesLegend} />}

      {/* Everything below is governed by this period filter — the trend chart above
          is deliberately fixed to the last 6 months regardless of it, so the filter
          sits after it rather than above the whole section. */}
      <div className="flex items-center justify-between mb-3 mt-5">
        <span className="text-[11.5px]" style={{ color: C.textFaint }}>
          {t("dashboard.periodLabel", { period: periodLabelKey ? t(periodLabelKey) : t("period.all") })}
        </span>
        <FilterToggle
          open={showReportFilters}
          onToggle={() => setShowReportFilters((v) => !v)}
          activeCount={period !== "all" ? 1 : 0}
          label={t("dashboard.periodFilterLabel")}
        />
      </div>
      {showReportFilters && (
        <div className="anim-slide-up mb-2 p-3 rounded-xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <PeriodFilter period={period} setPeriod={setPeriod} customFrom={customFrom} setCustomFrom={setCustomFrom} customTo={customTo} setCustomTo={setCustomTo} />
        </div>
      )}

      <ChartCard title={t("reports.byGameTitle")} empty={gameData.length === 0 ? t("reports.emptyGames") : null}>
        <ResponsiveContainer>
          <BarChart data={gameData} barGap={3} barCategoryGap="22%" margin={{ top: 4, right: 4, left: 4, bottom: 0 }}>
            <CartesianGrid vertical={false} stroke={C.border} />
            <XAxis dataKey="label" tick={{ fill: C.textFaint, fontSize: 11 }} axisLine={{ stroke: C.border }} tickLine={false} />
            <YAxis tick={{ fill: C.textFaint, fontSize: 11 }} axisLine={false} tickLine={false} width={40} tickFormatter={(v) => compactMoney(v, locale)} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="invested" name={t("reports.seriesInvested")} fill={SERIES_COLOR.invested} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
            <Bar dataKey="revenue" name={t("reports.seriesRevenue")} fill={SERIES_COLOR.revenue} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
            <Bar dataKey="margin" name={t("reports.seriesMargin")} fill={SERIES_COLOR.margin} radius={[4, 4, 0, 0]} maxBarSize={22} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      {gameData.length > 0 && <LegendSwatches items={seriesLegend} />}

      <ChartCard title={t("reports.byPlatformTitle")} empty={platformData.length === 0 ? t("reports.emptyPlatforms") : null}>
        <ResponsiveContainer>
          <BarChart data={platformData} layout="vertical" margin={{ top: 4, right: 24, left: 4, bottom: 0 }}>
            <CartesianGrid horizontal={false} stroke={C.border} />
            <XAxis type="number" tick={{ fill: C.textFaint, fontSize: 11 }} axisLine={{ stroke: C.border }} tickLine={false} tickFormatter={(v) => compactMoney(v, locale)} />
            <YAxis type="category" dataKey="platform" tick={{ fill: C.textDim, fontSize: 12 }} axisLine={false} tickLine={false} width={110} />
            <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
            <Bar dataKey="margin" name={t("reports.seriesMargin")} fill={SERIES_COLOR.margin} radius={[0, 4, 4, 0]} maxBarSize={20} isAnimationActive={false}>
              {platformData.map((p, i) => (
                <Cell key={i} fill={p.margin < 0 ? C.crimson : SERIES_COLOR.margin} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </>
  );
}

export default ReportSection;
