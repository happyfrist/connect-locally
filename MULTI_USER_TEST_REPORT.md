# Multi-user test report

**Date:** 30 October 2026  
**Environment:** local Freebuff workspace, development Convex deployment (`pastel-husky-806`)  
**Test harness:** `convex-test` 0.0.66 + Vitest 5.0.5, edge-runtime environment  
**Schema:** real `src/convex/schema.ts`, real public/internal functions  
**Command:** `bun run test:backend`  
**Result:** **14 passed, 0 failed** (one earlier deletion failure was found and fixed)

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

## Defects found by these tests

1. **Deletion worker used an auth-scoped profile lookup.** Scheduled internal functions have no signed-in identity, so the profile survived deletion. Replaced with a direct indexed lookup.
2. **Deletion UI was unreachable.** The Safety page held state for a confirmation dialog that was not rendered. Added the typed-confirmation dialog and wired the existing action.
3. **`me` briefly exposed a scrubbed profile during deletion.** It now returns `profile: null` and `onboardingComplete: false` for non-active accounts.
4. **Hosts had no check-in affordance.** The host branch showed only cancellation; hosts could not establish their own attendance for reconnection. Added host check-in with the same server window.
5. **Hidden hosts' plans remained readable by direct ID.** Central visibility now hides the plan for non-owners.
6. **Hosting implicitly counted as attendance.** The reconnection path allowed a host to skip check-in. Hosts now use the same window; the UI and backend both require a real attendance record.
7. **Scheduled functions and generated types required a Convex upgrade.** Upgraded `convex` 1.42.1 → 1.48.0; deploy and typecheck pass.

## Explicit limitations

- No second real browser, Android device or live deployment was tested.
- The test identities are simulated at the Convex auth boundary; they do not exercise the OTP delivery provider.
- Capacity-race, simultaneous-tab, slow-network and duplicate-submit behavior were not stress-tested.
- No moderation queue UI interaction test, report-to-appeal journey test or deletion-under-load test.
- No screenshots, axe-core, Lighthouse or Playwright evidence exists.
- The demo-mode integration test intentionally runs with the flag absent; the development deployment has it enabled for the walkthrough.
