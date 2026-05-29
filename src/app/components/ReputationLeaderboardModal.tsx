import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CheckCircle2, Circle, Trophy, X } from "lucide-react";
import {
  buildMockLeaderboard,
  deriveXpFromScore,
  type XpInput,
} from "../lib/reputation-xp";
import { Tag } from "../ui-primitives";

type Tab = "LEADERBOARD" | "PROGRESS";

export function ReputationLeaderboardModal({
  open,
  onClose,
  xpInput,
  tier,
  compositeDisplay,
  nextMilestone,
}: {
  open: boolean;
  onClose: () => void;
  xpInput: XpInput;
  tier?: string;
  compositeDisplay?: string;
  nextMilestone?: string;
}) {
  const [tab, setTab] = useState<Tab>("LEADERBOARD");
  const xp = useMemo(() => deriveXpFromScore(xpInput), [xpInput]);
  const rows = useMemo(
    () => buildMockLeaderboard(xp.totalXp, tier ?? "NONE"),
    [xp.totalXp, tier],
  );

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 font-mono">
          <motion.div
            className="absolute inset-0 bg-black/92"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-3xl flex-col border border-white/30 bg-black text-white"
            initial={{ opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.97 }}
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex shrink-0 items-center justify-between border-b border-white/15 px-4 py-2">
              <div className="flex items-center gap-2 text-[11px] tracking-[0.18em] uppercase text-white/70">
                <Trophy className="h-3.5 w-3.5" />
                <span className="text-white/30">F6.0 ·</span> REPUTATION LEADERBOARD
              </div>
              <button
                type="button"
                onClick={onClose}
                className="border border-white/30 p-1 text-white/60 hover:bg-white hover:text-black transition-colors"
                aria-label="Close"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </header>

            <div className="flex shrink-0 gap-1 border-b border-white/15 px-4 py-2">
              {(
                [
                  ["LEADERBOARD", "LEADERBOARD"],
                  ["PROGRESS", "MY PROGRESS"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setTab(key)}
                  className={`border px-3 py-1 text-[10px] tracking-[0.16em] transition-colors ${
                    tab === key
                      ? "border-white bg-white text-black"
                      : "border-white/25 text-white/50 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto">
              {tab === "LEADERBOARD" ? (
                <div className="p-4">
                  <p className="mb-3 text-[10px] leading-relaxed text-white/50">
                    Top sellers ranked by proof-weighted XP. Complete verifications, anchor receipts,
                    and close sales to climb the board.
                  </p>
                  <table className="w-full text-[11px]">
                    <thead className="border-b border-white/15 text-white/40">
                      <tr>
                        {["RANK", "SELLER", "TIER", "COMPOSITE", "XP", "VERIFIED RUNS"].map((h) => (
                          <th key={h} className="px-2 py-1.5 text-left font-normal tracking-[0.14em]">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => (
                        <tr
                          key={row.handle}
                          className={`border-b border-white/5 ${
                            row.isCurrentUser ? "bg-white/[0.06]" : "hover:bg-white/[0.03]"
                          }`}
                        >
                          <td className="px-2 py-2 tabular-nums">#{row.rank}</td>
                          <td className="px-2 py-2 tracking-[0.1em]">
                            {row.handle}
                            {row.isCurrentUser && (
                              <span className="ml-1.5 text-[9px] text-white/40">YOU</span>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            <Tag tone={row.tier === "S" || row.tier === "A" ? "default" : "mute"}>
                              {row.tier}
                            </Tag>
                          </td>
                          <td className="px-2 py-2 tabular-nums">
                            {row.isCurrentUser ? compositeDisplay ?? "--" : row.compositeScore}
                          </td>
                          <td className="px-2 py-2 tabular-nums">{row.totalXp.toLocaleString()}</td>
                          <td className="px-2 py-2 tabular-nums">
                            {row.isCurrentUser ? xpInput.verifiedRuns : row.verifiedRuns}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="space-y-4 p-4">
                  <div className="grid grid-cols-2 gap-px bg-white/10 text-[11px] sm:grid-cols-4">
                    {[
                      ["VERIFICATIONS", xp.breakdown.fromVerifications],
                      ["RECEIPTS", xp.breakdown.fromReceipts],
                      ["COMPOSITE", xp.breakdown.fromComposite],
                      ["MILESTONES", xp.breakdown.fromMilestones],
                    ].map(([label, value]) => (
                      <div key={label} className="bg-black px-3 py-2">
                        <div className="text-[9px] tracking-[0.18em] text-white/40">{label}</div>
                        <div className="mt-0.5 tabular-nums text-white">
                          +{(value as number).toLocaleString()} XP
                        </div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="mb-2 text-[9px] tracking-[0.2em] text-white/40">LEVEL PROGRESS</div>
                    <div className="flex items-end gap-2">
                      <span className="text-[32px] font-medium tabular-nums leading-none">
                        {xp.currentLevel.level}
                      </span>
                      <span className="pb-1 text-[12px] tracking-[0.12em] text-white">
                        {xp.currentLevel.title.toUpperCase()}
                      </span>
                      <span className="pb-1 ml-auto text-[10px] tabular-nums text-white/50">
                        {xp.totalXp.toLocaleString()} XP total
                      </span>
                    </div>
                    <div className="mt-2 h-1.5 bg-white/10">
                      <div
                        className="h-full bg-white"
                        style={{ width: `${Math.round(xp.progressFraction * 100)}%` }}
                      />
                    </div>
                    {xp.nextLevel && (
                      <div className="mt-1 text-[10px] text-white/45">
                        {xp.xpToNextLevel?.toLocaleString()} XP to reach {xp.nextLevel.title}
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="mb-2 text-[9px] tracking-[0.2em] text-white/40">
                      MILESTONE CHECKLIST
                    </div>
                    <div className="space-y-1.5">
                      {xp.pendingMilestones.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-start gap-2 border border-white/10 px-3 py-2 text-[10px]"
                        >
                          <Circle className="mt-px h-3 w-3 shrink-0 text-white/25" />
                          <span className="flex-1 text-white/70">{m.label}</span>
                          <span className="shrink-0 tabular-nums text-white/40">+{m.xpReward} XP</span>
                        </div>
                      ))}
                      {xp.completedMilestones.map((m) => (
                        <div
                          key={m.id}
                          className="flex items-start gap-2 border border-white/10 bg-white/[0.03] px-3 py-2 text-[10px]"
                        >
                          <CheckCircle2 className="mt-px h-3 w-3 shrink-0 text-white" />
                          <span className="flex-1 text-white/55 line-through decoration-white/20">
                            {m.label}
                          </span>
                          <span className="shrink-0 tabular-nums text-white/35">+{m.xpReward} XP</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {nextMilestone && (
                    <div className="border border-white/15 px-3 py-2 text-[10px] text-white/55">
                      <span className="text-[9px] tracking-[0.18em] text-white/40">NEXT API MILESTONE · </span>
                      {nextMilestone}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
