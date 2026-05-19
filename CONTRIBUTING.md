# Contributing

This guide defines how changes reach the canonical Darbot Browser MCP repository.

You'll learn:

- Which branches and remotes are authoritative.
- How to set up, build, test, and lint locally.
- How releases are prepared and published.

## Branching model

- `main` is the canonical public branch.
- `v*.x` branches are active release lines.
- Feature and fix work must land through GitHub pull requests.
- Azure DevOps is a read-only mirror for publishing and tracking; do not make source changes there.

## Commit style

Use Conventional Commits:

```text
feat: add browser bridge readiness check
fix(auth): require server base url for oauth metadata
docs: restructure v2 documentation
```

## Local development

```bash
npm install
npm run build
npm test
npm run lint
```

Use targeted tests while developing, then run the full suite before opening a pull request.

## Test fixtures

Follow the conventions in `tests/README.md` for browser fixtures, snapshots, mocked network state, and generated artifacts. Keep fixtures deterministic and avoid committing screenshots, traces, or browser profile data unless a test explicitly requires them.

## Pull requests

Every PR should include:

- A clear problem statement and solution summary.
- Linked issue or release item when available.
- Tests or a documented reason tests are not applicable.
- Documentation updates for user-facing behavior.
- No generated build artifacts, packaged extensions, `.nupkg` files, traces, or local browser state.

## Release process

1. Update versions on the active release branch.
2. Open a GitHub PR with changelog and docs updates.
3. Merge after CI and review.
4. Tag the release.
5. Let release workflows publish npm, VS Code, NuGet, hosted artifacts, and the ADO mirror.
6. Validate package availability and update `RELEASE_TRACKER.md`.

## Sign-off

If a repository-level DCO or CLA check is enabled, follow the bot instructions on the pull request. Otherwise, ensure every contribution is made under the project license and that you have rights to submit it.

---

_Last updated: 2026-05-18 (v2.0.0)_
