# Changelog

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
