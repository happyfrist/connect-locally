import type { Doc } from "../_generated/dataModel";
import { AVAILABILITY, BUDGETS, GROUP_SIZES } from "./catalog";

type Profile = Doc<"profiles">;

export type MatchResult = {
  /** 0–100, deliberately readable rather than a mysterious “compatibility”. */
  score: number;
  sharedInterests: string[];
  sharedActivities: string[];
  sharedAvailability: string[];
  reasons: string[];
};

const WEIGHTS = {
  interests: 0.25,
  activities: 0.2,
  schedule: 0.2,
  area: 0.15,
  budget: 0.1,
  group: 0.1,
} as const;

function overlap(a: string[], b: string[]): string[] {
  const set = new Set(b);
  return a.filter((value) => set.has(value));
}

function ratio(shared: string[], a: string[], b: string[]): number {
  const denominator = Math.min(a.length, b.length);
  if (denominator === 0) return 0;
  return Math.min(1, shared.length / denominator);
}

function budgetCompatibility(a: string, b: string): number {
  if (a === b) return 1;
  const pair = [a, b].sort().join("-");
  if (pair === "flexible-low") return 0.6;
  if (pair === "free-low") return 0.3;
  return 0.15;
}

function groupCompatibility(a: string, b: string): number {
  if (a === b) return 1;
  const pair = [a, b].sort().join("-");
  if (pair === "one-small") return 0.6;
  if (pair === "large-small") return 0.4;
  return 0.2;
}

function labelFor(list: readonly { key: string; label: string }[], key: string) {
  return list.find((item) => item.key === key)?.label ?? key;
}

/**
 * Deterministic, explainable matching. No appearance, no inferred sensitive
 * attributes, no model. Weights are a starting hypothesis, documented in
 * ARCHITECTURE.md, and can be changed in one place.
 */
export function scoreMatch(me: Profile, other: Profile): MatchResult {
  const sharedInterests = overlap(me.interests, other.interests);
  const sharedActivities = overlap(me.activities, other.activities);
  const sharedAvailability = overlap(me.availability, other.availability);
  const sameArea =
    me.area.trim().toLowerCase() === other.area.trim().toLowerCase() &&
    me.area.trim().length > 0;

  const interestScore = ratio(sharedInterests, me.interests, other.interests);
  const activityScore = ratio(sharedActivities, me.activities, other.activities);
  const scheduleScore = ratio(
    sharedAvailability,
    me.availability,
    other.availability,
  );
  const areaScore = sameArea ? 1 : 0.45; // same city is already required
  const budgetScore = budgetCompatibility(me.budget, other.budget);
  const groupScore = groupCompatibility(me.groupSize, other.groupSize);

  const score =
    interestScore * WEIGHTS.interests +
    activityScore * WEIGHTS.activities +
    scheduleScore * WEIGHTS.schedule +
    areaScore * WEIGHTS.area +
    budgetScore * WEIGHTS.budget +
    groupScore * WEIGHTS.group;

  const reasons: string[] = [];
  if (sharedActivities.length > 0) {
    reasons.push(`Both into ${sharedActivities.slice(0, 2).join(" and ").toLowerCase()}`);
  }
  if (sharedAvailability.length > 0) {
    reasons.push(
      `Also free on ${sharedAvailability
        .slice(0, 2)
        .map((key) => labelFor(AVAILABILITY, key).toLowerCase())
        .join(" and ")}`,
    );
  }
  if (sameArea) {
    reasons.push(`Both around ${other.area}`);
  }
  if (me.groupSize === other.groupSize) {
    reasons.push(`Same preference: ${labelFor(GROUP_SIZES, other.groupSize)}`);
  }
  if (me.budget === other.budget) {
    reasons.push(`Similar budget: ${labelFor(BUDGETS, other.budget)}`);
  }
  if (reasons.length < 2 && sharedInterests.length > 1) {
    reasons.push(
      `Shared interests: ${sharedInterests.slice(0, 2).join(", ")}`,
    );
  }
  if (reasons.length === 0) {
    reasons.push(`Both in ${other.city} and looking to meet people`);
  }

  return {
    score: Math.min(99, Math.round(score * 100)),
    sharedInterests,
    sharedActivities,
    sharedAvailability,
    reasons: reasons.slice(0, 3),
  };
}
