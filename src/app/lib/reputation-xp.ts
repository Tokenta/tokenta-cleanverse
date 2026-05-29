/**
 * Reputation XP & Level system.
 *
 * XP is derived entirely from fields already returned by the reputation API —
 * no new backend endpoint is required. The formulas intentionally over-weight
 * early activity (verifiedRuns, anchoredReceipts) so new sellers feel progress
 * immediately, even before composite score builds up.
 */

export interface ReputationLevel {
  level: number;
  title: string;
  /** Minimum total XP to reach this level. */
  xpMin: number;
  /** Minimum XP to reach the NEXT level (undefined for max level). */
  xpMax: number | undefined;
  /** Short badge abbreviation shown in UI (e.g. "LV 2"). */
  badge: string;
}

export const LEVELS: ReputationLevel[] = [
  { level: 1, title: "Newcomer",       xpMin: 0,    xpMax: 300,   badge: "LV 1" },
  { level: 2, title: "Contributor",    xpMin: 300,  xpMax: 800,   badge: "LV 2" },
  { level: 3, title: "Verified Trader",xpMin: 800,  xpMax: 2000,  badge: "LV 3" },
  { level: 4, title: "Trusted Partner",xpMin: 2000, xpMax: 5000,  badge: "LV 4" },
  { level: 5, title: "Elite Seller",   xpMin: 5000, xpMax: undefined, badge: "LV 5" },
];

export interface MilestoneDefinition {
  id: string;
  label: string;
  /** XP awarded when this milestone is first completed. */
  xpReward: number;
  /** Returns true when the user's current state has satisfied this milestone. */
  isCompleted: (input: XpInput) => boolean;
}

export interface XpInput {
  verifiedRuns: number;
  anchoredReceipts: number;
  /** Nullable composite score 0–100 (null = UNVERIFIED). */
  composite: number | null;
  /** Number of completed orders (optional, 0 if not provided). */
  completedOrders?: number;
  /** Whether the user has at least one LIVE listing (optional). */
  hasActiveListing?: boolean;
}

export interface XpBreakdown {
  fromVerifications: number;
  fromReceipts: number;
  fromComposite: number;
  fromMilestones: number;
  total: number;
}

export interface DerivedXpResult {
  totalXp: number;
  breakdown: XpBreakdown;
  currentLevel: ReputationLevel;
  nextLevel: ReputationLevel | null;
  /** Progress [0–1] toward the next level threshold. */
  progressFraction: number;
  xpToNextLevel: number | null;
  completedMilestones: MilestoneDefinition[];
  pendingMilestones: MilestoneDefinition[];
}

export const MILESTONES: MilestoneDefinition[] = [
  {
    id: "first_verify",
    label: "First Verification",
    xpReward: 120,
    isCompleted: (i) => i.verifiedRuns >= 1,
  },
  {
    id: "three_verifies",
    label: "3 Verifications Completed",
    xpReward: 200,
    isCompleted: (i) => i.verifiedRuns >= 3,
  },
  {
    id: "first_receipt",
    label: "First Anchored Receipt",
    xpReward: 80,
    isCompleted: (i) => i.anchoredReceipts >= 1,
  },
  {
    id: "first_listing",
    label: "First Active Listing",
    xpReward: 200,
    isCompleted: (i) => i.hasActiveListing === true,
  },
  {
    id: "first_sale",
    label: "First Completed Sale",
    xpReward: 300,
    isCompleted: (i) => (i.completedOrders ?? 0) >= 1,
  },
  {
    id: "five_sales",
    label: "5 Completed Sales",
    xpReward: 500,
    isCompleted: (i) => (i.completedOrders ?? 0) >= 5,
  },
  {
    id: "composite_50",
    label: "Composite Score 50+",
    xpReward: 300,
    isCompleted: (i) => (i.composite ?? 0) >= 50,
  },
  {
    id: "composite_80",
    label: "Composite Score 80+",
    xpReward: 600,
    isCompleted: (i) => (i.composite ?? 0) >= 80,
  },
];

/** Derives total XP and level from existing API data fields. */
export function deriveXpFromScore(input: XpInput): DerivedXpResult {
  const fromVerifications = input.verifiedRuns * 120;
  const fromReceipts = input.anchoredReceipts * 60;
  const fromComposite = Math.round((input.composite ?? 0) * 5);

  const completed = MILESTONES.filter((m) => m.isCompleted(input));
  const pending = MILESTONES.filter((m) => !m.isCompleted(input));
  const fromMilestones = completed.reduce((acc, m) => acc + m.xpReward, 0);

  const total = fromVerifications + fromReceipts + fromComposite + fromMilestones;

  // Find current level (last level whose xpMin <= total)
  const currentLevel =
    [...LEVELS].reverse().find((l) => total >= l.xpMin) ?? LEVELS[0]!;

  const nextLevel =
    currentLevel.level < LEVELS.length
      ? (LEVELS.find((l) => l.level === currentLevel.level + 1) ?? null)
      : null;

  const xpToNextLevel = nextLevel ? nextLevel.xpMin - total : null;
  const levelRange = nextLevel
    ? nextLevel.xpMin - currentLevel.xpMin
    : undefined;
  const progressFraction = levelRange
    ? Math.min(1, (total - currentLevel.xpMin) / levelRange)
    : 1;

  return {
    totalXp: total,
    breakdown: { fromVerifications, fromReceipts, fromComposite, fromMilestones },
    currentLevel,
    nextLevel,
    progressFraction,
    xpToNextLevel,
    completedMilestones: completed,
    pendingMilestones: pending,
  };
}

/** Generates mock peer leaderboard rows for the MVP UI. */
export interface LeaderboardRow {
  rank: number;
  handle: string;
  tier: string;
  compositeScore: number;
  totalXp: number;
  verifiedRuns: number;
  isCurrentUser?: boolean;
}

export function buildMockLeaderboard(currentUserXp: number, currentUserTier: string): LeaderboardRow[] {
  const peers: Omit<LeaderboardRow, "rank">[] = [
    { handle: "0x3f…a1c2", tier: "S", compositeScore: 97, totalXp: 9240, verifiedRuns: 52 },
    { handle: "0x7b…e45f", tier: "A", compositeScore: 84, totalXp: 6180, verifiedRuns: 38 },
    { handle: "0x12…d993", tier: "A", compositeScore: 81, totalXp: 5720, verifiedRuns: 33 },
    { handle: "0xcc…0f1a", tier: "B", compositeScore: 74, totalXp: 4050, verifiedRuns: 24 },
    { handle: "0x99…b3e7", tier: "B", compositeScore: 71, totalXp: 3640, verifiedRuns: 20 },
    { handle: "0x44…7c22", tier: "C", compositeScore: 62, totalXp: 2810, verifiedRuns: 15 },
    { handle: "0x0a…f518", tier: "C", compositeScore: 58, totalXp: 2340, verifiedRuns: 12 },
    { handle: "You",       tier: currentUserTier, compositeScore: 0,  totalXp: currentUserXp, verifiedRuns: 0, isCurrentUser: true },
  ];

  // Sort by XP descending, assign ranks
  const sorted = [...peers].sort((a, b) => b.totalXp - a.totalXp);
  return sorted.map((row, i) => ({ ...row, rank: i + 1 }));
}
