import { Avatar, CategoryChip } from "@/components/product/ui";
import { formatDay, formatDuration, formatMoney, formatTime, shortName } from "@/lib/format";
import { cn } from "@/lib/utils";
import { ArrowUpRight, Clock, MapPin, Users } from "lucide-react";
import { Link } from "react-router";

export type ActivityCardData = {
  activity: {
    _id: string;
    title: string;
    description: string;
    category: string;
    kind: "activity" | "invitation";
    city: string;
    area: string;
    venue: string;
    startsAt: number;
    durationMins: number;
    cost: number;
    maxParticipants: number;
    beginnerFriendly: boolean;
    recurrence: "once" | "weekly" | "biweekly" | "monthly";
    status: "open" | "cancelled";
    isDemo: boolean;
  };
  host: {
    displayName: string;
    area: string;
    isDemo: boolean;
  } | null;
  approvedCount: number;
  spotsLeft: number;
  myStatus: string;
  attended: boolean;
};

const statusLabel: Record<string, string> = {
  host: "You're hosting",
  approved: "You're going",
  pending: "Request sent",
  declined: "Not accepted",
  withdrawn: "Withdrawn",
};

export function ActivityCard({ data }: { data: ActivityCardData }) {
  const { activity, host, spotsLeft, myStatus } = data;
  const status = statusLabel[myStatus];

  return (
    <Link
      to={`/activity/${activity._id}`}
      className="group flex flex-col rounded-2xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-warm"
    >
      <div className="flex items-start justify-between gap-2">
        <CategoryChip category={activity.category} />
        <div className="flex items-center gap-1.5">
          {activity.isDemo ? (
            <span className="rounded-full border border-dashed border-[oklch(0.62_0.08_80)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[oklch(0.45_0.06_75)]">
              demo
            </span>
          ) : null}
          {status ? (
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                myStatus === "approved" || myStatus === "host"
                  ? "bg-secondary text-secondary-foreground"
                  : "bg-muted text-muted-foreground",
              )}
            >
              {status}
            </span>
          ) : null}
        </div>
      </div>

      <h3 className="mt-3 font-display text-xl leading-6 text-foreground">
        {activity.title}
      </h3>
      <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted-foreground">
        {activity.description}
      </p>

      <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
        <p className="flex items-center gap-2">
          <Clock className="size-3.5 text-primary/70" />
          <span className="font-medium text-foreground">
            {formatDay(activity.startsAt)}
          </span>
          {formatTime(activity.startsAt)} · {formatDuration(activity.durationMins)}
        </p>
        <p className="flex items-center gap-2">
          <MapPin className="size-3.5 text-primary/70" />
          <span className="truncate">
            {activity.venue} · {activity.area}
          </span>
        </p>
      </div>

      <div className="mt-auto flex items-end justify-between gap-3 border-t border-border pt-3.5">
        <div className="flex min-w-0 items-center gap-2.5">
          {host ? (
            <>
              <Avatar name={host.displayName} size="sm" />
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-foreground">
                  {shortName(host.displayName)}
                  {host.isDemo ? (
                    <span className="ml-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                      demo
                    </span>
                  ) : null}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  {activity.beginnerFriendly ? "Beginner friendly" : "Some experience helpful"}
                </p>
              </div>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">Host unavailable</p>
          )}
        </div>
        <div className="shrink-0 text-right">
          <p className="text-xs font-semibold text-foreground">
            {formatMoney(activity.cost)}
          </p>
          <p className="flex items-center justify-end gap-1 text-[11px] text-muted-foreground">
            <Users className="size-3" /> {spotsLeft} left
          </p>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
        <span>See the plan</span>
        <ArrowUpRight className="size-3.5" />
      </div>
    </Link>
  );
}
