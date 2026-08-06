export function Badge({ children, color, bg }) {
  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold tracking-wide"
      style={{ color, backgroundColor: bg, border: `1px solid ${color}33` }}
    >
      {children}
    </span>
  );
}
