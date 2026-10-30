import { v } from "convex/values";
import { query } from "./_generated/server";
import { connectionExists, listBlockedIds, publicProfile, requireProfile } from "./lib/auth";
import { scoreMatch } from "./lib/matching";

export const suggestions = query({
  args: {},
  handler: async (ctx) => {
    const { userId, profile } = await requireProfile(ctx);
    const [people, blocked] = await Promise.all([
      ctx.db
        .query("profiles")
        .withIndex("by_city", (q) => q.eq("city", profile.city))
        .collect(),
      listBlockedIds(ctx, userId),
    ]);

    const candidates = [];
    for (const person of people) {
      if (person.userId === userId) continue;
      if (!person.onboardingComplete || person.hidden) continue;
      if (blocked.has(person.userId as string)) continue;
      if (await connectionExists(ctx, userId, person.userId)) continue;

      const match = scoreMatch(profile, person);
      candidates.push({
        person: publicProfile(person),
        ...match,
      });
    }

    candidates.sort((a, b) => b.score - a.score);
    return candidates.slice(0, 12);
  },
});

/** A member profile plus the shared ground, for a person page or dialog. */
export const detail = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { userId, profile } = await requireProfile(ctx);
    if (args.userId === userId) {
      return { person: publicProfile(profile), match: null, connected: false };
    }
    const blocked = await listBlockedIds(ctx, userId);
    if (blocked.has(args.userId as string)) return null;
    const other = await ctx.db
      .query("profiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .unique();
    if (!other || !other.onboardingComplete) return null;

    return {
      person: publicProfile(other),
      match: scoreMatch(profile, other),
      connected: await connectionExists(ctx, userId, args.userId),
    };
  },
});
