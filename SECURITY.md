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
- Automatic demo-host approval for seeded demo plans.
- One-time moderator bootstrap while no moderator exists (prototype limitation).
- Missing rate limiting, retention automation, appeals, grievance officer or staffed moderation.
- Absence of identity verification or background checks.

## Current controls

See [PRIVACY.md](./PRIVACY.md#5-security-controls-present) for the implemented controls and known gaps. Key points:

- Every public function authenticates the caller and loads a completed profile.
- Admin functions require the `admin` role.
- Blocks and reconnect privacy are enforced server-side, not just in the UI.
- Public profile shapes are allow-listed.
- No service-role or provider secret exists in client code.

## Before a public pilot

1. Independent authorization review of every Convex function.
2. Abuse testing: enumeration, capacity races, duplicate requests, report spam.
3. Dependency and secret scanning in CI.
4. Rate limiting at the function and platform level.
5. A documented incident-response owner, channel and timeline.
6. Legal review of privacy notices and intermediary obligations.
