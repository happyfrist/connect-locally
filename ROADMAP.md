# Roadmap

Version 1 is the complete loop: **sign up → choose interests → find a plan → request to join → host approval → attend → private mutual reconnection → connection**. Circles, pods, conversation circles, a private journal, milestones, blocking, reporting and moderation support that loop rather than replacing it.

Everything below is ordered by risk and user value, not by how easy it is to demo.

## Before anything else: make the safety claims true

These are launch blockers, not stretch goals.

1. **Legal review** of DPDP notices and rights, intermediary obligations, grievance officer, affinity-group eligibility and event responsibility. Publish a real privacy policy and grievance channel.
2. **Staffed moderation** with SLAs, appeals, evidence retention and an on-call escalation path.
3. **Independent security review** of every Convex function, especially block bypasses, reconnect privacy, report access and moderator boundaries.
4. **Verification decision**: whether to add age/identity verification, which provider, what is stored, and how it is legally justified. Do not add document collection by default.
5. **Pilot operations**: one city chosen with founder input, 15–20 user interviews, 3–5 staffed small plans, a named safety lead, incident drills.

## Next (before a public pilot)

- **Expand backend tests** to every remaining mutation: non-host approval, circle capacity races, duplicate join requests, report lifecycle transitions and rate-limit boundaries.
- **E2E journeys** with two accounts in a real browser: host approval, cancellation, mutual reconnect, block, report → moderation, export/delete.
- **Platform-level abuse controls**: edge/WAF throttling, monitoring and alerting beyond the app's fixed-window counters; no invasive device fingerprinting.
- **Recurring occurrences**: the current `recurrence` field is descriptive only. Generate real future occurrences with edit/cancel scope.
- **Notifications**: approval, change, cancellation, mutual connection and upcoming-plan reminders. Preferences and a quiet-by-default design; no re-engagement nudges.
- **Event-scoped communication**: host ↔ attendee coordination and a connection-only conversation, with request controls, mute, block and report. Never unrestricted stranger messaging.
- **Accessibility audit** against WCAG 2.2 AA, including keyboard navigation, focus management, contrast and reduced motion. Small-Android layout has been designed for, not device-tested.
- **Data lifecycle**: legally reviewed retention periods, backup policy, export completeness and periodic deletion-worker monitoring. Session revocation and resumable product-record deletion now exist.
- **Photo support** with consent, moderation and EXIF stripping — or keep it out. The product works without photos.
- **Postgres/PostGIS migration path** if native apps require it; keep the domain services portable.

## Later

- Map layer with MapLibre and a configurable, rate-limit-respecting tile/geocoding provider. Attribution and usage policy must be honoured; no bulk tile downloads.
- Host reliability signals based on completions and cancellations, designed to avoid popularity dynamics.
- Affinity circles after legal review, with clear eligibility, reporting and moderation.
- Translation and localisation (starting with Hindi and Kannada).
- Community-run city guides and safety documentation.
- Transparent, optional venue or workshop fees once a genuine operational cost exists. Never paid visibility, never paid friendship, never paying people to attend.
- AI assistance limited to host-written descriptions, activity suggestions and conversation prompts — with explicit disclosure and no private conversation data sent to providers.

## Suggested licence

**AGPL-3.0** is the best fit for a networked product that intends to stay open: hosted modifications must remain available to users, which protects against a closed commercial fork of the community's work. Apache-2.0 is the pragmatic alternative if broad adoption and patent clarity matter more; MIT maximises reuse but offers no hosted-service protection. A `LICENSE` file has not been added because ownership and licence choice belong to the founder. Do not describe the repository as open source until one is committed.

## Open decisions

- Launch city and initial segment.
- Trademark and name-clearance check for "Connectmaxxing" before any public launch.
- Licence and contribution model.
- Whether identity verification is proportionate, and which provider.
- Moderation staffing model and funding.
- Whether photos, direct messages and payments belong in the product at all.
- How to measure the North Star (*meaningful repeat connections*) without invasive tracking. Proposed: event-based, first-party counts of repeat attendance with the same person plus mutual reconnection, never exported to third-party analytics.

## Feature gaps in v1 (stated plainly)

- No direct messaging, even between connections.
- No photo uploads or image consent workflow.
- No push notifications or email digests.
- No map or distance filter beyond city/area.
- No automatic recurring events.
- No payments or ticketing.
- No identity or age verification.
- No admin web app separate from the member app; moderation is a role-restricted route in the same client.
- Backend integration tests now cover the highest-risk authorization and lifecycle paths, but there is no browser E2E suite, load test or real-device matrix.
