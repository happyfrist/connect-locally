import { ActivityCard } from "@/components/product/ActivityCard";
import { EmptyState } from "@/components/product/ui";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { CalendarCheck, CalendarPlus, Inbox, Plus } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";

type Tab = "upcoming" | "hosting" | "past";

export default function Plans() {
  const plans = useQuery(api.activities.myPlans);
  const [tab, setTab] = useState<Tab>("upcoming");
  const [now] = useState(() => Date.now());

  if (plans === undefined) {
    return (
      <div>
        <Skeleton className="h-10 w-64" />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const sortByStart = <T extends { activity: { startsAt: number } }>(rows: T[]) =>
    [...rows].sort((a, b) => a.activity.startsAt - b.activity.startsAt);

  const upcoming = sortByStart([...plans.upcoming, ...plans.hosting]);
  const past = [...plans.past, ...plans.hostingPast].sort(
    (a, b) => b.activity.startsAt - a.activity.startsAt,
  );
  const hosting = sortByStart(plans.hosting);
  const pendingTotal = hosting.reduce((sum, row) => sum + row.pendingCount, 0);

  const rows = tab === "upcoming" ? upcoming : tab === "hosting" ? hosting : past;

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            My plans
          </p>
          <h1 className="mt-2 font-display text-3xl">What's coming up.</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Requests, approvals and the plans you're part of. No streaks.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/create">
            <Plus className="size-4" /> New plan
          </Link>
        </Button>
      </header>

      {pendingTotal > 0 ? (
        <Link
          to="/plans"
          onClick={() => setTab("hosting")}
          className="mt-5 flex items-center gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3 text-sm transition-colors hover:bg-primary/10"
        >
          <Inbox className="size-4 text-primary" />
          <span>
            <span className="font-medium">
              {pendingTotal} join request{pendingTotal === 1 ? "" : "s"} waiting
            </span>{" "}
            <span className="text-muted-foreground">for your decision</span>
          </span>
        </Link>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1">
        {(
          [
            ["upcoming", `Upcoming (${upcoming.length})`],
            ["hosting", `Hosting (${hosting.length})`],
            ["past", `Past (${past.length})`],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              tab === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {rows.length === 0 ? (
        <div className="mt-4">
          {tab === "upcoming" ? (
            <EmptyState
              icon={<CalendarPlus className="size-5" />}
              title="Nothing on the calendar"
              description="Join a plan in Discover, or put one on the calendar yourself. A plan with two people is a plan."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  <Button asChild>
                    <Link to="/discover">Find a plan</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/create">Host one</Link>
                  </Button>
                </div>
              }
            />
          ) : tab === "hosting" ? (
            <EmptyState
              icon={<CalendarCheck className="size-5" />}
              title="You're not hosting anything yet"
              description="Hosting is how most people meet their first few members. Pick something you'd do anyway and make room for two or three others."
              action={
                <Button asChild>
                  <Link to="/create">Host a plan</Link>
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={<CalendarCheck className="size-5" />}
              title="No past plans yet"
              description="After a plan happens, mark that you were there. It creates a private journal entry and opens the mutual reconnection step."
              action={
                <Button variant="outline" asChild>
                  <Link to="/discover">Find something this week</Link>
                </Button>
              }
            />
          )}
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {rows.map((row) => (
            <div key={row.activity._id}>
              <ActivityCard data={row} />
              {row.pendingCount > 0 ? (
                <Link
                  to={`/activity/${row.activity._id}`}
                  className="mt-2 flex items-center justify-between rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-[11px] font-medium text-primary hover:bg-primary/10"
                >
                  <span>
                    {row.pendingCount} request{row.pendingCount === 1 ? "" : "s"} waiting
                  </span>
                  <span>Review →</span>
                </Link>
              ) : row.myStatus === "approved" && !row.attended && row.activity.startsAt < now ? (
                <Link
                  to={`/activity/${row.activity._id}`}
                  className="mt-2 flex items-center justify-between rounded-xl border border-border bg-card px-3 py-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  <span>Did you make it?</span>
                  <span>Check in →</span>
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <p className="mt-8 rounded-xl bg-muted/60 px-4 py-3 text-[11px] leading-5 text-muted-foreground">
        My Plans shows only what you're part of. Hosts can approve or decline
        requests, publish updates and cancel a plan. Everyone who requested a spot
        is notified in-app when something changes.
      </p>
    </div>
  );
}
