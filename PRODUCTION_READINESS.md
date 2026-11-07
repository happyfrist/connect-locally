# Production readiness — verified status

**Date:** 7 November 2026  
**Verdict:** **NOT PRODUCTION-READY. NO PUBLIC-LAUNCH GO.**  
**Review URL:** not supplied (`[INSERT THE LATEST DEPLOYED PREVIEW / REVIEW URL]` was left as a placeholder). No deployed browser review was performed.

This document records what was actually changed, tested and verified. It is deliberately narrower than the full master brief. Everything not evidenced here remains open, even if a document describes it. Phase 2 added in-app notifications, opt-in transactional email through the real gateway, request-integrity fixes and a GitHub Actions verification workflow; the legal, operational, browser-testing and security-review blockers are unchanged.

## 1. What was completed and verified

| Area | Change | Evidence | Remaining limitation |
|---|---|---|---|
| Moderator privilege escalation | Removed public `claimModerator`. Added internal `moderation.grantRole`, `moderation.listModerators`, `moderation.setAccountStatus`. Moderation accepts `moderator` or `admin`; no public client can grant a role. | Backend test: public API has no claim/grant/status functions; member queue access refused; owner grant works. | Owner procedure has no MFA, dual control or approval workflow. Existing `admin` rows created by the old claim flow must be audited before any production migration. |
| Account disable/recovery | Owner-only disable/re-enable; disabling revokes all auth sessions and is audited. | Backend test: session count becomes zero; account status `disabled`; product mutation refused. | No member-facing appeal, no second-reviewer requirement, no recovery code if the owner loses deployment access. |
| Account deletion | Deletion revokes sessions, refresh tokens, provider accounts and verification codes synchronously; product records removed by a bounded, indexed, resumable scheduled worker; auth-scoped lookup bug fixed. | Backend test with fake timers runs the full job: profile, hosted plan, hosted circle removed; report retained; tombstone has no email/role; re-onboarding refused. | Retention periods are not legally reviewed. Backups are not covered. Auth rate-limit rows may retain an email until provider cleanup. |
| Unreachable delete UI | The Safety page had state and imports for a confirmation dialog that was never rendered. Added a typed `DELETE` confirmation dialog wired to the real action. | Typecheck + lint; code inspection. | No browser interaction test. |
| Hidden accounts | One visibility policy now covers profiles, discovery, plans, participants, circles, posts and connections. Hidden hosts cannot expose plans by direct ID. | Backend tests: hidden profile and hidden host absent from suggestions/list/detail. | No visual browser pass. |
| Blocking | Block checks centralised; blocking ends an existing connection; pending reconnect answers deleted; direct-ID queries filtered. | Backend test covers profiles, plan visibility, circle members/posts, connection removal and decisions. | No test yet for every report/moderation interaction or simultaneous block requests. |
| Check-in integrity | Check-in is limited to 30 minutes before start through 24 hours after scheduled end. Cancelled plans reject attendance. Hosts now check in through the same window; hosting is not treated as proof of attendance. | Policy unit tests + backend tests for before, cancelled, late, valid and host-without-attendance paths. Host UI updated. | No automated browser test of host check-in UI. |
| Reconnection integrity | Opens only after the plan ends, closes after 14 days, rejects cancelled plans, requires attendance and mutual independent yes answers. | Policy unit tests + backend tests for future/cancelled plans and two-sided consent. | No browser test of the two-account journey. |
| Notifications | In-app feed for join requests, decisions, updates, cancellations, circle decisions, mutual connections and report outcomes. Transactional email is opt-in, queued in `emailOutbox`, re-checks consent/account status at delivery, and calls the real `/v1/email/send` gateway. Demo profiles, guests and deleted/disabled accounts are skipped. | Backend tests: in-app always on; email off until opt-in; delivery-time opt-out skips without calling the provider; dedupe; real gateway endpoint/header/recipient/payload with a mocked response; HTTP-200-with-failure recorded as failed; deletion removes feed and queued email. | No live provider delivery, bounce/complaint handling, automatic retry/backoff, reminder job or verified sending domain. Sent mail cannot be recalled. No browser test of the feed. |
| Request integrity | Host approval/decline now refuses requests after the plan starts. Cancelled plans reject host updates. Hosted cancelled plans are no longer shown as upcoming. | Backend test: a pending request cannot be approved after start; decision notification is written. | No concurrency stress test. |
| Abuse controls | Fixed-window rate limits for profile writes, plan creation, join requests, plan updates, check-ins, circle create/join/post/decision, reports, blocks, reconnection and moderation decisions. Report reasons allow-listed. | Backend test: 11th report in a day is throttled; invalid reason rejected. | Discovery queries cannot write rate-limit counters; no WAF/CAPTCHA/IP reputation; not load-tested. |
| Demo contamination | Demo seeding and demo reconnection consent require `ALLOW_DEMO_SEED=true`. Default is off. | Unit test + backend test: seed returns `enabled:false` and creates no users by default. Dev deployment explicitly sets the flag. | No hard separation between staging and production deployments; the flag must be absent in production. |
| Guest bypass | Anonymous guests are refused by all product functions unless `ALLOW_GUEST_DEMO=true`. Guest button hidden when disabled; false “add an email later” copy removed. | Unit test + backend test: guest suggestions call refused by default. | Existing anonymous accounts in a deployment would need cleanup/migration if the flag is turned off. |
| Moderator queue query bounds | Queue and audit reads are now indexed and bounded instead of collecting entire tables. | Typecheck; code inspection. | No pagination beyond the bounded first 100 reports / 30 audit rows. |
| Lint/type quality | All ESLint errors fixed, including pre-existing React purity/setState errors and `any` in the touched pages. Generated/shadcn warnings remain. | `bun run lint` exits 0 with 17 warnings. | Warnings in third-party UI files were not eliminated. |

## 2. Verification actually run

| Check | Command | Result |
|---|---|---|
| Convex schema/functions deploy | `bunx convex dev --once` | Pass, development deployment only |
| TypeScript | `bunx tsc -b --noEmit` | Pass |
| Lint | `bun run lint` | Pass, 0 errors, 17 warnings |
| Unit tests | `bun run test` | **14 passed** (matching + policy) |
| Backend integration | `bun run test:backend` | **20 passed** |
| Combined | `bun run test:all` | **34 passed, 0 failed** |
| Vite transform smoke | HTTP requests to `/`, `main`, `AppShell`, `Safety`, `Onboarding`, `notifications` and `notify` modules | All returned 200 after the final Phase 2 edits |

Detailed multi-account evidence: [MULTI_USER_TEST_REPORT.md](./MULTI_USER_TEST_REPORT.md).

Not run or not available:

- Production build (per environment guidance; no request to build a deployable artifact).
- Playwright/browser E2E, screenshots, mobile viewport, real Android device.
- axe-core/WCAG 2.2 AA audit, Lighthouse/performance audit.
- Load test, concurrent capacity test, duplicate-submit stress test.
- Independent penetration test, SAST/DAST, dependency audit, secret scan, git-history scan.
- Backup creation or restore drill.
- Staging or production deployment.
- Live email OTP or transactional-email delivery. The notification test mocks the gateway response; the credential is a Convex environment secret.
- Legal review or legal research package.
- Agent Skills installation/activation, design-system deliverable, licensed-asset register, or full feature audit.
- Cost model at 100 / 1,000 / 10,000 users.

## 3. Unresolved findings register

Severity: **Blocker** (must be closed before any public pilot), **High**, **Medium**, **Low**.

| Severity | Finding | Why it matters | Status |
|---|---|---|---|
| Blocker | No qualified Indian legal review; no published terms, privacy notice, grievance officer or monitored grievance channel. | DPDP/IT intermediary, consumer and contract obligations are unresolved. A generated document is not compliance. | Open |
| Blocker | No staffed moderation, on-call safety lead, SLA, escalation, appeals or incident response. | Reports currently queue for nobody in production. The app cannot promise review. | Open |
| Blocker | Age is self-declared; no age-assurance decision or provider review. | The product claims 18+ but cannot enforce it. | Open |
| Blocker | No independent security review or penetration test; no CI security scanning. | Authorization tests cover selected paths, not the whole attack surface. | Open |
| Blocker | No browser E2E, mobile-device or accessibility verification. | Visual layout, dialogs, keyboard/focus, overflow, screen readers and real Android behavior are unverified. | Open |
| Blocker | No staging/production separation or verified backup/restore. | A staging seed or failed migration could affect real data; recovery is untested. | Open |
| High | Owner role provisioning is a single-person CLI procedure with no MFA/dual control. | A compromised owner workstation can grant moderation or disable accounts. | Open |
| High | Existing `admin` roles may exist from the removed self-service claim flow. | Must be inventoried and re-provisioned deliberately before production. | Open |
| High | No platform-level abuse controls (WAF, IP reputation, bot detection); query discovery is unthrottled. | Application counters are bypassable at scale and cannot protect reads. | Open |
| High | No appeal or restoration workflow. Reporters now get an in-app outcome notification, but there is no acknowledgement SLA, email guarantee or route back for suspended members. | A queue is not a process; a member can be stuck with no human appeal path. | Open |
| High | No content moderation for free-text or future images. | Reports are reactive only; harmful content can remain visible until review. | Open |
| High | No email deliverability, bounce, complaint or provider-outage testing for OTP or notifications. | Sign-in or updates may fail silently during a provider incident. | Open |
| High | No automated retention enforcement or legally reviewed retention periods. | Reports/audit are retained indefinitely in this build. | Open |
| Medium | Discovery/people queries use bounded `.take(...)` but no cursor pagination. | Larger cities will silently truncate results. | Open |
| Medium | Capacity is enforced through Convex transaction retry, but no explicit concurrent-request test exists. | Capacity invariant is reasoned, not stress-verified. | Open |
| Medium | Report/moderation action coverage is incomplete (warning only records a note; outcome notification exists, but no detailed appeal or restoration). | The action model is narrower than the UI/policy language. | Open |
| Medium | Minimum-participant enforcement and recurrence are descriptive only. | Hosts may expect automatic cancellation/occurrences that do not exist. | Open |
| Medium | `ALLOW_DEMO_SEED` / `ALLOW_GUEST_DEMO` are environment flags, not a deployment-type guarantee. | Misconfiguration could enable demo/guest access in production. | Open |
| Medium | Auth rate-limit rows retain an email identifier until provider cleanup. | Data minimisation at deletion is incomplete. | Open |
| Low | Generated/shadcn ESLint Fast Refresh warnings remain. | No runtime impact found; affects developer experience. | Open |
| Low | Vite module-transform smoke is not a browser rendering test. | It catches import/transform failures only; runtime layout, hooks and network behavior remain unverified. | Open |

## 4. Release gates

| Gate | Status |
|---|---|
| Core backend journeys tested with multiple identities | **Partial — 20 backend tests pass; browser journeys absent** |
| Authentication/session security tested | **Partial — session revocation tested; OTP/provider untested** |
| Authorization reviewed and tested | **Partial — high-risk paths tested; full function-by-function review incomplete** |
| Account deletion + session revocation verified | **Pass in backend tests** |
| No public administrator escalation | **Pass — public claim removed and tested** |
| Hidden accounts enforced | **Pass in backend tests** |
| Blocking across surfaces | **Pass in backend tests** |
| Mutual reconnection consent | **Pass in backend tests** |
| Demo data isolated from production | **Default-off gate implemented; deployment separation not verified** |
| Abuse prevention deployed | **Partial — app counters only** |
| Notifications and opt-in email | **Pass in backend tests with a mocked gateway; live delivery untested** |
| GitHub Actions verification | **Workflow added to workspace; not executed on GitHub** |
| Privacy inventory/notices/workflows | **Draft only; no legal review** |
| Legal review | **Not started with counsel** |
| Grievance process | **Missing** |
| Staffed moderation | **Missing** |
| Backup restore tested | **Not done** |
| Independent security review | **Not done** |
| CI, backend and browser tests | **Backend/unit yes; CI workflow exists but is unverified; browser no** |
| Accessibility audit | **Not done** |
| Real-device mobile testing | **Not done** |
| Costs known and approved | **Not done** |
| Staging validated and rollback tested | **Not done** |

## 5. Owner inputs required

1. The real deployed review URL, or access to a staging deployment.
2. Confirmation of the official product name and licence decision.
3. A decision on age assurance, with a budget if a paid provider is required.
4. A named safety lead, moderation owner, grievance contact and response targets.
5. Indian counsel engaged on the actual architecture and data inventory.
6. A staging Convex deployment and separate production deployment, with backups.
7. Approval before any paid service, production migration or public launch.

## 6. Repository and environment constraints encountered

- Git/GitHub operations are blocked in this environment (`Vly manages version control`). The public repository `github.com/happyfrist/connect-locally` exists on `main` (4 commits at the time of inspection, latest `10a61c19`, 30 October 2026), but this workspace cannot create a branch, commit, push or inspect history. The Phase 2 changes are **not on GitHub** until the owner commits them from a permitted environment.
- The GitHub Actions workflow is unexecuted because no push/build was possible here. Local `.env*` files are git-ignored, but no existing-history secret scan was possible; verify the remote history before inviting contributors.
- The live review URL was not supplied, so no live browser inspection was possible.
- The workspace has one development Convex deployment; there is no staging or production database.
- Agent Skills could not be activated in this runtime. No skill was installed or claimed as used; this deliverable remains open.
- Legal research and the requested legal/policy package were not produced in this pass. Do not treat existing policy drafts as counsel-reviewed.
