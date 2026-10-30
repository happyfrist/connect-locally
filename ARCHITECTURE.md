# Architecture

## 1. Shape of the system

A modular monolith: one Vite/React client and one Convex deployment. There is no separate API server, no microservice split and no service-role key in the browser.

```
src/
  pages/                 route-level screens (UI composition only)
  components/
    AppShell.tsx         nav, profile gate, derived notifications
    product/             shared product UI (cards, report dialog, primitives)
    ui/                  shadcn/ui primitives
  convex/
    schema.ts            all tables, indexes and enums
    lib/
      catalog.ts         shared activity/interests vocabulary (client-safe)
      auth.ts            identity, profile gate, block checks, allow-listed public shape
      matching.ts        deterministic scoring + explanations
    profiles.ts          onboarding, public profile, export, deletion
    activities.ts        discover, detail, create/edit/cancel, requests, attendance, updates, plans
    people.ts            explainable suggestions and person detail
    reconnect.ts         private decisions, mutual connection creation, connections list
    circles.ts           circles, pods, conversation circles, membership, posts, plans
    journal.ts           private journal, stats, computed milestones
    safety.ts            blocking, reports, reporter view
    moderation.ts        moderator bootstrap, queue, decisions, audit log
    seed.ts              idempotent demo city
```

### Why not Expo + Supabase?

The brief specified Expo/Supabase. This project was created in a Freebuff Web environment that provides Vite + React + Convex and deploys those automatically. Building the entire domain twice — or standing up an unconnected Supabase schema next to a working app — would produce documentation instead of a working product.

Consequences:

- **No Postgres RLS.** Authorization is enforced inside every public Convex function, which is the only execution path available to clients. The equivalent policy tests are listed in §5.
- **No React Native screens.** The UI is responsive and mobile-first with bottom navigation, but it is a web app.
- **No Expo push, MapLibre or PostGIS.** There is no background location or map layer at all; discovery is city/area based as the brief allows for a first prototype.

The domain model and permission rules translate directly to Postgres + RLS if a native client is built later.

## 2. Data model

| Table | Purpose | Notable constraints |
| --- | --- | --- |
| `users` | Convex Auth identity + `role` (`admin`/`member`) | email indexed by auth; never returned to other members |
| `profiles` | Public-facing member profile and preferences | `by_user` unique in practice; `isDemo`, `hidden` |
| `activities` | Hosted plans and open invitations | `status`, `startsAt`, `maxParticipants`, `autoApprove` (demo only), `isDemo` |
| `joinRequests` | Join intent + host decision | `by_activity_user`; one row per member per plan |
| `attendance` | Honest self/host check-in | `isDemo` marks sample history |
| `reconnectDecisions` | Private yes/maybe/no per direction | `by_pair(activityId, fromUserId, toUserId)` |
| `connections` | Mutual reconnection result | stored sorted as `userA`/`userB`, `by_pair` |
| `blocks` | Directional block, enforced both ways | `by_pair`; deletes pending decisions between the pair |
| `reports` | Safety reports + moderator outcome | reporter-only index; status enum |
| `circles` | Community, pod or conversation circle | `kind`, `joinPolicy`, `maxMembers`, `prompts` |
| `circleMembers` | Membership + pending requests | `by_circle_user`; host role |
| `circlePosts` | Circle discussion/announcement | members-only read in `circles.get` |
| `activityUpdates` | Host announcements | visible with the plan |
| `journalEntries` | Private memory per attended plan | `by_user_activity`; `isDemo` for the sample |
| `auditLog` | Moderator and bootstrap actions | append-only through functions |
| `demoSeed` | Idempotency markers | content per city, history per member |

All timestamps are stored as epoch milliseconds. No table stores exact coordinates, phone numbers, messages or identity documents. There is intentionally no direct-message table yet.

## 3. Authorization model

Every public function starts with `requireProfile(ctx)` (a valid signed-in user with a completed profile) or `requireAdmin(ctx)`. There is no unauthenticated read path except Convex Auth's own endpoints.

| Operation | Rule |
| --- | --- |
| Read a plan | Signed in, not blocked with the host. Venue and area are public by design. |
| Read participant names | Signed in and not blocked with those members. Only approved participants; no contact details. |
| Request to join | Not the host, plan open, not started, capacity available, no existing pending/approved/declined request, not blocked with host. |
| Approve/decline | Host of that plan only; request must be pending; approval re-checks capacity transactionally. |
| Withdraw | Request owner only. |
| Post update / cancel | Host only. Cancelling declines pending requests and sets a reason. |
| Check in | Host or approved participant; only after start time. Creates one journal entry, idempotently. |
| Read reconnect candidates | Only if the viewer checked in; candidates are the host plus checked-in attendees. |
| Submit reconnect decision | Both parties must be attendees; blocked pairs rejected; answer upserted privately. |
| Create connection | Only inside `reconnect.decide` when both directions are `yes`. Never through a public mutation. |
| Connections list | Only rows where the caller is `userA` or `userB`, with blocks filtered. |
| Circle read | Signed in; host blocked check. Discussion posts and pending members are returned only to approved members/host. |
| Circle join | Capacity and block checks; `open` approves immediately, `request` creates a pending membership. |
| Circle approve | Host only, pending row only, capacity re-checked. |
| Circle post | Approved member; announcements host-only. |
| Report | Signed in; target existence validated; duplicates with an open report are collapsed. |
| Moderator queue/resolve | `role === "admin"` only; decisions write `auditLog`. |
| Data export | Caller's own rows only. |
| Data deletion | Caller's own rows, their hosted plans/circles, related participant rows, and decisions about them. |

Blocks are checked in discovery, people suggestions, plan detail, join requests, circle listing/joining, reconnect and connection listings. Because blocked users can call functions directly with known IDs, the checks live inside the functions, not only in the UI.

## 4. Matching

`src/convex/lib/matching.ts` is deterministic and explainable:

| Signal | Weight |
| --- | --- |
| Shared interest categories | 0.25 |
| Shared preferred activities | 0.20 |
| Shared availability slots | 0.20 |
| Same neighbourhood | 0.15 |
| Budget compatibility | 0.10 |
| Group-size preference | 0.10 |

The result is presented as “shared ground”, not compatibility or attractiveness. The UI shows the actual reasons (“Both into morning runs and café outings”, “Also free on weekend mornings”). No appearance, gender, caste, religion, sexuality, mental health, income or inferred attributes are used. No model, training or external AI provider is involved.

Weights are a product hypothesis, not a scientific claim. Change them in one file and re-run the unit tests.

## 5. Safety-critical behaviour

1. **Mutual-only connection.** `reconnect.decide` writes the caller's answer, then reads the other direction. It returns only `{ connected }` — never the other person's answer. A "maybe" is never surfaced.
2. **Demo consent.** Seeded demo profiles have `openToReconnect` as a standing demo interest. When a real member chooses yes, the mutation records the demo profile's yes explicitly. The UI labels the profile, the plan and the resulting history as demo/sample. This exists only so the flow is testable in a one-person demo; it is not a pattern for real members.
3. **Blocks delete pending answers** in both directions, so a later one-sided yes cannot create a connection.
4. **Reports never return to the reported member.** The reporter sees status only; internal notes stay moderator-side.
5. **Moderation bootstrap is one-time.** `/moderation` lets the first member claim the role only while no admin exists. Production must grant roles server-side.
6. **No verification claims.** The 18+ gate is self-declared and the UI says so. No identity provider is integrated.
7. **Public venues only.** The data model has `venue` + `area`, not coordinates or addresses.

## 6. Demo data

`seed.seedDemoCity` is idempotent via `demoSeed` markers.

- `content:<city>` — five clearly labelled demo members, ten plans, five circles and discussion posts in the member's city.
- `history:<userId>` — one past “sample history” plan with the member and two demo attendees, so the post-meetup flow works immediately.

Demo hosts have `autoApprove: true` so the join → approval journey works without a second human account. Everything seeded is flagged and rendered with a **demo** or **sample** badge. No real member is given fake attendance beyond the explicitly labelled sample entry.

Seeded demo accounts cannot sign in: they have no credentials.

## 7. Runtime and scale

Queries cap lists (30 plans, 12 people, 40 posts, 100 reports) and use indexes for the primary access paths. Some per-row follow-up queries (counts, profiles) are intentionally simple; they are fine at prototype scale and would be denormalised or paginated before a city pilot. Convex reactivity means approvals, capacity and reconnect results update without polling.

## 8. Verification status

- `bunx convex dev --once` — schema and functions deploy successfully.
- `bunx tsc -b --noEmit` — passes for the client and functions.
- `bun test` — 7 unit tests for the deterministic matching weights, reasons and edge cases.
- No integration/E2E harness, load test, or device matrix exists yet. No browser-driven visual test was performed on a physical Android device, and the author could not drive the preview interactively from this environment.
- Backend authorization was reviewed function by function, but has not been penetration-tested.

See [ROADMAP.md](./ROADMAP.md) for the testing work required before a pilot.
