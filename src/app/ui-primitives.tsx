export function Cell({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`px-3 py-1.5 ${className}`}>{children}</div>;
}

export function Panel({
  title,
  code,
  right,
  children,
  className = "",
  bodyClassName = "",
  scrollBody = true,
}: {
  title: string;
  code?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
  /** When false, body does not scroll — use TokentaScrollArea inside for an isolated scrollbar. */
  scrollBody?: boolean;
}) {
  return (
    <section className={`border border-white/15 bg-black flex flex-col min-h-0 ${className}`}>
      <header className="flex shrink-0 items-center justify-between border-b border-white/15 px-3 py-1.5">
        <div className="flex items-center gap-2 uppercase tracking-[0.18em] text-white/70 text-[11px]">
          {code && <span className="text-white/30">{code}</span>}
          <span>{title}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-white/40">{right}</div>
      </header>
      <div
        className={
          scrollBody
            ? `overflow-auto flex-1 min-h-0 ${bodyClassName}`
            : `flex flex-1 min-h-0 flex-col overflow-hidden ${bodyClassName}`
        }
      >
        {children}
      </div>
    </section>
  );
}

export function resultTagTone(
  result: string,
): "default" | "up" | "down" | "warn" | "mute" {
  const r = result.toUpperCase();
  if (r === "PASS") return "default";
  if (r === "PENDING" || r === "RUNNING") return "mute";
  if (r === "REVIEW" || r === "DEGRADED") return "warn";
  return "warn";
}

export function Tag({ children, tone = "default" }: { children: React.ReactNode; tone?: "default" | "up" | "down" | "warn" | "mute" }) {
  const m = {
    default: "border-white/30 text-white",
    up: "border-white text-white",
    down: "border-white/40 text-white/70",
    warn: "border-white text-black bg-white",
    mute: "border-white/15 text-white/40",
  }[tone];
  return <span className={`inline-flex items-center gap-1 border ${m} px-1.5 py-[1px] text-[10px] tracking-[0.12em] uppercase`}>{children}</span>;
}

export function Pulse() {
  return (
    <span className="relative inline-flex items-center">
      <span className="absolute inline-flex h-1.5 w-1.5 rounded-full bg-white opacity-60 animate-ping" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-white" />
    </span>
  );
}
