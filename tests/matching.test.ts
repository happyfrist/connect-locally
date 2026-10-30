import { describe, expect, test } from "bun:test";
import { scoreMatch } from "../src/convex/lib/matching";

type Profile = Parameters<typeof scoreMatch>[0];

function profile(overrides: Partial<Record<keyof Profile, unknown>> = {}): Profile {
  return {
    _id: "profile",
    _creationTime: 0,
    userId: "user",
    displayName: "Test member",
    ageConfirmed: true,
    city: "Bengaluru",
    area: "Indiranagar",
    bio: "",
    languages: ["English"],
    interests: ["fitness", "exploration"],
    activities: ["Morning run", "Café outing"],
    availability: ["weekend-mornings"],
    groupSize: "small",
    budget: "low",
    comfort: "balanced",
    onboardingComplete: true,
    ...overrides,
  } as unknown as Profile;
}

describe("scoreMatch", () => {
  test("identical declared preferences produce a high shared-ground score", () => {
    const result = scoreMatch(profile(), profile({ userId: "other" }));
    expect(result.score).toBeGreaterThanOrEqual(90);
    expect(result.sharedInterests).toEqual(["fitness", "exploration"]);
    expect(result.sharedActivities).toEqual(["Morning run", "Café outing"]);
  });

  test("budget compatibility changes the score even when no other signal matches", () => {
    const unrelated = profile({
      userId: "other-a",
      area: "Whitefield",
      interests: ["contribution"],
      activities: ["Clean-up drive"],
      availability: ["weekday-evenings"],
      groupSize: "large",
      budget: "flexible",
    });
    const sameBudget = { ...unrelated, userId: "other-b", budget: "low" };
    expect(scoreMatch(profile(), sameBudget).score).toBeGreaterThan(
      scoreMatch(profile(), unrelated).score,
    );
  });

  test("unrelated preferences score low and still explain why", () => {
    const result = scoreMatch(
      profile(),
      profile({
        userId: "other",
        area: "Whitefield",
        interests: ["contribution"],
        activities: ["Clean-up drive"],
        availability: ["weekday-evenings"],
        groupSize: "large",
        budget: "flexible",
      }),
    );
    expect(result.score).toBeLessThan(30);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons.length).toBeLessThanOrEqual(3);
  });

  test("sharing a preferred activity raises the score", () => {
    const base = profile({
      userId: "other",
      area: "Koramangala",
      interests: ["learning"],
      activities: ["Study session"],
      availability: ["weekday-evenings"],
      groupSize: "large",
      budget: "flexible",
    });
    const withoutShared = scoreMatch(profile(), base);
    const withShared = scoreMatch(
      profile(),
      profile({ ...base, activities: ["Morning run"] }),
    );
    expect(withShared.score).toBeGreaterThan(withoutShared.score);
    expect(withShared.reasons.join(" ").toLowerCase()).toContain("morning run");
  });

  test("same neighbourhood and budget are reflected in the reasons", () => {
    const result = scoreMatch(
      profile(),
      profile({
        userId: "other",
        interests: ["sports"],
        activities: ["Badminton"],
        availability: ["weekday-evenings"],
        area: "Indiranagar",
        budget: "low",
        groupSize: "small",
      }),
    );
    const reasons = result.reasons.join(" ").toLowerCase();
    expect(reasons).toContain("indiranagar");
    expect(reasons).toContain("budget");
  });

  test("scoring is deterministic", () => {
    const a = scoreMatch(profile(), profile({ userId: "other" }));
    const b = scoreMatch(profile(), profile({ userId: "other" }));
    expect(a.score).toBe(b.score);
    expect(a.reasons).toEqual(b.reasons);
  });

  test("missing declared data does not crash or invent reasons", () => {
    const result = scoreMatch(
      profile({ interests: [], activities: [], availability: [] }),
      profile({ userId: "other", interests: [], activities: [], availability: [] }),
    );
    expect(Number.isFinite(result.score)).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(0);
    expect(result.score).toBeLessThanOrEqual(99);
    expect(result.reasons.length).toBeGreaterThan(0);
  });
});
