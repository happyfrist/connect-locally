import { ReportDialog } from "@/components/product/ReportDialog";
import { Avatar, CategoryChip } from "@/components/product/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { formatWhen, shortName, timeAgo } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  Check,
  Flag,
  Loader2,
  Lock,
  MapPin,
  MessageCircle,
  Plus,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router";
import { toast } from "sonner";

const KIND_LABEL: Record<string, string> = {
  pod: "Friendship pod",
  community: "Community",
  conversation: "Conversation circle",
};

export default function CircleDetail() {
  const { circleId } = useParams();
  const detail = useQuery(
    api.circles.get,
    circleId ? { circleId: circleId as Id<"circles"> } : "skip",
  );
  const join = useMutation(api.circles.join);
  const leaveCircle = useMutation(api.circles.leave);
  const decideMember = useMutation(api.circles.decideMember);
  const post = useMutation(api.circles.post);

  const [busy, setBusy] = useState<string | null>(null);
  const [postBody, setPostBody] = useState("");

  if (detail === undefined) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (detail === null) {
    return (
      <div className="py-20 text-center">
        <h1 className="font-display text-2xl">This circle isn't available</h1>
        <Button asChild className="mt-4">
          <Link to="/circles">Back to circles</Link>
        </Button>
      </div>
    );
  }

  const { circle, host, members, pendingMembers, isMember, isHost } = detail;

  const doJoin = async () => {
    setBusy("join");
    try {
      const status = await join({ circleId: circle._id });
      toast.success(
        status === "approved" ? "You're in." : "Request sent to the host.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not join.");
    } finally {
      setBusy(null);
    }
  };

  const doLeave = async () => {
    setBusy("leave");
    try {
      await leaveCircle({ circleId: circle._id });
      toast.success("You've left the circle. No hard feelings.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not leave.");
    } finally {
      setBusy(null);
    }
  };

  const doDecide = async (requestId: string, decision: "approved" | "declined") => {
    setBusy(requestId);
    try {
      await decideMember({
        circleId: circle._id,
        requestId: requestId as Id<"circleMembers">,
        decision,
      });
      toast.success(decision === "approved" ? "Member approved" : "Request declined");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update.");
    } finally {
      setBusy(null);
    }
  };

  const doPost = async () => {
    setBusy("post");
    try {
      await post({ circleId: circle._id, body: postBody, kind: "discussion" });
      setPostBody("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <Link
        to="/circles"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> All circles
      </Link>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1.55fr_1fr] lg:items-start">
        <div className="space-y-5">
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-center gap-2">
              <CategoryChip category={circle.category} />
              <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {KIND_LABEL[circle.kind]}
              </span>
              {circle.isDemo ? (
                <span className="rounded-full border border-dashed border-[oklch(0.62_0.08_80)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[oklch(0.45_0.06_75)]">
                  demo content
                </span>
              ) : null}
            </div>
            <h1 className="mt-3 font-display text-3xl leading-tight">{circle.name}</h1>
            <p className="mt-3 text-sm leading-7 text-muted-foreground">
              {circle.description}
            </p>
            <div className="mt-5 grid gap-2 sm:grid-cols-2">
              <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs">
                <CalendarDays className="size-3.5 text-primary" /> {circle.cadence}
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs">
                <MapPin className="size-3.5 text-primary" /> {circle.area}, {circle.city}
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs">
                <Users className="size-3.5 text-primary" /> {members.length} member
                {members.length === 1 ? "" : "s"}
                {circle.maxMembers ? ` of ${circle.maxMembers}` : ""}
              </div>
              <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs">
                <Lock className="size-3.5 text-primary" />{" "}
                {circle.joinPolicy === "open" ? "Open to join" : "Host approves members"}
              </div>
            </div>

            {circle.rules ? (
              <div className="mt-5 rounded-xl border border-border p-4">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Circle rules
                </p>
                <p className="mt-1.5 text-xs leading-5">{circle.rules}</p>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap items-center gap-2">
              {isMember ? (
                <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
                  <Check className="size-3.5" /> You're a member
                </span>
              ) : detail.membershipStatus === "pending" ? (
                <span className="rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground">
                  Request pending
                </span>
              ) : (
                <Button onClick={doJoin} disabled={busy === "join"} className="gap-2">
                  {busy === "join" ? <Loader2 className="size-4 animate-spin" /> : null}
                  {circle.joinPolicy === "open" ? "Join this circle" : "Ask to join"}
                </Button>
              )}
              {isMember && !isHost ? (
                <Button variant="ghost" size="sm" onClick={doLeave} disabled={busy === "leave"}>
                  Leave circle
                </Button>
              ) : null}
              {isMember ? (
                <Button variant="outline" size="sm" asChild className="gap-1.5">
                  <Link to={`/create?circle=${circle._id}`}>
                    <Plus className="size-3.5" /> Add a plan
                  </Link>
                </Button>
              ) : null}
              <div className="ml-auto">
                <ReportDialog
                  targetType="circle"
                  targetId={circle._id}
                  targetLabel={circle.name}
                  trigger={
                    <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground">
                      <Flag className="size-3.5" /> Report
                    </Button>
                  }
                />
              </div>
            </div>
          </section>

          {detail.prompts.length > 0 ? (
            <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-xl">
                {circle.kind === "conversation" ? "Conversation prompts" : "The arc"}
              </h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Prompts are an invitation, never an obligation. Passing is always
                allowed.
              </p>
              <ol className="mt-4 space-y-2">
                {detail.prompts.map((prompt, index) => (
                  <li
                    key={prompt}
                    className="flex gap-3 rounded-xl bg-muted/40 px-4 py-3 text-sm leading-6"
                  >
                    <span className="font-display text-lg text-primary/50">
                      {index + 1}
                    </span>
                    {prompt}
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <CalendarDays className="size-4 text-primary" />
              <h2 className="font-display text-xl">Meeting up</h2>
            </div>
            {detail.activities.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No upcoming plans attached to this circle yet. Members can add one.
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {detail.activities.map((activity) => (
                  <li key={activity._id}>
                    <Link
                      to={`/activity/${activity._id}`}
                      className="flex items-center gap-3 rounded-xl border border-border px-4 py-3 transition-colors hover:border-primary/40"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{activity.title}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatWhen(activity.startsAt)} · {activity.area}
                        </p>
                      </div>
                      <ArrowUpRight className="size-4 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {!detail.activities.length && isMember ? (
              <Button asChild size="sm" variant="outline" className="mt-3">
                <Link to={`/create?circle=${circle._id}`}>Add the first plan</Link>
              </Button>
            ) : null}
          </section>

          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <MessageCircle className="size-4 text-primary" />
              <h2 className="font-display text-xl">Discussion</h2>
            </div>

            {!isMember ? (
              <p className="mt-3 flex items-start gap-2 rounded-xl bg-muted/50 px-4 py-3 text-xs leading-5 text-muted-foreground">
                <Lock className="mt-0.5 size-3.5 shrink-0" />
                Discussions are visible to approved members only. Join to read and
                reply.
              </p>
            ) : (
              <>
                <div className="mt-3 flex gap-2">
                  <Input
                    value={postBody}
                    onChange={(event) => setPostBody(event.target.value)}
                    placeholder="A short note for the circle…"
                    maxLength={600}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && postBody.trim().length >= 2) {
                        doPost();
                      }
                    }}
                  />
                  <Button
                    onClick={doPost}
                    disabled={postBody.trim().length < 2 || busy === "post"}
                  >
                    {busy === "post" ? <Loader2 className="size-4 animate-spin" /> : "Post"}
                  </Button>
                </div>

                {detail.posts.length === 0 ? (
                  <p className="mt-4 text-sm text-muted-foreground">
                    No posts yet. Keep it to coordination, not an endless feed.
                  </p>
                ) : (
                  <ul className="mt-4 space-y-3">
                    {detail.posts.map((item) => (
                      <li key={item._id} className="rounded-xl bg-muted/40 px-4 py-3">
                        <div className="flex items-center gap-2">
                          {item.author ? (
                            <Avatar name={item.author.displayName} size="sm" />
                          ) : null}
                          <p className="text-xs font-medium">
                            {item.author
                              ? shortName(item.author.displayName)
                              : "Member"}
                          </p>
                          <span className="text-[10px] text-muted-foreground">
                            {timeAgo(item.createdAt)}
                          </span>
                        </div>
                        <p className="mt-2 text-sm leading-6">{item.body}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </section>
        </div>

        <aside className="space-y-4">
          {host ? (
            <div className="rounded-2xl border border-border bg-card p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                Host
              </p>
              <div className="mt-3 flex items-center gap-3">
                <Avatar name={host.displayName} size="lg" />
                <div className="min-w-0">
                  <p className="font-display text-lg leading-6">
                    {shortName(host.displayName)}
                    {host.isDemo ? (
                      <span className="ml-1.5 align-middle text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                        demo
                      </span>
                    ) : null}
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {host.area} · {host.languages.join(", ")}
                  </p>
                </div>
              </div>
              {host.bio ? (
                <p className="mt-3 text-xs leading-5 text-muted-foreground">{host.bio}</p>
              ) : null}
            </div>
          ) : null}

          <div className="rounded-2xl border border-border bg-card p-5">
            <h2 className="font-display text-lg">
              Members <span className="text-xs text-muted-foreground">({members.length})</span>
            </h2>
            <ul className="mt-3 space-y-2">
              {members.map((member) => (
                <li key={member.userId} className="flex items-center gap-2.5">
                  <Avatar name={member.displayName} size="sm" />
                  <p className="min-w-0 flex-1 truncate text-xs">
                    {shortName(member.displayName)}
                  </p>
                  {member.role === "host" ? (
                    <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                      host
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>

          {isHost && pendingMembers.length > 0 ? (
            <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
              <h2 className="font-display text-lg">Membership requests</h2>
              <ul className="mt-3 space-y-3">
                {pendingMembers.map((member) => (
                  <li key={member.requestId}>
                    {member.person ? (
                      <div className="flex items-center gap-2">
                        <Avatar name={member.person.displayName} size="sm" />
                        <p className="min-w-0 flex-1 truncate text-xs">
                          {shortName(member.person.displayName)}
                        </p>
                      </div>
                    ) : null}
                    <div className="mt-2 flex gap-2">
                      <Button
                        size="sm"
                        className="h-7 gap-1 text-[11px]"
                        onClick={() => doDecide(member.requestId, "approved")}
                        disabled={busy === member.requestId}
                      >
                        <Check className="size-3" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 gap-1 text-[11px]"
                        onClick={() => doDecide(member.requestId, "declined")}
                        disabled={busy === member.requestId}
                      >
                        <X className="size-3" /> Decline
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-2xl border border-dashed border-border p-5">
            <p className="text-xs font-medium">Group expectations</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              Conversation circles are peer discussion, not therapy. Facilitators
              are not counsellors. No one is required to disclose personal
              information, and confidentiality has limits where safety is at risk.
            </p>
            <Link
              to="/safety"
              className="mt-2 inline-block text-[11px] font-medium text-primary hover:underline"
            >
              Read the group safety guidance
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}
