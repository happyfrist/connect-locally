import { Avatar, CategoryChip, EmptyState } from "@/components/product/ui";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { CalendarDays, Loader2, Plus, Users } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

type Kind = "all" | "pod" | "community" | "conversation";

const KIND_LABEL: Record<string, string> = {
  pod: "Friendship pod",
  community: "Community",
  conversation: "Conversation circle",
};

export default function Circles() {
  const [kind, setKind] = useState<Kind>("all");
  const circles = useQuery(api.circles.list, kind === "all" ? {} : { kind });
  const join = useMutation(api.circles.join);
  const [busy, setBusy] = useState<string | null>(null);

  const doJoin = async (circleId: string) => {
    setBusy(circleId);
    try {
      const status = await join({ circleId: circleId as any });
      toast.success(
        status === "approved"
          ? "You're in. The circle's discussions are now visible."
          : "Request sent. The host will review it.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not join the circle.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Circles
          </p>
          <h1 className="mt-2 font-display text-3xl">
            The same faces, more than once.
          </h1>
          <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
            Small recurring groups, four-week pods and quiet conversation circles.
            Membership is for showing up, not for a group chat that never sleeps.
          </p>
        </div>
        <Button asChild className="gap-2">
          <Link to="/create?tab=circle">
            <Plus className="size-4" /> Start a circle
          </Link>
        </Button>
      </header>

      <div className="mt-6 flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1">
        {(
          [
            ["all", "All circles"],
            ["pod", "Friendship pods"],
            ["community", "Communities"],
            ["conversation", "Conversation"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setKind(key)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              kind === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {circles === undefined ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {[0, 1, 2, 3].map((index) => (
            <Skeleton key={index} className="h-52 rounded-2xl" />
          ))}
        </div>
      ) : circles.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<Users className="size-5" />}
            title="No circles in this city yet"
            description="Start one around something you already do. A four-week pod works better than a group with no next meeting."
            action={
              <Button asChild>
                <Link to="/create?tab=circle">Start the first circle</Link>
              </Button>
            }
          />
        </div>
      ) : (
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {circles.map((circle) => (
            <article
              key={circle._id}
              className="flex flex-col rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <CategoryChip category={circle.category} />
                <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {KIND_LABEL[circle.kind]}
                </span>
              </div>

              <Link to={`/circles/${circle._id}`} className="mt-3">
                <h2 className="font-display text-xl leading-6 hover:text-primary">
                  {circle.name}
                </h2>
              </Link>
              <p className="mt-1.5 line-clamp-3 text-sm leading-6 text-muted-foreground">
                {circle.description}
              </p>

              <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                <p className="flex items-center gap-2">
                  <CalendarDays className="size-3.5 text-primary/70" />
                  {circle.cadence}
                </p>
                <p className="flex items-center gap-2">
                  <Users className="size-3.5 text-primary/70" />
                  {circle.memberCount} member{circle.memberCount === 1 ? "" : "s"}
                  {circle.maxMembers ? ` · up to ${circle.maxMembers}` : ""} ·{" "}
                  {circle.area}
                </p>
              </div>

              <div className="mt-auto flex items-center gap-2 border-t border-border pt-4">
                {circle.host ? (
                  <div className="flex min-w-0 items-center gap-2">
                    <Avatar name={circle.host.displayName} size="sm" />
                    <div className="min-w-0">
                      <p className="truncate text-[11px] font-medium">
                        {circle.host.displayName}
                        {circle.isDemo ? (
                          <span className="ml-1 text-[9px] uppercase tracking-wider text-muted-foreground">
                            demo
                          </span>
                        ) : null}
                      </p>
                      <p className="text-[10px] text-muted-foreground">Host</p>
                    </div>
                  </div>
                ) : null}

                <div className="ml-auto">
                  {circle.membershipStatus === "approved" ? (
                    <Button size="sm" variant="outline" asChild>
                      <Link to={`/circles/${circle._id}`}>Open circle</Link>
                    </Button>
                  ) : circle.membershipStatus === "pending" ? (
                    <span className="rounded-full bg-muted px-3 py-1.5 text-[11px] text-muted-foreground">
                      Requested
                    </span>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => doJoin(circle._id)}
                      disabled={busy === circle._id}
                      className="gap-1.5"
                    >
                      {busy === circle._id ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : null}
                      {circle.joinPolicy === "open" ? "Join" : "Ask to join"}
                    </Button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="mt-8 rounded-xl bg-muted/60 px-4 py-3 text-[11px] leading-5 text-muted-foreground">
        Pods run on a four-week arc: introductions, shared exploration, a group
        activity, then a reflection and a choice about whether to continue. Leaving
        is always allowed and never punished.
      </p>
    </div>
  );
}
