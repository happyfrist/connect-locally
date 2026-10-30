import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireProfile } from "./lib/auth";

type Achievement = {
  key: string;
  title: string;
  description: string;
  unlocked: boolean;
  progress: string;
};

/**
 * Private journal, honest participation stats and optional achievements.
 * Nothing here is shared with other members or ranked globally.
 */
export const mine = query({
  args: {},
  handler: async (ctx) => {
    const { userId, profile } = await requireProfile(ctx);
    const [entries, attendanceRows, memberships, hosted, connectionsA, connectionsB] =
      await Promise.all([
        ctx.db
          .query("journalEntries")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect(),
        ctx.db
          .query("attendance")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect(),
        ctx.db
          .query("circleMembers")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .collect(),
        ctx.db
          .query("activities")
          .withIndex("by_host", (q) => q.eq("hostId", userId))
          .collect(),
        ctx.db
          .query("connections")
          .withIndex("by_userA", (q) => q.eq("userA", userId))
          .collect(),
        ctx.db
          .query("connections")
          .withIndex("by_userB", (q) => q.eq("userB", userId))
          .collect(),
      ]);

    const sortedEntries = entries.sort((a, b) => b.occurredAt - a.occurredAt);
    const totalMinutes = entries.reduce((sum, entry) => sum + entry.durationMins, 0);
    const categories = Array.from(new Set(entries.map((entry) => entry.category)));

    // Count familiar faces across attended plans.
    const faceCounts = new Map<string, number>();
    for (const row of attendanceRows) {
      const peers = await ctx.db
        .query("attendance")
        .withIndex("by_activity", (q) => q.eq("activityId", row.activityId))
        .collect();
      for (const peer of peers) {
        if (peer.userId === userId) continue;
        faceCounts.set(peer.userId as string, (faceCounts.get(peer.userId as string) ?? 0) + 1);
      }
    }
    const familiarFaces = Array.from(faceCounts.values()).filter((count) => count >= 2).length;

    let hostedWithGuests = 0;
    let hostedWellAttended = 0;
    for (const activity of hosted) {
      const requests = await ctx.db
        .query("joinRequests")
        .withIndex("by_activity", (q) => q.eq("activityId", activity._id))
        .collect();
      const approved = requests.filter((request) => request.status === "approved").length;
      if (approved >= 1) hostedWithGuests += 1;
      const attendance = await ctx.db
        .query("attendance")
        .withIndex("by_activity", (q) => q.eq("activityId", activity._id))
        .collect();
      const others = attendance.filter((row) => row.userId !== userId).length;
      if (others >= 2) hostedWellAttended += 1;
    }

    const weekendAttendance = attendanceRows.filter((row) => {
      const day = new Date(row.markedAt).getDay();
      return day === 0 || day === 6;
    }).length;
    const hostedLearning = hosted.some((activity) => activity.category === "learning");
    const approvedCircles = memberships.filter((m) => m.status === "approved").length;
    const connectionCount = connectionsA.length + connectionsB.length;

    const achievements: Achievement[] = [
      {
        key: "first-hello",
        title: "First hello",
        description: "A mutual reconnection turned into a real connection.",
        unlocked: connectionCount >= 1,
        progress: `${Math.min(connectionCount, 1)}/1`,
      },
      {
        key: "first-activity",
        title: "Out the door",
        description: "Checked in to your first real-world plan.",
        unlocked: attendanceRows.length >= 1,
        progress: `${Math.min(attendanceRows.length, 1)}/1`,
      },
      {
        key: "weekend-explorer",
        title: "Weekend explorer",
        description: "Met people on a Saturday or Sunday.",
        unlocked: weekendAttendance >= 1,
        progress: `${Math.min(weekendAttendance, 1)}/1`,
      },
      {
        key: "three-activities",
        title: "Three plans in",
        description: "Three plans is where faces start becoming familiar.",
        unlocked: attendanceRows.length >= 3,
        progress: `${Math.min(attendanceRows.length, 3)}/3`,
      },
      {
        key: "familiar-faces",
        title: "Familiar faces",
        description: "Met the same person at two different plans.",
        unlocked: familiarFaces >= 1,
        progress: `${Math.min(familiarFaces, 1)}/1`,
      },
      {
        key: "circle-member",
        title: "Part of a circle",
        description: "Joined a recurring group, not just a one-off plan.",
        unlocked: approvedCircles >= 1,
        progress: `${Math.min(approvedCircles, 1)}/1`,
      },
      {
        key: "community-builder",
        title: "Community builder",
        description: "Hosted a plan that someone else joined.",
        unlocked: hostedWithGuests >= 1,
        progress: `${Math.min(hostedWithGuests, 1)}/1`,
      },
      {
        key: "good-host",
        title: "Good host",
        description: "Two or more people showed up to a plan you hosted.",
        unlocked: hostedWellAttended >= 1,
        progress: `${Math.min(hostedWellAttended, 1)}/1`,
      },
      {
        key: "project-creator",
        title: "Project creator",
        description: "Hosted a learning plan for others.",
        unlocked: hostedLearning,
        progress: hostedLearning ? "1/1" : "0/1",
      },
      {
        key: "city-explorer",
        title: "Local explorer",
        description: "Tried three different kinds of activity.",
        unlocked: categories.length >= 3,
        progress: `${Math.min(categories.length, 3)}/3`,
      },
    ];

    return {
      entries: sortedEntries,
      stats: {
        totalMinutes,
        activities: attendanceRows.length,
        connections: connectionCount,
        circles: approvedCircles,
        categories: categories.length,
        familiarFaces,
        hosted: hosted.length,
      },
      achievements,
      profile,
    };
  },
});

export const addReflection = mutation({
  args: { entryId: v.id("journalEntries"), reflection: v.string() },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.userId !== userId) {
      throw new Error("That journal entry isn't yours.");
    }
    const reflection = args.reflection.trim();
    if (reflection.length > 2000) {
      throw new Error("Keep reflections under 2000 characters.");
    }
    await ctx.db.patch(args.entryId, { reflection: reflection || undefined });
  },
});

export const removeEntry = mutation({
  args: { entryId: v.id("journalEntries") },
  handler: async (ctx, args) => {
    const { userId } = await requireProfile(ctx);
    const entry = await ctx.db.get(args.entryId);
    if (!entry || entry.userId !== userId) {
      throw new Error("That journal entry isn't yours.");
    }
    await ctx.db.delete(args.entryId);
  },
});
