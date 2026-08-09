import { useState, useEffect } from "react";
import { loadLotWithCards } from "../lib/storage";

// Fetches a single record by id whenever `key` or `version` changes — used by every
// detail/edit modal that used to just do `items.find(i => i.id === x)` on the one
// big in-memory array. `version` is App.jsx's dataVersion counter: bumping it after
// a mutation re-fetches whatever's currently open, so e.g. cancelling a sale updates
// the detail view still showing that card without needing optimistic local patching.
export function useAsyncRecord(key, loader, version) {
  const [record, setRecord] = useState(null);
  useEffect(() => {
    let cancelled = false;
    if (key == null) { setRecord(null); return; }
    loader(key).then((r) => { if (!cancelled) setRecord(r); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, version]);
  return record;
}

// Same idea for a {lotId, cardId} ref: loads the whole lot (with its cards) and
// resolves the one card, mirroring the old resolveLotCard() helper.
export function useAsyncLotCard(ref, version) {
  const lot = useAsyncRecord(ref?.lotId ?? null, loadLotWithCards, version);
  if (!lot || !ref) return null;
  const card = lot.cards.find((c) => c.id === ref.cardId);
  return card ? { lot, card } : null;
}
