import { useMemo } from "react";
import {
  AI_PROVIDER_OPTIONS,
  getProviderOption,
  type AiProviderOption,
} from "../providers/ai-provider-catalog";

export function AiProviderSelect({
  value,
  onChange,
  compatibleBaseUrl,
  onCompatibleBaseUrlChange,
  claimedModel,
  onClaimedModelChange,
  showModelField = false,
  className = "",
}: {
  value: string;
  onChange: (slug: string) => void;
  compatibleBaseUrl?: string;
  onCompatibleBaseUrlChange?: (url: string) => void;
  claimedModel?: string;
  onClaimedModelChange?: (model: string) => void;
  showModelField?: boolean;
  className?: string;
}) {
  const selected = useMemo(() => getProviderOption(value), [value]);
  const groups = useMemo(() => groupProviders(AI_PROVIDER_OPTIONS), []);

  return (
    <div className={`space-y-2 ${className}`.trim()}>
      <div>
        <div className="mb-1.5 text-[9px] tracking-[0.2em] text-white/40">API PROVIDER</div>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full border border-white/20 bg-black px-2 py-2 text-[11px] outline-none focus:border-white"
        >
          {groups.map(([label, items]) => (
            <optgroup key={label} label={label}>
              {items.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>

      {selected.hint && (
        <p className="text-[10px] leading-relaxed text-white/45">{selected.hint}</p>
      )}

      {selected.requiresBaseUrl && onCompatibleBaseUrlChange && (
        <div>
          <div className="mb-1.5 text-[9px] tracking-[0.2em] text-white/40">GATEWAY BASE URL</div>
          <input
            type="url"
            value={compatibleBaseUrl ?? ""}
            onChange={(e) => onCompatibleBaseUrlChange(e.target.value)}
            placeholder="https://your-gateway.example"
            className="w-full border border-white/20 bg-black px-2 py-2 text-[11px] outline-none focus:border-white placeholder:text-white/25"
          />
        </div>
      )}

      {showModelField && onClaimedModelChange && (
        <div>
          <div className="mb-1.5 text-[9px] tracking-[0.2em] text-white/40">DEFAULT MODEL</div>
          <input
            type="text"
            value={claimedModel ?? selected.defaultModel}
            onChange={(e) => onClaimedModelChange(e.target.value)}
            className="w-full border border-white/20 bg-black px-2 py-2 text-[11px] outline-none focus:border-white"
          />
        </div>
      )}
    </div>
  );
}

function groupProviders(options: AiProviderOption[]): [string, AiProviderOption[]][] {
  const gateways = options.filter((p) => p.requiresBaseUrl);
  const global = options.filter(
    (p) => (p.region === "global" || p.region === "both") && !p.requiresBaseUrl,
  );
  const cn = options.filter((p) => p.region === "cn" && !p.requiresBaseUrl);
  return [
    ["Global providers", global],
    ["China / APAC providers", cn],
    ["Gateways & custom", gateways],
  ].filter(([, items]) => items.length > 0) as [string, AiProviderOption[]][];
}
