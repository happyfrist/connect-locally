import { EmptyState } from "@/components/product/ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { CATEGORY_MAP } from "@/convex/lib/catalog";
import { formatDay, formatDuration, formatLongDay } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import {
  BookHeart,
  CalendarDays,
  Check,
  Download,
  Image as ImageIcon,
  Loader2,
  Lock,
  MapPin,
  Pencil,
  Share2,
  Trash2,
  Trophy,
  Users,
} from "lucide-react";
import { useRef, useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";

export default function Life() {
  const data = useQuery(api.journal.mine);
  const addReflection = useMutation(api.journal.addReflection);
  const removeEntry = useMutation(api.journal.removeEntry);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [shareEntryId, setShareEntryId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  if (data === undefined) {
    return (
      <div>
        <Skeleton className="h-10 w-72" />
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <Skeleton key={index} className="h-24 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  const { entries, stats, achievements } = data;
  const unlocked = achievements.filter((item) => item.unlocked).length;
  const shareEntry =
    entries.find((entry) => entry._id === shareEntryId) ?? entries[0] ?? null;

  const saveReflection = async (entryId: string) => {
    try {
      await addReflection({
        entryId: entryId as Id<"journalEntries">,
        reflection: draft,
      });
      setEditingId(null);
      toast.success("Reflection saved privately.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save.");
    }
  };

  const remove = async (entryId: string) => {
    try {
      await removeEntry({ entryId: entryId as Id<"journalEntries"> });
      setConfirmDelete(null);
      toast.success("Entry deleted.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not delete.");
    }
  };

  const downloadCard = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const { snapdom } = await import("@zumer/snapdom");
      const result = await snapdom(cardRef.current, { scale: 2 });
      await result.download({ format: "png", filename: "saanjh-memory.png" });
      toast.success("Card saved. You decide where it goes next.");
    } catch (error) {
      toast.error("Could not generate the image in this browser.");
      console.error(error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div>
      <header className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          My life
        </p>
        <h1 className="mt-2 font-display text-3xl">Proof you left the house.</h1>
        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
          A private record of shared time. This is not a score of your social
          worth, and no one else can see it.
        </p>
      </header>

      <section className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat
          label="Time outside"
          value={
            stats.totalMinutes >= 60
              ? `${(stats.totalMinutes / 60).toFixed(1)} hr`
              : `${stats.totalMinutes} min`
          }
          hint="Across recorded plans"
        />
        <Stat label="Plans attended" value={String(stats.activities)} hint="Checked in by you" />
        <Stat label="Circles" value={String(stats.circles)} hint="Recurring groups" />
        <Stat
          label="Mutual connections"
          value={String(stats.connections)}
          hint="Two clear yes answers"
        />
        <Stat
          label="Familiar faces"
          value={String(stats.familiarFaces)}
          hint="Same person, more than once"
        />
        <Stat
          label="Kinds of plans"
          value={String(stats.categories)}
          hint="Different ways of meeting"
        />
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl">Friendship journal</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Private by default. Edit, reflect or delete anything here.
            </p>
          </div>
          {entries.length > 0 ? (
            <Button
              variant="outline"
              size="sm"
              className="gap-2"
              onClick={() => {
                setShareEntryId(entries[0]._id);
                setShareOpen(true);
              }}
            >
              <Share2 className="size-3.5" /> Make a share card
            </Button>
          ) : null}
        </div>

        {entries.length === 0 ? (
          <div className="mt-4">
            <EmptyState
              icon={<BookHeart className="size-5" />}
              title="Your journal is empty"
              description="After a plan starts, check in from the plan page. It creates a private entry here with space for a note."
              action={
                <Button asChild>
                  <Link to="/plans">Go to my plans</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <ul className="mt-4 space-y-3">
            {entries.map((entry) => {
              const category = CATEGORY_MAP[entry.category];
              return (
                <li
                  key={entry._id}
                  className="rounded-2xl border border-border bg-card p-5"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-lg" aria-hidden>
                          {category?.emoji ?? "✦"}
                        </span>
                        <h3 className="font-display text-xl leading-6">{entry.title}</h3>
                        {entry.isDemo ? (
                          <span className="rounded-full border border-dashed border-[oklch(0.62_0.08_80)] px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-[oklch(0.45_0.06_75)]">
                            sample
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <CalendarDays className="size-3" /> {formatDay(entry.occurredAt)}
                        </span>
                        <span>{formatDuration(entry.durationMins)}</span>
                        <span className="inline-flex items-center gap-1">
                          <Users className="size-3" /> {entry.participants} people
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        aria-label="Edit reflection"
                        onClick={() => {
                          setEditingId(entry._id);
                          setDraft(entry.reflection ?? "");
                        }}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8 text-muted-foreground"
                        aria-label="Delete entry"
                        onClick={() => setConfirmDelete(entry._id)}
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>

                  {editingId === entry._id ? (
                    <div className="mt-3">
                      <Textarea
                        value={draft}
                        onChange={(event) => setDraft(event.target.value)}
                        placeholder="What do you want to remember?"
                        rows={3}
                        maxLength={2000}
                        className="resize-none"
                      />
                      <div className="mt-2 flex gap-2">
                        <Button size="sm" onClick={() => saveReflection(entry._id)} className="gap-1.5">
                          <Check className="size-3.5" /> Save privately
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : entry.reflection ? (
                    <p className="mt-3 rounded-xl bg-muted/50 px-4 py-3 text-sm leading-6 text-muted-foreground">
                      {entry.reflection}
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(entry._id);
                        setDraft("");
                      }}
                      className="mt-3 text-[11px] font-medium text-primary hover:underline"
                    >
                      Add a private note
                    </button>
                  )}

                  {confirmDelete === entry._id ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg bg-destructive/5 px-3 py-2">
                      <p className="text-[11px] text-muted-foreground">
                        Delete this entry? The plan itself stays in your history.
                      </p>
                      <div className="ml-auto flex gap-2">
                        <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(null)}>
                          Keep
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => remove(entry._id)}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="font-display text-2xl">Milestones</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Participation, not popularity. No leaderboards, no streaks, no points
              for screen time.
            </p>
          </div>
          <span className="rounded-full bg-muted px-3 py-1 text-[11px] text-muted-foreground">
            {unlocked} of {achievements.length} reached
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {achievements.map((achievement) => (
            <div
              key={achievement.key}
              className={`rounded-2xl border p-4 ${
                achievement.unlocked
                  ? "border-primary/30 bg-primary/5"
                  : "border-border bg-card"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex size-8 items-center justify-center rounded-full ${
                    achievement.unlocked
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {achievement.unlocked ? (
                    <Trophy className="size-4" />
                  ) : (
                    <Lock className="size-3.5" />
                  )}
                </span>
                <div>
                  <p className="text-sm font-medium">{achievement.title}</p>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    {achievement.progress}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {achievement.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="mt-8 flex items-start gap-2.5 rounded-xl bg-muted/60 px-4 py-3 text-[11px] leading-5 text-muted-foreground">
        <Lock className="mt-0.5 size-3.5 shrink-0" />
        <p>
          Journal entries and milestones are visible only to you. Participation
          counts are based on your own check-ins — a check-in is not proof that
          anyone is trustworthy, and it is never shown as a trust score.
        </p>
      </div>

      {/* Share card dialog */}
      <Dialog open={shareOpen} onOpenChange={setShareOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Share a memory</DialogTitle>
            <DialogDescription>
              Only what you choose to include. No participant names, private notes
              or locations are added automatically.
            </DialogDescription>
          </DialogHeader>

          {entries.length > 0 ? (
            <>
              <Select
                value={shareEntry?._id}
                onValueChange={(value) => setShareEntryId(value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an entry" />
                </SelectTrigger>
                <SelectContent>
                  {entries.map((entry) => (
                    <SelectItem key={entry._id} value={entry._id}>
                      {entry.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {shareEntry ? (
                <div
                  ref={cardRef}
                  className="relative overflow-hidden rounded-2xl bg-[oklch(0.28_0.03_50)] p-6 text-[oklch(0.96_0.015_82)]"
                  style={{ width: "100%", aspectRatio: "4 / 5" }}
                >
                  <div className="pointer-events-none absolute -right-14 -top-14 size-48 rounded-full border-[28px] border-white/10" />
                  <div className="relative flex h-full flex-col">
                    <div className="flex items-center gap-2">
                      <span className="relative inline-flex size-7 items-center justify-center overflow-hidden rounded-full bg-[oklch(0.83_0.11_82)]">
                        <span className="absolute left-1/2 top-1/2 size-3.5 -translate-x-1/2 -translate-y-[60%] rounded-full bg-[oklch(0.62_0.12_45)]" />
                      </span>
                      <span className="font-display text-lg">saanjh</span>
                      <span className="ml-auto text-[9px] uppercase tracking-[0.16em] text-white/50">
                        a shared experience
                      </span>
                    </div>

                    <div className="mt-auto">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-[oklch(0.8_0.1_82)]">
                        {CATEGORY_MAP[shareEntry.category]?.label ?? shareEntry.category}
                      </p>
                      <p className="mt-2 font-display text-3xl leading-tight">
                        {shareEntry.title}
                      </p>
                      <p className="mt-3 text-xs text-white/70">
                        {formatLongDay(shareEntry.occurredAt)} ·{" "}
                        {formatDuration(shareEntry.durationMins)} ·{" "}
                        {shareEntry.participants} people
                      </p>
                      {shareEntry.reflection ? (
                        <p className="mt-4 border-l border-white/20 pl-3 text-xs italic leading-5 text-white/80">
                          “{shareEntry.reflection.slice(0, 140)}
                          {shareEntry.reflection.length > 140 ? "…" : ""}”
                        </p>
                      ) : null}
                    </div>

                    <div className="mt-5 flex items-center gap-2 border-t border-white/15 pt-3 text-[9px] uppercase tracking-[0.14em] text-white/45">
                      <MapPin className="size-3" /> {shareEntry.isDemo ? "sample entry" : "private memory, shared by you"}
                      <span className="ml-auto">less scrolling · more shared life</span>
                    </div>
                  </div>
                </div>
              ) : null}
            </>
          ) : null}

          <div className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
            <ImageIcon className="mt-0.5 size-3.5 shrink-0" />
            Photo uploads aren't part of v1, so cards contain only your own words and
            activity facts. Nothing is posted anywhere by Saanjh.
          </div>

          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={downloadCard}
              disabled={!shareEntry || downloading}
              className="flex-1 gap-2"
            >
              {downloading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Download className="size-4" />
              )}
              Download PNG
            </Button>
            <Button variant="outline" onClick={() => setShareOpen(false)}>
              Done
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 font-display text-2xl text-foreground">{value}</p>
      <p className="mt-0.5 text-[10px] leading-4 text-muted-foreground">{hint}</p>
    </div>
  );
}
