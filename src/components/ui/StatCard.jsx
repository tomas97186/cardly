import { C } from "../../lib/theme";

export function StatCard({ icon: Icon, label, value, accent, sub }) {
  return (
    <div className="p-4 rounded-2xl" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-[11px] uppercase tracking-widest" style={{ color: C.textFaint }}>{label}</span>
        <Icon size={15} color={accent || C.textDim} />
      </div>
      <div className="text-xl font-bold" style={{ fontFamily: "'Oswald', sans-serif", color: accent || C.text }}>{value}</div>
      {sub && <div className="text-[11.5px] mt-0.5" style={{ color: C.textFaint }}>{sub}</div>}
    </div>
  );
}
