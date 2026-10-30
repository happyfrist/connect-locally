import { ReportDialog } from "@/components/product/ReportDialog";
import { Avatar, CategoryChip } from "@/components/product/ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CATEGORY_MAP, RECONNECT_LABELS } from "@/convex/lib/catalog";
import {
  formatDay,
  formatDuration,
  formatEnd,
  formatMoney,
  formatTime,
  shortName,
  timeAgo,
} from "@/lib/format";
import { cn } from "@/lib/utils";
import { useMutation, useQuery } from "convex/react";
import {
  Accessibility,
  ArrowLeft,
  BadgeCheck,
  Ban,
  CalendarDays,
  Check,
  Clock,
  Flag,
  Loader2,
  Lock,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Ticket,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";

export default function Activity() {
  const { activityId } = useParams();
  const navigate = useNavigate();
  const detail = useQuery(
    api.activities.get,
    activityId ? { activityId: activityId as Id<"activities"> } : "skip",
  );

  const requestJoin = useMutation(api.activities.requestJoin);
  const withdraw = useMutation(api.activities.withdraw);
  const decide = useMutation(api.activities.decideRequest);
  const markAttendance = useMutation(api.activities.markAttendance);
  const postUpdate = useMutation(api.activities.postUpdate);
  const cancelActivity = useMutation(api.activities.cancel);
  const reconnect = useMutation(api.reconnect.decide);
  const blockMember = useMutation(api.safety.block);

  const [joinOpen, setJoinOpen] = useState(false);
  const [joinNote, setJoinNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [updateBody, setUpdateBody] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [blockOpen, setBlockOpen] = useState(false);

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
        <h1 className="font-display text-2xl">This plan isn't available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          It may have been removed, or one of you has blocked the other.
        </p>
        <Button asChild className="mt-5">
          <Link to="/discover">Back to discover</Link>
        </Button>
      </div>
    );
  }

  const { activity, host, isHost, participants, reconnectCandidates } = detail;
  const category = CATEGORY_MAP[activity.category];
  const started = activity.startsAt <= Date.now();
  const cancelled = activity.status === "cancelled";
  const spotsLeft = activity.maxParticipants - participants.length;
  const canAttend =
    (isHost || detail.myRequestStatus === "approved") && started && !cancelled;

  const doRequest = async () => {
    setBusy("join");
    try {
      const status = await requestJoin({
        activityId: activity._id,
        message: joinNote.trim() || undefined,
      });
      setJoinOpen(false);
      setJoinNote("");
      toast.success(
        status === "approved"
          ? "You're in. This demo host approves requests instantly."
          : "Request sent. The host will see it in their plans.",
      );
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send the request.");
    } finally {
      setBusy(null);
    }
  };

  const doWithdraw = async () => {
    setBusy("withdraw");
    try {
      await withdraw({ activityId: activity._id });
      toast.success("You've left this plan. No explanation needed.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not leave the plan.");
    } finally {
      setBusy(null);
    }
  };

  const doDecide = async (requestId: string, decision: "approved" | "declined") => {
    setBusy(requestId);
    try {
      await decide({ requestId: requestId as Id<"joinRequests">, decision });
      toast.success(decision === "approved" ? "Approved" : "Declined");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update the request.");
    } finally {
      setBusy(null);
    }
  };

  const doAttend = async () => {
    setBusy("attend");
    try {
      await markAttendance({ activityId: activity._id });
      toast.success("Checked in. Your private journal has a new entry.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not check in.");
    } finally {
      setBusy(null);
    }
  };

  const doReconnect = async (targetId: string, decision: "yes" | "maybe" | "no") => {
    setBusy(targetId);
    try {
      const result = await reconnect({
        activityId: activity._id,
        targetId: targetId as Id<"users">,
        decision,
      });
      if (result.connected) {
        toast.success("You're connected — you both said yes.");
      } else if (decision === "yes") {
        toast.success("Saved privately. Nothing is shared unless they also say yes.");
      } else {
        toast.success("Saved. They'll never see this answer.");
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your answer.");
    } finally {
      setBusy(null);
    }
  };

  const doUpdate = async () => {
    setBusy("update");
    try {
      await postUpdate({ activityId: activity._id, body: updateBody });
      setUpdateBody("");
      toast.success("Update posted to everyone joining.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post the update.");
    } finally {
      setBusy(null);
    }
  };

  const doCancel = async () => {
    setBusy("cancel");
    try {
      await cancelActivity({ activityId: activity._id, reason: cancelReason });
      setCancelOpen(false);
      toast.success("Plan cancelled. Everyone who requested a spot has been informed in-app.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel the plan.");
    } finally {
      setBusy(null);
    }
  };

  const doBlock = async () => {
    if (!host) return;
    setBusy("block");
    try {
      await blockMember({ userId: host.userId });
      setBlockOpen(false);
      toast.success("Blocked. You won't see each other's plans or profiles.");
      navigate("/discover");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not block this member.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <Link
        to="/discover"
        className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Back to discover
      </Link>

      {cancelled ? (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
          <Ban className="mt-0.5 size-4 shrink-0 text-destructive" />
          <div>
            <p className="font-medium text-foreground">This plan was cancelled</p>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground">
              {activity.cancelReason ?? "The host cancelled this plan."}
            </p>
          </div>
        </div>
      ) : null}

      <div className="mt-4 grid gap-6 lg:grid-cols-[1.6fr_1fr] lg:items-start">
        <div className="space-y-6">
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex flex-wrap items-center gap-2">
              <CategoryChip category={activity.category} />
              <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground">
                {activity.kind === "invitation" ? "Open invitation" : "Hosted plan"}
              </span>
              {activity.isDemo ? (
                <span className="rounded-full border border-dashed border-[oklch(0.62_0.08_80)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[oklch(0.45_0.06_75)]">
                  demo content
                </span>
              ) : null}
              {activity.beginnerFriendly ? (
                <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground">
                  Beginner friendly
                </span>
              ) : null}
            </div>

            <h1 className="mt-4 max-w-2xl font-display text-3xl leading-tight sm:text-4xl">
              {activity.title}
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">
              {activity.description}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <Detail icon={<CalendarDays className="size-4" />} label="When">
                {formatDay(activity.startsAt)} · {formatTime(activity.startsAt)} —{" "}
                {formatEnd(activity.startsAt, activity.durationMins)}
              </Detail>
              <Detail icon={<MapPin className="size-4" />} label="Public venue">
                {activity.venue}, {activity.area}
              </Detail>
              <Detail icon={<Clock className="size-4" />} label="Duration">
                {formatDuration(activity.durationMins)}
              </Detail>
              <Detail icon={<Wallet className="size-4" />} label="Expected cost">
                {formatMoney(activity.cost)}
                {activity.costNote ? ` · ${activity.costNote}` : ""}
              </Detail>
              <Detail icon={<Users className="size-4" />} label="Group size">
                {participants.length} of {activity.maxParticipants} spots filled
                {spotsLeft > 0 ? ` · ${spotsLeft} left` : " · full"}
              </Detail>
              <Detail icon={<BadgeCheck className="size-4" />} label="Repeats">
                {activity.recurrence === "once"
                  ? "One-time plan"
                  : activity.recurrence === "weekly"
                    ? "Every week"
                    : activity.recurrence === "biweekly"
                      ? "Every two weeks"
                      : "Monthly"}
              </Detail>
            </div>

            <div className="mt-6 grid gap-4 border-t border-border pt-5 sm:grid-cols-2">
              {activity.equipment ? (
                <InfoBlock title="What to bring">{activity.equipment}</InfoBlock>
              ) : null}
              {activity.rules ? (
                <InfoBlock title="House rules">{activity.rules}</InfoBlock>
              ) : null}
              {activity.accessibility ? (
                <InfoBlock title="Accessibility">
                  <span className="flex items-start gap-1.5">
                    <Accessibility className="mt-0.5 size-3.5 shrink-0" />
                    {activity.accessibility}
                  </span>
                </InfoBlock>
              ) : null}
              {activity.cancellationPolicy ? (
                <InfoBlock title="If it doesn't happen">
                  {activity.cancellationPolicy}
                </InfoBlock>
              ) : null}
            </div>
          </section>

          {/* Host updates */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <div className="flex items-center gap-2">
              <MessageCircle className="size-4 text-primary" />
              <h2 className="font-display text-xl">Updates from the host</h2>
            </div>
            {detail.updates.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">
                No updates yet. Everything you need is above.
              </p>
            ) : (
              <ul className="mt-4 space-y-3">
                {detail.updates.map((update) => (
                  <li key={update._id} className="rounded-xl bg-muted/50 px-4 py-3">
                    <p className="text-sm leading-6">{update.body}</p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {update.authorName} · {timeAgo(update.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {isHost && !cancelled ? (
              <div className="mt-4 border-t border-border pt-4">
                <Label htmlFor="update">Post an update to everyone joining</Label>
                <Textarea
                  id="update"
                  value={updateBody}
                  onChange={(event) => setUpdateBody(event.target.value)}
                  placeholder="Meeting point changed to the north gate, still 7 am."
                  rows={2}
                  maxLength={500}
                  className="mt-1.5 resize-none"
                />
                <Button
                  size="sm"
                  className="mt-2"
                  onClick={doUpdate}
                  disabled={updateBody.trim().length < 3 || busy === "update"}
                >
                  {busy === "update" ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  Publish update
                </Button>
              </div>
            ) : null}
          </section>

          {/* Participants */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl">
              Who's coming{" "}
              <span className="text-sm font-normal text-muted-foreground">
                ({participants.length + 1} including the host)
              </span>
            </h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Everyone here was approved by the host. Names only — no contact
              details are shared.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {host ? (
                <PersonRow person={host} role="Host" />
              ) : null}
              {participants.map((person) => (
                <PersonRow key={person.userId} person={person} role="Going" />
              ))}
              {participants.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No one else has joined yet. First-timers welcome.
                </p>
              ) : null}
            </div>
          </section>

          {/* After meetup */}
          {detail.hasAttended ? (
            <section className="rounded-2xl border border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-primary" />
                <h2 className="font-display text-xl">Would you like to see them again?</h2>
              </div>
              <p className="mt-1.5 max-w-xl text-sm leading-6 text-muted-foreground">
                Your answer is private. The other person never sees it unless you
                both say a clear yes — then you're connected and can plan something
                else.
              </p>
              {detail.attendanceIsDemo ? (
                <p className="mt-3 inline-flex rounded-full border border-dashed border-[oklch(0.62_0.08_80)] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-[oklch(0.45_0.06_75)]">
                  sample history · demo attendees
                </p>
              ) : null}

              {reconnectCandidates.length === 0 ? (
                <p className="mt-4 rounded-xl bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
                  No one else has checked in yet. You can come back to this later.
                </p>
              ) : (
                <ul className="mt-4 space-y-3">
                  {reconnectCandidates.map((candidate) => (
                    <li
                      key={candidate.userId}
                      className="rounded-xl border border-border p-3.5"
                    >
                      <div className="flex flex-wrap items-center gap-3">
                        <Avatar name={candidate.displayName} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium">
                            {shortName(candidate.displayName)}
                            {candidate.isDemo ? (
                              <span className="ml-2 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                                demo
                              </span>
                            ) : null}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {candidate.area}
                          </p>
                        </div>
                        {candidate.connected ? (
                          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-[11px] font-medium text-secondary-foreground">
                            <Check className="size-3" /> Connected
                          </span>
                        ) : null}
                      </div>

                      {!candidate.connected ? (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {(["yes", "maybe", "no"] as const).map((decision) => (
                            <button
                              key={decision}
                              type="button"
                              disabled={busy === candidate.userId}
                              onClick={() => doReconnect(candidate.userId, decision)}
                              className={cn(
                                "rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors disabled:opacity-60",
                                candidate.myDecision === decision
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border text-muted-foreground hover:border-primary/40 hover:text-foreground",
                              )}
                            >
                              {RECONNECT_LABELS[decision]}
                            </button>
                          ))}
                        </div>
                      ) : (
                        <p className="mt-2 text-[11px] text-muted-foreground">
                          You both said yes. Start a conversation or plan something
                          from Connections.
                        </p>
                      )}
                      {candidate.myDecision && !candidate.connected ? (
                        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-muted-foreground">
                          <Lock className="size-3" /> Saved privately. Their answer
                          isn't visible to you either.
                        </p>
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 flex items-start gap-2 rounded-xl bg-muted/50 p-3 text-[11px] leading-5 text-muted-foreground">
                <Lock className="mt-0.5 size-3.5 shrink-0" />
                <p>
                  Seeded demo profiles carry a standing demo interest in
                  reconnecting so this flow can be tested. Real members must both
                  answer independently.
                </p>
              </div>
            </section>
          ) : null}

          {isHost && detail.hostRequests.length > 0 ? (
            <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="font-display text-xl">Join requests</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                You decide who comes. Capacity updates immediately.
              </p>
              <ul className="mt-4 space-y-3">
                {detail.hostRequests.map((request) => (
                  <li
                    key={request._id}
                    className="rounded-xl border border-border p-3.5"
                  >
                    <div className="flex flex-wrap items-center gap-3">
                      {request.person ? (
                        <>
                          <Avatar name={request.person.displayName} />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium">
                              {shortName(request.person.displayName)}
                            </p>
                            <p className="text-[11px] text-muted-foreground">
                              {request.person.area} ·{" "}
                              {request.person.activities.slice(0, 2).join(", ")}
                            </p>
                          </div>
                        </>
                      ) : (
                        <p className="text-sm">A member</p>
                      )}
                      <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {request.status}
                      </span>
                    </div>
                    {request.message ? (
                      <p className="mt-2 rounded-lg bg-muted/50 px-3 py-2 text-xs leading-5 text-muted-foreground">
                        “{request.message}”
                      </p>
                    ) : null}
                    {request.status === "pending" ? (
                      <div className="mt-3 flex gap-2">
                        <Button
                          size="sm"
                          className="gap-1.5"
                          disabled={busy === request._id}
                          onClick={() => doDecide(request._id, "approved")}
                        >
                          <Check className="size-3.5" /> Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5"
                          disabled={busy === request._id}
                          onClick={() => doDecide(request._id, "declined")}
                        >
                          <X className="size-3.5" /> Decline
                        </Button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-6">
          <div className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-baseline justify-between">
              <p className="font-display text-2xl">{formatMoney(activity.cost)}</p>
              <p className="text-xs text-muted-foreground">
                {spotsLeft > 0 ? `${spotsLeft} spots left` : "Full"}
              </p>
            </div>

            {cancelled ? (
              <Button disabled className="mt-4 w-full">
                Cancelled
              </Button>
            ) : isHost ? (
              <div className="mt-4 space-y-2">
                <p className="rounded-lg bg-secondary/60 px-3 py-2 text-center text-xs font-medium text-secondary-foreground">
                  You're hosting this plan
                </p>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => setCancelOpen(true)}
                >
                  Cancel this plan
                </Button>
              </div>
            ) : detail.myRequestStatus === "approved" ? (
              <div className="mt-4 space-y-2">
                <p className="flex items-center justify-center gap-1.5 rounded-lg bg-secondary/70 px-3 py-2 text-xs font-medium text-secondary-foreground">
                  <Check className="size-3.5" /> You're on the list
                </p>
                {started ? (
                  detail.hasAttended ? (
                    <p className="rounded-lg bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
                      Checked in. Journal entry saved privately.
                    </p>
                  ) : (
                    <Button
                      className="w-full gap-2"
                      onClick={doAttend}
                      disabled={busy === "attend"}
                    >
                      {busy === "attend" ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        <BadgeCheck className="size-4" />
                      )}
                      I was there — check in
                    </Button>
                  )
                ) : (
                  <p className="rounded-lg bg-muted px-3 py-2 text-center text-[11px] text-muted-foreground">
                    Check-in opens when the plan starts ({formatTime(activity.startsAt)}).
                  </p>
                )}
                <Button variant="ghost" className="w-full" onClick={doWithdraw} disabled={busy === "withdraw"}>
                  Can't make it? Leave the plan
                </Button>
              </div>
            ) : detail.myRequestStatus === "pending" ? (
              <div className="mt-4 space-y-2">
                <p className="rounded-lg bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
                  Request sent. Waiting for the host.
                </p>
                <Button variant="outline" className="w-full" onClick={doWithdraw}>
                  Withdraw request
                </Button>
              </div>
            ) : detail.myRequestStatus === "declined" ? (
              <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
                The host didn't accept this request. There are other plans.
              </p>
            ) : started ? (
              <p className="mt-4 rounded-lg bg-muted px-3 py-2 text-center text-xs text-muted-foreground">
                This plan has already started.
              </p>
            ) : (
              <Button asChild className="mt-4 w-full gap-2">
                <button type="button" onClick={() => setJoinOpen(true)}>
                  <UserPlus className="size-4" /> Request to join
                </button>
              </Button>
            )}

            <div className="mt-4 space-y-2 border-t border-border pt-4 text-[11px] text-muted-foreground">
              <p className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-primary" />
                Public venue, shown before you join. No home addresses.
              </p>
              <p className="flex items-start gap-2">
                <Ticket className="mt-0.5 size-3.5 shrink-0 text-primary" />
                {activity.cost === 0
                  ? "No payment is collected in Saanjh."
                  : "Cost is paid directly at the venue. No payment is collected in Saanjh."}
              </p>
            </div>
          </div>

          {host ? (
            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="flex items-center gap-3">
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
              <div className="mt-3 flex flex-wrap gap-1.5">
                {host.interests.slice(0, 4).map((key) => (
                  <CategoryChip key={key} category={key} />
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-1 border-t border-border pt-3">
                <ReportDialog
                  targetType="activity"
                  targetId={activity._id}
                  targetLabel={activity.title}
                  trigger={
                    <Button variant="ghost" size="sm" className="gap-1.5 px-2 text-muted-foreground">
                      <Flag className="size-3.5" /> Report plan
                    </Button>
                  }
                />
                {!isHost ? (
                  <>
                    <ReportDialog
                      targetType="member"
                      targetId={host.userId}
                      targetLabel={host.displayName}
                      trigger={
                        <Button variant="ghost" size="sm" className="gap-1.5 px-2 text-muted-foreground">
                          <Flag className="size-3.5" /> Report host
                        </Button>
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-1.5 px-2 text-muted-foreground"
                      onClick={() => setBlockOpen(true)}
                    >
                      <Ban className="size-3.5" /> Block
                    </Button>
                  </>
                ) : null}
              </div>
            </div>
          ) : null}

          {detail.circle ? (
            <Link
              to={`/circles/${detail.circle._id}`}
              className="block rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-primary">
                Part of a circle
              </p>
              <p className="mt-1 font-display text-lg">{detail.circle.name}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Meet the same faces again, not just once.
              </p>
            </Link>
          ) : null}

          <div className="rounded-2xl border border-dashed border-border p-5">
            <p className="text-xs font-medium">Nervous about arriving alone?</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              Public venue, a named host, a clear end time, and beginner-friendly
              plans. You can leave at any point. Read the safety centre for a
              first-timer checklist.
            </p>
            <Link
              to="/safety"
              className="mt-2 inline-block text-[11px] font-medium text-primary hover:underline"
            >
              First-timer checklist
            </Link>
          </div>
        </aside>
      </div>

      {/* Join dialog */}
      <Dialog open={joinOpen} onOpenChange={setJoinOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request to join</DialogTitle>
            <DialogDescription>
              {activity.title} · {formatDay(activity.startsAt)} at{" "}
              {formatTime(activity.startsAt)}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="join-note">
                A short note for the host{" "}
                <span className="font-normal text-muted-foreground">(optional)</span>
              </Label>
              <Textarea
                id="join-note"
                value={joinNote}
                onChange={(event) => setJoinNote(event.target.value)}
                placeholder="I'm new to the city and would love to join."
                rows={3}
                maxLength={300}
                className="mt-1.5 resize-none"
              />
            </div>
            <p className="rounded-lg bg-muted/60 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
              {activity.autoApprove
                ? "This is a seeded demo host, so requests are approved instantly."
                : "The host approves everyone personally. You'll see it in My Plans once approved."}
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setJoinOpen(false)}>
              Not yet
            </Button>
            <Button onClick={doRequest} disabled={busy === "join"} className="gap-2">
              {busy === "join" ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
              Send request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel this plan?</DialogTitle>
            <DialogDescription>
              Everyone with a pending request is informed. This can't be undone.
            </DialogDescription>
          </DialogHeader>
          <div>
            <Label htmlFor="cancel-reason">Reason (shared with attendees)</Label>
            <Input
              id="cancel-reason"
              value={cancelReason}
              onChange={(event) => setCancelReason(event.target.value)}
              placeholder="Heavy rain forecast — trying again next Sunday."
              className="mt-1.5"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCancelOpen(false)}>
              Keep the plan
            </Button>
            <Button variant="destructive" onClick={doCancel} disabled={busy === "cancel"}>
              {busy === "cancel" ? <Loader2 className="size-4 animate-spin" /> : null}
              Cancel plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Block dialog */}
      <Dialog open={blockOpen} onOpenChange={setBlockOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Block this member?</DialogTitle>
            <DialogDescription>
              You'll stop seeing each other's plans, circles and profiles. Any
              private reconnect answers between you are deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={doBlock} disabled={busy === "block"}>
              {busy === "block" ? <Loader2 className="size-4 animate-spin" /> : null}
              Block member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Detail({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl bg-muted/40 px-3.5 py-3">
      <span className="mt-0.5 text-primary">{icon}</span>
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </p>
        <p className="mt-0.5 text-sm text-foreground">{children}</p>
      </div>
    </div>
  );
}

function InfoBlock({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </p>
      <p className="mt-1 text-xs leading-5 text-foreground">{children}</p>
    </div>
  );
}

function PersonRow({
  person,
  role,
}: {
  person: { displayName: string; area: string; isDemo?: boolean };
  role: string;
}) {
  return (
    <div className="flex items-center gap-2.5 rounded-lg border border-border px-3 py-2">
      <Avatar name={person.displayName} size="sm" />
      <div className="min-w-0">
        <p className="truncate text-xs font-medium">
          {shortName(person.displayName)}
          {person.isDemo ? (
            <span className="ml-1.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
              demo
            </span>
          ) : null}
        </p>
        <p className="text-[10px] text-muted-foreground">{person.area}</p>
      </div>
      <span className="ml-auto text-[10px] font-medium text-muted-foreground">
        {role}
      </span>
    </div>
  );
}
