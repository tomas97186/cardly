import { Search, Megaphone, Link2 } from "lucide-react";
import { C } from "../../lib/theme";
import { useCatalog } from "../../context/CatalogContext";
import { euro, fmtDate } from "../../lib/format";
import { TextInput } from "../ui/Inputs";
import { FilterToggle } from "../ui/FilterToggle";
import { SortSelect } from "../ui/SortSelect";
import { Badge } from "../ui/Badge";
import { PhotoThumb } from "../ui/Photo";

export function ListingsSection({
  allListedUnits, totalListedValue, rawListedUnitsCount,
  listingSearch, setListingSearch,
  showListingFilters, setShowListingFilters,
  listingPlatforms, listingPlatformFilter, setListingPlatformFilter,
  listingPriceMin, setListingPriceMin, listingPriceMax, setListingPriceMax,
  sortListings, setSortListings,
  onOpenUnit,
}) {
  const { GAME_META } = useCatalog();
  return (
    <>
      <div className="flex items-center justify-between mb-3 p-3 rounded-xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
        <div>
          <div className="text-[10.5px] uppercase" style={{ color: C.textFaint }}>In vendita</div>
          <div className="text-sm font-bold mt-0.5">{allListedUnits.length} {allListedUnits.length === 1 ? "carta" : "carte"}</div>
        </div>
        <div className="text-right">
          <div className="text-[10.5px] uppercase" style={{ color: C.textFaint }}>Totale richiesto</div>
          <div className="text-sm font-bold mt-0.5" style={{ color: C.info }}>{euro(totalListedValue)}</div>
        </div>
      </div>

      <div className="relative mb-3">
        <Search size={15} style={{ position: "absolute", left: 12, top: 11 }} color={C.textFaint} />
        <TextInput value={listingSearch} onChange={(e) => setListingSearch(e.target.value)} placeholder="Cerca tra le carte in vendita..." style={{ paddingLeft: 34 }} />
      </div>

      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[11.5px] flex-shrink-0" style={{ color: C.textFaint }}>{allListedUnits.length} risultati</span>
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
              {[["all", "Tutte le piattaforme"], ...listingPlatforms.map((p) => [p, p])].map(([val, label]) => (
                <button key={val} onClick={() => setListingPlatformFilter(val)} className="px-3 py-1.5 rounded-full text-[12.5px] font-medium whitespace-nowrap"
                  style={{ background: listingPlatformFilter === val ? C.info : C.surfaceAlt, color: listingPlatformFilter === val ? "#0C1330" : C.textDim }}>
                  {label}
                </button>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <TextInput type="number" step="0.01" min="0" value={listingPriceMin} onChange={(e) => setListingPriceMin(e.target.value)} placeholder="Prezzo min €" />
            <TextInput type="number" step="0.01" min="0" value={listingPriceMax} onChange={(e) => setListingPriceMax(e.target.value)} placeholder="Prezzo max €" />
          </div>
        </div>
      )}

      {allListedUnits.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.textFaint }}>
          <Megaphone size={24} className="mx-auto mb-2" />
          <div className="text-sm">{rawListedUnitsCount === 0 ? "Nessuna carta in vendita al momento." : "Nessun risultato con questi filtri."}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-2">
          {allListedUnits.map((u) => {
            const meta = GAME_META[u.game] || GAME_META.altro;
            return (
              <button key={u.id} onClick={() => onOpenUnit(u)} className="w-full flex items-center gap-3 p-3 rounded-xl text-left" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
                <PhotoThumb photoKey={u.photoKey} size={44} rounded="8px" iconSize={14} />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{u.name}</div>
                  <div className="text-[11px] flex items-center gap-1.5 mt-0.5" style={{ color: C.textFaint }}>
                    <Badge color={meta.color} bg={meta.bg}>{meta.label}</Badge>
                    {u.listing.platform && <span>{u.listing.platform}</span>}
                    {fmtDate(u.listing.listedDate)}
                    {u.listing.link && <Link2 size={11} />}
                  </div>
                </div>
                <div className="text-[13px] font-bold" style={{ color: C.info }}>{euro(u.listing.price)}</div>
              </button>
            );
          })}
        </div>
      )}
    </>
  );
}
