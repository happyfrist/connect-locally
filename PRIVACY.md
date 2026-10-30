# Privacy

This document describes what the prototype stores, who can see it, and what still needs legal review. It is **not** a privacy policy and does not claim compliance with any law.

## 1. What is collected

| Data | Why | Who can see it | Notes |
| --- | --- | --- | --- |
| Email address | Sign-in via one-time code | The member only (auth layer) | Never returned in a public profile; guest accounts have none |
| Display name, city, neighbourhood, optional bio, languages | Introduce the member to other members | Signed-in members in the same city; plan/circle co-participants | Area is approximate, not an address |
| Interests, preferred activities, availability, group-size, budget, comfort | Discovery and explainable matching | Signed-in members in the same city | Declared preferences only |
| Plans, requests, approvals, attendance | Run the real-world flow | Hosts/participants as needed; attendance only on the plan | Attendance is not a trust score |
| Private reconnect answers | Mutual-consent workflow | The member who gave the answer; moderators only if a report requires it | One side's answer is never returned to the other before mutual yes |
| Connections | Show mutual results | The two connected members | Created only after two yes answers |
| Journal entries and reflections | Personal memory | The member only | Private by default; no sharing flag |
| Blocks | Protect members | The blocker | Enforced both ways server-side |
| Reports | Safety review | Reporter (status only), moderators (details) | Never shown to the reported member |
| Moderator audit log | Accountability | Moderators | Actor, action, target, note |
| Demo seed markers | Idempotent sample data | No one | Contains city and member ids |

### Not collected

- Exact home coordinates, GPS in the background or location history.
- Phone numbers, contacts or address book uploads.
- Aadhaar numbers, government ids, identity documents or selfies.
- Payment card details (no payments exist).
- Advertising identifiers or third-party analytics identifiers.
- Direct messages (no messaging feature yet).
- Photos (no upload feature yet).

## 2. User controls

- **Export:** Safety centre → *Export my data* downloads a JSON file containing the profile, requests, attendance, reconnect answers, connections, journal, circle memberships and reports made by the member.
- **Delete:** Safety centre → *Delete my data* immediately revokes every Convex Auth session and provider identity, then removes the profile, hosted plans/circles and their participant rows, requests, attendance, private answers, connections, blocks, memberships and journal entries in bounded resumable batches. The member row becomes a tombstone with no email, image or role.
- **Block/unblock:** from a plan or the safety centre. Blocking also ends an existing connection.
- **Journal:** edit or delete any entry.
- **Profile:** edit all profile fields from the shell.

### Deletion behavior and retention exceptions

- Sign-in sessions, refresh tokens, provider accounts and pending verification codes are deleted synchronously when deletion starts. An already-issued access token cannot use product functions because every function checks `accountStatus` and refuses `deleting`/`deleted` accounts.
- Product records are removed by a scheduled, indexed, resumable job in small batches, so a large history does not need to fit in one database transaction. The job is idempotent and revokes auth again on each run.
- **Retained:** moderation reports and the moderator audit log. These are kept as an unidentified safety record with the tombstone user id, not an email. Deleting them would destroy evidence needed for safety, legal or appeal processes. The retention period is **not yet legally reviewed or enforced**.
- **Not deleted:** Convex Auth's internal rate-limit rows may retain an email identifier until the provider's own cleanup. Backups and infrastructure-level copies are outside the app's control and have no documented retention yet.
- There is no automatic expiry deletion for inactive accounts; only member-initiated deletion exists.

## 3. Vendors and data flow

| Processor | Role | Data |
| --- | --- | --- |
| Convex | Database, functions, auth session storage | All application data above |
| Freebuff integrations gateway | Sends the email OTP | Email address and six-digit code |
| `@zumer/snapdom` | Generates the memory card **in the browser** | No network transfer; image is downloaded locally |

No analytics, advertising, CRM, AI provider or payment processor is connected. There are no cookies for tracking; Convex Auth uses its own session mechanism.

Vendor DPAs, hosting regions and subprocessors have **not** been reviewed. This must happen before any public pilot.

## 4. Legal research status

The brief requires research into Indian law. This prototype has not been legally reviewed and should not be described as compliant. Counsel should assess at minimum:

- **Digital Personal Data Protection Act, 2023** and the **Digital Personal Data Protection Rules, 2025**, including commencement/phase-in, notice and consent requirements, data-principal rights, children's provisions, breach notification, consent managers where applicable, and cross-border processing.
- **Information Technology Act, 2000** and the **IT Intermediary Guidelines and Digital Media Ethics Code Rules, 2021**, including grievance officer, monthly compliance reporting, takedown timelines, and the current 2025–2026 amendments and official guidance.
- **Consumer protection** and event-related responsibilities: who is responsible when a paid venue or activity is cancelled, and how costs are described.
- **Group eligibility**: whether women-only or other affinity circles are lawful and how to moderate them without discrimination.
- **Emergency and safeguarding**: what the product must not promise, and what escalation obligations arise from a safety report.
- **Children's data**: the product is 18+ only and self-declared; a real age-assurance approach would change the analysis.

Primary sources to check: MeitY, the Gazette of India, PIB, and India Code. Do not treat draft amendments as enacted law.

## 5. Security controls present

- Every product read/write requires an active account and a completed profile. Disabled, deleting and deleted accounts are refused server-side.
- Moderation requires the `moderator` or `admin` role. There is **no public moderator claim mutation**; roles are granted only through an internal owner/deployment procedure.
- Authorization is enforced in Convex functions, not only in the UI.
- One shared visibility policy hides blocked, hidden, disabled, deleting and deleted members across profiles, discovery, plans, circles and connections.
- Public profile shapes are explicit allow-lists; email and moderation fields are never returned to other members.
- Blocked pairs are rejected in every relevant function, including direct ID calls. Blocking ends a connection and deletes pending reconnect answers.
- Check-in is limited to approved participants/hosts and a narrow window (30 minutes before start to 24 hours after the scheduled end). Reconnection is available only after a plan ends, for 14 days, and never for a cancelled plan.
- Reports cannot be read by the reported member. Reasons are allow-listed, duplicates collapsed, and submissions throttled.
- Mutations for profile writes, plans, joins, circles, reports, reconnection, check-in and moderator decisions have fixed-window rate limits.
- Convex Auth applies its own sign-in rate limit (10 failed attempts/hour per identifier by default) and OTP expiry.
- Demo seeding and demo reconnection consent are disabled unless `ALLOW_DEMO_SEED=true` is explicitly set on the deployment.
- Anonymous guest accounts are refused by every product function unless `ALLOW_GUEST_DEMO=true`. They are not treated as verified members; production requires email OTP.
- No service-role key, database password or provider secret exists in client code.
- Convex environment variables (email gateway key) are read server-side only.
- Input lengths, enum values, future dates, capacity and status transitions are validated server-side.

### Known security gaps

- Query-level discovery throttling is not implemented; Convex queries cannot write rate-limit counters. Platform-level abuse controls and monitoring are still required.
- The app-level throttles are fixed-window counters, not a distributed WAF or bot-detection system. There is no CAPTCHA, device attestation or IP reputation.
- No CSRF-specific analysis (Convex RPC uses authenticated websockets; still needs review).
- No independent penetration test, dependency audit, secret scanning or CI pipeline yet. `convex-test` authorization tests exist, but they are not a penetration test.
- No automated content moderation for free-text fields beyond length limits and report review.
- No age or identity verification. Email OTP proves control of an inbox, not a person or age.
- No staffed moderation team, appeal process, grievance officer or emergency response.
- No email verification requirement beyond the OTP itself.

## 6. Breach response (draft, not operational)

1. Contain: revoke affected credentials, disable the affected function if necessary.
2. Assess: affected members, data categories, likely harm.
3. Notify: legal counsel, then the Data Protection Board and affected members as required by applicable law and timelines.
4. Record: timeline, root cause, remediation, audit entries.
5. Review: update this document and the threat model.

No on-call contact, legal contact or notification template exists yet.

## 7. Grievance and contact

The app has a moderation queue but **no published grievance officer, contact address, response SLA or appeal process**. These are launch blockers for India. Do not claim a grievance mechanism exists until a named person, monitored channel and timeline are in place.
