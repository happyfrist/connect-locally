import { Avatar } from "@/components/product/ui";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { api } from "@/convex/_generated/api";
import {
  AVAILABILITY,
  BUDGETS,
  CATEGORIES,
  CITY_SUGGESTIONS,
  COMFORT_LEVELS,
  GROUP_SIZES,
  LANGUAGES,
} from "@/convex/lib/catalog";
import { useMutation, useQuery } from "convex/react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  MapPin,
  Sparkles,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";

type FormState = {
  displayName: string;
  city: string;
  area: string;
  bio: string;
  languages: string[];
  interests: string[];
  activities: string[];
  availability: string[];
  groupSize: "one" | "small" | "large";
  budget: "free" | "low" | "flexible";
  comfort: "quiet" | "balanced" | "lively";
};

const initialForm: FormState = {
  displayName: "",
  city: "",
  area: "",
  bio: "",
  languages: ["English"],
  interests: [],
  activities: [],
  availability: ["weekend-mornings"],
  groupSize: "small",
  budget: "low",
  comfort: "balanced",
};

const STEPS = ["You", "Where", "Interests", "Comfort", "Review"];

export default function Onboarding() {
  const me = useQuery(api.profiles.me);
  const complete = useMutation(api.profiles.completeOnboarding);
  const seed = useMutation(api.seed.seedDemoCity);
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const isEditing = params.get("edit") === "1";

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(initialForm);
  const [adult, setAdult] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);

  useEffect(() => {
    if (hydrated || !me?.profile) return;
    setForm({
      displayName: me.profile.displayName,
      city: me.profile.city,
      area: me.profile.area,
      bio: me.profile.bio,
      languages: me.profile.languages,
      interests: me.profile.interests,
      activities: me.profile.activities,
      availability: me.profile.availability,
      groupSize: me.profile.groupSize,
      budget: me.profile.budget,
      comfort: me.profile.comfort,
    });
    setAdult(true);
    setHydrated(true);
  }, [me, hydrated]);

  if (me === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const profile = me?.profile;
  const update = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const toggle = (key: "languages" | "interests" | "availability" | "activities", value: string) => {
    setForm((current) => {
      const has = current[key].includes(value);
      let next = has
        ? current[key].filter((item) => item !== value)
        : [...current[key], value];
      const result = { ...current, [key]: next };
      if (key === "interests" && has) {
        // Remove activities that belonged to the removed category.
        const category = CATEGORIES.find((item) => item.key === value);
        if (category) {
          result.activities = current.activities.filter(
            (activity) => !category.activities.includes(activity),
          );
        }
      }
      return result;
    });
  };

  const selectedCategories = CATEGORIES.filter((category) =>
    form.interests.includes(category.key),
  );

  const stepValid = (() => {
    if (step === 0) return form.displayName.trim().length >= 2 && adult;
    if (step === 1) return form.city.trim().length > 1 && form.area.trim().length > 0;
    if (step === 2) return form.interests.length > 0;
    if (step === 3) return form.availability.length > 0 && form.activities.length > 0;
    return true;
  })();

  const submit = async () => {
    setSaving(true);
    try {
      await complete({
        ...form,
        displayName: form.displayName.trim(),
        city: form.city.trim(),
        area: form.area.trim(),
        bio: form.bio.trim(),
        confirmedAdult: true,
      });
      if (!profile) {
        setSeeding(true);
        try {
          await seed({});
        } catch (error) {
          console.warn("Demo seed skipped", error);
        }
      }
      toast.success(isEditing ? "Profile updated" : "You're in. Welcome to Saanjh.");
      navigate("/discover");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save your profile.");
    } finally {
      setSaving(false);
      setSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto w-full max-w-3xl px-5 py-8 sm:py-12">
        <div className="flex items-center justify-between">
          <Link to={profile ? "/discover" : "/"} className="flex items-center gap-2.5">
            <span className="relative inline-flex size-8 items-center justify-center overflow-hidden rounded-full bg-primary">
              <span className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-[60%] rounded-full bg-[oklch(0.94_0.1_90)]" />
            </span>
            <span className="font-display text-xl">saanjh</span>
          </Link>
          {profile ? (
            <Button variant="ghost" size="sm" asChild>
              <Link to="/discover">Cancel</Link>
            </Button>
          ) : null}
        </div>

        <div className="mt-8 flex items-center gap-2">
          {STEPS.map((label, index) => (
            <div key={label} className="flex flex-1 items-center gap-2">
              <div className="flex-1">
                <div
                  className={`h-1 rounded-full ${
                    index <= step ? "bg-primary" : "bg-border"
                  }`}
                />
                <p
                  className={`mt-2 hidden text-[10px] font-medium uppercase tracking-wider sm:block ${
                    index <= step ? "text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-2xl border border-border bg-card p-6 shadow-warm sm:p-9">
          {step === 0 ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                {isEditing ? "Your profile" : "A little about you"}
              </p>
              <h1 className="mt-2 font-display text-3xl">
                {isEditing ? "Keep your profile true." : "Let's start with you."}
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                This is what other members see. Your email, phone number and exact
                address are never shown.
              </p>

              <div className="mt-7 flex items-center gap-4">
                <Avatar name={form.displayName || "New member"} size="lg" />
                <div className="flex-1">
                  <Label htmlFor="displayName">Display name</Label>
                  <Input
                    id="displayName"
                    value={form.displayName}
                    onChange={(event) => update("displayName", event.target.value)}
                    placeholder="What should people call you?"
                    maxLength={40}
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div className="mt-5">
                <Label htmlFor="bio">
                  A short introduction{" "}
                  <span className="font-normal text-muted-foreground">(optional)</span>
                </Label>
                <Textarea
                  id="bio"
                  value={form.bio}
                  onChange={(event) => update("bio", event.target.value)}
                  placeholder="New in town, learning to cook, looking for people to walk with."
                  maxLength={280}
                  rows={3}
                  className="mt-1.5 resize-none"
                />
                <p className="mt-1 text-right text-[11px] text-muted-foreground">
                  {form.bio.length}/280
                </p>
              </div>

              <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-border bg-background/60 p-4">
                <Checkbox
                  checked={adult}
                  onCheckedChange={(value) => setAdult(value === true)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-medium">
                    I'm 18 or older
                  </span>
                  <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
                    Saanjh is an adult-only space. This is a self-declaration, not
                    identity verification — we say so honestly.
                  </span>
                </span>
              </label>
            </div>
          ) : null}

          {step === 1 ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                Your patch of the city
              </p>
              <h1 className="mt-2 font-display text-3xl">Where do you spend your days?</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                We only use your city and neighbourhood, never exact coordinates.
                There is no background location tracking.
              </p>

              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    list="city-suggestions"
                    value={form.city}
                    onChange={(event) => update("city", event.target.value)}
                    placeholder="Bengaluru"
                    className="mt-1.5"
                  />
                  <datalist id="city-suggestions">
                    {CITY_SUGGESTIONS.map((city) => (
                      <option key={city} value={city} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <Label htmlFor="area">Neighbourhood or area</Label>
                  <Input
                    id="area"
                    value={form.area}
                    onChange={(event) => update("area", event.target.value)}
                    placeholder="Indiranagar"
                    className="mt-1.5"
                  />
                </div>
              </div>

              <div className="mt-6 flex items-start gap-3 rounded-xl bg-secondary/60 p-4 text-xs leading-5 text-secondary-foreground">
                <MapPin className="mt-0.5 size-4 shrink-0" />
                Plans always show a public venue. Your home address is never
                collected, asked for, or displayed.
              </div>

              <div className="mt-7">
                <Label>Languages you're comfortable with</Label>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {LANGUAGES.map((language) => (
                    <button
                      key={language}
                      type="button"
                      onClick={() => toggle("languages", language)}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                        form.languages.includes(language)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-card hover:border-primary/40"
                      }`}
                    >
                      {language}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                What you'd enjoy
              </p>
              <h1 className="mt-2 font-display text-3xl">
                Pick a few things worth leaving the house for.
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Choose up to nine. This drives both activity suggestions and the
                shared ground you'll see with other people. No interests means no
                weak guesses.
              </p>

              <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
                {CATEGORIES.map((category) => {
                  const selected = form.interests.includes(category.key);
                  return (
                    <button
                      key={category.key}
                      type="button"
                      onClick={() => toggle("interests", category.key)}
                      className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors ${
                        selected
                          ? "border-primary bg-primary/5"
                          : "border-border bg-card hover:border-primary/40"
                      }`}
                    >
                      <span className="text-xl" aria-hidden>
                        {category.emoji}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-2 text-sm font-medium">
                          {category.label}
                          {selected ? (
                            <Check className="ml-auto size-4 text-primary" />
                          ) : null}
                        </span>
                        <span className="mt-0.5 block text-xs text-muted-foreground">
                          {category.tagline}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">
                {form.interests.length}/9 selected
              </p>
            </div>
          ) : null}

          {step === 3 ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                Comfort, not performance
              </p>
              <h1 className="mt-2 font-display text-3xl">How do you like to meet?</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                These are filters, not a personality test. You can change them any
                time.
              </p>

              <div className="mt-7">
                <Label>Preferred activities</Label>
                <div className="mt-2.5 space-y-4">
                  {selectedCategories.map((category) => (
                    <div key={category.key}>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                        {category.emoji} {category.label}
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {category.activities.map((activity) => (
                          <button
                            key={activity}
                            type="button"
                            onClick={() => toggle("activities", activity)}
                            className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                              form.activities.includes(activity)
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border hover:border-primary/40"
                            }`}
                          >
                            {activity}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-7">
                <Label>When are you usually free?</Label>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {AVAILABILITY.map((slot) => (
                    <button
                      key={slot.key}
                      type="button"
                      onClick={() => toggle("availability", slot.key)}
                      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                        form.availability.includes(slot.key)
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      {slot.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-7 grid gap-5 sm:grid-cols-2">
                <div>
                  <Label>Group size you prefer</Label>
                  <div className="mt-2 space-y-2">
                    {GROUP_SIZES.map((option) => (
                      <OptionRow
                        key={option.key}
                        selected={form.groupSize === option.key}
                        label={option.label}
                        hint={option.hint}
                        onClick={() => update("groupSize", option.key)}
                      />
                    ))}
                  </div>
                </div>
                <div>
                  <Label>Budget for a plan</Label>
                  <div className="mt-2 space-y-2">
                    {BUDGETS.map((option) => (
                      <OptionRow
                        key={option.key}
                        selected={form.budget === option.key}
                        label={option.label}
                        hint={option.hint}
                        onClick={() => update("budget", option.key)}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="mt-6">
                <Label>Your kind of room</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {COMFORT_LEVELS.map((option) => (
                    <button
                      key={option.key}
                      type="button"
                      onClick={() => update("comfort", option.key)}
                      title={option.hint}
                      className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                        form.comfort === option.key
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:border-primary/40"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                One last look
              </p>
              <h1 className="mt-2 font-display text-3xl">Ready when you are.</h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                You control what's visible. Email is private, area is approximate,
                and you can edit or delete all of this later.
              </p>

              <div className="mt-6 rounded-xl border border-border bg-background/60 p-4">
                <div className="flex items-center gap-3">
                  <Avatar name={form.displayName} size="lg" />
                  <div>
                    <p className="font-display text-xl">{form.displayName || "Your name"}</p>
                    <p className="text-xs text-muted-foreground">
                      {form.area || "Your area"} · {form.city || "Your city"} ·{" "}
                      {form.languages.join(", ")}
                    </p>
                  </div>
                </div>
                {form.bio ? (
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">
                    {form.bio}
                  </p>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {form.interests.map((interest) => {
                    const category = CATEGORIES.find((item) => item.key === interest);
                    return (
                      <span
                        key={interest}
                        className="rounded-full bg-muted px-2.5 py-1 text-[11px]"
                      >
                        {category?.emoji} {category?.label ?? interest}
                      </span>
                    );
                  })}
                </div>
                <div className="mt-4 grid gap-2 border-t border-border pt-3 text-xs text-muted-foreground sm:grid-cols-2">
                  <p>
                    <span className="font-medium text-foreground">Activities: </span>
                    {form.activities.join(", ") || "None yet"}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Free on: </span>
                    {form.availability
                      .map((key) => AVAILABILITY.find((slot) => slot.key === key)?.label ?? key)
                      .join(", ")}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Group size: </span>
                    {GROUP_SIZES.find((option) => option.key === form.groupSize)?.label}
                  </p>
                  <p>
                    <span className="font-medium text-foreground">Budget: </span>
                    {BUDGETS.find((option) => option.key === form.budget)?.label}
                  </p>
                </div>
              </div>

              {!profile ? (
                <div className="mt-5 flex items-start gap-3 rounded-xl bg-secondary/60 p-4 text-xs leading-5 text-secondary-foreground">
                  <Sparkles className="mt-0.5 size-4 shrink-0" />
                  After you join we'll add a small, clearly labelled demo city so
                  you can try the full journey immediately. Demo members are marked
                  as demo everywhere.
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="mt-8 flex items-center justify-between gap-3 border-t border-border pt-5">
            <Button
              variant="ghost"
              onClick={() => setStep((current) => Math.max(0, current - 1))}
              disabled={step === 0 || saving}
              className="gap-2"
            >
              <ArrowLeft className="size-4" /> Back
            </Button>
            {step < 4 ? (
              <Button
                onClick={() => setStep((current) => current + 1)}
                disabled={!stepValid}
                className="gap-2"
              >
                Continue <ArrowRight className="size-4" />
              </Button>
            ) : (
              <Button onClick={submit} disabled={saving} className="gap-2">
                {saving || seeding ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Check className="size-4" />
                )}
                {isEditing ? "Save profile" : "Finish and explore"}
              </Button>
            )}
          </div>
          {!stepValid && step < 4 ? (
            <p className="mt-3 text-right text-xs text-muted-foreground">
              {step === 0
                ? "Add a display name and confirm you're 18+."
                : step === 1
                  ? "Add your city and area."
                  : step === 2
                    ? "Pick at least one interest."
                    : "Pick at least one activity and one time slot."}
            </p>
          ) : null}
        </div>

        <p className="mt-5 text-center text-xs leading-5 text-muted-foreground">
          Saanjh is 18+. Your exact address, phone number and email are never
          shared with other members.
        </p>
      </div>
    </div>
  );
}

function OptionRow({
  selected,
  label,
  hint,
  onClick,
}: {
  selected: boolean;
  label: string;
  hint: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-start gap-2 rounded-lg border px-3 py-2 text-left transition-colors ${
        selected ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
      }`}
    >
      <span
        className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full border ${
          selected ? "border-primary bg-primary" : "border-border"
        }`}
      >
        {selected ? <Check className="size-2.5 text-primary-foreground" /> : null}
      </span>
      <span>
        <span className="block text-xs font-medium">{label}</span>
        <span className="block text-[11px] text-muted-foreground">{hint}</span>
      </span>
    </button>
  );
}
