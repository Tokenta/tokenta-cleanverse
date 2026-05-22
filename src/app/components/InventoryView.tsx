import { platformInventoryKeys } from "./tokenta-data";
import { useAuth } from "../auth/AuthContext";

function Panel({
  title,
  code,
  children,
  className = "",
}: {
  title: string;
  code?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`border border-white/15 bg-black flex flex-col min-h-0 ${className}`}>
      <header className="flex items-center justify-between border-b border-white/15 px-3 py-1.5">
        <div className="flex items-center gap-2 uppercase tracking-[0.18em] text-white/70 text-[11px]">
          {code && <span className="text-white/30">{code}</span>}
          <span>{title}</span>
        </div>
      </header>
      <div className="flex-1 min-h-0 overflow-auto">{children}</div>
    </section>
  );
}

export function InventoryView({ onCreateListing }: { onCreateListing?: () => void }) {
  const { requireAuth } = useAuth();

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-white/15 px-4 py-2 text-[11px] text-white/50">
        F8 Inventory Control — virtual ledger for fragmented API keys. Platform mode only.
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-12">
        <div className="col-span-8 border-r border-white/15">
          <Panel title="Virtual Inventory Ledger" code="F8.1">
            <table className="w-full text-[11px]">
              <thead className="sticky top-0 border-b border-white/15 bg-black text-white/40">
                <tr className="tracking-[0.12em]">
                  {["KEY ID", "PROVIDER", "ORIG QTY", "REMAINING", "PURCHASE", "COST", "STATUS", "ACTIONS"].map((h) => (
                    <th key={h} className="px-2 py-1.5 text-left font-normal">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {platformInventoryKeys.map((k) => (
                  <tr key={k.keyId} className="border-b border-white/5 hover:bg-white/5">
                    <td className="px-2 py-2 tracking-[0.1em]">{k.keyId}</td>
                    <td className="px-2 py-2">{k.provider}</td>
                    <td className="px-2 py-2 tabular-nums">{k.originalQty}</td>
                    <td className="px-2 py-2 tabular-nums">{k.remaining}</td>
                    <td className="px-2 py-2 tabular-nums text-white/60">{k.purchaseDate}</td>
                    <td className="px-2 py-2 tabular-nums">{k.costBasis}</td>
                    <td className="px-2 py-2">
                      <span
                        className={`border px-1 text-[9px] tracking-[0.14em] ${
                          k.status === "RETIRED" ? "border-white/20 text-white/40" : "border-white/40"
                        }`}
                      >
                        {k.status}
                      </span>
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-1">
                        {(["SPLIT", "ALLOCATE", "RETIRE"] as const).map((a) => (
                          <button
                            key={a}
                            type="button"
                            className="border border-white/30 px-1.5 py-0.5 text-[8px] tracking-[0.12em] hover:bg-white hover:text-black"
                          >
                            {a}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Panel>
        </div>
        <div className="col-span-4 flex flex-col">
          <Panel title="Inventory Metrics" code="F8.2">
            <div className="grid grid-cols-1 gap-px bg-white/10 p-px text-[11px]">
              {[
                ["TOTAL VALUE (COST)", "$84.00"],
                ["MARKET VALUE", "$112.40"],
                ["UTILIZATION", "62%"],
                ["IDLE KEYS", "2"],
                ["AVG HOLD (DAYS)", "11"],
                ["MARGIN 30D", "+18.2%"],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between bg-black px-3 py-2">
                  <span className="text-white/40 tracking-[0.14em]">{k}</span>
                  <span className="tabular-nums">{v}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Panel title="Aggregated SKU · Live" code="F8.3" className="border-t-0 flex-1">
            <div className="p-3 text-[11px] leading-relaxed text-white/60 space-y-2">
              <p>
                Virtual SKU: <span className="text-white">200k OpenAI GPT-4 Tokens (Proxy Access)</span>
              </p>
              <p>Backend rotates across keys #A1B2, #E5F6 via proxy gateway. Buyer receives single platform-issued key.</p>
              <button
                type="button"
                onClick={() => {
                  if (!requireAuth("Creating platform inventory listings")) return;
                  onCreateListing?.();
                }}
                className="w-full border border-white bg-white py-2 text-[10px] tracking-[0.2em] text-black mt-2 hover:bg-white/90"
              >
                CREATE AGGREGATED LISTING
              </button>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
