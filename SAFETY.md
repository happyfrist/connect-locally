# Safety

Saanjh coordinates strangers meeting in physical locations. That is the highest-risk thing the product does, so this document separates **what is implemented** from **what is still missing**.

> This is a prototype. It is not safe to use with strangers yet. It has no identity verification, no emergency response, no staffed moderation team and no real-world pilot.

## 1. Implemented safeguards

### Before a plan

- Every plan requires a **public venue**, an area, a start time and a duration. There is no field for a home address or exact coordinates.
- Discovery shows the venue, host, cost, group size, house rules, accessibility notes and cancellation policy **before** joining.
- Joining is a **request**, not an instant RSVP, except for explicitly labelled demo hosts.
- Hosts approve or decline each person; capacity is enforced transactionally.
- A member can withdraw without giving a reason.
- Beginner-friendly and small-group filters make lower-pressure plans easy to find.
- Blocks are enforced server-side in discovery, person suggestions, plan detail, join requests and circles.

### During and after a plan

- Self check-in opens only after the start time and only for approved participants (or the host).
- Hosts can post updates, cancel with a reason, and see who is coming.
- After checking in, each attendee can privately answer *yes / maybe / no* about seeing each other person again.
- A **connection requires two independent yes answers**. A one-sided answer is never returned to the other person; a "maybe" is never surfaced.
- Blocking deletes pending private answers between both people.
- Journal entries are private. Participation numbers are never shown as a trust score.

### Reporting and moderation

- Plans, circles and members can be reported from their own pages with a reason and a free-text description.
- Reports are visible only to the reporter (status) and to a role-restricted moderator queue (details).
- Duplicate open reports on the same target by the same reporter are collapsed.
- Moderators can mark a report reviewing/resolved/dismissed, warn, cancel a plan, restrict a circle to request-only, or hide a member profile. Every decision is written to `auditLog` with the moderator's user id.
- A report's internal note is never shown to the reporter or the reported member.

### First-timer support

- Public-venue-first language throughout the flow.
- Copyable safety plan and a WhatsApp share action in the Safety centre (user-initiated; no trusted contact stored).
- First-timer checklist and explicit statement that leaving early is allowed.
- 18+ self-declaration, stated as self-declaration.

## 2. What is not implemented

| Gap | Consequence |
| --- | --- |
| Age or identity verification | Anyone can self-declare 18+. A proper provider and legal review are required. |
| Host background checks | Hosts are unverified members, exactly as labelled. |
| Emergency response | Saanjh cannot send help and does not contact anyone on your behalf. |
| Live location / check-in monitoring | No one is watching whether you arrive or leave. |
| 24/7 moderation staffing | The queue exists; staffed coverage, SLAs and escalation do not. |
| Automated retention/deletion | Data remains until a member deletes it; no scheduled purge exists. |
| Appeals workflow | Moderator decisions can be amended, but there is no member-facing appeal process. |
| Affinity-group policy | The data model could support women-only or other groups, but eligibility rules, moderation and legal review are not built. |
| Recurring occurrence generation | `recurrence` is descriptive. The app does not automatically create future occurrences. |

## 3. Emergency guidance

In India: **112** for police, fire or ambulance; **100** police; **181** women's helpline; **1930** cyber-fraud reporting. Verify current numbers locally before publishing. These are public services, not Saanjh features. The app shows a warning not to rely on it for emergency help.

## 4. Host accountability (current)

- Host identity in the UI is the member's display name and profile; there is no verification badge.
- Hosts cannot approve themselves into their own plan's participant list, but they are treated as present for reconnection.
- Cancellations are visible on the plan and decline pending requests.
- Hosts can be reported and blocked like anyone else.
- There is **no** host rating, reliability score or public review system. That was deliberate: popularity ratings create the incentives the product is trying to avoid. A reliability model would need careful design and anti-abuse review.

## 5. Conversation circles

Peer conversation, not therapy:

- Facilitators are members, not counsellors, and are not trained or vetted in this prototype.
- Prompts are invitations; passing is always allowed.
- Sessions should happen in public venues with a clear end time.
- Participants are told that confidentiality has limits: safety concerns and reports may be shared with moderators.
- No participant is required to disclose personal, medical or emotional information.
- The UI does not present peer discussion as treatment and does not diagnose anything.

Before real sessions: written facilitator guidance, a safeguarding escalation path, a local mental-health resource list, and legal review of the wording.

## 6. Pilot prerequisites (not done)

1. Choose one city with founder input and local research.
2. Recruit and interview 15–20 members from one segment; publish findings without inventing evidence.
3. Run 3–5 staffed, small, public plans with a named safety lead present.
4. Establish an incident log, on-call rota, and a same-day response commitment.
5. Legal review of DPDP notices, intermediary obligations, grievance officer, group eligibility and event responsibility.
6. Independent security review of authorization and abuse paths.
7. Decide whether verification is proportionate and which provider to use.
8. Define pilot exit criteria, including a safety-report rate that pauses the pilot.

## 7. Incident handling (proposed, not operational)

1. A report creates an `open` row in the moderator queue.
2. A moderator acknowledges (`reviewing`) within the published SLA.
3. Immediate risk: advise the reporter to contact emergency services; preserve the report; restrict the reported member's profile or cancel the plan.
4. Record the action and rationale in `auditLog` and the report's internal note.
5. Notify the reporter of the status change only.
6. Review whether the plan, circle or member needs permanent removal.
7. Retain the report for the period set in the retention policy once legal review is complete.

No SLA is currently promised or enforced by the software.
