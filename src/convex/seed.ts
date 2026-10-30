import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation } from "./_generated/server";
import { requireProfile } from "./lib/auth";

const DAY = 864e5;

type DemoPersonSeed = {
  key: string;
  name: string;
  city: string;
  area: string;
  bio: string;
  interests: string[];
  activities: string[];
  availability: string[];
  groupSize: "one" | "small" | "large";
  budget: "free" | "low" | "flexible";
  comfort: "quiet" | "balanced" | "lively";
  languages: string[];
  openToReconnect: boolean;
};

function demoEmail(key: string, city: string) {
  const slug = city.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `demo.${slug}.${key}@saanjh.example`;
}

function nextWeekday(day: number, hour: number, minute = 0) {
  const now = new Date();
  const target = new Date(now);
  const diff = (day - now.getDay() + 7) % 7;
  target.setDate(now.getDate() + diff);
  target.setHours(hour, minute, 0, 0);
  if (target.getTime() < Date.now() + 3600_000) {
    target.setDate(target.getDate() + 7);
  }
  return target.getTime();
}

async function ensureDemoUser(
  ctx: any,
  seed: Omit<DemoPersonSeed, "city"> & { city: string },
) {
  const email = demoEmail(seed.key, seed.city);
  const existing = await ctx.db
    .query("users")
    .withIndex("email", (q: any) => q.eq("email", email))
    .unique();

  const userId =
    existing?._id ??
    (await ctx.db.insert("users", {
      name: seed.name,
      email,
      role: "member",
    }));

  const profile = await ctx.db
    .query("profiles")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .unique();

  if (!profile) {
    await ctx.db.insert("profiles", {
      userId,
      displayName: seed.name,
      ageConfirmed: true,
      city: seed.city,
      area: seed.area,
      bio: seed.bio,
      languages: seed.languages,
      interests: seed.interests,
      activities: seed.activities,
      availability: seed.availability,
      groupSize: seed.groupSize,
      budget: seed.budget,
      comfort: seed.comfort,
      onboardingComplete: true,
      isDemo: true,
      openToReconnect: seed.openToReconnect,
    });
  }
  return userId as Id<"users">;
}

/**
 * Seeds a demo city. Every seeded member is labelled "Demo profile" in the UI,
 * and demo reconnect interest is a clearly documented standing preference, not
 * a claim that a real person consented.
 */
export const seedDemoCity = mutation({
  args: {},
  handler: async (ctx) => {
    const { userId, profile } = await requireProfile(ctx);
    const city = profile.city;
    const now = Date.now();
    const isBengaluru = city.toLowerCase() === "bengaluru";

    const areas = isBengaluru
      ? ["Indiranagar", "Koramangala", "Jayanagar", "HSR Layout", "Central Bengaluru"]
      : ["Central", "Old Town", "Riverside", "North End", "Green Park"];

    const venues = isBengaluru
      ? {
          park: "Cubbon Park, Gate 2",
          cafe: "Third Wave Coffee, Indiranagar",
          books: "Church Street bookstores",
          sport: "Play Arena, Koramangala",
          cinema: "Rex Theatre, Brigade Road",
          study: "Kanaja Café, Jayanagar",
          boards: "The Board Room, Koramangala",
          trail: "Nandi Hills base gate",
          cleanup: "Cubbon Park, Queen's Circle",
        }
      : {
          park: `${city} Central Park, main gate`,
          cafe: `The Reading Room café, ${areas[0]}`,
          books: `${city} Book Bazaar`,
          sport: `${city} Sports Complex`,
          cinema: `${city} Film Society`,
          study: `${city} Central Library café`,
          boards: `The Game Table, ${areas[1]}`,
          trail: `${city} ridge trailhead`,
          cleanup: `${city} lakeside garden`,
        };

    const people: DemoPersonSeed[] = [
      {
        key: "ananya",
        name: "Ananya (demo)",
        city,
        area: areas[0],
        bio: "New to the city, collecting bookshops and filter coffee. Happiest in small groups.",
        interests: ["exploration", "social", "creativity"],
        activities: ["Café outing", "Bookstore crawl", "Photo walk", "Coffee"],
        availability: ["weekend-mornings", "weekday-evenings"],
        groupSize: "small",
        budget: "low",
        comfort: "balanced",
        languages: ["English", "हिन्दी"],
        openToReconnect: true,
      },
      {
        key: "kabir",
        name: "Kabir (demo)",
        city,
        area: areas[1],
        bio: "Independent learner. Building small projects and looking for people to build beside.",
        interests: ["learning", "creativity", "exploration"],
        activities: ["Study session", "Programming", "Build a project", "City walk"],
        availability: ["weekday-evenings", "weekend-afternoons"],
        groupSize: "small",
        budget: "free",
        comfort: "quiet",
        languages: ["English", "मराठी"],
        openToReconnect: true,
      },
      {
        key: "meera",
        name: "Meera (demo)",
        city,
        area: areas[2],
        bio: "Runs slowly, cycles often, organises the Sunday run. Beginner pace is the real pace.",
        interests: ["fitness", "sports"],
        activities: ["Morning run", "Badminton", "Cycling", "Gym session"],
        availability: ["weekday-mornings", "weekend-mornings"],
        groupSize: "large",
        budget: "low",
        comfort: "lively",
        languages: ["English", "ಕನ್ನಡ"],
        openToReconnect: false,
      },
      {
        key: "dev",
        name: "Dev (demo)",
        city,
        area: areas[3],
        bio: "Weekend trekker and film society regular. Knows the good chai places near every theatre.",
        interests: ["nature", "entertainment", "exploration"],
        activities: ["Trekking", "Movie night", "Photo walk", "Camping"],
        availability: ["weekend-mornings", "weekend-evenings"],
        groupSize: "small",
        budget: "flexible",
        comfort: "balanced",
        languages: ["English", "हिन्दी"],
        openToReconnect: true,
      },
      {
        key: "riya",
        name: "Riya (demo)",
        city,
        area: areas[4],
        bio: "Organises quiet volunteering mornings. Prefers early plans and small groups.",
        interests: ["contribution", "social", "nature"],
        activities: ["Volunteering", "Clean-up drive", "Coffee", "Outdoor picnic"],
        availability: ["weekend-mornings", "weekday-evenings"],
        groupSize: "small",
        budget: "free",
        comfort: "quiet",
        languages: ["English", "മലയാളം"],
        openToReconnect: true,
      },
    ];

    const demoIds: Record<string, Id<"users">> = {};
    for (const person of people) {
      demoIds[person.key] = await ensureDemoUser(ctx, person);
    }

    const contentKey = `content:v3:${city.toLowerCase()}`;
    const contentMarker = await ctx.db
      .query("demoSeed")
      .withIndex("by_key", (q) => q.eq("key", contentKey))
      .unique();

    let contentCreated = false;

    if (!contentMarker) {
      const circleIds: Record<string, Id<"circles">> = {};

      const circleSeeds = [
        {
          key: "runners",
          name: "Sunday Runners' Club",
          description:
            "A weekly easy-pace run around the park, followed by breakfast. Walkers welcome; nobody gets left behind.",
          category: "fitness",
          kind: "community" as const,
          area: areas[0],
          host: demoIds.meera,
          cadence: "Every Sunday · 7:00 am",
          joinPolicy: "open" as const,
          maxMembers: 30,
          rules: "Public park meets only. Easy pace, regroup points every kilometre.",
          prompts: undefined,
        },
        {
          key: "films",
          name: "Indie Film Circle",
          description:
            "One film a month, then chai and a real conversation about it. No film-school knowledge required.",
          category: "entertainment",
          kind: "community" as const,
          area: areas[1],
          host: demoIds.dev,
          cadence: "Second Sunday · 6:00 pm",
          joinPolicy: "open" as const,
          maxMembers: 20,
          rules: "Tickets are paid individually. The discussion after is free.",
          prompts: undefined,
        },
        {
          key: "learners",
          name: "Independent Learners",
          description:
            "A four-week pod for people studying alone. Week 1 intros and goals, week 2 focused session, week 3 pair projects, week 4 demo and reflect.",
          category: "learning",
          kind: "pod" as const,
          area: areas[1],
          host: demoIds.kabir,
          cadence: "Thursdays · 4 weeks",
          joinPolicy: "open" as const,
          maxMembers: 8,
          rules: "Phones face down. Bring one small thing you're stuck on.",
          prompts: [
            "What are you learning right now, and why?",
            "Where did you get stuck this week?",
            "What's one thing you could teach someone here?",
            "What will you try before we meet again?",
          ],
        },
        {
          key: "books",
          name: "Book & Coffee",
          description:
            "Four Saturday mornings, four small bookshops. Bring whatever you're reading; nobody has to finish the book.",
          category: "exploration",
          kind: "pod" as const,
          area: areas[0],
          host: demoIds.ananya,
          cadence: "Saturdays · 4 weeks",
          joinPolicy: "open" as const,
          maxMembers: 8,
          rules: "One coffee per meet. No pressure to finish any book.",
          prompts: [
            "Week 1 — Bring a book you love and one you abandoned.",
            "Week 2 — Swap a recommendation with someone new.",
            "Week 3 — Read quietly together for twenty minutes.",
            "Week 4 — Share one line that stayed with you.",
          ],
        },
        {
          key: "quiet",
          name: "Quiet Mornings",
          description:
            "A conversation circle for people who find introductions hard. Prompts, tea, and no obligation to speak.",
          category: "social",
          kind: "conversation" as const,
          area: areas[2],
          host: demoIds.riya,
          cadence: "Sundays · 8:00 am",
          joinPolicy: "open" as const,
          maxMembers: 8,
          rules: "What's said here stays here. Passing is always allowed.",
          prompts: [
            "What brought you to this city (or kept you here)?",
            "What does a good week look like for you lately?",
            "What's something you'd like to learn from someone else?",
            "What's one small thing that made this week easier?",
          ],
        },
      ];

      for (const circle of circleSeeds) {
        const circleId = await ctx.db.insert("circles", {
          name: circle.name,
          description: circle.description,
          category: circle.category,
          kind: circle.kind,
          city,
          area: circle.area,
          hostId: circle.host,
          rules: circle.rules,
          cadence: circle.cadence,
          joinPolicy: circle.joinPolicy,
          maxMembers: circle.maxMembers,
          prompts: circle.prompts,
          isDemo: true,
          createdAt: now,
        });
        circleIds[circle.key] = circleId;

        await ctx.db.insert("circleMembers", {
          circleId,
          userId: circle.host,
          role: "host",
          status: "approved",
          joinedAt: now,
        });
        const demoKeys = Object.keys(demoIds);
        for (const memberKey of demoKeys) {
          if (demoIds[memberKey] === circle.host) continue;
          // Deterministic pseudo-membership so seeded data is reproducible.
          if (memberKey.charCodeAt(0) % 2 === 0) continue;
          await ctx.db.insert("circleMembers", {
            circleId,
            userId: demoIds[memberKey],
            role: "member",
            status: "approved",
            joinedAt: now,
          });
        }
      }

      const postSeeds = [
        {
          circle: circleIds.runners,
          author: demoIds.meera,
          body: "This Sunday: 7:00 am at the gate. 5 km easy, breakfast after for whoever's free.",
        },
        {
          circle: circleIds.runners,
          author: demoIds.riya,
          body: "I'll be walking the last kilometre. Happy to keep anyone company at the back.",
        },
        {
          circle: circleIds.films,
          author: demoIds.dev,
          body: "Voting on next month's film in the discussion. Two options, both under two hours.",
        },
        {
          circle: circleIds.learners,
          author: demoIds.kabir,
          body: "Week 2 focus: bring the smallest possible version of your project. Fifteen minutes each.",
        },
        {
          circle: circleIds.books,
          author: demoIds.ananya,
          body: "Starting at the second-hand stall this Saturday. Bring cash if you want to buy anything.",
        },
        {
          circle: circleIds.quiet,
          author: demoIds.riya,
          body: "Reminder: passing is always fine. The prompts are just a way in, not a test.",
        },
      ];
      for (const post of postSeeds) {
        await ctx.db.insert("circlePosts", {
          circleId: post.circle,
          authorId: post.author,
          body: post.body,
          kind: "discussion",
          createdAt: now,
        });
      }

      const activitySeeds = [
        {
          title: "Sunday morning run",
          description:
            "An easy 5 km around the park, regroup points every kilometre, breakfast after if people are free. First-timers and walkers genuinely welcome.",
          category: "fitness",
          kind: "activity" as const,
          area: areas[0],
          venue: venues.park,
          startsAt: nextWeekday(0, 7, 0),
          durationMins: 75,
          cost: 0,
          maxParticipants: 8,
          beginnerFriendly: true,
          equipment: "Comfortable shoes, water",
          rules: "Public park. Easy pace, no one left behind.",
          cancellationPolicy: "Cancelled by 9 pm the previous night if it's raining heavily.",
          recurrence: "weekly" as const,
          circleId: circleIds.runners,
          host: demoIds.meera,
        },
        {
          title: "Bookstore crawl + filter coffee",
          description:
            "Three second-hand bookshops on one street, then coffee to compare finds. Come with or without a book; browsing is the point.",
          category: "exploration",
          kind: "activity" as const,
          area: areas[1],
          venue: venues.books,
          startsAt: nextWeekday(6, 11, 0),
          durationMins: 150,
          cost: 350,
          maxParticipants: 5,
          beginnerFriendly: true,
          equipment: "Some cash for books (optional)",
          rules: "Public shops and a café. No home visits.",
          cancellationPolicy: "Free cancellation up to 3 hours before.",
          recurrence: "once" as const,
          circleId: circleIds.books,
          host: demoIds.ananya,
        },
        {
          title: "Beginner badminton doubles",
          description:
            "Two courts booked for an hour. We rotate pairs so nobody is stuck with the same partner. Racquets can be rented at the venue.",
          category: "sports",
          kind: "activity" as const,
          area: areas[1],
          venue: venues.sport,
          startsAt: nextWeekday(3, 19, 0),
          durationMins: 90,
          cost: 200,
          maxParticipants: 6,
          beginnerFriendly: true,
          equipment: "Sports shoes. Racquets available on rent.",
          rules: "Court booking split equally. Public sports complex.",
          cancellationPolicy: "Court fee is only collected at the venue.",
          recurrence: "once" as const,
          host: demoIds.meera,
        },
        {
          title: "Indie film + chai after",
          description:
            "This month's film society screening, followed by chai nearby for anyone who wants to talk about it. Ticket bought individually at the counter.",
          category: "entertainment",
          kind: "activity" as const,
          area: areas[2],
          venue: venues.cinema,
          startsAt: nextWeekday(0, 18, 0),
          durationMins: 180,
          cost: 300,
          maxParticipants: 6,
          beginnerFriendly: true,
          rules: "Public theatre. Buy your own ticket.",
          cancellationPolicy: "Cancel any time; tickets are individual.",
          recurrence: "monthly" as const,
          circleId: circleIds.films,
          host: demoIds.dev,
        },
        {
          title: "Python side-project evening",
          description:
            "Bring a small project or just your laptop. We work quietly for an hour, then show what we're stuck on. Beginners genuinely fine.",
          category: "learning",
          kind: "activity" as const,
          area: areas[3],
          venue: venues.study,
          startsAt: nextWeekday(4, 19, 30),
          durationMins: 120,
          cost: 0,
          maxParticipants: 5,
          beginnerFriendly: true,
          equipment: "Laptop and charger",
          rules: "Café meet. Order something if you can.",
          cancellationPolicy: "Cancelled if the café is closed.",
          recurrence: "weekly" as const,
          circleId: circleIds.learners,
          host: demoIds.kabir,
        },
        {
          title: "Saturday lakeside clean-up",
          description:
            "Two hours of picking up litter around the lake with the regular volunteers, then breakfast. Gloves and bags provided.",
          category: "contribution",
          kind: "activity" as const,
          area: areas[4],
          venue: venues.cleanup,
          startsAt: nextWeekday(6, 8, 0),
          durationMins: 120,
          cost: 0,
          maxParticipants: 12,
          beginnerFriendly: true,
          equipment: "Closed shoes. Gloves provided.",
          rules: "Public park. Follow the volunteer coordinator's instructions.",
          cancellationPolicy: "Runs in light rain; cancelled in a storm.",
          recurrence: "weekly" as const,
          host: demoIds.riya,
        },
        {
          title: "Anyone up for an evening walk?",
          description:
            "Forty minutes around the neighbourhood park, then home before dinner. Talking optional, company is the point.",
          category: "social",
          kind: "invitation" as const,
          area: areas[4],
          venue: venues.park,
          startsAt: nextWeekday(5, 18, 30),
          durationMins: 60,
          cost: 0,
          maxParticipants: 4,
          beginnerFriendly: true,
          rules: "Public park, well-lit loop.",
          cancellationPolicy: "Cancel any time before 5 pm.",
          recurrence: "once" as const,
          host: demoIds.riya,
        },
        {
          title: "Sunrise trek at Nandi Hills",
          description:
            "Early start, moderate 6 km trail, back in the city by noon. We'll pool a cab from a public pickup point; cost shared.",
          category: "nature",
          kind: "activity" as const,
          area: areas[5] ?? areas[0],
          venue: venues.trail,
          startsAt: nextWeekday(0, 5, 30),
          durationMins: 300,
          cost: 800,
          maxParticipants: 6,
          beginnerFriendly: false,
          equipment: "Trail shoes, 1.5L water, cap",
          rules: "Public trail. Stay with the group. No solo detours.",
          cancellationPolicy: "Cab share is settled on the day.",
          recurrence: "once" as const,
          host: demoIds.dev,
        },
        {
          title: "Chai and board games",
          description:
            "A table for eight at the board game café. We'll pick easy games so nobody has to learn a rulebook alone.",
          category: "social",
          kind: "activity" as const,
          area: areas[1],
          venue: venues.boards,
          startsAt: nextWeekday(6, 17, 0),
          durationMins: 150,
          cost: 250,
          maxParticipants: 8,
          beginnerFriendly: true,
          rules: "Public café. Table charge split equally.",
          cancellationPolicy: "Cancel up to 2 hours before.",
          recurrence: "once" as const,
          host: demoIds.ananya,
        },
        {
          title: "Weekend study session",
          description:
            "A quiet two-hour study block for people preparing for exams alone. Pomodoro timers, one break, no talking during focus blocks.",
          category: "learning",
          kind: "activity" as const,
          area: areas[2],
          venue: venues.study,
          startsAt: nextWeekday(6, 15, 0),
          durationMins: 120,
          cost: 0,
          maxParticipants: 6,
          beginnerFriendly: true,
          equipment: "Whatever you're studying",
          rules: "Silent focus blocks. Phones on silent.",
          cancellationPolicy: "Cancel any time.",
          recurrence: "weekly" as const,
          circleId: circleIds.learners,
          host: demoIds.kabir,
        },
      ];

      for (const seed of activitySeeds) {
        const approvedDemoAttendees = Object.values(demoIds).filter(
          (id, index) =>
            id !== seed.host && (seed.title.length + index) % 3 === 0,
        );
        const activityId = await ctx.db.insert("activities", {
          hostId: seed.host,
          title: seed.title,
          description: seed.description,
          category: seed.category,
          kind: seed.kind,
          city,
          area: seed.area,
          venue: seed.venue,
          startsAt: seed.startsAt,
          durationMins: seed.durationMins,
          cost: seed.cost,
          maxParticipants: seed.maxParticipants,
          minParticipants: 2,
          beginnerFriendly: seed.beginnerFriendly,
          accessibility: "Ground-floor public venue. Ask the host for step-free access details.",
          rules: seed.rules,
          cancellationPolicy: seed.cancellationPolicy,
          equipment: seed.equipment,
          recurrence: seed.recurrence,
          circleId: "circleId" in seed ? seed.circleId : undefined,
          status: "open",
          autoApprove: true,
          isDemo: true,
        });
        for (const attendee of approvedDemoAttendees) {
          await ctx.db.insert("joinRequests", {
            activityId,
            userId: attendee,
            status: "approved",
            createdAt: now,
            decidedAt: now,
          });
          await ctx.db.insert("attendance", {
            activityId,
            userId: attendee,
            method: "self",
            isDemo: true,
            markedAt: now,
          });
        }
      }

      await ctx.db.insert("demoSeed", {
        key: contentKey,
        city,
        seededAt: now,
      });
      contentCreated = true;
    }

    // One clearly labelled sample meetup in the member's own history, so the
    // post-meetup reconnection flow can be tried immediately. Real members are
    // never given fake attendance.
    const historyKey = `history:v3:${userId}`;
    const historyMarker = await ctx.db
      .query("demoSeed")
      .withIndex("by_key", (q) => q.eq("key", historyKey))
      .unique();

    let historyCreated = false;
    if (!historyMarker) {
      const startedAt = now - 5 * DAY;
      const sampleActivityId = await ctx.db.insert("activities", {
        hostId: demoIds.meera,
        title: "Sunday morning run (sample history)",
        description:
          "A sample past meetup added to your history so you can try the after-meetup flow. It did not actually happen.",
        category: "fitness",
        kind: "activity",
        city,
        area: areas[0],
        venue: venues.park,
        startsAt: startedAt,
        durationMins: 75,
        cost: 0,
        maxParticipants: 8,
        beginnerFriendly: true,
        rules: "Sample data.",
        cancellationPolicy: "Sample data.",
        recurrence: "once",
        status: "open",
        autoApprove: true,
        isDemo: true,
      });

      const attendees = [userId, demoIds.ananya, demoIds.kabir];
      for (const attendee of attendees) {
        await ctx.db.insert("joinRequests", {
          activityId: sampleActivityId,
          userId: attendee,
          status: "approved",
          createdAt: startedAt,
          decidedAt: startedAt,
        });
        await ctx.db.insert("attendance", {
          activityId: sampleActivityId,
          userId: attendee,
          method: attendee === userId ? "self" : "self",
          isDemo: true,
          markedAt: startedAt + 3600_000,
        });
      }
      await ctx.db.insert("journalEntries", {
        userId,
        activityId: sampleActivityId,
        title: "Sunday morning run (sample history)",
        category: "fitness",
        occurredAt: startedAt,
        durationMins: 75,
        participants: 4,
        isDemo: true,
        reflection:
          "Sample entry — edit or delete this. This is where a private note about the morning would live.",
        createdAt: now,
      });

      await ctx.db.insert("demoSeed", {
        key: historyKey,
        city,
        seededAt: now,
      });
      historyCreated = true;
    }

    return { contentCreated, historyCreated, city };
  },
});
