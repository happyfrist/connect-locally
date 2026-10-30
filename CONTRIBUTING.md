# Contributing

This is a prototype of an 18+ platonic friendship product. Contributions are welcome once the repository has a chosen licence and an owner. Until then, treat it as source-available rather than open source.

## What is useful right now

- Authorization tests for Convex functions (blocked pairs, non-host approvals, reconnect privacy, moderator boundaries).
- Integration tests for the seven journeys listed in the product brief.
- Accessibility work: keyboard navigation, focus order, contrast, reduced motion, screen-reader labels.
- Small-screen layout fixes, especially on budget Android devices.
- Copy improvements that keep claims honest (no invented verification, no fake members).
- Localisation of the interface, starting with Hindi and Kannada.
- Documentation fixes where the code and docs disagree.

## What needs discussion first

- Direct messaging, photos, maps, payments, AI features or identity verification.
- Anything that introduces a score, streak, leaderboard or paid visibility.
- Schema changes that affect deletion, privacy or moderation retention.
- New third-party services. Document purpose, licence, free-tier limits, data sent, privacy impact and a replacement strategy before adding one.

## Development workflow

```bash
bun install
bunx convex dev --once    # push schema/functions, regenerate types
bunx tsc -b --noEmit      # required
bun test                  # matching unit tests
```

Do not run a production build against real infrastructure as part of a pull request. Never commit secrets, `.env` values, service keys or personal data.

## Conventions

- Keep UI in `src/pages` and `src/components`; domain logic belongs in `src/convex`.
- Every public Convex function starts with `requireProfile` or `requireAdmin`, and re-checks any permission the client claims.
- New database indexes go in `src/convex/schema.ts` with a matching access pattern.
- Comments explain *why*, especially around privacy, blocking and demo data.
- Do not add a dependency for something a few typed functions can do.
- Do not add demo content without an `isDemo` flag and a visible label.

## Pull requests

- One logical change per pull request.
- Describe the user-facing behaviour, the authorization impact and how it was verified.
- Include screenshots only for visual changes; they are not a substitute for tests.
- If a check fails and is unrelated, say so rather than disabling it.
- Never weaken an assertion, skip a security check or silence a type error to get green CI.

## Code of conduct

Be direct about the work, generous with people.

- No harassment, discriminatory language or personal attacks.
- Do not disclose private information shared in the product or in reports.
- Respect the product's boundaries: no dating mechanics, no engagement manipulation, no paying people to attend.
- Report conduct concerns privately to the maintainer once one is designated.
