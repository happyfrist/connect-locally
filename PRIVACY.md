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
- **Delete:** Safety centre → *Delete my data* removes the profile, requests, attendance, private answers, connections, blocks, memberships, journal entries, reports they made, hosted plans, hosted circles and related participant rows, and scrubs the sign-in identity's name/email/image.
- **Block/unblock:** from a plan or the safety centre.
- **Journal:** edit or delete any entry.
- **Profile:** edit all profile fields from the shell.

### Deletion limitations

- The Convex Auth identity row is **scrubbed, not deleted**, so an existing session cannot keep writing product data. The row may still exist with internal identifiers. Fully revoking auth sessions needs a server-side auth-admin operation and is not implemented.
- Reports made **about** a member by other people are retained for safety review. They are not deleted by the member's own deletion, because they belong to another reporter and to the moderation record.
- Backups and infrastructure-level copies are outside the app's control and have no documented retention yet.
- No automated deletion scheduler exists. Deletion happens only when the member triggers it.

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

- All product reads/writes require a signed-in member with a completed profile; admin operations require the `admin` role.
- Authorization is enforced in Convex functions, not only in the UI.
- Public profile shapes are explicit allow-lists; email and moderation fields are never returned to other members.
- Blocked pairs are rejected in every relevant function, including direct ID calls.
- Reports cannot be read by the reported member.
- No service-role key, database password or provider secret exists in client code.
- Convex environment variables (email gateway key) are read server-side only.
- Input lengths, enum values, future dates, capacity and status transitions are validated server-side.

### Known security gaps

- No rate limiting on reports, join requests or sign-in attempts beyond Convex Auth's built-in behaviour.
- No CSRF-specific analysis (Convex RPC uses authenticated websockets; still needs review).
- No independent penetration test, dependency audit or secret scanning in CI.
- No content moderation for free-text fields beyond length limits.
- Moderator bootstrap via self-service is prototype-only.
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
