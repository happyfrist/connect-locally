/**
 * Pure policy helpers shared by Convex functions and unit tests.
 * Keep this module free of Convex/database imports.
 */

export const CHECK_IN_OPENS_BEFORE_MS = 30 * 60_000;
export const CHECK_IN_CLOSES_AFTER_MS = 24 * 60 * 60_000;
export const RECONNECT_OPENS_AFTER_MS = 0;
export const RECONNECT_CLOSES_AFTER_MS = 14 * 24 * 60 * 60_000;

export type CheckInState = "before" | "open" | "closed";

/** Check-in is a narrow window around the scheduled meeting, not an open switch. */
export function checkInState(
  startsAt: number,
  durationMins: number,
  now: number,
): CheckInState {
  const opensAt = startsAt - CHECK_IN_OPENS_BEFORE_MS;
  const closesAt = startsAt + durationMins * 60_000 + CHECK_IN_CLOSES_AFTER_MS;
  if (now < opensAt) return "before";
  if (now > closesAt) return "closed";
  return "open";
}

export type ReconnectState = "before" | "open" | "closed";

/**
 * Reconnection opens once the plan has finished and closes after a fortnight.
 * It is never available for a cancelled plan.
 */
export function reconnectState(
  startsAt: number,
  durationMins: number,
  status: "open" | "cancelled",
  now: number,
): ReconnectState {
  if (status === "cancelled") return "closed";
  const opensAt = startsAt + durationMins * 60_000 + RECONNECT_OPENS_AFTER_MS;
  const closesAt = opensAt + RECONNECT_CLOSES_AFTER_MS;
  if (now < opensAt) return "before";
  if (now > closesAt) return "closed";
  return "open";
}

/** Fixed-window rate-limit bucket. Window boundaries are deterministic. */
export function rateLimitBucket(key: string, now: number, windowMs: number) {
  const windowStart = Math.floor(now / windowMs) * windowMs;
  return { bucket: `${key}:${windowStart}`, windowStart };
}

/** Demo content must be opt-in at the deployment level, never on by default. */
export function demoSeedEnabled(env: Record<string, string | undefined>) {
  return env.ALLOW_DEMO_SEED === "true";
}

/**
 * Anonymous guest accounts bypass email verification, so they may only take
 * part in a deliberately labelled demo deployment. Production defaults to off.
 */
export function guestDemoEnabled(env: Record<string, string | undefined>) {
  return env.ALLOW_GUEST_DEMO === "true";
}
