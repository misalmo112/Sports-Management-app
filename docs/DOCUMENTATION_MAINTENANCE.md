# Documentation Maintenance

## Purpose

Use this checklist when feature work changes the system surface. The goal is to keep current-state docs aligned with the repo and to keep proposal docs clearly separated from implemented behavior.

## Current-State Docs

These should describe live repo behavior only:

- `docs/ARCHITECTURE.md`
- `docs/PROJECT_DOCUMENTATION.md`
- `docs/MODELS.md`
- `docs/API_CONVENTIONS.md`
- `docs/PERMISSIONS.md`
- `docs/ROLE_ROUTE_MAP.md`
- `docs/NAVIGATION_MAP.md`
- `docs/NAVIGATION_COVERAGE.md`
- `README.md`

## Proposal / Planning Docs

These may describe future behavior, but must say so near the top:

- migration plans
- rollout plans
- design proposals
- future integration plans

## Update Checklist

When a feature changes the system surface, verify the following:

- Architecture doc updated if subsystem ownership or data flow changed.
- Project overview updated if top-level capabilities changed.
- Models doc updated if platform models, fields, or service-level finance ownership changed.
- API conventions updated if route families, auth paths, headers, or error conventions changed.
- Permissions doc updated if roles, academy-context behavior, or permission classes changed.
- Route map updated if user-facing pages or backend endpoints changed.
- Navigation map and coverage updated if sidebar items or route coverage changed.
- README updated only when the top-level product summary or project structure changed.

## Source-of-Truth Rule

- If the behavior is implemented now, document it in the current-state docs.
- If the behavior is planned but not implemented, document it in a proposal doc and label it clearly.
- Do not leave speculative examples in current-state reference docs.
