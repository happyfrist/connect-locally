import { describe, expect, test } from "bun:test";
import {
  checkInState,
  demoSeedEnabled,
  guestDemoEnabled,
  rateLimitBucket,
  reconnectState,
} from "../src/convex/lib/policy";

const MIN = 60_000;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;

describe("check-in window", () => {
  const startsAt = 1_800_000_000_000;
  const durationMins = 90;

  test("opens 30 minutes before the plan and closes 24 hours after it ends", () => {
    expect(checkInState(startsAt, durationMins, startsAt - 31 * MIN)).toBe("before");
    expect(checkInState(startsAt, durationMins, startsAt - 30 * MIN)).toBe("open");
    expect(checkInState(startsAt, durationMins, startsAt + 90 * MIN)).toBe("open");
    expect(
      checkInState(startsAt, durationMins, startsAt + 90 * MIN + 24 * HOUR),
    ).toBe("open");
    expect(
      checkInState(startsAt, durationMins, startsAt + 90 * MIN + 24 * HOUR + 1),
    ).toBe("closed");
  });
});

describe("reconnection window", () => {
  const startsAt = 1_800_000_000_000;
  const durationMins = 60;

  test("opens only after the plan has ended", () => {
    expect(reconnectState(startsAt, durationMins, "open", startsAt - MIN)).toBe(
      "before",
    );
    expect(
      reconnectState(startsAt, durationMins, "open", startsAt + 59 * MIN),
    ).toBe("before");
    expect(
      reconnectState(startsAt, durationMins, "open", startsAt + 60 * MIN),
    ).toBe("open");
  });

  test("is never available for a cancelled plan", () => {
    expect(
      reconnectState(startsAt, durationMins, "cancelled", startsAt + 2 * HOUR),
    ).toBe("closed");
  });

  test("closes after fourteen days", () => {
    const opensAt = startsAt + 60 * MIN;
    expect(reconnectState(startsAt, durationMins, "open", opensAt + 14 * DAY)).toBe(
      "open",
    );
    expect(
      reconnectState(startsAt, durationMins, "open", opensAt + 14 * DAY + 1),
    ).toBe("closed");
  });
});

describe("rate-limit buckets", () => {
  test("are stable inside a window and change at the boundary", () => {
    const now = 1_800_000_000_123;
    const first = rateLimitBucket("activity:create:user", now, HOUR);
    const same = rateLimitBucket("activity:create:user", now + 10 * MIN, HOUR);
    const next = rateLimitBucket("activity:create:user", now + HOUR, HOUR);
    expect(first.bucket).toBe(same.bucket);
    expect(next.bucket).not.toBe(first.bucket);
  });
});

describe("demo environment gates", () => {
  test("seeding is disabled unless explicitly opted in", () => {
    expect(demoSeedEnabled({})).toBe(false);
    expect(demoSeedEnabled({ ALLOW_DEMO_SEED: "false" })).toBe(false);
    expect(demoSeedEnabled({ ALLOW_DEMO_SEED: "true" })).toBe(true);
  });

  test("anonymous guest access is disabled unless explicitly opted in", () => {
    expect(guestDemoEnabled({})).toBe(false);
    expect(guestDemoEnabled({ ALLOW_GUEST_DEMO: "true" })).toBe(true);
  });
});
