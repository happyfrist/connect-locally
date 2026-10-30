# Changelog

## v0.2.0 — production hardening (in progress)

### Security and account lifecycle

- Removed the public `claimModerator` mutation. Moderator/admin roles are now granted only through internal owner functions (`moderation.grantRole`, `moderation.listModerators`) and can be revoked the same way.
- Added `moderator` as a least-privilege role alongside `admin`; moderation UI and functions accept either, with no self-service path.
- Added owner-only disable/re-enable (`moderation.setAccountStatus`) that revokes live sessions and is audit-logged.
- Added explicit account status (`active`, `disabled`, `deleting`, `deleted`) enforced by every product function.
- Account deletion now revokes all auth sessions, refresh tokens, provider accounts and verification codes synchronously, then removes product records in bounded, indexed, resumable batches. Moderator reports/audit records are retained as an unidentified safety record.
- Added account notice screens for disabled/deleting/deleted accounts.
- Added a confirmation dialog to the previously unreachable “Delete my data” action.

### Authorization and privacy

- Centralised profile visibility: hidden, blocked, disabled, deleting and deleted accounts are filtered consistently from profiles, discovery, plans, participants, circles, circle posts and connections.
- Blocking now ends an existing connection and removes both sides' pending reconnect answers; block checks cover direct-ID calls.
- Hidden hosts can no longer expose their plans through list/detail queries.
- Fixed host session/profile lookup in the scheduled deletion worker.

### Integrity and abuse controls

- Check-in is limited to 30 minutes before start through 24 hours after scheduled end; cancelled plans are rejected.
- Hosts must check in like participants; the UI now offers host check-in.
- Reconnection opens only after a plan ends, closes after 14 days, and is rejected for cancelled plans.
- Added fixed-window rate limits for profile writes, plan creation, join requests, plan updates, check-ins, circle creation/joining/posting/decisions, reports, blocks, reconnection and moderation decisions.
- Report reasons are server-side allow-listed; duplicates are still collapsed.
- Demo seeding and demo reconnection consent require `ALLOW_DEMO_SEED=true`; production defaults to off.
- Anonymous guest accounts are refused by all product functions unless `ALLOW_GUEST_DEMO=true`; production requires an email-verified account. The guest button is hidden when disabled and the false “add an email later” claim was removed.

### Testing and tooling

- Added `convex-test` + Vitest backend integration tests with independent identities (14 tests).
- Added pure policy tests for check-in/reconnect windows, rate buckets and demo/guest gating (7 tests).
- Upgraded `convex` to 1.48.0 for the test harness.
- Fixed all ESLint errors across the repository; remaining warnings are Fast Refresh hints in generated/shadcn files.

### Still blocked

- No live review URL was provided; browser E2E, mobile and accessibility checks were not run.
- No legal review, grievance process, staffed moderation, age/identity assurance, platform-level abuse monitoring, backups/restore test or independent penetration test.

## v0.1.0 — prototype

### Added

- Email OTP and guest authentication via Convex Auth.
- Five-step 18+ onboarding with city, area, languages, interests, preferred activities, availability, budget, group size and comfort.
- Activity-first discovery with category, time, cost and beginner filters; open invitations.
- Explainable people suggestions with shared-ground reasons.
- Hosted plans and open invitations with public venue, capacity, rules, accessibility, equipment, cancellation policy and recurrence (descriptive).
- Join requests with host approve/decline, capacity checks, withdraw, cancellation and host updates.
- Check-in, private friendship journal, computed milestones and client-side share cards.
- Post-meetup private reconnect decisions with mutual-only connection creation.
- Connections list, with connection removal that also clears the pair's private answers.
- Circles: communities, four-week friendship pods and conversation circles, with membership approval, prompts, plans and discussions.
- Blocking, reporting, reporter status view and a role-restricted moderator queue with audit log.
- Personal data export and deletion.
- Labelled demo city seeding, including one clearly marked sample past meetup for testing reconnection.
- Matching unit tests (`bun test`).
- Product, architecture, safety, privacy, security, contribution and roadmap documentation.

### Known gaps

- No direct messaging, photos, push notifications, maps, payments or identity verification.
- No automatic recurring event occurrences.
- No integration/E2E test harness, load testing or device matrix.
- Legal review, moderation staffing, grievance channel and pilot operations are not complete.

### Verified

- Convex schema and functions deploy with `bunx convex dev --once`.
- `bunx tsc -b --noEmit` passes.
- `bun test` passes (7 tests).
- All lazy-loaded page modules transform in the Vite dev server.
