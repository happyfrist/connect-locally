# Saanjh

**Less scrolling. More shared life.**

Saanjh is a working prototype of an 18+, platonic, real-world friendship platform for India. It is built around a single loop: discover a small plan, ask to join, meet in a public place, and privately decide whether you'd like to see each other again.

It is deliberately **not** a dating app, a feed, a follower graph or a paid-visibility product.

---

## What this repository actually contains

A responsive web application (mobile-first) with a real backend, not mock screens.

| Area | Status |
| --- | --- |
| Email OTP + guest sign-in | Working (Convex Auth) |
| 18+ onboarding and progressive profile | Working |
| Activity-first discovery with filters | Working |
| Explainable people matching | Working |
| Create hosted plans and open invitations | Working |
| Join requests + host approval/decline | Working |
| Capacity, cancellation and host updates | Working |
| Check-in, private friendship journal | Working |
| Mutual-only reconnection → connections | Working |
| Circles, friendship pods, conversation circles | Working |
| Circle membership approval + discussions | Working |
| Blocking, reporting, moderator queue, audit log | Working |
| Data export and data deletion | Working |
| Demo city seeding (clearly labelled) | Working |
| Direct messages between connections | **Not implemented** |
| Photo upload, maps, push notifications, payments | **Not implemented** |
| Identity verification, background checks | **Not implemented, not claimed** |

See [ROADMAP.md](./ROADMAP.md) for what comes next and [ARCHITECTURE.md](./ARCHITECTURE.md) for how it works.

> This is a production-minded prototype, not a launched network. It has not had legal review, a real-world safety operation, or a public pilot. Do not use it to meet strangers yet.

---

## Stack (and a deliberate deviation)

The original brief proposed Expo + Supabase. This repository was created inside a Freebuff Web environment, which provides **Vite + React + TypeScript + Convex**. Building on the provided runtime avoids running two parallel backends and keeps the whole flow — including authorization — real and testable in one place.

- **Frontend:** React 19, Vite 7, TypeScript, React Router 7, Tailwind CSS 4, shadcn/ui, Framer Motion.
- **Backend:** Convex (reactive queries, transactional mutations, TypeScript functions).
- **Auth:** Convex Auth with email OTP and anonymous guest sessions.
- **Images:** `@zumer/snapdom` to generate shareable memory cards client-side.

Authorization notes specific to Convex are in [ARCHITECTURE.md](./ARCHITECTURE.md). Convex has no Postgres RLS; every public query and mutation checks the caller's identity and permissions explicitly. That is the equivalent control here.

---

## Run it

The development server and Convex dev process are managed by the Freebuff environment. For local work:

```bash
bun install
bunx convex dev --once   # push schema/functions and regenerate types
bunx tsc -b --noEmit     # typecheck
```

Environment variables are managed by the host. The client uses `VITE_CONVEX_URL`; Convex secrets stay server-side and are never imported into client code.

There are no seeding scripts to run. After a new member finishes onboarding, a small demo city is added automatically so the full journey can be tried immediately. Every seeded profile and plan is labelled **demo**.

---

## Try the whole journey in two minutes

1. Open `/`, choose **Find something this week**, and sign in with email (or **Continue as a guest**).
2. Complete the five-step onboarding. A demo city matching your city is created.
3. **Discover → Plans**: open *Sunday morning run* and choose **Request to join**. The seeded demo host approves instantly (labelled).
4. **My Life**: a clearly marked **sample** past meetup already exists, so you can test the after-meetup step without waiting for a date to pass.
5. Open the sample plan → **Would you like to see them again?** → choose *Yes* for Ananya (demo) or Kabir (demo). A connection is created because demo profiles carry a standing demo interest. Meera (demo) does not, so her answer stays private.
6. **Connections** shows the mutual result.
7. **Create** a plan of your own. Open it, post an update, cancel it, and approve/decline requests when a second account asks to join.
8. **Circles** → join *Independent Learners*, read the discussion, add a plan to the circle.
9. **Moderation**: visit `/moderation`, claim first-moderator access (one-time bootstrap in this prototype), then report a plan from its page and process the report. Every action is audit-logged.
10. **Safety centre**: export your data, copy a safety plan for an upcoming meetup, block a member, delete your data.

To test the *real* host-approval and mutual-reconnect rules rather than the demo helper, use two guest accounts in two browser profiles.

---

## Privacy in one paragraph

Saanjh stores only what the flow needs: display name, city, neighbourhood, optional bio, languages, interests, preferences, plans, requests, check-ins, private reconnect answers, journal entries and reports. It never asks for an exact address, phone number, identity document, contacts or background location. A one-sided reconnect answer is never returned to the other person, and is deleted if either person blocks the other. There is no third-party analytics, advertising or payment integration in this version. Details and retention limits: [PRIVACY.md](./PRIVACY.md).

## Safety in one paragraph

Plans must use a public venue with a start and end time; join requests require host approval; blocked pairs cannot see or join each other's plans; reports go to a role-restricted queue with an audit trail. There is **no** identity verification, age verification beyond self-declaration, emergency response, or staffed moderation team. The 18+ gate is self-attested and described as such in the product. Read [SAFETY.md](./SAFETY.md) before doing anything real-world with this.

## Licence

No licence file is included yet. Recommendation: **AGPL-3.0** for a networked product, because it keeps modifications to a hosted Saanjh available to its users, while MIT/Apache-2.0 make more sense if the goal is maximum reuse of the domain layer. This is a founder decision; see [ROADMAP.md](./ROADMAP.md#open-decisions).

## Documentation

- [ARCHITECTURE.md](./ARCHITECTURE.md) — domain model, authorization, matching, demo data.
- [SAFETY.md](./SAFETY.md) — implemented safeguards, known gaps, incident handling.
- [PRIVACY.md](./PRIVACY.md) — data inventory, user rights, legal-review questions.
- [ROADMAP.md](./ROADMAP.md) — prioritised next work and open decisions.
