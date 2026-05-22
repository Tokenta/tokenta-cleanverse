import { priceSeries } from "./tokenta-data";

export function PriceChart() {
  const w = 100;
  const h = 100;
  const min = Math.min(...priceSeries);
  const max = Math.max(...priceSeries);
  const range = max - min || 1;
  const step = w / (priceSeries.length - 1);

  const points = priceSeries
    .map((p, i) => `${i * step},${h - ((p - min) / range) * h * 0.9 - 5}`)
    .join(" ");

  const areaPath = `M0,${h} L${points
    .split(" ")
    .map((pt) => pt)
    .join(" L")} L${w},${h} Z`;

  return (
    <div className="relative w-full h-full bg-black border border-white/10">
      <div className="absolute inset-0 grid grid-cols-6 grid-rows-4 pointer-events-none">
        {Array.from({ length: 24 }).map((_, i) => (
          <div key={i} className="border-r border-b border-white/5" />
        ))}
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
        <path d={areaPath} fill="white" fillOpacity="0.08" />
        <polyline points={points} fill="none" stroke="white" strokeWidth="0.4" vectorEffect="non-scaling-stroke" />
      </svg>
      <div className="absolute top-2 left-2 right-2 flex justify-between text-[10px] text-white/40 font-mono">
        <span>GPT4-CMP / USDC · 1H</span>
        <span>H {max.toFixed(4)} · L {min.toFixed(4)}</span>
      </div>
      <div className="absolute bottom-2 left-2 right-2 flex justify-between text-[10px] text-white/40 font-mono">
        <span>15:42</span><span>16:00</span><span>16:20</span><span>16:42</span>
      </div>
    </div>
  );
}
