import { Avatar, EmptyState } from "@/components/product/ui";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatDay, shortName } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { CalendarPlus, HeartHandshake, Lock } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

export default function Connections() {
  const connections = useQuery(api.reconnect.myConnections);
  const removeConnection = useMutation(api.reconnect.removeConnection);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const doRemove = async (connectionId: string) => {
    try {
      await removeConnection({ connectionId: connectionId as Id<"connections"> });
      setConfirmId(null);
      toast.success("Connection removed. You can meet again through a new plan.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not remove the connection.");
    }
  };

  return (
    <div>
      <header className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          Connections
        </p>
        <h1 className="mt-2 font-display text-3xl">People who also said yes.</h1>
        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
          A connection only appears here after you've both chosen to reconnect.
          Neither of you sees the other's answer before that.
        </p>
      </header>

      {connections === undefined ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {[0, 1].map((index) => (
            <Skeleton key={index} className="h-40 rounded-2xl" />
          ))}
        </div>
      ) : connections.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            icon={<HeartHandshake className="size-5" />}
            title="No connections yet"
            description="After a plan, you'll be asked privately whether you'd like to see each person again. Say yes and it stays private until they do too."
            action={
              <div className="flex flex-wrap justify-center gap-2">
                <Button asChild>
                  <Link to="/discover">Find a plan</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/plans">See your history</Link>
                </Button>
              </div>
            }
          />
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {connections.map((connection) => (
            <article
              key={connection._id}
              className="flex flex-col rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex items-center gap-3">
                <Avatar name={connection.person.displayName} size="lg" />
                <div className="min-w-0">
                  <p className="font-display text-xl leading-6">
                    {shortName(connection.person.displayName)}
                    {connection.person.isDemo ? (
                      <span className="ml-1.5 align-middle text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                        demo
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {connection.person.area} · {connection.person.city}
                  </p>
                </div>
              </div>

              {connection.person.bio ? (
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {connection.person.bio}
                </p>
              ) : null}

              <dl className="mt-3 space-y-1 text-[11px] text-muted-foreground">
                {connection.activityTitle ? (
                  <div>
                    <dt className="inline font-medium text-foreground">Met at: </dt>
                    <dd className="inline">{connection.activityTitle}</dd>
                  </div>
                ) : null}
                <div>
                  <dt className="inline font-medium text-foreground">Connected: </dt>
                  <dd className="inline">{formatDay(connection.createdAt)}</dd>
                </div>
              </dl>

              <p className="mt-3 flex items-start gap-1.5 rounded-lg bg-muted/50 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
                <Lock className="mt-0.5 size-3 shrink-0" />
                Contact details are never shared automatically. Exchange them only if
                you both want to.
              </p>

              <Button className="mt-3 w-full gap-2" variant="outline" asChild>
                <Link
                  to={`/create?title=${encodeURIComponent(
                    `Coffee with ${shortName(connection.person.displayName)}`,
                  )}`}
                >
                  <CalendarPlus className="size-4" /> Plan something else
                </Link>
              </Button>

              {confirmId === connection._id ? (
                <div className="mt-2 rounded-lg bg-destructive/5 px-3 py-2">
                  <p className="text-[11px] text-muted-foreground">
                    Remove this connection? Private answers between you are deleted.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Button size="sm" variant="ghost" onClick={() => setConfirmId(null)}>
                      Keep
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => doRemove(connection._id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmId(connection._id)}
                  className="mt-2 self-start text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Remove connection
                </button>
              )}
            </article>
          ))}
        </div>
      )}

      <div className="mt-8 rounded-xl bg-secondary/50 px-4 py-3 text-[11px] leading-5 text-secondary-foreground">
        <p className="font-medium">How a connection is created</p>
        <p className="mt-1">
          Each person independently answers yes, maybe or no after the same plan.
          Only two clear yes answers create a connection. A “maybe” stays private
          and never appears to the other person. Blocking removes any pending
          private answers between two people.
        </p>
      </div>
    </div>
  );
}
