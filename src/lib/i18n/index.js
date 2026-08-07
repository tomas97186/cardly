import { it } from "./it";
import { en } from "./en";

export const DICTS = { it, en };
export const LANGS = ["it", "en"];

// Dot-path lookup: resolve(dict, "forms.sale.registerSale") -> dict.forms.sale.registerSale
export function resolve(dict, path) {
  return path.split(".").reduce((node, key) => (node && node[key] !== undefined ? node[key] : undefined), dict);
}
