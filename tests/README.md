# Test suite

This suite uses Playwright Test (`npm test` runs `npx playwright test`).

## Running subsets

- All tests: `npm test`
- One file: `npx playwright test tests/evaluate.spec.ts`
- By title: `npx playwright test -g "browser_evaluate"`
- Edge project: `npm run test:msedge`

## Environment variables

- `PWMCP_DEBUG=1` mirrors MCP server stderr during fixture startup.
- OAuth tests set and restore `SERVER_BASE_URL`, `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, and `AZURE_CLIENT_SECRET` internally.
- Cloud validation scripts use `CLOUD_SERVER_URL` when testing a deployed instance.

## Fixture patterns

- Import `{ test, expect }` from `./fixtures.js`.
- Use `client` for a default MCP session; `visionClient` is a second default client used to verify the native screen-tool surface.
- Use `startClient({ args, config })` for custom CLI flags or generated config files.
- Use `server`/`httpsServer` for offline deterministic web content.
- Browser-dependent tests should stay headless-compatible and skip known unsupported browser/channel combinations.

## Determinism

Tests should avoid real network services. Bridge and OAuth coverage use local mocks and process-local environment changes. Tests that need fixed well-known ports must run serially and skip with a clear reason if those ports are already in use.
