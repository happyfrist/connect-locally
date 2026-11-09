# Multi-user test report

**Date:** 7 November 2026  
**Environment:** local Freebuff workspace, development Convex deployment (`pastel-husky-806`)  
**Test harness:** `convex-test` 0.0.66 + Vitest 5.0.5, edge-runtime environment  
**Schema:** real `src/convex/schema.ts`, real public/internal functions  
**Command:** `bun run test:backend`  
**Result:** **31 passed, 0 failed** (functional-audit defects and one test setup were found and corrected)

This is backend integration testing, not browser E2E. It proves that separate authenticated identities acting through the real Convex functions see the correct state and are refused where they should be. It does not prove visual layout, browser session persistence or real-world operations.

## Identities used

Each test creates its own fresh database and accounts through `t.run` + `t.withIdentity({ subject: userId })`:

- Member A / Member B / Member C
- Host and attendee
- Circle host and member
- Moderator (granted by an internal owner procedure)
- Disabled account
- Deleted account (tombstone)
- No public `claimModerator`/`grantRole` API

## Scenarios and evidence

| # | Scenario | What was asserted | Result |
|---|---|---|---|
| 1 | Public privilege escalation | `api.moderation.claimModerator`, `grantRole` and `setAccountStatus` are absent from the public API; a member gets `isModerator: false`; queue access is refused | Pass |
| 2 | Owner provisioning | Internal `moderation.grantRole` makes the owner a moderator; another member still cannot read the queue | Pass |
| 3 | Disabled account | Owner-only status change removes auth sessions; `me` reports `disabled`; profile mutation is refused | Pass |
| 4 | Hidden member | Hidden profile is absent from suggestions and direct profile reads; viewer can still read their own profile | Pass |
| 5 | Hidden host | A plan hosted by a hidden member is absent from discovery and direct plan reads | Pass |
| 6 | Blocking symmetry | A↔B profile reads are null; B's plan is invisible to A; circle members, posts and connection disappear; B's own view remains intact | Pass |
| 7 | Check-in integrity | Before-window, cancelled and >24h-after-end check-ins are refused; an in-window check-in succeeds | Pass |
| 8 | Mutual reconnection | A's yes alone creates nothing and reveals no decision; B's yes creates exactly one connection visible to both | Pass |
| 9 | Reconnect state | Future and cancelled plans are refused | Pass |
| 10 | Report abuse controls | Invalid reason is rejected; 11th report in the same day is throttled | Pass |
| 11 | Demo isolation | Seeding returns `enabled: false` by default and creates no demo users | Pass |
| 12 | Export privacy | Export contains the member's own yes but not the other member's `maybe` decision | Pass |
| 13 | Deletion | Sessions, refresh tokens, provider account and verification codes are gone immediately; product records and profile are removed by the resumable worker; report is retained; tombstone has no email/role; re-onboarding is refused | Pass after fix |
| 14 | Host attendance | Hosting is not treated as proof of attendance; a non-checked-in host cannot be a reconnect target and cannot submit a reconnect answer | Pass |
| 15 | In-app notifications + opt-in | A join request always creates a host notification; email stays absent until the host explicitly enables it; a later event queues exactly one email | Pass |
| 16 | Real email endpoint | The queued action posts to `https://integrations.vly.ai/v1/email/send` with the bearer key, host recipient, subject and plan content; the outbox moves to `sent` | Pass with mocked provider response |
| 17 | Decision integrity | Approval writes a requester notification and queued email; approval after the plan starts is refused | Pass |
| 18 | Notification deletion | Repeated events dedupe to one feed row and one email job; the resumable deletion worker removes both | Pass |
| 19 | Gateway rejection | An HTTP 200 response with `success:false` / `status:"failed"` is recorded as `failed` with a bounded error, not `sent` | Pass |
| 20 | Delivery-time opt-out | A queued email is skipped and `fetch` is not called when the member turns email off before delivery | Pass |
| 21 | Pre-onboarding status | A signed-in account without a profile can query moderator status without an error; the queue is still refused | Pass |
| 22 | Host-inclusive capacity | With `maxParticipants: 2`, host plus one approved guest fills the plan; a second request is refused and detail shows `spotsLeft: 0` | Pass |
| 23 | Late cancellation | A host cannot cancel after the plan has started | Pass |
| 24 | City scope | A plan request and a circle join from another city are refused | Pass |
| 25 | Disabled applicant | A request from an account disabled after applying cannot be approved | Pass |
| 26 | Circle request/discussion | Request-only join stays pending; host approval unlocks posting; non-member posting is refused; leaving removes access and posts | Pass |
| 27 | Journal | Check-in creates one private entry; reflection edits persist; deleting the entry leaves attendance/history intact | Pass |
| 28 | Notification reads | One update can be marked read; `markAllRead` clears the remaining unread count | Pass |
| 29 | Moderation outcomes | Warning reaches the host; content removal declines the pending request and notifies host and applicant | Pass |
| 30 | Moderator/admin guard | A moderator cannot disable an admin account through a report decision | Pass |
| 31 | Export completeness | Export includes authored updates, circle posts, notifications, queued email and outgoing blocks | Pass |

## Defects found by these tests

1. **Deletion worker used an auth-scoped profile lookup.** Scheduled internal functions have no signed-in identity, so the profile survived deletion. Replaced with a direct indexed lookup.
2. **Deletion UI was unreachable.** The Safety page held state for a confirmation dialog that was not rendered. Added the typed-confirmation dialog and wired the existing action.
3. **`me` briefly exposed a scrubbed profile during deletion.** It now returns `profile: null` and `onboardingComplete: false` for non-active accounts.
4. **Hosts had no check-in affordance.** The host branch showed only cancellation; hosts could not establish their own attendance for reconnection. Added host check-in with the same server window.
5. **Hidden hosts' plans remained readable by direct ID.** Central visibility now hides the plan for non-owners.
6. **Hosting implicitly counted as attendance.** The reconnection path allowed a host to skip check-in. Hosts now use the same window; the UI and backend both require a real attendance record.
7. **Scheduled functions and generated types required a Convex upgrade.** Upgraded `convex` 1.42.1 → 1.48.0; deploy and typecheck pass.
8. **Hosts could approve or decline after the plan had started.** Added a server-side start guard and a regression test.
9. **The onboarding review screen promised demo content even when the deployment flag was off.** The promise is now conditional on `appConfig.demoSeedEnabled`; the seed call goes directly to the server gate so it is not skipped by a config-loading race.
10. **A test used `toMatchObject` for an absent optional field.** Convex omits absent fields; the assertion now checks the value directly. This was a test bug, not a product regression.
11. **New accounts could hit a moderator-query error before onboarding.** `moderation.status` called `requireProfile`; the shell now gets a safe `isModerator: false` result instead.
12. **The host was outside plan capacity in the backend but inside the UI.** `maxParticipants` is now the whole group, including the host, across list/detail/join/approve/update.
13. **A request could be approved after the applicant was disabled.** Approval now requires a visible, active profile.
14. **Blocking left hidden plan requests and circle memberships consuming capacity.** Blocking now withdraws pair requests and removes memberships in each other's circles.
15. **Pending circle members had no withdraw action.** Added the missing UI action.
16. **Moderator “warn” only wrote a note and content removal did not tell attendees.** Warnings now notify the subject; removed plans decline pending requests and notify affected members.
17. **Export omitted several personal records.** Added authored updates/posts, notifications, queued email and outgoing blocks.
18. **A repeated deletion request did not resume a stalled job.** It now schedules the idempotent worker again.
19. **City scope and post-start cancellation were UI-only assumptions.** Both are now enforced server-side.
20. **A moderator could restrict an admin account.** Only an admin can restrict another moderator/admin.

## Explicit limitations

- No second real browser, Android device or live deployment was tested.
- The test identities are simulated at the Convex auth boundary; they do not exercise the OTP delivery provider.
- Capacity is enforced transactionally and has a functional test, but no concurrent-request stress test.
- No moderation queue UI interaction test, report-to-appeal journey test or deletion-under-load test.
- No screenshots, axe-core, Lighthouse or Playwright evidence exists.
- The demo-mode integration test intentionally runs with the flag absent; the development deployment has it enabled for the walkthrough.
- Transactional email uses a mocked `fetch` response. No live provider delivery, bounce handling or inbox rendering was tested.
- The GitHub Actions workflow has not run because this host cannot push or trigger workflows.
