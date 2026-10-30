import { ActivityCard } from "@/components/product/ActivityCard";
import {
  Avatar,
  CategoryChip,
  EmptyState,
  Meter,
  PersonLine,
} from "@/components/product/ui";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CATEGORIES } from "@/convex/lib/catalog";
import { useMutation, useQuery } from "convex/react";
import {
  CalendarDays,
  Compass,
  Info,
  Loader2,
  MapPin,
  Sparkles,
  Users,
} from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router";
import { toast } from "sonner";

type Tab = "activities" | "invitations" | "people";

const TABS: { key: Tab; label: string }[] = [
  { key: "activities", label: "Plans" },
  { key: "invitations", label: "Open invitations" },
  { key: "people", label: "People" },
];

export default function Discover() {
  const me = useQuery(api.profiles.me);
  const [params, setParams] = useSearchParams();
  const tab = (params.get("tab") as Tab) || "activities";
  const category = params.get("category") ?? "";

  const [when, setWhen] = useState<"any" | "week" | "weekend">("any");
  const [budget, setBudget] = useState<"any" | "free" | "low">("any");
  const [beginner, setBeginner] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Id<"users"> | null>(null);
  const [seeding, setSeeding] = useState(false);

  const seed = useMutation(api.seed.seedDemoCity);

  const plans = useQuery(
    api.activities.list,
    tab === "people"
      ? "skip"
      : {
          category: category || undefined,
          when,
          budget,
          beginnerOnly: beginner,
          kind: tab === "invitations" ? "invitation" : "all",
        },
  );
  const people = useQuery(api.people.suggestions, tab === "people" ? {} : "skip");
  const personDetail = useQuery(
    api.people.detail,
    selectedPerson ? { userId: selectedPerson } : "skip",
  );

  const updateParams = (updates: Record<string, string | null>) => {
    const next = new URLSearchParams(params);
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    setParams(next, { replace: true });
  };

  const setParam = (key: string, value: string | null) =>
    updateParams({ [key]: value });

  const loadDemo = async () => {
    setSeeding(true);
    try {
      await seed({});
      toast.success("Demo city added. Seeded members are labelled.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load demo content.");
    } finally {
      setSeeding(false);
    }
  };

  const firstName = me?.profile?.displayName.split(" ")[0] ?? "";

  return (
    <div>
      <header className="max-w-2xl">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          {me?.profile?.city ?? "Your city"} · {me?.profile?.area ?? "nearby"}
        </p>
        <h1 className="mt-2 font-display text-3xl leading-tight sm:text-4xl">
          {firstName ? `${firstName}, what would you enjoy ` : "What would you enjoy "}
          doing with other people?
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          A short list of real plans, not an endless feed. People are introduced
          through shared ground, never through appearance.
        </p>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-1 rounded-xl border border-border bg-card p-1">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setParam("tab", item.key === "activities" ? null : item.key)}
            className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              tab === item.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab !== "people" ? (
        <div className="mt-4 rounded-xl border border-border bg-card p-3.5">
          <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
            <FilterChip
              active={!category}
              onClick={() => setParam("category", null)}
              label="Everything"
            />
            {CATEGORIES.map((item) => (
              <FilterChip
                key={item.key}
                active={category === item.key}
                onClick={() =>
                  setParam("category", category === item.key ? null : item.key)
                }
                label={`${item.emoji} ${item.label}`}
              />
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-border pt-3">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              When
            </span>
            {(["any", "week", "weekend"] as const).map((value) => (
              <FilterChip
                key={value}
                active={when === value}
                onClick={() => setWhen(value)}
                label={
                  value === "any" ? "Anytime" : value === "week" ? "This week" : "This weekend"
                }
                small
              />
            ))}
            <span className="ml-2 mr-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Cost
            </span>
            {(["any", "free", "low"] as const).map((value) => (
              <FilterChip
                key={value}
                active={budget === value}
                onClick={() => setBudget(value)}
                label={value === "any" ? "Any" : value === "free" ? "Free" : "Under ₹500"}
                small
              />
            ))}
            <button
              type="button"
              onClick={() => setBeginner((current) => !current)}
              className={`ml-auto rounded-full border px-3 py-1.5 text-[11px] font-medium transition-colors ${
                beginner
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              Beginner friendly only
            </button>
          </div>
        </div>
      ) : null}

      {tab !== "people" ? (
        <>
          <div className="mt-5 flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              {plans === undefined
                ? "Looking around your city…"
                : `${plans.length} ${plans.length === 1 ? "plan" : "plans"} worth leaving the house for`}
            </p>
            {plans?.some((row) => row.activity.isDemo) ? (
              <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Info className="size-3.5" /> Demo plans are labelled
              </span>
            ) : null}
          </div>

          {plans === undefined ? (
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {[0, 1, 2, 3].map((index) => (
                <Skeleton key={index} className="h-64 rounded-2xl" />
              ))}
            </div>
          ) : plans.length === 0 ? (
            <div className="mt-3">
              <EmptyState
                icon={<Compass className="size-5" />}
                title="Nothing here yet"
                description="Try a different filter, or add the sample city to see the full journey with clearly labelled demo members."
                action={
                  <div className="flex flex-wrap justify-center gap-2">
                    <Button onClick={loadDemo} disabled={seeding} className="gap-2">
                      {seeding ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                      Add sample city
                    </Button>
                    <Button variant="outline" asChild>
                      <a href="/create">Host something yourself</a>
                    </Button>
                  </div>
                }
              />
            </div>
          ) : (
            <div className="mt-3 grid gap-4 sm:grid-cols-2">
              {plans.map((row) => (
                <ActivityCard key={row.activity._id} data={row} />
              ))}
            </div>
          )}

          {tab === "invitations" ? (
            <p className="mt-5 rounded-xl bg-muted/60 px-4 py-3 text-xs leading-5 text-muted-foreground">
              Open invitations are informal plans with a small capacity. The host
              still approves everyone, and every invitation shows a public venue
              and an end time.
            </p>
          ) : null}
        </>
      ) : (
        <>
          <div className="mt-5 flex items-start gap-2.5 rounded-xl bg-secondary/50 px-4 py-3 text-xs leading-5 text-secondary-foreground">
            <Users className="mt-0.5 size-4 shrink-0" />
            <p>
              Suggestions use declared interests, availability, area, budget and
              group-size preference. No photos, no attractiveness votes and no
              personality score. There is no unsolicited direct messaging.
            </p>
          </div>

          {people === undefined ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {[0, 1, 2, 3].map((index) => (
                <Skeleton key={index} className="h-52 rounded-2xl" />
              ))}
            </div>
          ) : people.length === 0 ? (
            <div className="mt-4">
              <EmptyState
                icon={<Users className="size-5" />}
                title="No introductions yet"
                description="Invitations appear when there's genuine shared ground in your city. Joining a circle or hosting a plan is usually faster than waiting."
                action={
                  <Button onClick={loadDemo} disabled={seeding} variant="outline" className="gap-2">
                    {seeding ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
                    Add sample city
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {people.map((row) => (
                <article
                  key={row.person.userId}
                  className="flex flex-col rounded-2xl border border-border bg-card p-5"
                >
                  <PersonLine
                    person={row.person}
                    subtitle={`${row.person.area} · ${row.person.languages.join(", ")}`}
                  />
                  <div className="mt-4">
                    <Meter value={row.score} />
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {row.reasons.map((reason) => (
                      <li
                        key={reason}
                        className="flex items-start gap-2 text-xs leading-5 text-muted-foreground"
                      >
                        <span className="mt-1.5 size-1 shrink-0 rounded-full bg-primary" />
                        {reason}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {row.sharedInterests.slice(0, 3).map((key) => (
                      <CategoryChip key={key} category={key} />
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4 w-full"
                    onClick={() => setSelectedPerson(row.person.userId)}
                  >
                    See shared ground
                  </Button>
                </article>
              ))}
            </div>
          )}
        </>
      )}

      <Dialog
        open={selectedPerson !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedPerson(null);
        }}
      >
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          {personDetail === undefined ? (
            <div className="flex h-40 items-center justify-center">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : personDetail === null ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              This profile isn't available.
            </div>
          ) : (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <Avatar name={personDetail.person.displayName} size="lg" />
                  <div>
                    <DialogTitle className="font-display text-2xl">
                      {personDetail.person.displayName}
                    </DialogTitle>
                    <DialogDescription>
                      {personDetail.person.area} · {personDetail.person.city} ·{" "}
                      {personDetail.person.languages.join(", ")}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              {personDetail.person.isDemo ? (
                <p className="rounded-lg border border-dashed border-border bg-muted/50 px-3 py-2 text-[11px] leading-5 text-muted-foreground">
                  Demo profile seeded for this prototype. No real person is behind
                  this profile.
                </p>
              ) : null}

              {personDetail.person.bio ? (
                <p className="text-sm leading-6 text-muted-foreground">
                  {personDetail.person.bio}
                </p>
              ) : null}

              {personDetail.match ? (
                <div className="rounded-xl border border-border bg-background/60 p-4">
                  <Meter value={personDetail.match.score} />
                  <ul className="mt-3 space-y-1.5">
                    {personDetail.match.reasons.map((reason) => (
                      <li key={reason} className="text-xs leading-5 text-muted-foreground">
                        · {reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Would happily join
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {personDetail.person.activities.map((activity) => (
                    <span
                      key={activity}
                      className="rounded-full border border-border px-2.5 py-1 text-[11px]"
                    >
                      {activity}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Interests
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {personDetail.person.interests.map((key) => (
                    <CategoryChip key={key} category={key} />
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-2 rounded-xl bg-muted/60 p-3 text-[11px] leading-5 text-muted-foreground">
                <MapPin className="mt-0.5 size-3.5 shrink-0" />
                Saanjh doesn't offer direct messages between strangers. Meet through
                a plan or a circle, then choose to reconnect after.
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                {personDetail.connected ? (
                  <Button className="flex-1" asChild>
                    <a href="/connections">You're connected — say hello</a>
                  </Button>
                ) : (
                  <Button
                    className="flex-1 gap-2"
                    onClick={() => {
                      const shared = personDetail.match?.sharedInterests?.[0];
                      setSelectedPerson(null);
                      updateParams({
                        tab: null,
                        category: shared ?? null,
                      });
                    }}
                  >
                    <CalendarDays className="size-4" />
                    Find a plan you'd both like
                  </Button>
                )}
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedPerson(null);
                    updateParams({ tab: null, category: null });
                  }}
                >
                  Browse all plans
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function FilterChip({
  active,
  onClick,
  label,
  small,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  small?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-full border transition-colors ${
        small ? "px-2.5 py-1 text-[11px]" : "px-3 py-1.5 text-xs"
      } ${
        active
          ? "border-primary bg-primary/10 font-medium text-primary"
          : "border-border text-muted-foreground hover:border-primary/30 hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
}
