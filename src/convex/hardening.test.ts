import { convexTest } from "convex-test";
import type { TestConvex } from "convex-test";
import { describe, expect, it, vi } from "vitest";
import type { Id } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";
import schema from "./schema";
import { modules } from "./test.setup";

const CITY = "Bengaluru";
type T = TestConvex<typeof schema>;

async function makeUser(
  t: T,
  name: string,
  email: string,
  opts: {
    hidden?: boolean;
    role?: "member" | "moderator" | "admin";
    status?: "active" | "disabled";
    anonymous?: boolean;
  } = {},
) {
  return (await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      name,
      email,
      role: opts.role ?? "member",
      accountStatus: opts.status ?? "active",
      isAnonymous: opts.anonymous ?? false,
    });
    await ctx.db.insert("profiles", {
      userId,
      displayName: name,
      ageConfirmed: true,
      city: CITY,
      area: "Indiranagar",
      bio: `${name}'s profile`,
      languages: ["English"],
      interests: ["social"],
      activities: ["Coffee"],
      availability: ["weekend-mornings"],
      groupSize: "small",
      budget: "low",
      comfort: "balanced",
      onboardingComplete: true,
      isDemo: false,
      hidden: opts.hidden ?? false,
    });
    return userId as Id<"users">;
  })) as Id<"users">;
}

function as(t: T, userId: Id<"users">) {
  return t.withIdentity({ subject: userId });
}

async function makeActivity(
  t: T,
  hostId: Id<"users">,
  opts: {
    startsAt?: number;
    durationMins?: number;
    status?: "open" | "cancelled";
    title?: string;
    city?: string;
  } = {},
) {
  return (await t.run(async (ctx) => {
    return await ctx.db.insert("activities", {
      hostId,
      title: opts.title ?? "Public park walk",
      description: "A small, public plan for testing.",
      category: "social",
      kind: "activity",
      city: opts.city ?? CITY,
      area: "Indiranagar",
      venue: "Public park gate",
      startsAt: opts.startsAt ?? Date.now() + 24 * 60 * 60_000,
      durationMins: opts.durationMins ?? 60,
      cost: 0,
      maxParticipants: 8,
      beginnerFriendly: true,
      recurrence: "once",
      status: opts.status ?? "open",
      autoApprove: false,
      isDemo: false,
    });
  })) as Id<"activities">;
}

async function addAttendee(t: T, activityId: Id<"activities">, userId: Id<"users">) {
  await t.run(async (ctx) => {
    await ctx.db.insert("joinRequests", {
      activityId,
      userId,
      status: "approved",
      createdAt: Date.now(),
      decidedAt: Date.now(),
    });
    await ctx.db.insert("attendance", {
      activityId,
      userId,
      method: "self",
      markedAt: Date.now(),
    });
  });
}

async function makeCircle(
  t: T,
  hostId: Id<"users">,
  members: Id<"users">[],
) {
  const circleId = (await t.run(async (ctx) => {
    const id = await ctx.db.insert("circles", {
      name: "Test circle",
      description: "A public test circle with no private data.",
      category: "social",
      kind: "community",
      city: CITY,
      area: "Indiranagar",
      hostId,
      cadence: "Weekly",
      joinPolicy: "open",
      maxMembers: 20,
      isDemo: false,
      createdAt: Date.now(),
    });
    await ctx.db.insert("circleMembers", {
      circleId: id,
      userId: hostId,
      role: "host",
      status: "approved",
      joinedAt: Date.now(),
    });
    for (const member of members) {
      await ctx.db.insert("circleMembers", {
        circleId: id,
        userId: member,
        role: "member",
        status: "approved",
        joinedAt: Date.now(),
      });
    }
    return id;
  })) as Id<"circles">;
  return circleId;
}

describe("administrator access", () => {
  it("has no public moderator bootstrap and requires owner provisioning", async () => {
    const t = convexTest(schema, modules);
    const ownerEmail = "owner@example.test";
    const owner = await makeUser(t, "Owner", ownerEmail);
    const member = await makeUser(t, "Member", "member@example.test");

    expect("claimModerator" in api.moderation).toBe(false);
    expect("grantRole" in api.moderation).toBe(false);
    expect("setAccountStatus" in api.moderation).toBe(false);
    await expect(
      as(t, member).query(api.moderation.status, {}),
    ).resolves.toMatchObject({ isModerator: false });
    await expect(as(t, member).query(api.moderation.queue, {})).rejects.toThrow(
      /Moderator access/,
    );

    await t.mutation(internal.moderation.grantRole, {
      email: ownerEmail,
      role: "moderator",
    });
    await expect(
      as(t, owner).query(api.moderation.status, {}),
    ).resolves.toMatchObject({ isModerator: true });
    await expect(as(t, member).query(api.moderation.queue, {})).rejects.toThrow(
      /Moderator access/,
    );
  });

  it("revokes sessions when an owner disables an account", async () => {
    const t = convexTest(schema, modules);
    const email = "disabled@example.test";
    const userId = await makeUser(t, "Disabled", email);
    await t.run(async (ctx) => {
      await ctx.db.insert("authSessions", {
        userId,
        expirationTime: Date.now() + 60_000,
      });
    });

    await t.mutation(internal.moderation.setAccountStatus, {
      email,
      status: "disabled",
      reason: "Test suspension",
    });

    await expect(as(t, userId).query(api.profiles.me, {})).resolves.toMatchObject({
      accountStatus: "disabled",
    });
    await expect(
      as(t, userId).mutation(api.profiles.update, {
        displayName: "Still here",
        city: CITY,
        area: "Indiranagar",
        bio: "",
        languages: ["English"],
        interests: ["social"],
        activities: ["Coffee"],
        availability: ["weekend-mornings"],
        groupSize: "small",
        budget: "low",
        comfort: "balanced",
      }),
    ).rejects.toThrow(/disabled/);

    const sessions = await t.run(async (ctx) =>
      ctx.db.query("authSessions").collect(),
    );
    expect(sessions).toHaveLength(0);
  });
});

describe("abuse controls and demo isolation", () => {
  it("throttles repeated reports and rejects reasons outside the allow-list", async () => {
    const t = convexTest(schema, modules);
    const a = await makeUser(t, "Reporter", "report-a@example.test");
    const b = await makeUser(t, "Target", "report-b@example.test");
    const reporter = as(t, a);

    await expect(
      reporter.mutation(api.safety.report, {
        targetType: "member",
        targetId: b,
        reason: "Made up reason",
        details: "This reason is not on the server allow-list.",
      }),
    ).rejects.toThrow(/listed report reasons/);

    for (let attempt = 0; attempt < 10; attempt += 1) {
      await reporter.mutation(api.safety.report, {
        targetType: "member",
        targetId: b,
        reason: "Harassment or unwanted contact",
        details: "Repeated test report used to prove throttling works.",
      });
    }
    await expect(
      reporter.mutation(api.safety.report, {
        targetType: "member",
        targetId: b,
        reason: "Harassment or unwanted contact",
        details: "The eleventh report in the same day must be throttled.",
      }),
    ).rejects.toThrow(/Too many attempts/);
  });

  it("does not let anonymous guests bypass verified participation by default", async () => {
    const t = convexTest(schema, modules);
    const guest = await makeUser(t, "Guest", "guest@example.test", {
      anonymous: true,
    });
    await expect(as(t, guest).query(api.people.suggestions, {})).rejects.toThrow(
      /Guest accounts are available only/,
    );
  });

  it("refuses to seed demo people unless the deployment opts in", async () => {
    const t = convexTest(schema, modules);
    const member = await makeUser(t, "Real member", "demo-gate@example.test");
    const result = await as(t, member).mutation(api.seed.seedDemoCity, {});
    expect(result).toMatchObject({ enabled: false, contentCreated: false });

    const demoUsers = await t.run(async (ctx) =>
      ctx.db.query("users").collect(),
    );
    expect(demoUsers).toHaveLength(1);
    expect(demoUsers[0].email).toBe("demo-gate@example.test");
  });
});

describe("profile visibility", () => {
  it("removes hidden members from discovery and direct profile reads", async () => {
    const t = convexTest(schema, modules);
    const viewer = await makeUser(t, "Viewer", "viewer@example.test");
    const hidden = await makeUser(t, "Hidden", "hidden@example.test", {
      hidden: true,
    });      const suggestions = await as(t, viewer).query(api.people.suggestions, {});
    expect(suggestions.map((row) => row.person.userId)).not.toContain(hidden);
    await expect(
      as(t, viewer).query(api.profiles.byUser, { userId: hidden }),
    ).resolves.toBeNull();
    await expect(
      as(t, viewer).query(api.people.detail, { userId: hidden }),
    ).resolves.toBeNull();
    await expect(
      as(t, viewer).query(api.profiles.byUser, { userId: viewer }),
    ).resolves.toMatchObject({ displayName: "Viewer" });
  });

  it("removes a hidden host's plans from discovery and direct reads", async () => {
    const t = convexTest(schema, modules);
    const viewer = await makeUser(t, "Viewer", "activity-viewer@example.test");
    const hiddenHost = await makeUser(t, "Hidden host", "hidden-host@example.test", {
      hidden: true,
    });
    const activityId = await makeActivity(t, hiddenHost);

    const list = await as(t, viewer).query(api.activities.list, {});
    expect(list.map((row) => row.activity._id)).not.toContain(activityId);
    await expect(
      as(t, viewer).query(api.activities.get, { activityId }),
    ).resolves.toBeNull();
  });
});

describe("blocking", () => {
  it("is symmetric across profiles, plans, circles and connections", async () => {
    const t = convexTest(schema, modules);
    const a = await makeUser(t, "A", "block-a@example.test");
    const b = await makeUser(t, "B", "block-b@example.test");
    const c = await makeUser(t, "C", "block-c@example.test");
    const activityId = await makeActivity(t, b);
    const circleId = await makeCircle(t, c, [a, b]);

    await t.run(async (ctx) => {
      const [userA, userB] = [a, b].sort();
      await ctx.db.insert("connections", {
        userA,
        userB,
        activityId,
        createdAt: Date.now(),
      });
      await ctx.db.insert("circlePosts", {
        circleId,
        authorId: b,
        body: "A post from the blocked member",
        kind: "discussion",
        createdAt: Date.now(),
      });
    });

    await as(t, a).mutation(api.safety.block, { userId: b });

    await expect(
      as(t, a).query(api.profiles.byUser, { userId: b }),
    ).resolves.toBeNull();
    await expect(
      as(t, b).query(api.profiles.byUser, { userId: a }),
    ).resolves.toBeNull();
    await expect(
      as(t, a).query(api.activities.get, { activityId }),
    ).resolves.toBeNull();
    await expect(
      as(t, b).query(api.activities.get, { activityId }),
    ).resolves.not.toBeNull();

    const circle = await as(t, a).query(api.circles.get, { circleId });
    expect(circle?.members.map((member) => member.userId)).not.toContain(b);
    expect(circle?.posts.map((post) => post.body)).not.toContain(
      "A post from the blocked member",
    );

    await expect(as(t, a).query(api.reconnect.myConnections, {})).resolves.toEqual([]);
    await expect(as(t, b).query(api.reconnect.myConnections, {})).resolves.toEqual([]);

    const decisions = await t.run(async (ctx) =>
      ctx.db.query("reconnectDecisions").collect(),
    );
    expect(decisions).toHaveLength(0);
  });
});

describe("attendance and mutual reconnection", () => {
  it("rejects check-in outside the plan window and for cancelled plans", async () => {
    const t = convexTest(schema, modules);
    const host = await makeUser(t, "Host", "checkin-host@example.test");
    const guest = await makeUser(t, "Guest", "checkin-guest@example.test");

    const future = await makeActivity(t, host, {
      startsAt: Date.now() + 60 * 60_000,
    });
    await addAttendee(t, future, guest);
    await expect(
      as(t, guest).mutation(api.activities.markAttendance, { activityId: future }),
    ).rejects.toThrow(/30 minutes before/);

    const cancelled = await makeActivity(t, host, {
      startsAt: Date.now() - 60 * 60_000,
      status: "cancelled",
    });
    await addAttendee(t, cancelled, guest);
    await expect(
      as(t, guest).mutation(api.activities.markAttendance, { activityId: cancelled }),
    ).rejects.toThrow(/Cancelled/);

    const closed = await makeActivity(t, host, {
      startsAt: Date.now() - 48 * 60 * 60_000,
      durationMins: 60,
    });
    await addAttendee(t, closed, guest);
    await expect(
      as(t, guest).mutation(api.activities.markAttendance, { activityId: closed }),
    ).rejects.toThrow(/window closed/);

    const open = await makeActivity(t, host, {
      startsAt: Date.now() - 30 * 60_000,
      durationMins: 60,
    });
    await addAttendee(t, open, guest);
    await expect(
      as(t, guest).mutation(api.activities.markAttendance, { activityId: open }),
    ).resolves.toBeDefined();
  });

  it("creates a connection only after two independent yes answers", async () => {
    const t = convexTest(schema, modules);
    const a = await makeUser(t, "A", "reconnect-a@example.test");
    const b = await makeUser(t, "B", "reconnect-b@example.test");
    const activityId = await makeActivity(t, a, {
      startsAt: Date.now() - 2 * 60 * 60_000,
      durationMins: 60,
    });
    await addAttendee(t, activityId, a);
    await addAttendee(t, activityId, b);

    await expect(
      as(t, a).mutation(api.reconnect.decide, {
        activityId,
        targetId: b,
        decision: "yes",
      }),
    ).resolves.toMatchObject({ connected: false, mutual: false });
    await expect(as(t, b).query(api.reconnect.myConnections, {})).resolves.toEqual([]);

    const detailBefore = await as(t, b).query(api.activities.get, { activityId });
    expect(
      detailBefore?.reconnectCandidates.find((row) => row.userId === a)?.myDecision,
    ).toBeNull();

    await expect(
      as(t, b).mutation(api.reconnect.decide, {
        activityId,
        targetId: a,
        decision: "yes",
      }),
    ).resolves.toMatchObject({ connected: true, mutual: true });
    await expect(as(t, a).query(api.reconnect.myConnections, {})).resolves.toHaveLength(1);
    await expect(as(t, b).query(api.reconnect.myConnections, {})).resolves.toHaveLength(1);
  });

  it("does not treat hosting as proof of attendance", async () => {
    const t = convexTest(schema, modules);
    const host = await makeUser(t, "Host", "host-attendance@example.test");
    const guest = await makeUser(t, "Guest", "guest-attendance@example.test");
    const activityId = await makeActivity(t, host, {
      startsAt: Date.now() - 2 * 60 * 60_000,
    });
    // Only the guest checked in; the host did not.
    await addAttendee(t, activityId, guest);

    await expect(
      as(t, guest).mutation(api.reconnect.decide, {
        activityId,
        targetId: host,
        decision: "yes",
      }),
    ).rejects.toThrow(/checked in/);
    await expect(
      as(t, host).mutation(api.reconnect.decide, {
        activityId,
        targetId: guest,
        decision: "yes",
      }),
    ).rejects.toThrow(/Check in/);
  });

  it("refuses reconnection before a plan ends or after cancellation", async () => {
    const t = convexTest(schema, modules);
    const a = await makeUser(t, "A", "reconnect-window-a@example.test");
    const b = await makeUser(t, "B", "reconnect-window-b@example.test");
    const future = await makeActivity(t, a, {
      startsAt: Date.now() + 60 * 60_000,
    });
    await addAttendee(t, future, a);
    await addAttendee(t, future, b);
    await expect(
      as(t, a).mutation(api.reconnect.decide, {
        activityId: future,
        targetId: b,
        decision: "yes",
      }),
    ).rejects.toThrow(/after the plan has ended/);

    const cancelled = await makeActivity(t, a, {
      startsAt: Date.now() - 60 * 60_000,
      status: "cancelled",
    });
    await addAttendee(t, cancelled, a);
    await addAttendee(t, cancelled, b);
    await expect(
      as(t, a).mutation(api.reconnect.decide, {
        activityId: cancelled,
        targetId: b,
        decision: "yes",
      }),
    ).rejects.toThrow(/isn't available/);
  });
});

describe("personal data export", () => {
  it("includes the member's own decisions but never the other side's answer", async () => {
    const t = convexTest(schema, modules);
    const a = await makeUser(t, "A", "export-a@example.test");
    const b = await makeUser(t, "B", "export-b@example.test");
    const activityId = await makeActivity(t, a, {
      startsAt: Date.now() - 2 * 60 * 60_000,
    });
    await t.run(async (ctx) => {
      await ctx.db.insert("reconnectDecisions", {
        activityId,
        fromUserId: a,
        toUserId: b,
        decision: "yes",
        createdAt: Date.now(),
      });
      await ctx.db.insert("reconnectDecisions", {
        activityId,
        fromUserId: b,
        toUserId: a,
        decision: "maybe",
        createdAt: Date.now(),
      });
    });

    const exported = await as(t, a).query(api.profiles.exportMyData, {});
    expect(exported.reconnectDecisionsGiven).toHaveLength(1);
    expect(exported.reconnectDecisionsGiven[0]).toMatchObject({
      fromUserId: a,
      toUserId: b,
      decision: "yes",
    });
    expect(JSON.stringify(exported)).not.toContain('"decision":"maybe"');
  });
});

describe("account deletion", () => {
  it("revokes identity immediately and removes product records in resumable batches", async () => {
    vi.useFakeTimers();
    try {
      const t = convexTest(schema, modules);
      const a = await makeUser(t, "A", "delete-a@example.test");
      const b = await makeUser(t, "B", "delete-b@example.test");
      const hostedActivity = await makeActivity(t, a);
      const circleId = await makeCircle(t, a, [b]);
      const reportId = await t.run(async (ctx) => {
        return await ctx.db.insert("reports", {
          reporterId: a,
          targetType: "member",
          targetId: b,
          targetLabel: "B",
          reason: "Harassment or unwanted contact",
          details: "This report must survive for the safety record.",
          status: "open",
          createdAt: Date.now(),
        });
      });
      await t.run(async (ctx) => {
        const sessionId = await ctx.db.insert("authSessions", {
          userId: a,
          expirationTime: Date.now() + 60_000,
        });
        const accountId = await ctx.db.insert("authAccounts", {
          userId: a,
          provider: "email-otp",
          providerAccountId: "delete-a@example.test",
        });
        await ctx.db.insert("authRefreshTokens", {
          sessionId,
          expirationTime: Date.now() + 60_000,
        });
        await ctx.db.insert("authVerificationCodes", {
          accountId,
          provider: "email-otp",
          code: "123456",
          expirationTime: Date.now() + 60_000,
        });
      });

      await expect(
        as(t, a).mutation(api.profiles.deleteMyData, {}),
      ).resolves.toEqual({ started: true });

      // Access is revoked synchronously.
      await expect(as(t, a).query(api.profiles.me, {})).resolves.toMatchObject({
        accountStatus: "deleting",
        profile: null,
      });
      await expect(
        as(t, a).mutation(api.profiles.completeOnboarding, {
          displayName: "Resurrected",
          city: CITY,
          area: "Indiranagar",
          bio: "",
          languages: ["English"],
          interests: ["social"],
          activities: ["Coffee"],
          availability: ["weekend-mornings"],
          groupSize: "small",
          budget: "low",
          comfort: "balanced",
          confirmedAdult: true,
        }),
      ).rejects.toThrow(/being deleted/);

      const immediateAuth = await t.run(async (ctx) => ({
        sessions: await ctx.db.query("authSessions").collect(),
        accounts: await ctx.db.query("authAccounts").collect(),
        refresh: await ctx.db.query("authRefreshTokens").collect(),
        codes: await ctx.db.query("authVerificationCodes").collect(),
      }));
      expect(immediateAuth).toEqual({
        sessions: [],
        accounts: [],
        refresh: [],
        codes: [],
      });

      await t.finishAllScheduledFunctions(vi.runAllTimers);

      const finalState = await t.run(async (ctx) => ({
        user: await ctx.db.get(a),
        profile: await ctx.db
          .query("profiles")
          .withIndex("by_user", (q) => q.eq("userId", a))
          .unique(),
        hostedActivity: await ctx.db.get(hostedActivity),
        circle: await ctx.db.get(circleId),
        report: await ctx.db.get(reportId),
      }));
      expect(finalState.user).not.toBeNull();
      if (!finalState.user) throw new Error("Deletion removed the tombstone user.");
      expect(finalState.user).toMatchObject({
        name: "Deleted member",
        accountStatus: "deleted",
      });
      expect(finalState.user.email).toBeUndefined();
      expect(finalState.user.role).toBeUndefined();
      expect(finalState.profile).toBeNull();
      expect(finalState.hostedActivity).toBeNull();
      expect(finalState.circle).toBeNull();
      expect(finalState.report).not.toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });
});
