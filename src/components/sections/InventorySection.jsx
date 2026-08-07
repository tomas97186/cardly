import { Search, Package } from "lucide-react";
import { C, CATEGORY_OPTIONS } from "../../lib/theme";
import { TextInput } from "../ui/Inputs";
import { FilterToggle } from "../ui/FilterToggle";
import { SortSelect } from "../ui/SortSelect";
import { ItemCard } from "../ui/ItemCard";

export function InventorySection({
  search, setSearch, sortedFiltered, itemsCount,
  showInventoryFilters, setShowInventoryFilters,
  filterGame, setFilterGame, filterStatus, setFilterStatus,
  filterKind, setFilterKind, filterGraded, setFilterGraded,
  filterCategory, setFilterCategory,
  sortInventory, setSortInventory,
  games,
  onOpenItem, onOpenLot,
}) {
  return (
    <>
      <div className="relative mb-3">
        <Search size={15} style={{ position: "absolute", left: 12, top: 11 }} color={C.textFaint} />
        <TextInput value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cerca carta, set, lotto..." style={{ paddingLeft: 34 }} />
      </div>
      <div className="flex items-center justify-between gap-2 mb-3">
        <span className="text-[11.5px] flex-shrink-0" style={{ color: C.textFaint }}>{sortedFiltered.length} risultati</span>
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
          <FilterChips options={[["all", "Tutti i giochi"], ...games.map((g) => [g.key, g.label])]} value={filterGame} onChange={setFilterGame} activeColor={C.gold} activeText="#181305" />
          <FilterChips options={[["all", "Tutti i tipi"], ["singola", "Carte singole"], ["lotto", "Lotti"]]} value={filterKind} onChange={setFilterKind} activeColor={C.info} activeText="#0C1330" />
          <FilterChips options={[["all", "Tutti gli stati"], ["in_stock", "In magazzino"], ["listed", "In vendita"], ["sold", "Vendute"]]} value={filterStatus} onChange={setFilterStatus} activeColor={C.teal} activeText="#0B231D" />
          <FilterChips options={[["all", "Gradate e non"], ["graded", "Solo gradate"], ["notGraded", "Non gradate"]]} value={filterGraded} onChange={setFilterGraded} activeColor={C.amber} activeText="#241704" />
          <FilterChips options={[["all", "Tutte le categorie"], ...CATEGORY_OPTIONS.map((c) => [c, c])]} value={filterCategory} onChange={setFilterCategory} activeColor={C.crimson} activeText="#fff" last />
        </div>
      )}

      {sortedFiltered.length === 0 ? (
        <div className="text-center py-16 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.textFaint }}>
          <Package size={24} className="mx-auto mb-2" />
          <div className="text-sm">{itemsCount === 0 ? "Il tuo inventario è vuoto. Aggiungi il primo acquisto!" : "Nessun risultato con questi filtri."}</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {sortedFiltered.map((it) => (
            <ItemCard key={it.id} item={it} onClick={() => (it.kind === "lotto" ? onOpenLot(it.id) : onOpenItem(it.id))} />
          ))}
        </div>
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
