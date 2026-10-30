# Security

Connectmaxxing handles real-world meeting coordination. Security and safety reports are taken seriously even though this is a prototype.

## Reporting a vulnerability

**No security contact is configured yet.** Before publishing this repository or running a pilot, add a monitored private channel (for example a dedicated security email and a GitHub private vulnerability reporting setting) and replace this section.

Do not open a public issue containing:

- an exploit or steps to reproduce a data leak,
- personal data about a member,
- credentials, tokens or deployment identifiers.

Until a channel exists, do not deploy this code publicly.

## In scope

- Authorization bypasses in Convex functions (reading another member's data, approving your own membership, bypassing a block, reading a one-sided reconnect answer).
- Report or moderation data exposure.
- Privilege escalation to the `admin` role.
- Injection through free-text fields.
- Secret leakage into client bundles or git history.
- Session or OTP weaknesses.

## Out of scope (documented gaps, not vulnerabilities)

- Self-declared 18+ eligibility (no verification is claimed).
- Automatic demo-host approval for seeded demo plans when demo mode is explicitly enabled.
- Missing appeals, grievance officer, staffed moderation, legal review and retention automation.
- Absence of identity verification or background checks.
- Fixed-window abuse throttles are not a substitute for platform-level bot defence or independent abuse testing.

## Current controls

See [PRIVACY.md](./PRIVACY.md#5-security-controls-present) for the implemented controls and known gaps. Key points:

- Every public function authenticates the caller, checks account status and loads a completed profile.
- Moderation functions require the `moderator` or `admin` role. Roles are granted only by an internal owner procedure such as:
  `bunx convex run moderation:grantRole '{"email":"owner@example.com","role":"moderator"}'`.
  Public clients cannot call internal functions.
- Account disable and moderator recovery use the internal `moderation.setAccountStatus` and `moderation.grantRole` functions. Disabling revokes sessions immediately.
- Blocks, hidden accounts, check-in windows and reconnect consent are enforced server-side, not just in the UI.
- Deletion revokes auth sessions, refresh tokens, provider accounts and verification codes before scheduling resumable product-record cleanup.
- Public profile shapes are allow-listed.
- Demo seeding and demo consent are opt-in through `ALLOW_DEMO_SEED`; production defaults to off.
- Sensitive mutations have fixed-window rate limits. Convex Auth provides the sign-in/OTP attempt limit.
- No service-role or provider secret exists in client code.

## Automated security tests

`src/convex/hardening.test.ts` starts a real schema/function graph with `convex-test` and separate identities. It currently covers:

- No public moderator claim/provisioning mutation.
- Owner-only moderator grant and owner-only account disable with session revocation.
- Disabled accounts cannot perform product mutations.
- Hidden members and hidden hosts are absent from direct reads and discovery.
- Blocks are symmetric across profiles, plans, circles, posts and connections.
- Check-in rejects before/after the window and on cancelled plans.
- Reconnection requires two independent yes answers and rejects future/cancelled plans.
- Reports are reason-allow-listed and throttled.
- Demo seeding is off by default.
- Export includes only the member's own private answers.
- Deletion revokes auth records synchronously and removes product records through the resumable worker, while retaining the moderation report.

## Before a public pilot

1. Independent authorization review of every Convex function.
2. Abuse testing: enumeration, capacity races, duplicate requests, report spam, credential stuffing.
3. Dependency and secret scanning in CI.
4. Platform-level rate limiting, monitoring and alerting.
5. A documented incident-response owner, channel and timeline.
6. Legal review of privacy notices and intermediary obligations.
7. Real staffing and an appeal/grievance process.
