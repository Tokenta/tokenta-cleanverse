import { CheckCircle2, Circle, Trophy, ChevronRight, TrendingUp } from "lucide-react";
import { deriveXpFromScore, type XpInput } from "../lib/reputation-xp";

/**
 * Primary reputation status card shown at the top of the left column in the
 * Reputation view. Replaces the static "UNVERIFIED" status with a motivating
 * level badge, XP progress bar, completed/pending milestones, and a CTA to
 * open the leaderboard modal.
 */
export function ReputationLevelCard({
  xpInput,
  live,
  onOpenLeaderboard,
}: {
  xpInput: XpInput;
  live: boolean;
  onOpenLeaderboard: () => void;
}) {
  const xp = deriveXpFromScore(xpInput);
  const { currentLevel, nextLevel, progressFraction, totalXp, xpToNextLevel } = xp;

  const progressPct = Math.round(progressFraction * 100);

  return (
    <div className="border border-white/15 p-3 text-[11px] space-y-3 font-mono">
      {/* Header */}
      <div className="flex items-center justify-between text-[9px] tracking-[0.22em] text-white/40">
        <span>TOKENTA REPUTATION</span>
        <span>{live ? "LIVE" : "—"}</span>
      </div>

      {/* Level badge */}
      <div className="flex items-end gap-2">
        <div className="flex flex-col leading-none">
          <span className="text-[9px] tracking-[0.2em] text-white/40">LEVEL</span>
          <span className="text-[42px] font-medium tracking-tighter tabular-nums text-white leading-none mt-0.5">
            {currentLevel.level}
          </span>
        </div>
        <div className="pb-1 flex flex-col gap-0.5">
          <span className="text-[13px] tracking-[0.12em] text-white font-medium">
            {currentLevel.title.toUpperCase()}
          </span>
          <span className="text-[9px] tracking-[0.14em] text-white/45">
            {totalXp.toLocaleString()} XP TOTAL
          </span>
        </div>
      </div>

      {/* XP progress bar */}
      <div>
        <div className="flex items-center justify-between text-[9px] tracking-[0.14em] mb-1">
          <span className="text-white/40">
            {nextLevel ? `TO ${nextLevel.title.toUpperCase()}` : "MAX LEVEL"}
          </span>
          <span className="text-white/60 tabular-nums">
            {nextLevel ? `${xpToNextLevel?.toLocaleString()} XP left` : "MAXED"}
          </span>
        </div>
        <div className="h-1.5 bg-white/10 w-full">
          <div
            className="h-full bg-white transition-all duration-700"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between text-[8px] text-white/30 mt-0.5 tabular-nums">
          <span>{currentLevel.xpMin.toLocaleString()}</span>
          <span>{nextLevel ? nextLevel.xpMin.toLocaleString() : "—"}</span>
        </div>
      </div>

      {/* Milestones */}
      <MilestoneList xp={xp} />

      {/* Leaderboard CTA */}
      <button
        type="button"
        onClick={onOpenLeaderboard}
        className="w-full flex items-center justify-between border border-white/25 px-2.5 py-1.5 hover:bg-white/[0.06] transition-colors"
      >
        <div className="flex items-center gap-1.5 text-[9px] tracking-[0.18em] text-white/70">
          <Trophy className="h-3 w-3" />
          VIEW LEADERBOARD
        </div>
        <ChevronRight className="h-3 w-3 text-white/40" />
      </button>
    </div>
  );
}

function MilestoneList({ xp }: { xp: ReturnType<typeof deriveXpFromScore> }) {
  // Show at most 3 completed + 3 pending to keep the card compact
  const toShow = [
    ...xp.completedMilestones.slice(-3),
    ...xp.pendingMilestones.slice(0, 3),
  ];

  return (
    <div className="space-y-1">
      <div className="text-[9px] tracking-[0.2em] text-white/40 mb-1">
        MILESTONES · {xp.completedMilestones.length}/{xp.completedMilestones.length + xp.pendingMilestones.length}
      </div>
      {toShow.map((m) => {
        const done = xp.completedMilestones.includes(m);
        return (
          <div key={m.id} className="flex items-start gap-1.5">
            {done ? (
              <CheckCircle2 className="h-3 w-3 shrink-0 text-white mt-px" />
            ) : (
              <Circle className="h-3 w-3 shrink-0 text-white/25 mt-px" />
            )}
            <span className={done ? "text-white/70" : "text-white/35"}>
              {m.label}
            </span>
            {!done && (
              <span className="ml-auto shrink-0 text-[8px] text-white/30 tabular-nums">
                +{m.xpReward} XP
              </span>
            )}
          </div>
        );
      })}
      {xp.pendingMilestones.length > 3 && (
        <div className="text-[8px] text-white/30 tracking-[0.1em] pl-4">
          +{xp.pendingMilestones.length - 3} more to unlock
        </div>
      )}
    </div>
  );
}

/**
 * Compact variant used in the Trust Vector panel header — shows level + XP
 * inline without the full milestones list. Used as a quick status reference
 * when space is limited.
 */
export function ReputationLevelBadge({
  xpInput,
}: {
  xpInput: XpInput;
}) {
  const { currentLevel, totalXp, progressFraction } = deriveXpFromScore(xpInput);
  const pct = Math.round(progressFraction * 100);

  return (
    <div className="flex items-center gap-2 text-[10px]">
      <TrendingUp className="h-3 w-3 text-white/60" />
      <span className="tracking-[0.14em] text-white">
        {currentLevel.badge} · {currentLevel.title.toUpperCase()}
      </span>
      <span className="text-white/40 tabular-nums">{totalXp.toLocaleString()} XP</span>
      <div className="flex-1 h-0.5 bg-white/10 max-w-[48px]">
        <div className="h-full bg-white" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
