export function PriceChart({
  ticker,
  pricePoints,
}: {
  ticker?: string;
  pricePoints?: number[];
}) {
  if (!pricePoints?.length) {
    return (
      <div className="relative flex h-full w-full items-center justify-center border border-white/10 bg-black">
        <span className="px-4 text-center text-[10px] tracking-[0.18em] text-white/40">
          NO PRICE HISTORY · SELECT A LIVE LISTING
        </span>
      </div>
    );
  }

  const w = 100;
  const h = 100;
  const min = Math.min(...pricePoints);
  const max = Math.max(...pricePoints);
  const range = max - min || 1;
  const step = w / (pricePoints.length - 1);

  const points = pricePoints
    .map((p, i) => `${i * step},${h - ((p - min) / range) * h * 0.9 - 5}`)
    .join(" ");

  const areaPath = `M0,${h} L${points
    .split(" ")
    .map((pt) => pt)
    .join(" L")} L${w},${h} Z`;

  return (
    <div className="relative h-full w-full border border-white/10 bg-black">
      <div className="pointer-events-none absolute inset-0 grid grid-cols-6 grid-rows-4">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="border-b border-r border-white/5" />
        ))}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
        <path d={areaPath} fill="white" fillOpacity="0.08" />
        <polyline points={points} fill="none" stroke="white" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="absolute left-2 right-2 top-2 flex justify-between font-mono text-[10px] text-white/40">
        <span>{ticker ?? "—"} / USDC</span>
        <span>
          H {max.toFixed(4)} · L {min.toFixed(4)}
        </span>
      </div>
    </div>
  );
}
