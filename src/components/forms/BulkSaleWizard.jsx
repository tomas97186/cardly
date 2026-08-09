import { useState, useEffect } from "react";
import { Search, X, Check, Plus, AlertCircle } from "lucide-react";
import { C, CONDITION_OPTIONS, CATEGORY_OPTIONS, LANGUAGE_OPTIONS } from "../../lib/theme";
import { useCatalog } from "../../context/CatalogContext";
import { useLanguage } from "../../context/LanguageContext";
import { money, uid, cardDisplayName, currentCurrencySymbol } from "../../lib/format";
import { searchGlobal } from "../../lib/storage";
import { Field } from "../ui/Field";
import { TextInput, Select } from "../ui/Inputs";
import { PhotoThumb } from "../ui/Photo";
import { GradingFields } from "../ui/GradingFields";
import { GhostButton, PrimaryButton } from "../ui/Buttons";
import { GroupSaleForm } from "./GroupSaleForm";

// ---------- Bulk sale wizard: search & pick cards from anywhere in the inventory, or add
// a brand-new one on the spot, then register one sale for all of them together
// (used from the Vendite section) ----------
export function BulkSaleWizard({ onCancel, onSubmit, onSelectionChange }) {
  const { GAME_META } = useCatalog();
  const { t } = useLanguage();
  const [step, setStep] = useState("pick"); // 'pick' | 'new' | 'details'
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState([]);
  const [candidates, setCandidates] = useState([]);

  // Lets the parent know how many cards are selected, so it can only call this a
  // "vendita multipla" once that's actually true instead of always up front.
  useEffect(() => { onSelectionChange?.(selected.length); }, [selected, onSelectionChange]);

  useEffect(() => {
    const q = query.trim();
    if (!q) { setCandidates([]); return; }
    let cancelled = false;
    const timer = setTimeout(async () => {
      const rows = await searchGlobal(q, 30);
      if (cancelled) return;
      const mapped = rows
        // Whole lots aren't a sellable unit here, and already-sold cards can't be sold again.
        .filter((r) => r.type !== "lot" && r.status !== "sold")
        .map((r) => (r.type === "lotCard"
          ? { key: `l-${r.id}`, kind: "lotto", id: r.id, lotId: r.lotId, name: cardDisplayName(r.name || t("common.unnamedCard"), r.cardNumber), sub: t("details.groupSaleSourceLabel", { lotName: r.subName }), cost: r.assignedCost, photoKey: r.photoKeys?.[0], game: r.game }
          : { key: `s-${r.id}`, kind: "singola", id: r.id, name: cardDisplayName(r.name, r.cardNumber), sub: r.subName || GAME_META[r.game]?.label || "", cost: r.unitCost, photoKey: r.photoKeys?.[0], game: r.game }
        ));
      setCandidates(mapped);
    }, 250);
    return () => { cancelled = true; clearTimeout(timer); };
  }, [query, t, GAME_META]);

  const selectedKeys = new Set(selected.map((s) => s.key));

  function toggle(c) {
    setSelected((prev) => (prev.some((s) => s.key === c.key) ? prev.filter((s) => s.key !== c.key) : [...prev, c]));
  }

  if (step === "new") {
    return (
      <NewCardForm
        onCancel={() => setStep("pick")}
        onAdd={(card) => { setSelected((prev) => [...prev, card]); setStep("pick"); }}
      />
    );
  }

  if (step === "details") {
    return (
      <GroupSaleForm
        cards={selected}
        onBack={() => setStep("pick")}
        onCancel={onCancel}
        onSubmit={(saleData) => onSubmit(selected.map((s) => (s.kind === "new" ? s : { kind: s.kind, id: s.id, lotId: s.lotId })), saleData)}
      />
    );
  }

  return (
    <div>
      <div className="relative mb-3">
        <Search size={15} style={{ position: "absolute", left: 12, top: 11 }} color={C.textFaint} />
        <TextInput value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t("forms.bulkSearchPlaceholder")} style={{ paddingLeft: 34 }} />
      </div>

      <button onClick={() => setStep("new")} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[12.5px] font-medium mb-3" style={{ border: `1.5px dashed ${C.border}`, color: C.gold }}>
        <Plus size={14} /> {t("forms.cardNotInInventory")}
      </button>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {selected.map((s) => (
            <button key={s.key} onClick={() => toggle(s)} className="flex items-center gap-1 pl-2.5 pr-1.5 py-1 rounded-full text-[12px]" style={{ background: `${C.teal}29`, color: C.teal }}>
              {s.name} <X size={12} />
            </button>
          ))}
        </div>
      )}

      <div className="space-y-1.5 mb-4" style={{ maxHeight: "46vh", overflowY: "auto" }}>
        {!query.trim() ? (
          <div className="text-center py-8 text-[13px]" style={{ color: C.textFaint }}>{t("forms.bulkSearchPrompt")}</div>
        ) : candidates.length === 0 ? (
          <div className="text-center py-8 text-[13px]" style={{ color: C.textFaint }}>{t("forms.noCardsFound", { query })}</div>
        ) : (
          candidates.map((c) => {
            const isSel = selectedKeys.has(c.key);
            return (
              <button
                key={c.key} onClick={() => toggle(c)}
                className="w-full flex items-center gap-3 p-2.5 rounded-xl text-left"
                style={{ background: isSel ? `${C.teal}24` : C.surfaceAlt, border: `1px solid ${isSel ? C.tealDim : "transparent"}` }}
              >
                <div style={{ width: 20, height: 20, borderRadius: 6, flexShrink: 0, border: `1.5px solid ${isSel ? C.teal : C.border}`, background: isSel ? C.teal : "transparent", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  {isSel && <Check size={13} color={C.tealText} />}
                </div>
                <PhotoThumb photoKey={c.photoKey} size={36} rounded="8px" iconSize={13} preferThumb />
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{c.name}</div>
                  <div className="text-[11px] truncate" style={{ color: C.textFaint }}>{c.sub}</div>
                </div>
                <span className="text-[12px] flex-shrink-0" style={{ color: c.cost != null ? C.textDim : C.amber }}>{c.cost != null ? money(c.cost) : t("common.costNa")}</span>
              </button>
            );
          })
        )}
      </div>

      <div className="flex gap-3">
        <GhostButton full onClick={onCancel}>{t("common.cancel")}</GhostButton>
        <PrimaryButton full disabled={selected.length === 0} onClick={() => setStep("details")}>
          {t("forms.continueWithCount", { count: selected.length })}
        </PrimaryButton>
      </div>
    </div>
  );
}

// Quickly catalogs a card that isn't in the inventory yet, so it can be sold right
// away in this same sale — the cost is optional, since it's normal not to remember
// (or never have tracked) what a card being sold on the spot originally cost.
function NewCardForm({ onCancel, onAdd }) {
  const { games, gradingCompanies } = useCatalog();
  const { t } = useLanguage();
  const [name, setName] = useState("");
  const [game, setGame] = useState(games[0]?.key || "altro");
  const [setName_, setSetName] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [condition, setCondition] = useState("Da valutare");
  const [category, setCategory] = useState("Carta Singola");
  const [language, setLanguage] = useState(LANGUAGE_OPTIONS[0]);
  const [graded, setGraded] = useState(false);
  const [gradingCompany, setGradingCompany] = useState(gradingCompanies[0] || "");
  const [grade, setGrade] = useState("");
  const [cost, setCost] = useState("");

  const valid = name.trim().length > 0;

  function handleAdd() {
    if (!valid) return;
    onAdd({
      key: `new-${uid()}`, kind: "new", name: name.trim(), game, setName: setName_, cardNumber,
      condition, category, language, gradingCompany: graded ? gradingCompany : null, grade: graded ? grade.trim() : null,
      cost: cost.trim() === "" ? null : parseFloat(cost),
      sub: t("forms.newCardSub"),
    });
  }

  return (
    <div>
      <Field label={t("common.game")}>
        <Select value={game} onChange={(e) => setGame(e.target.value)}>
          {games.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
        </Select>
      </Field>
      <Field label={t("forms.cardName")}>
        <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder={t("forms.cardNamePlaceholder")} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("forms.setName")}><TextInput value={setName_} onChange={(e) => setSetName(e.target.value)} /></Field>
        <Field label={t("forms.cardNumber")}><TextInput value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("forms.condition")}><Select value={condition} onChange={(e) => setCondition(e.target.value)}>{CONDITION_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
        <Field label={t("forms.category")}><Select value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORY_OPTIONS.map((c) => <option key={c} value={c}>{c}</option>)}</Select></Field>
      </div>
      <Field label={t("forms.cardLanguage")}><Select value={language} onChange={(e) => setLanguage(e.target.value)}>{LANGUAGE_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}</Select></Field>
      <GradingFields graded={graded} setGraded={setGraded} gradingCompany={gradingCompany} setGradingCompany={setGradingCompany} grade={grade} setGrade={setGrade} />
      <Field label={t("forms.purchaseCost", { symbol: currentCurrencySymbol() })} hint={t("forms.purchaseCostHint")}>
        <TextInput type="number" step="0.01" min="0" value={cost} onChange={(e) => setCost(e.target.value)} placeholder={t("common.notSpecified")} />
      </Field>

      {cost.trim() === "" && (
        <div className="flex gap-2 items-start px-3 py-2.5 rounded-lg mb-4" style={{ background: `${C.amber}1F` }}>
          <AlertCircle size={14} color={C.amber} style={{ marginTop: 1, flexShrink: 0 }} />
          <span className="text-[12.5px]" style={{ color: C.amber }}>
            {t("forms.noCostWarning")}
          </span>
        </div>
      )}

      <div className="flex gap-3">
        <GhostButton full onClick={onCancel}>{t("common.back")}</GhostButton>
        <PrimaryButton full disabled={!valid} onClick={handleAdd}><Plus size={16} /> {t("forms.addToSelection")}</PrimaryButton>
      </div>
    </div>
  );
}
