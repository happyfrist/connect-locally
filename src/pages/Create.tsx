import { CategoryChip } from "@/components/product/ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { CATEGORIES } from "@/convex/lib/catalog";
import { fromDateTimeLocal, toDateTimeLocal } from "@/lib/format";
import { useMutation, useQuery } from "convex/react";
import { CalendarPlus, Loader2, MapPin, Plus, Users } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

type Tab = "activity" | "invitation" | "circle";

function defaultStart() {
  const date = new Date(Date.now() + 86_400_000);
  date.setHours(18, 0, 0, 0);
  return toDateTimeLocal(date.getTime());
}

export default function Create() {
  const me = useQuery(api.profiles.me);
  const circles = useQuery(api.circles.list, {});
  const createActivity = useMutation(api.activities.create);
  const createCircle = useMutation(api.circles.create);
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const initialTab = (params.get("tab") as Tab) || "activity";
  const [tab, setTab] = useState<Tab>(
    initialTab === "circle" ? "circle" : initialTab === "invitation" ? "invitation" : "activity",
  );
  const [saving, setSaving] = useState(false);

  const myCircles = (circles ?? []).filter(
    (circle) => circle.membershipStatus === "approved",
  );

  const [form, setForm] = useState({
    title: params.get("title") ?? "",
    description: "",
    category: "fitness",
    area: "",
    venue: "",
    startsAt: defaultStart(),
    durationMins: "90",
    cost: "0",
    costNote: "",
    maxParticipants: "6",
    beginnerFriendly: true,
    accessibility: "",
    equipment: "",
    rules: "",
    cancellationPolicy: "",
    recurrence: "once" as "once" | "weekly" | "biweekly" | "monthly",
    circleId: params.get("circle") ?? "",
  });

  const [circleForm, setCircleForm] = useState({
    name: "",
    description: "",
    category: "social",
    kind: "pod" as "pod" | "community" | "conversation",
    area: "",
    cadence: "Saturdays · 4 weeks",
    joinPolicy: "open" as "open" | "request",
    maxMembers: "8",
    rules: "",
    prompts: "",
  });

  const update = (key: keyof typeof form, value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }));

  const submitActivity = async () => {
    setSaving(true);
    try {
      const id = await createActivity({
        title: form.title,
        description: form.description,
        category: form.category,
        kind: tab === "invitation" ? "invitation" : "activity",
        area: form.area,
        venue: form.venue,
        startsAt: fromDateTimeLocal(form.startsAt),
        durationMins: Number(form.durationMins),
        cost: Number(form.cost) || 0,
        costNote: form.costNote || undefined,
        maxParticipants: Number(form.maxParticipants),
        beginnerFriendly: form.beginnerFriendly,
        accessibility: form.accessibility || undefined,
        equipment: form.equipment || undefined,
        rules: form.rules || undefined,
        cancellationPolicy: form.cancellationPolicy || undefined,
        recurrence: form.recurrence,
        circleId: form.circleId
          ? (form.circleId as Id<"circles">)
          : undefined,
      });
      toast.success("Plan published. Share it with one person you'd like there.");
      navigate(`/activity/${id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the plan.");
    } finally {
      setSaving(false);
    }
  };

  const submitCircle = async () => {
    setSaving(true);
    try {
      const id = await createCircle({
        name: circleForm.name,
        description: circleForm.description,
        category: circleForm.category,
        kind: circleForm.kind,
        area: circleForm.area,
        cadence: circleForm.cadence,
        joinPolicy: circleForm.joinPolicy,
        maxMembers: Number(circleForm.maxMembers),
        rules: circleForm.rules || undefined,
        prompts: circleForm.prompts
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean),
      });
      toast.success("Circle started. Invite people through a first plan.");
      navigate(`/circles/${id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the circle.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
          Create
        </p>
        <h1 className="mt-2 font-display text-3xl">Start something people can show up to.</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Plans use public venues and clear start and end times. You approve
          everyone who joins.
        </p>
      </header>

      <div className="mt-6 inline-flex flex-wrap gap-1 rounded-xl border border-border bg-card p-1">
        {(
          [
            { key: "activity", label: "Hosted plan" },
            { key: "invitation", label: "Open invitation" },
            { key: "circle", label: "Circle or pod" },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setTab(item.key);
              const next = new URLSearchParams(params);
              next.set("tab", item.key);
              setParams(next, { replace: true });
            }}
            className={`rounded-lg px-3.5 py-2 text-xs font-medium transition-colors ${
              tab === item.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab !== "circle" ? (
        <div className="mt-4 space-y-5 rounded-2xl border border-border bg-card p-6">
          <div>
            <Label htmlFor="title">
              {tab === "invitation" ? "What are you inviting people to?" : "Plan title"}
            </Label>
            <Input
              id="title"
              value={form.title}
              onChange={(event) => update("title", event.target.value)}
              placeholder={
                tab === "invitation"
                  ? "Anyone up for an evening walk?"
                  : "Sunday morning run around the park"
              }
              maxLength={80}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>Category</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CATEGORIES.map((category) => (
                <button
                  key={category.key}
                  type="button"
                  onClick={() => update("category", category.key)}
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    form.category === category.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {category.emoji} {category.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="description">What will happen?</Label>
            <Textarea
              id="description"
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="An easy 5k, regroup points every kilometre, breakfast after for whoever is free."
              rows={4}
              maxLength={800}
              className="mt-1.5 resize-none"
            />
            <p className="mt-1 text-right text-[11px] text-muted-foreground">
              {form.description.length}/800
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="venue">Public venue</Label>
              <Input
                id="venue"
                value={form.venue}
                onChange={(event) => update("venue", event.target.value)}
                placeholder="Cubbon Park, Gate 2"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="area">Area / neighbourhood</Label>
              <Input
                id="area"
                value={form.area}
                onChange={(event) => update("area", event.target.value)}
                placeholder="Central Bengaluru"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="startsAt">Starts at</Label>
              <Input
                id="startsAt"
                type="datetime-local"
                value={form.startsAt}
                onChange={(event) => update("startsAt", event.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Duration</Label>
              <Select
                value={form.durationMins}
                onValueChange={(value) => update("durationMins", value)}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[45, 60, 90, 120, 150, 180, 240, 300].map((minutes) => (
                    <SelectItem key={minutes} value={String(minutes)}>
                      {minutes < 60 ? `${minutes} minutes` : `${minutes / 60} hour${minutes > 60 ? "s" : ""}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="cost">Expected cost per person (₹)</Label>
              <Input
                id="cost"
                type="number"
                min={0}
                value={form.cost}
                onChange={(event) => update("cost", event.target.value)}
                className="mt-1.5"
              />
              <p className="mt-1 text-[11px] text-muted-foreground">
                No payment is collected through Connectmaxxing.
              </p>
            </div>
            <div>
              <Label htmlFor="max">Maximum people</Label>
              <Input
                id="max"
                type="number"
                min={2}
                max={30}
                value={form.maxParticipants}
                onChange={(event) => update("maxParticipants", event.target.value)}
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Repeats</Label>
              <Select
                value={form.recurrence}
                onValueChange={(value) =>
                  update("recurrence", value as typeof form.recurrence)
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">One-time plan</SelectItem>
                  <SelectItem value="weekly">Every week</SelectItem>
                  <SelectItem value="biweekly">Every two weeks</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {myCircles.length > 0 ? (
              <div>
                <Label>Part of a circle? (optional)</Label>
                <Select
                  value={form.circleId || "none"}
                  onValueChange={(value) =>
                    update("circleId", value === "none" ? "" : value)
                  }
                >
                  <SelectTrigger className="mt-1.5">
                    <SelectValue placeholder="No circle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No circle</SelectItem>
                    {myCircles.map((circle) => (
                      <SelectItem key={circle._id} value={circle._id}>
                        {circle.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-4 py-3">
            <div>
              <p className="text-sm font-medium">Beginner friendly</p>
              <p className="text-[11px] text-muted-foreground">
                Say so only if someone with no experience would be comfortable.
              </p>
            </div>
            <Switch
              checked={form.beginnerFriendly}
              onCheckedChange={(value) => update("beginnerFriendly", value)}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="equipment">What to bring</Label>
              <Input
                id="equipment"
                value={form.equipment}
                onChange={(event) => update("equipment", event.target.value)}
                placeholder="Comfortable shoes, water"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="accessibility">Accessibility notes</Label>
              <Input
                id="accessibility"
                value={form.accessibility}
                onChange={(event) => update("accessibility", event.target.value)}
                placeholder="Step-free entrance; quiet seating available"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="rules">House rules</Label>
              <Textarea
                id="rules"
                value={form.rules}
                onChange={(event) => update("rules", event.target.value)}
                placeholder="Public park only. Easy pace. No one left behind."
                rows={2}
                className="mt-1.5 resize-none"
              />
            </div>
            <div>
              <Label htmlFor="cancellation">Cancellation policy</Label>
              <Textarea
                id="cancellation"
                value={form.cancellationPolicy}
                onChange={(event) => update("cancellationPolicy", event.target.value)}
                placeholder="Cancelled by 9 pm the night before if it's raining heavily."
                rows={2}
                className="mt-1.5 resize-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <MapPin className="size-3.5" /> City is set from your profile:{" "}
              {me?.profile?.city ?? "your city"}
            </p>
            <Button onClick={submitActivity} disabled={saving} className="gap-2">
              {saving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <CalendarPlus className="size-4" />
              )}
              {tab === "invitation" ? "Publish invitation" : "Publish plan"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-5 rounded-2xl border border-border bg-card p-6">
          <div>
            <Label htmlFor="circle-name">Circle name</Label>
            <Input
              id="circle-name"
              value={circleForm.name}
              onChange={(event) =>
                setCircleForm((current) => ({ ...current, name: event.target.value }))
              }
              placeholder="Weekend Explorers"
              maxLength={60}
              className="mt-1.5"
            />
          </div>

          <div>
            <Label>Kind of circle</Label>
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {(
                [
                  ["pod", "Friendship pod", "Four to eight people, four-week arc"],
                  ["community", "Community", "Open, recurring interest group"],
                  ["conversation", "Conversation circle", "Facilitated prompts, no disclosure required"],
                ] as const
              ).map(([key, title, hint]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() =>
                    setCircleForm((current) => ({ ...current, kind: key }))
                  }
                  className={`rounded-xl border p-3 text-left transition-colors ${
                    circleForm.kind === key
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  }`}
                >
                  <p className="text-xs font-medium">{title}</p>
                  <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{hint}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="circle-description">What is it for?</Label>
            <Textarea
              id="circle-description"
              value={circleForm.description}
              onChange={(event) =>
                setCircleForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
              placeholder="Four Saturday mornings, four small bookshops. Bring whatever you're reading; nobody has to finish the book."
              rows={3}
              maxLength={600}
              className="mt-1.5 resize-none"
            />
          </div>

          <div>
            <Label>Category</Label>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {CATEGORIES.map((category) => (
                <button
                  key={category.key}
                  type="button"
                  onClick={() =>
                    setCircleForm((current) => ({
                      ...current,
                      category: category.key,
                    }))
                  }
                  className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                    circleForm.category === category.key
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:border-primary/40"
                  }`}
                >
                  {category.emoji} {category.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="circle-area">Area</Label>
              <Input
                id="circle-area"
                value={circleForm.area}
                onChange={(event) =>
                  setCircleForm((current) => ({ ...current, area: event.target.value }))
                }
                placeholder="Indiranagar"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="cadence">How often does it meet?</Label>
              <Input
                id="cadence"
                value={circleForm.cadence}
                onChange={(event) =>
                  setCircleForm((current) => ({ ...current, cadence: event.target.value }))
                }
                placeholder="Saturdays · 4 weeks"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label>Who can join?</Label>
              <Select
                value={circleForm.joinPolicy}
                onValueChange={(value) =>
                  setCircleForm((current) => ({
                    ...current,
                    joinPolicy: value as "open" | "request",
                  }))
                }
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Anyone can join</SelectItem>
                  <SelectItem value="request">I approve each member</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="max-members">Member limit</Label>
              <Input
                id="max-members"
                type="number"
                min={2}
                max={100}
                value={circleForm.maxMembers}
                onChange={(event) =>
                  setCircleForm((current) => ({
                    ...current,
                    maxMembers: event.target.value,
                  }))
                }
                className="mt-1.5"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="circle-rules">Circle rules</Label>
            <Textarea
              id="circle-rules"
              value={circleForm.rules}
              onChange={(event) =>
                setCircleForm((current) => ({ ...current, rules: event.target.value }))
              }
              placeholder="Public venues only. What's said here stays here. Passing is always allowed."
              rows={2}
              className="mt-1.5 resize-none"
            />
          </div>

          <div>
            <Label htmlFor="prompts">
              Conversation prompts{" "}
              <span className="font-normal text-muted-foreground">(one per line)</span>
            </Label>
            <Textarea
              id="prompts"
              value={circleForm.prompts}
              onChange={(event) =>
                setCircleForm((current) => ({ ...current, prompts: event.target.value }))
              }
              placeholder={"Week 1 — What brought you here?\nWeek 2 — What are you working on?\nWeek 3 — What's one thing you'd like to learn?"}
              rows={4}
              className="mt-1.5 resize-none"
            />
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
            <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <Users className="size-3.5" /> You'll be the host and first member
            </p>
            <Button onClick={submitCircle} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Start circle
            </Button>
          </div>
        </div>
      )}

      <p className="mt-4 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Checkbox checked disabled className="size-3" /> Plans and circles appear in
        your city only. Nothing is broadcast outside Connectmaxxing.
      </p>

      {myCircles.length > 0 ? (
        <div className="mt-8">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Your circles
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {myCircles.map((circle) => (
              <span
                key={circle._id}
                className="inline-flex items-center gap-1.5 rounded-full border border-border px-2.5 py-1 text-[11px]"
              >
                {circle.name}
                <CategoryChip category={circle.category} className="border-0 bg-transparent px-0" />
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
