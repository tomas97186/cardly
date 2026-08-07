import { useEffect, useRef } from "react";

// Installed as a standalone PWA (see manifest.json), the app has no browser chrome —
// so the Android hardware/gesture back button normally exits it outright, since the
// SPA never pushes any history entries for it to fall back to. This keeps a synthetic
// history stack in sync with `depth` (how many view/modal/detail layers are currently
// open): opening a layer pushes an entry, closing one in-app (e.g. an "X" button)
// consumes one, and pressing back pops one and calls `onBack` to close the top layer
// instead of leaving the app. At depth 0 (dashboard, nothing open), back falls through
// to the real exit — same as any Android app at its home screen.
export function useAndroidBackButton(depth, onBack) {
  const depthRef = useRef(0);
  const syncingRef = useRef(false);
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (depth > depthRef.current) {
      for (let i = depthRef.current; i < depth; i++) window.history.pushState({ cardlyDepth: i + 1 }, "");
    } else if (depth < depthRef.current) {
      syncingRef.current = true;
      window.history.go(depth - depthRef.current);
    }
    depthRef.current = depth;
  }, [depth]);

  useEffect(() => {
    function handlePopState() {
      if (syncingRef.current) { syncingRef.current = false; return; }
      depthRef.current = Math.max(0, depthRef.current - 1);
      onBackRef.current();
    }
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
}
