import { EmptyState } from "@/components/product/ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { timeAgo } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import {
  CheckCircle2,
  ClipboardList,
  Flag,
  Loader2,
  Lock,
  SlidersHorizontal,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

type Filter = "all" | "open" | "reviewing" | "closed";

export default function Moderation() {
  const status = useQuery(api.moderation.status);
  const queue = useQuery(
    api.moderation.queue,
    status?.isModerator ? {} : "skip",
  );
  const resolve = useMutation(api.moderation.resolve);

  const [filter, setFilter] = useState<Filter>("open");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [newStatus, setNewStatus] = useState<"reviewing" | "resolved" | "dismissed">("resolved");
  const [action, setAction] = useState<
    "none" | "warning" | "content_removed" | "member_restricted"
  >("none");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  if (status === undefined) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 rounded-2xl" />
      </div>
    );
  }

  if (!status.isModerator) {
    return (
      <div className="mx-auto max-w-xl py-10">
        <div className="rounded-2xl border border-border bg-card p-7 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-muted">
            <Lock className="size-5 text-muted-foreground" />
          </div>
          <h1 className="mt-4 font-display text-2xl">Moderator access</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Moderation is least-privilege and role-restricted. There is no
            self-service signup for this role. The deployment owner grants it
            with a trusted server-side procedure; every decision is audited.
          </p>
          <Button asChild className="mt-5">
            <Link to="/discover">Back to discover</Link>
          </Button>
        </div>
      </div>
    );
  }

  const reports = queue?.reports ?? [];
  const visible = reports.filter((report) => {
    if (filter === "all") return true;
    if (filter === "closed") return report.status === "resolved" || report.status === "dismissed";
    return report.status === filter;
  });
  const selected = reports.find((report) => report._id === selectedId) ?? null;
  const counts = {
    open: reports.filter((report) => report.status === "open").length,
    reviewing: reports.filter((report) => report.status === "reviewing").length,
    resolved: reports.filter((report) => report.status === "resolved").length,
    dismissed: reports.filter((report) => report.status === "dismissed").length,
  };

  const quickReview = async (reportId: string) => {
    setBusy(reportId);
    try {
      await resolve({
        reportId: reportId as Id<"reports">,
        status: "reviewing",
        resolution: "Moved to review.",
        action: "none",
      });
      toast.success("Marked as reviewing.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update.");
    } finally {
      setBusy(null);
    }
  };

  const submitResolution = async () => {
    if (!selected) return;
    setBusy(selected._id);
    try {
      await resolve({
        reportId: selected._id as Id<"reports">,
        status: newStatus,
        resolution: note,
        action,
      });
      setSelectedId(null);
      setNote("");
      setAction("none");
      toast.success("Report updated and logged.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save the decision.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
            Moderation
          </p>
          <h1 className="mt-2 font-display text-3xl">Review queue</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Reported people never see report contents. Every decision is logged with
            the moderator's identity.
          </p>
        </div>
        <div className="flex gap-2 text-center text-xs">
          <div className="rounded-xl border border-border bg-card px-3 py-2">
            <p className="font-display text-xl">{counts.open}</p>
            <p className="text-[10px] text-muted-foreground">open</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-3 py-2">
            <p className="font-display text-xl">{counts.reviewing}</p>
            <p className="text-[10px] text-muted-foreground">reviewing</p>
          </div>
          <div className="rounded-xl border border-border bg-card px-3 py-2">
            <p className="font-display text-xl">{counts.resolved}</p>
            <p className="text-[10px] text-muted-foreground">resolved</p>
          </div>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1">
        {(
          [
            ["open", "Open"],
            ["reviewing", "Reviewing"],
            ["closed", "Closed"],
            ["all", "All"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setFilter(key)}
            className={`flex-1 rounded-lg px-3 py-2 text-xs font-medium transition-colors ${
              filter === key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {queue === undefined ? (
        <div className="mt-4 space-y-3">
          <Skeleton className="h-40 rounded-2xl" />
          <Skeleton className="h-40 rounded-2xl" />
        </div>
      ) : visible.length === 0 ? (
        <div className="mt-4">
          <EmptyState
            icon={<CheckCircle2 className="size-5" />}
            title="Nothing in this queue"
            description="Reports about plans, circles and members appear here with the reporter's description and a traceable decision trail."
          />
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          {visible.map((report) => (
            <article
              key={report._id}
              className="rounded-2xl border border-border bg-card p-5"
            >
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  {report.targetType}
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider ${
                    report.status === "open"
                      ? "bg-primary/10 text-primary"
                      : report.status === "reviewing"
                        ? "bg-[oklch(0.92_0.05_85)] text-[oklch(0.4_0.08_75)]"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {report.status}
                </span>
                <span className="ml-auto text-[11px] text-muted-foreground">
                  {timeAgo(report.createdAt)}
                </span>
              </div>

              <h2 className="mt-3 font-display text-xl">{report.targetLabel}</h2>
              <p className="mt-1 text-xs font-medium text-primary">{report.reason}</p>
              <p className="mt-2 rounded-xl bg-muted/50 px-3.5 py-3 text-sm leading-6">
                {report.details}
              </p>

              <dl className="mt-3 grid gap-x-4 gap-y-1 text-[11px] text-muted-foreground sm:grid-cols-2">
                <div>
                  <dt className="inline font-medium text-foreground">Reported by: </dt>
                  <dd className="inline">{report.reporter}</dd>
                </div>
                <div>
                  <dt className="inline font-medium text-foreground">Target now: </dt>
                  <dd className="inline">
                    {report.target
                      ? `${report.target.title} · ${report.target.statusLabel}`
                      : "Content removed or unavailable"}
                  </dd>
                </div>
                {report.target?.hostName ? (
                  <div>
                    <dt className="inline font-medium text-foreground">Host / owner: </dt>
                    <dd className="inline">{report.target.hostName}</dd>
                  </div>
                ) : null}
                {report.resolution ? (
                  <div className="sm:col-span-2">
                    <dt className="inline font-medium text-foreground">Last note: </dt>
                    <dd className="inline">{report.resolution}</dd>
                  </div>
                ) : null}
              </dl>

              <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
                {report.status === "open" ? (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    disabled={busy === report._id}
                    onClick={() => quickReview(report._id)}
                  >
                    <ClipboardList className="size-3.5" /> Start review
                  </Button>
                ) : null}
                {report.status !== "resolved" && report.status !== "dismissed" ? (
                  <Button
                    size="sm"
                    className="gap-1.5"
                    onClick={() => {
                      setSelectedId(report._id);
                      setNewStatus("resolved");
                      setNote(report.resolution ?? "");
                      setAction("none");
                    }}
                  >
                    <Flag className="size-3.5" /> Decision
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="gap-1.5"
                    onClick={() => {
                      setSelectedId(report._id);
                      setNewStatus(report.status === "resolved" ? "resolved" : "dismissed");
                      setNote(report.resolution ?? "");
                      setAction("none");
                    }}
                  >
                    <SlidersHorizontal className="size-3.5" /> Amend decision
                  </Button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}

      <section className="mt-8">
        <h2 className="font-display text-xl">Audit log</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          The most recent moderator actions. No private conversations are logged.
        </p>
        <ul className="mt-3 space-y-2">
          {(queue?.audit ?? []).map((entry) => (
            <li
              key={entry._id}
              className="flex flex-wrap items-center gap-2 rounded-xl border border-border bg-card px-4 py-2.5 text-[11px]"
            >
              <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                {entry.action}
              </span>
              <span className="text-muted-foreground">
                {entry.targetType} · {entry.targetId.slice(0, 8)}…
                {entry.note ? ` · ${entry.note}` : ""}
              </span>
              <span className="ml-auto text-muted-foreground">{timeAgo(entry.createdAt)}</span>
            </li>
          ))}
          {(queue?.audit ?? []).length === 0 ? (
            <p className="text-xs text-muted-foreground">No actions logged yet.</p>
          ) : null}
        </ul>
      </section>

      <p className="mt-6 rounded-xl bg-muted/60 px-4 py-3 text-[11px] leading-5 text-muted-foreground">
        Least privilege: this page is only reachable with the moderator role. It is
        not a database console and cannot read member conversations. In production,
        roles, retention and appeal processes need documented operational ownership.
      </p>

      <Dialog open={selected !== null} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Record a decision</DialogTitle>
            <DialogDescription>
              {selected
                ? `${selected.targetType}: ${selected.targetLabel}`
                : "Report decision"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label>Status</Label>
              <Select
                value={newStatus}
                onValueChange={(value) =>
                  setNewStatus(value as typeof newStatus)
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="reviewing">Still reviewing</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="dismissed">Dismissed (no action)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Action taken</Label>
              <Select
                value={action}
                onValueChange={(value) => setAction(value as typeof action)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No content change</SelectItem>
                  <SelectItem value="warning">Warn the member</SelectItem>
                  <SelectItem value="content_removed">Remove the plan / restrict the circle</SelectItem>
                  <SelectItem value="member_restricted">Restrict the member's profile</SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1 text-[11px] text-muted-foreground">
                “Remove” cancels a plan or makes a circle request-only. “Restrict”
                disables the responsible account and revokes its sessions. Both are
                logged.
              </p>
            </div>

            <div>
              <Label htmlFor="resolution">Moderator note (internal)</Label>
              <Textarea
                id="resolution"
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="What was reviewed, what was decided, and any follow-up needed."
                rows={4}
                maxLength={1000}
                className="mt-1.5 resize-none"
              />
            </div>

            <p className="rounded-lg bg-muted/60 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
              The reporter sees the status change, not this internal note. Reports
              never reveal the reporter's identity to the reported member.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedId(null)}>
              Cancel
            </Button>
            <Button onClick={submitResolution} disabled={busy === selected?._id}>
              {busy === selected?._id ? (
                <Loader2 className="size-4 animate-spin" />
              ) : null}
              Save decision
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
