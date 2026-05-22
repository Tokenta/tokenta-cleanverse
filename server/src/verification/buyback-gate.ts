/** Mechanism §6.3 / §9 — buyback strict OVERCLAIMED handling */

import type { JobContext } from "../types/verification.js";
import type { ScoreResult } from "./asset-scorer.js";

export function applyBuybackStrictGate(scores: ScoreResult, context: JobContext): ScoreResult {
  if (context !== "TOKENTA_BUYBACK") return scores;
  if (scores.declaredAlignment !== "OVERCLAIMED") return scores;

  if (scores.confidence === "HIGH") {
    return { ...scores, terminalOutcome: "FAIL" };
  }
  if (scores.confidence === "MEDIUM") {
    return { ...scores, terminalOutcome: "REVIEW" };
  }
  return { ...scores, terminalOutcome: "DEGRADED" };
}

export function buybackFailureFromScores(
  scores: ScoreResult,
  context: JobContext,
): { code?: string; message?: string } {
  if (context !== "TOKENTA_BUYBACK" || scores.declaredAlignment !== "OVERCLAIMED") {
    return {};
  }
  if (scores.terminalOutcome === "FAIL") {
    return {
      code: "QUANTITY_MISMATCH",
      message: "Declared quantity exceeds inferred executable capacity band",
    };
  }
  return {};
}
