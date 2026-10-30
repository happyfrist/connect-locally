import { motion } from "framer-motion";
import {
  ArrowRight,
  Ban,
  Bike,
  BookOpen,
  CalendarDays,
  Check,
  Coffee,
  Code2,
  Compass,
  Footprints,
  HeartHandshake,
  MapPin,
  ShieldCheck,
  Sparkles,
  Sun,
  Users,
  Wallet,
} from "lucide-react";
import { Link } from "react-router";

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0 },
};

function Mark({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={`relative inline-flex size-8 items-center justify-center overflow-hidden rounded-full bg-primary ${className}`}
    >
      <span className="absolute left-1/2 top-1/2 size-4 -translate-x-1/2 -translate-y-[60%] rounded-full bg-[oklch(0.94_0.1_90)]" />
      <span className="absolute bottom-2 left-1/2 h-px w-5 -translate-x-1/2 bg-[oklch(0.95_0.03_85)]/80" />
    </span>
  );
}

function Nav() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-5">
        <Link to="/" className="flex items-center gap-2.5">
          <Mark />
          <span className="font-display text-xl tracking-tight text-foreground">
            saanjh
          </span>
        </Link>
        <nav className="ml-auto hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <a href="#why" className="transition-colors hover:text-foreground">
            Why it exists
          </a>
          <a href="#how" className="transition-colors hover:text-foreground">
            How it works
          </a>
          <a href="#circles" className="transition-colors hover:text-foreground">
            Circles
          </a>
          <a href="#safety" className="transition-colors hover:text-foreground">
            Safety
          </a>
        </nav>
        <div className="ml-auto flex items-center gap-2 md:ml-0">
          <Link
            to="/auth"
            className="hidden rounded-full px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted sm:inline-flex"
          >
            Sign in
          </Link>
          <Link
            to="/auth?returnTo=/discover"
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Join free
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function ActivityPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <motion.div
        initial={{ opacity: 0, rotate: -6, y: 24 }}
        animate={{ opacity: 1, rotate: -3, y: 0 }}
        transition={{ duration: 0.7, delay: 0.15 }}
        className="absolute -left-3 top-6 w-[86%] rounded-2xl border border-border bg-card p-4 shadow-warm"
      >
        <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
          <BookOpen className="size-3.5 text-primary" />
          Exploration · Saturday
        </div>
        <p className="mt-2 font-display text-lg leading-6">
          Bookstore crawl + filter coffee
        </p>
        <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="size-3.5" /> Church Street · 5 spots
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 26 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.3 }}
        className="relative mt-14 rounded-2xl border border-border bg-card p-5 shadow-warm"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
              <Sun className="size-3.5" /> Sunday · 7:00 am
            </div>
            <p className="mt-2 font-display text-2xl leading-7">
              Easy 5k, breakfast after
            </p>
          </div>
          <span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-secondary-foreground">
            Beginner
          </span>
        </div>
        <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
          <span className="flex size-9 items-center justify-center rounded-full bg-[oklch(0.92_0.035_150)] text-xs font-semibold text-[oklch(0.33_0.05_150)]">
            MR
          </span>
          <div className="text-xs">
            <p className="font-medium text-foreground">Meera hosts</p>
            <p className="text-muted-foreground">4 of 8 joining · Free</p>
          </div>
          <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-1 text-[11px] font-medium">
            Public park <ShieldCheck className="size-3 text-primary" />
          </span>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, delay: 0.75 }}
        className="absolute -bottom-6 left-6 flex items-center gap-3 rounded-2xl border border-[oklch(0.85_0.05_150)] bg-[oklch(0.96_0.025_150)] px-3.5 py-3 shadow-warm"
      >
        <span className="flex -space-x-2">
          <span className="flex size-7 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground ring-2 ring-[oklch(0.96_0.025_150)]">
            A
          </span>
          <span className="flex size-7 items-center justify-center rounded-full bg-[oklch(0.55_0.09_150)] text-[10px] font-semibold text-white ring-2 ring-[oklch(0.96_0.025_150)]">
            K
          </span>
        </span>
        <div>
          <p className="text-[11px] font-semibold text-[oklch(0.33_0.05_150)]">
            Mutual yes
          </p>
          <p className="text-[10px] text-[oklch(0.42_0.04_150)]">
            Both chose to reconnect, privately
          </p>
        </div>
      </motion.div>

      <span className="absolute -right-2 -top-6 rotate-6 rounded-full border border-border bg-accent px-3 py-1.5 text-[11px] font-medium text-accent-foreground shadow-sm">
        No swiping, ever
      </span>
    </div>
  );
}

const personas = [
  {
    icon: Compass,
    title: "You moved for work",
    body: "Your colleagues are lovely. You still don't know anyone to call on a Sunday.",
  },
  {
    icon: BookOpen,
    title: "You study from home",
    body: "Exam prep or a self-taught course, without a campus to meet people on.",
  },
  {
    icon: Code2,
    title: "You work remotely",
    body: "Plenty of calls, very few conversations that aren't about tickets.",
  },
  {
    icon: Footprints,
    title: "You're starting over",
    body: "School friends scattered across cities and time zones.",
  },
  {
    icon: Bike,
    title: "You want a partner",
    body: "A running buddy, a doubles opponent, someone to trek with at 5 am.",
  },
  {
    icon: HeartHandshake,
    title: "You'd rather go small",
    body: "Quiet plans, a few familiar faces, no crowd and no performance.",
  },
];

const steps = [
  {
    title: "Pick something real",
    body: "A run, a study block, a film, a café crawl. Filter by time, area, cost and how big the group is.",
  },
  {
    title: "Ask to join",
    body: "The host approves people, not an algorithm. You see the venue, the rules and who's coming first.",
  },
  {
    title: "Meet in a public place",
    body: "Plans happen in public, with clear start and end times. You can cancel or leave, no explanation needed.",
  },
  {
    title: "Reconnect, if it's mutual",
    body: "Afterwards you're each asked privately. A connection appears only when both of you say a clear yes.",
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <Nav />

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-0 paper opacity-60" />
          <div className="relative mx-auto grid w-full max-w-6xl gap-14 px-5 pb-20 pt-14 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:pb-28 lg:pt-20">
            <div>
              <motion.div
                initial="hidden"
                animate="show"
                variants={fadeUp}
                transition={{ duration: 0.5 }}
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card/80 px-3 py-1.5 text-[11px] font-medium text-muted-foreground"
              >
                <span className="size-1.5 rounded-full bg-primary" />
                Adult-only · India first · free to join
              </motion.div>

              <motion.h1
                initial="hidden"
                animate="show"
                variants={fadeUp}
                transition={{ duration: 0.6, delay: 0.08 }}
                className="mt-6 text-balance font-display text-[2.9rem] leading-[1.03] tracking-tight text-foreground sm:text-6xl"
              >
                Less scrolling.
                <br />
                More Saturday
                <br />
                <span className="italic text-primary">mornings.</span>
              </motion.h1>

              <motion.p
                initial="hidden"
                animate="show"
                variants={fadeUp}
                transition={{ duration: 0.6, delay: 0.16 }}
                className="mt-6 max-w-lg text-[15px] leading-7 text-muted-foreground"
              >
                Saanjh helps you find people who want the same real-world things
                you do — a running partner, a study table, a film, a walk after
                work. It's a bridge out of the app, not another place to live
                inside one.
              </motion.p>

              <motion.div
                initial="hidden"
                animate="show"
                variants={fadeUp}
                transition={{ duration: 0.6, delay: 0.24 }}
                className="mt-8 flex flex-wrap items-center gap-3"
              >
                <Link
                  to="/auth?returnTo=/discover"
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-sm font-medium text-primary-foreground shadow-sm transition-transform hover:-translate-y-0.5 hover:bg-primary/90"
                >
                  Find something this week
                  <ArrowRight className="size-4" />
                </Link>
                <a
                  href="#how"
                  className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
                >
                  How it works
                </a>
              </motion.div>

              <p className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="size-3.5 text-primary" /> Public venues
                  first
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Ban className="size-3.5 text-primary" /> No swipes, no scores
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Wallet className="size-3.5 text-primary" /> Free core
                  experience
                </span>
              </p>
            </div>

            <ActivityPreview />
          </div>
        </section>

        {/* Principles */}
        <section id="why" className="border-y border-border bg-card/60">
          <div className="mx-auto grid w-full max-w-6xl gap-8 px-5 py-14 md:grid-cols-3">
            {[
              {
                icon: Ban,
                title: "No infinite feed",
                body: "A handful of relevant plans, not an endless scroll engineered to keep you here.",
              },
              {
                icon: Users,
                title: "No popularity contest",
                body: "No follower counts, attractiveness scores or global leaderboards. Just shared ground.",
              },
              {
                icon: Wallet,
                title: "No paying to be seen",
                body: "You never pay to be visible to another person. Friendship isn't an ad placement.",
              },
            ].map((item) => (
              <div key={item.title} className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-secondary-foreground">
                  <item.icon className="size-5" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-foreground">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                    {item.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Personas */}
        <section className="mx-auto w-full max-w-6xl px-5 py-20">
          <div className="max-w-2xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
              Built for the in-between
            </p>
            <h2 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">
              Most of us didn't lose friends.
              <br />
              <span className="text-muted-foreground">
                We lost the place we used to meet them.
              </span>
            </h2>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {personas.map((persona) => (
              <div
                key={persona.title}
                className="group rounded-2xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-card"
              >
                <persona.icon className="size-5 text-primary" />
                <h3 className="mt-4 text-sm font-semibold text-foreground">
                  {persona.title}
                </h3>
                <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                  {persona.body}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section id="how" className="border-t border-border bg-[oklch(0.962_0.018_82)]">
          <div className="mx-auto w-full max-w-6xl px-5 py-20">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-xl">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                  The whole loop
                </p>
                <h2 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">
                  Four steps, and then you're
                  <span className="italic text-primary"> out the door.</span>
                </h2>
              </div>
              <p className="max-w-xs text-sm leading-6 text-muted-foreground">
                Messaging exists to coordinate a plan — not to become the plan.
                It is deliberately limited.
              </p>
            </div>

            <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-2 lg:grid-cols-4">
              {steps.map((step, index) => (
                <div key={step.title} className="bg-card p-6">
                  <span className="font-display text-3xl text-primary/35">
                    0{index + 1}
                  </span>
                  <h3 className="mt-5 text-sm font-semibold text-foreground">
                    {step.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Circles / pods */}
        <section id="circles" className="bg-[oklch(0.27_0.02_55)] text-[oklch(0.96_0.015_82)]">
          <div className="mx-auto grid w-full max-w-6xl gap-12 px-5 py-20 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[oklch(0.8_0.1_82)]">
                Friendship pods
              </p>
              <h2 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">
                The same four people,
                <br />
                four weeks in a row.
              </h2>
              <p className="mt-5 max-w-md text-sm leading-7 text-[oklch(0.83_0.015_82)]">
                One-off plans are a start. Familiarity needs repetition. Join a
                small pod of four to eight people with a simple arc — no endless
                group chat, no performance.
              </p>
              <div className="mt-7 flex flex-wrap gap-2">
                {[
                  "Morning runners",
                  "Independent learners",
                  "Book & coffee",
                  "New-city friends",
                  "Quiet mornings",
                  "Movie circle",
                ].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-[oklch(0.88_0.015_82)]"
                  >
                    {chip}
                  </span>
                ))}
              </div>
              <Link
                to="/auth?returnTo=/circles"
                className="mt-8 inline-flex items-center gap-2 rounded-full bg-[oklch(0.94_0.03_85)] px-5 py-2.5 text-sm font-medium text-[oklch(0.27_0.02_55)] transition-colors hover:bg-white"
              >
                Browse circles <ArrowRight className="size-4" />
              </Link>
            </div>

            <div className="rounded-3xl border border-white/12 bg-white/[0.04] p-6 backdrop-blur-sm sm:p-8">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[oklch(0.8_0.1_82)]">
                    Four-week arc
                  </p>
                  <p className="mt-1 font-display text-2xl">Weekend Explorers</p>
                </div>
                <span className="rounded-full border border-white/15 px-2.5 py-1 text-[10px] uppercase tracking-wider">
                  6 of 8
                </span>
              </div>
              <div className="mt-7 space-y-1">
                {[
                  ["Week 1", "Introductions over coffee", "Low stakes, no personal disclosures expected"],
                  ["Week 2", "Shared exploration", "A neighbourhood walk everyone can manage"],
                  ["Week 3", "A group activity", "Something with a task, so talking is optional"],
                  ["Week 4", "Reflect, and choose", "Keep meeting, or part warmly. Both are fine"],
                ].map(([week, title, body], index) => (
                  <div key={week} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <span className="flex size-7 items-center justify-center rounded-full border border-white/20 text-[10px]">
                        {index + 1}
                      </span>
                      {index < 3 ? (
                        <span className="h-12 w-px bg-white/15" />
                      ) : null}
                    </div>
                    <div className="pb-4">
                      <p className="text-[10px] uppercase tracking-[0.14em] text-[oklch(0.72_0.02_82)]">
                        {week}
                      </p>
                      <p className="mt-1 text-sm font-medium">{title}</p>
                      <p className="mt-0.5 text-xs leading-5 text-[oklch(0.76_0.015_82)]">
                        {body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Safety */}
        <section id="safety" className="mx-auto w-full max-w-6xl px-5 py-20">
          <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-start">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                Safety is the product
              </p>
              <h2 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">
                Strangers meeting in person
                <br />
                needs more than a checkbox.
              </h2>
              <p className="mt-5 max-w-md text-sm leading-7 text-muted-foreground">
                This is a prototype built around that responsibility, not a
                finished safety operation. Here's what is actually implemented —
                and what still needs real-world work before any public pilot.
              </p>
              <Link
                to="/auth?returnTo=/safety"
                className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
              >
                Read the safety centre <ArrowRight className="size-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {[
                ["Public venues, shown before you join", "No home addresses, no undisclosed location changes."],
                ["Host approval, not automatic matching", "Every attendee is approved by a person who can be reported."],
                ["Private, mutual reconnection", "One-sided interest is never revealed. A connection needs two clear yes answers."],
                ["Block, report and a human review queue", "Reports are visible only to moderators, with a traceable action log."],
                ["Minimum data, approximate location", "City and area only. No background tracking, no contact uploads, no Aadhaar."],
              ].map(([title, body]) => (
                <div
                  key={title}
                  className="flex gap-3 rounded-xl border border-border bg-card p-4"
                >
                  <span className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
                    <Check className="size-3" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{title}</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      {body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Quote / principle */}
        <section className="border-y border-border bg-card/60">
          <div className="mx-auto max-w-4xl px-5 py-16 text-center">
            <Sparkles className="mx-auto size-5 text-primary" />
            <blockquote className="mt-5 font-display text-2xl leading-snug text-foreground sm:text-3xl">
              “A successful member might eventually stop needing Saanjh to make
              plans with their friends. That's a successful outcome, not
              churn.”
            </blockquote>
            <p className="mt-4 text-xs uppercase tracking-[0.16em] text-muted-foreground">
              From the product principles
            </p>
          </div>
        </section>

        {/* Honest demo band */}
        <section className="mx-auto w-full max-w-6xl px-5 py-14">
          <div className="flex flex-col gap-5 rounded-2xl border border-dashed border-border bg-[oklch(0.955_0.03_85)] p-6 sm:flex-row sm:items-center">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-card">
              <Coffee className="size-5 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                This is a working prototype, not a launched network.
              </p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Seeded members are clearly marked “demo”, and sample meetup
                history is labelled. There are no testimonials here from people
                who don't exist.
              </p>
            </div>
            <Link
              to="/auth?returnTo=/discover"
              className="inline-flex shrink-0 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Try the flow <ArrowRight className="size-4" />
            </Link>
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto w-full max-w-6xl px-5 pb-20">
          <div className="relative overflow-hidden rounded-3xl bg-primary px-7 py-14 text-primary-foreground sm:px-14">
            <div className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full border-[40px] border-white/10" />
            <div className="pointer-events-none absolute -bottom-24 right-24 size-48 rounded-full border-[24px] border-white/10" />
            <div className="relative max-w-xl">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/70">
                Start with one plan
              </p>
              <h2 className="mt-3 font-display text-3xl leading-tight sm:text-4xl">
                Someone in your city is
                <br />
                also free on Sunday.
              </h2>
              <p className="mt-4 text-sm leading-7 text-white/80">
                Pick a plan, meet in public, and see who you'd like to see again.
                No profile performance required.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to="/auth?returnTo=/discover"
                  className="inline-flex items-center gap-2 rounded-full bg-[oklch(0.97_0.02_85)] px-5 py-3 text-sm font-medium text-[oklch(0.28_0.03_55)] hover:bg-white"
                >
                  Create an account <ArrowRight className="size-4" />
                </Link>
                <Link
                  to="/auth"
                  className="inline-flex items-center gap-2 rounded-full border border-white/30 px-5 py-3 text-sm font-medium text-white hover:bg-white/10"
                >
                  I already have one
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-5 py-10 sm:flex-row sm:items-center">
          <div className="flex items-center gap-2.5">
            <Mark />
            <div>
              <p className="font-display text-lg leading-none">saanjh</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Less scrolling. More shared life.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground sm:ml-auto">
            <a href="#why" className="hover:text-foreground">
              Principles
            </a>
            <a href="#safety" className="hover:text-foreground">
              Safety
            </a>
            <Link to="/auth" className="hover:text-foreground">
              Sign in
            </Link>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3" /> Prototype · v1
            </span>
          </div>
        </div>
        <div className="mx-auto w-full max-w-6xl border-t border-border/70 px-5 py-4 text-[11px] leading-5 text-muted-foreground">
          Saanjh is an 18+ platonic friendship product. This prototype has not
          completed legal review, identity verification or a real-world safety
          operation. Please don't use it to meet strangers yet.
        </div>
      </footer>
    </div>
  );
}
