import { PersonLine } from "@/components/product/ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/hooks/use-auth";
import { formatWhen, timeAgo } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  Check,
  ClipboardCopy,
  Download,
  ExternalLink,
  Flag,
  Loader2,
  Lock,
  Phone,
  ShieldCheck,
  Trash2,
  UserX,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function Safety() {
  const plans = useQuery(api.activities.myPlans);
  const reports = useQuery(api.safety.myReports);
  const blocked = useQuery(api.safety.blockedList);
  const exportData = useQuery(api.profiles.exportMyData);
  const unblock = useMutation(api.safety.unblock);
  const deleteMyData = useMutation(api.profiles.deleteMyData);
  const { signOut } = useAuth();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePhrase, setDeletePhrase] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [unblocking, setUnblocking] = useState<string | null>(null);

  const nextPlan =
    [...(plans?.upcoming ?? []), ...(plans?.hosting ?? [])].sort(
      (a, b) => a.activity.startsAt - b.activity.startsAt,
    )[0] ?? null;

  const safetyPlanText = nextPlan
    ? `Safety plan for a Connectmaxxing meetup\n\nWhat: ${nextPlan.activity.title}\nWhen: ${formatWhen(nextPlan.activity.startsAt)} (about ${nextPlan.activity.durationMins} min)\nWhere: ${nextPlan.activity.venue}, ${nextPlan.activity.area}\nHost: ${nextPlan.host?.displayName ?? "the host"}\n\nI'll message you when I arrive and when I'm leaving. Connectmaxxing does not track my location. If I don't check in by the end time, call me.`
    : "";

  const copyPlan = async () => {
    if (!safetyPlanText) return;
    try {
      await navigator.clipboard.writeText(safetyPlanText);
      toast.success("Safety plan copied. Send it to someone you trust.");
    } catch {
      toast.error("Couldn't copy automatically. Select and copy the text instead.");
    }
  };

  const doExport = () => {
    if (!exportData) return;
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "connectmaxxing-my-data.json";
    anchor.click();
    URL.revokeObjectURL(url);
    toast.success("Export downloaded.");
  };

  const doUnblock = async (userId: string) => {
    setUnblocking(userId);
    try {
      await unblock({ userId: userId as any });
      toast.success("Unblocked.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not unblock.");
    } finally {
      setUnblocking(null);
    }
  };

  const doDelete = async () => {
    setDeleting(true);
    try {
      await deleteMyData({});
      await signOut();
      window.location.href = "/";
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete your data.");
      setDeleting(false);
    }
  };

  return (
    <div>
      <header className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          Safety centre
        </p>
        <h1 className="mt-2 font-display text-3xl">
          Strangers meeting in person.
        </h1>
        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
          What's built, what isn't, and what to do before you meet anyone. This
          prototype does not provide emergency response, supervision or identity
          verification.
        </p>
      </header>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-[oklch(0.75_0.12_40)]/50 bg-[oklch(0.97_0.04_50)] p-5">
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-[oklch(0.5_0.15_30)]" />
            <h2 className="font-display text-xl">If you need help now</h2>
          </div>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Connectmaxxing cannot send help. In India, call 112 for police, fire or
            ambulance. These are public emergency numbers, not a Connectmaxxing service.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              ["112", "All emergencies (police, fire, ambulance)"],
              ["100", "Police"],
              ["181", "Women's helpline"],
              ["1930", "Cyber fraud reporting"],
            ].map(([number, label]) => (
              <a
                key={number}
                href={`tel:${number}`}
                className="flex items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-2.5 text-xs hover:border-primary/40"
              >
                <Phone className="size-3.5 text-primary" />
                <span>
                  <span className="block font-semibold text-foreground">{number}</span>
                  <span className="block text-[10px] text-muted-foreground">{label}</span>
                </span>
              </a>
            ))}
          </div>
          <p className="mt-3 text-[10px] leading-4 text-muted-foreground">
            Verify current numbers locally. This list is guidance, not legal or
            medical advice.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-primary" />
            <h2 className="font-display text-xl">Before your first meetup</h2>
          </div>
          <ul className="mt-3 space-y-2">
            {[
              "The venue is public and shown before you join. Never accept a last-minute change to a private address.",
              "Tell someone where you're going and when you expect to be back.",
              "Arrive and leave on your own terms. You can leave at any point, no explanation needed.",
              "Keep the conversation inside the plan and circle until you've both chosen to reconnect.",
              "If something feels off, leave, block, and report. A moderator sees reports; the reported person doesn't.",
            ].map((tip) => (
              <li key={tip} className="flex gap-2 text-xs leading-5 text-muted-foreground">
                <Check className="mt-0.5 size-3.5 shrink-0 text-primary" />
                {tip}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-xl">Share a safety plan</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Connectmaxxing doesn't store a trusted contact. Copy the plan and send it
              yourself, or open your messaging app.
            </p>
          </div>
          {nextPlan ? (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={copyPlan} className="gap-2">
                <ClipboardCopy className="size-3.5" /> Copy plan
              </Button>
              <Button variant="outline" size="sm" asChild className="gap-2">
                <a
                  href={`https://wa.me/?text=${encodeURIComponent(safetyPlanText)}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  <ExternalLink className="size-3.5" /> Open WhatsApp
                </a>
              </Button>
            </div>
          ) : null}
        </div>
        {nextPlan ? (
          <pre className="mt-3 whitespace-pre-wrap rounded-xl bg-muted/50 p-4 text-[11px] leading-5 text-muted-foreground">
            {safetyPlanText}
          </pre>
        ) : (
          <p className="mt-3 rounded-xl bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
            You don't have an upcoming plan yet. Once you do, a copyable safety plan
            will appear here.
          </p>
        )}
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <Flag className="size-4 text-primary" />
            <h2 className="font-display text-xl">Your reports</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Report a plan, circle or member from its page. Only moderators see the
            details.
          </p>
          {reports === undefined ? null : reports.length === 0 ? (
            <p className="mt-3 rounded-xl bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
              You haven't reported anything. To report, open the plan or profile and
              use the report action.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {reports.map((report) => (
                <li
                  key={report._id}
                  className="rounded-xl border border-border px-3.5 py-3"
                >
                  <div className="flex items-center gap-2">
                    <p className="text-xs font-medium">{report.targetLabel}</p>
                    <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {report.status}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {report.reason} · {timeAgo(report.createdAt)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-2">
            <UserX className="size-4 text-primary" />
            <h2 className="font-display text-xl">Blocked members</h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Blocking hides plans, circles and profiles both ways and deletes pending
            private reconnect answers.
          </p>
          {blocked === undefined ? null : blocked.length === 0 ? (
            <p className="mt-3 rounded-xl bg-muted/50 px-4 py-3 text-xs text-muted-foreground">
              No one is blocked.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {blocked.map((person) => (
                <li
                  key={person.userId}
                  className="flex items-center justify-between gap-2 rounded-xl border border-border px-3 py-2"
                >
                  <PersonLine person={person} subtitle={person.area} />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => doUnblock(person.userId)}
                    disabled={unblocking === person.userId}
                  >
                    {unblocking === person.userId ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      "Unblock"
                    )}
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <section className="mt-4 rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2">
          <Lock className="size-4 text-primary" />
          <h2 className="font-display text-xl">Your data</h2>
        </div>
        <p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">
          Connectmaxxing stores your profile, plans, requests, check-ins, private reconnect
          answers, journal entries and reports. It does not store exact home
          coordinates, background location, identity documents, contacts or payment
          details. Export or delete below.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={doExport} className="gap-2">
            <Download className="size-3.5" /> Export my data
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 text-destructive hover:text-destructive"
            onClick={() => setDeleteOpen(true)}
          >
            <Trash2 className="size-3.5" /> Delete my data
          </Button>
        </div>
        <p className="mt-3 text-[10px] leading-4 text-muted-foreground">
          Deletion removes your profile, plans, requests, check-ins, journal, private
          answers, blocks and reports. The sign-in identity row is scrubbed rather
          than erased so an active session can't keep writing data — see PRIVACY.md
          for this limitation.
        </p>
      </section>

      <section className="mt-4 rounded-2xl border border-dashed border-border p-5">
        <h2 className="font-display text-xl">What isn't built yet</h2>
        <ul className="mt-2 grid gap-1.5 text-xs leading-5 text-muted-foreground sm:grid-cols-2">
          <li>· Identity or age verification (the 18+ check is self-declared)</li>
          <li>· Government ID (Aadhaar or otherwise) collection — deliberately absent</li>
          <li>· Emergency response, live location tracking or supervision</li>
          <li>· A staffed 24/7 moderation team; reports are queued for a human reviewer</li>
          <li>· Legal review of affinity-group eligibility and moderation policies</li>
          <li>· Verified host background checks or guarantees of any kind</li>
        </ul>
        <p className="mt-3 text-[11px] leading-5 text-muted-foreground">
          Do not use this prototype to meet strangers. A public pilot requires
          operational safety work, legal review and a local escalation process that
          don't exist yet.
        </p>
      </section>
    </div>
  );
}
