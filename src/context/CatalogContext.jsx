import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { loadCatalogSettings, saveCatalogSettings } from "../lib/storage";
import { DEFAULT_GAMES, DEFAULT_PLATFORMS, DEFAULT_GRADING_COMPANIES, COLOR_PALETTE, buildGameMeta, slugifyKey, sortAltroLast } from "../lib/catalog";

const CatalogContext = createContext(null);

export function CatalogProvider({ children }) {
  const [games, setGames] = useState(DEFAULT_GAMES);
  const [platforms, setPlatforms] = useState(DEFAULT_PLATFORMS);
  const [gradingCompanies, setGradingCompanies] = useState(DEFAULT_GRADING_COMPANIES);

  useEffect(() => {
    (async () => {
      const saved = await loadCatalogSettings();
      if (saved && Array.isArray(saved.games) && saved.games.length) setGames(sortAltroLast(saved.games));
      if (saved && Array.isArray(saved.platforms) && saved.platforms.length) setPlatforms(saved.platforms);
      if (saved && Array.isArray(saved.gradingCompanies) && saved.gradingCompanies.length) setGradingCompanies(saved.gradingCompanies);
    })();
  }, []);

  const persist = useCallback((nextGames, nextPlatforms, nextGradingCompanies) => {
    saveCatalogSettings({ games: nextGames, platforms: nextPlatforms, gradingCompanies: nextGradingCompanies });
  }, []);

  function addGame(label) {
    const trimmed = label.trim();
    if (!trimmed) return;
    const key = slugifyKey(trimmed, games.map((g) => g.key));
    const color = COLOR_PALETTE[games.length % COLOR_PALETTE.length];
    const next = sortAltroLast([...games, { key, label: trimmed, color }]);
    setGames(next); persist(next, platforms, gradingCompanies);
  }
  function renameGame(key, label) {
    const trimmed = label.trim();
    if (!trimmed) return;
    const next = games.map((g) => (g.key === key ? { ...g, label: trimmed } : g));
    setGames(next); persist(next, platforms, gradingCompanies);
  }
  function removeGame(key) {
    if (key === "altro") return; // always keep a fallback game
    const next = games.filter((g) => g.key !== key);
    setGames(next); persist(next, platforms, gradingCompanies);
  }

  function addPlatform(name) {
    const trimmed = name.trim();
    if (!trimmed || platforms.includes(trimmed)) return;
    const next = [...platforms, trimmed];
    setPlatforms(next); persist(games, next, gradingCompanies);
  }
  function removePlatform(name) {
    const next = platforms.filter((p) => p !== name);
    setPlatforms(next); persist(games, next, gradingCompanies);
  }

  function addGradingCompany(name) {
    const trimmed = name.trim();
    if (!trimmed || gradingCompanies.includes(trimmed)) return;
    const next = [...gradingCompanies, trimmed];
    setGradingCompanies(next); persist(games, platforms, next);
  }
  function removeGradingCompany(name) {
    const next = gradingCompanies.filter((g) => g !== name);
    setGradingCompanies(next); persist(games, platforms, next);
  }

  const GAME_META = useMemo(() => buildGameMeta(games), [games]);

  const value = {
    games, GAME_META, platforms, gradingCompanies,
    addGame, renameGame, removeGame, addPlatform, removePlatform, addGradingCompany, removeGradingCompany,
  };
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within a CatalogProvider");
  return ctx;
}
