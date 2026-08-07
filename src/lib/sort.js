// ---------- Sorting helpers ----------
// Labels are translation keys (resolved via t()), not display text — see lib/i18n.
export const SORT_OPTIONS = [
  ["recent", "sort.recent"],
  ["oldest", "sort.oldest"],
  ["price_desc", "sort.price_desc"],
  ["price_asc", "sort.price_asc"],
  ["name_asc", "sort.name_asc"],
  ["name_z", "sort.name_z"],
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
