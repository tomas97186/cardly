// ---------- Sorting helpers ----------
export const SORT_OPTIONS = [
  ["recent", "Più recenti"],
  ["oldest", "Meno recenti"],
  ["price_desc", "Prezzo: dal più alto"],
  ["price_asc", "Prezzo: dal più basso"],
  ["name_asc", "Nome: A-Z"],
  ["name_z", "Nome: Z-A"],
];
export function sortUnits(list, sortKey, { getDate, getPrice, getName }) {
  const arr = [...list];
  switch (sortKey) {
    case "oldest": arr.sort((a, b) => getDate(a) - getDate(b)); break;
    case "price_desc": arr.sort((a, b) => (getPrice(b) ?? -Infinity) - (getPrice(a) ?? -Infinity)); break;
    case "price_asc": arr.sort((a, b) => (getPrice(a) ?? Infinity) - (getPrice(b) ?? Infinity)); break;
    case "name_asc": arr.sort((a, b) => getName(a).localeCompare(getName(b))); break;
    case "name_z": arr.sort((a, b) => getName(b).localeCompare(getName(a))); break;
    case "recent":
    default: arr.sort((a, b) => getDate(b) - getDate(a)); break;
  }
  return arr;
}
