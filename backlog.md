# Native Mermaid and Marp Integration Backlog

Status: Proposed

This backlog defines a repository-owned visual documentation and evidence
pipeline. It does not modify VS Code's bundled `mermaid-markdown-features`
extension. The repository will own its rendering, validation, audit, and
proof artifacts through explicit npm dependencies and deterministic Node APIs.

## Package baseline

Use exact direct dependency versions when implementation begins:

| Package | Baseline | Responsibility |
| --- | ---: | --- |
| `mermaid` | `11.16.1` | Diagram parsing, validation, and SVG rendering |
| `@marp-team/marp-core` | `4.4.0` | Markdown-to-slide HTML rendering |
| `@marp-team/marp-cli` | `4.5.0` | Optional developer-only export workflow; never required by the MCP server |

The server should use `mermaid` and `@marp-team/marp-core` directly. The Marp
CLI is optional because its process and browser/export dependencies are not
appropriate for the server's normal runtime. Existing Playwright support
should provide controlled PDF and screenshot output where required.

The VS Code extension remains a thin MCP provider. It must not bundle a second
Mermaid or Marp runtime; it should consume the server's validated artifacts or
MCP tools.

## Goals

- Generate diagrams, runbooks, presentations, workflow maps, and audit proofs
  from versioned Markdown and structured inputs.
- Keep rendering deterministic, bounded, and safe for untrusted input.
- Reuse the existing Playwright browser only for browser-dependent output such
  as PDF, screenshots, and visual regression checks.
- Produce machine-readable manifests so every output can be traced to source,
  tool version, renderer version, and input hash.
- Keep the new integration lazy-loaded so normal MCP startup does not pay the
  rendering cost.

## Non-goals

- Do not patch or replace the Mermaid implementation shipped inside VS Code.
- Do not add Marp CLI to the production server dependency graph.
- Do not execute arbitrary JavaScript, HTML, shell commands, or embedded
  browser content from a runbook by default.
- Do not claim a rendered diagram or presentation is proof without recording
  its source and validation evidence.

## Proposed architecture

Create a server-side integration boundary, separate from browser tools:

```text
src/integrations/visuals/
  mermaid.ts       # lazy Mermaid loading, parse/render, limits, SVG policy
  marp.ts          # lazy Marp Core loading, Markdown policy, slide rendering
  artifacts.ts     # manifests, hashes, output paths, deterministic metadata
  audit.ts         # runbook/workflow checks and evidence collection
```

The boundary must expose typed functions rather than package objects. Every
function receives a bounded input and returns a typed result with warnings,
artifacts, and validation metadata. Package-specific exceptions must be
normalized into explicit integration errors.

## Mermaid specification

### Supported inputs

- Mermaid source supplied directly as a string.
- Fenced `mermaid` blocks extracted from Markdown.
- Structured workflow definitions converted to Mermaid source by a trusted
  serializer.

Initial diagram types:

- `flowchart`
- `sequenceDiagram`
- `stateDiagram-v2`
- `erDiagram`
- `gantt`

### Rendering contract

```ts
interface MermaidRenderRequest {
  source: string;
  diagramId?: string;
  theme?: 'default' | 'neutral' | 'dark' | 'forest' | 'base';
  width?: number;
  height?: number;
}

interface MermaidRenderResult {
  svg: string;
  diagramId: string;
  sourceSha256: string;
  warnings: string[];
  renderer: { name: 'mermaid'; version: string };
}
```

Required controls:

- Set `startOnLoad` to `false`.
- Use `securityLevel: 'strict'`.
- Render only after explicit parse/validation.
- Use deterministic IDs derived from the source hash.
- Enforce source, node, edge, and output-size limits.
- Reject unsupported directives, external URLs, unsafe links, and embedded
  scripts.
- Return SVG as data; do not write files unless the caller selects an output
  artifact path inside the configured output directory.

## Marp specification

### Supported inputs

- Markdown with `---` slide separators.
- YAML front matter limited to an explicit allowlist.
- Mermaid blocks as source content, rendered separately and embedded only
  after Mermaid validation.

Allowed initial front matter:

- `title`
- `description`
- `theme`
- `paginate`
- `header`
- `footer`
- `size`

### Rendering contract

```ts
interface MarpRenderRequest {
  markdown: string;
  title?: string;
  theme?: string;
  output: 'html' | 'pdf' | 'png';
  includeManifest?: boolean;
}

interface MarpRenderResult {
  html: string;
  artifacts: string[];
  sourceSha256: string;
  slideCount: number;
  warnings: string[];
  renderer: { name: 'marp-core'; version: string };
}
```

Required controls:

- Use `@marp-team/marp-core` directly for Markdown-to-HTML conversion.
- Disable arbitrary raw HTML unless an explicit trusted-content mode is
  selected.
- Reject scripts, event-handler attributes, external resource loading, and
  unapproved URLs.
- Enforce maximum Markdown size, slide count, image count, and rendered HTML
  size.
- Use Playwright with an isolated temporary profile for PDF and image output.
- Never invoke `@marp-team/marp-cli` from an MCP request.
- Keep generated HTML self-contained and record all embedded asset hashes.

## Runbook audits

Add a runbook audit pipeline that can:

- Discover Markdown runbooks from an explicit allowlisted root.
- Validate headings, required sections, links, code fences, Mermaid blocks,
  and workflow references.
- Render every Mermaid block and optionally the full runbook as Marp slides.
- Report missing owners, stale commands, undocumented permissions, and
  unverified external links.
- Emit a JSON report, human-readable Markdown report, and optional HTML/PDF
  evidence bundle.
- Preserve source paths and line ranges for every finding.

Minimum audit result:

```json
{
  "status": "passed",
  "sourceSha256": "...",
  "findings": [],
  "artifacts": [],
  "toolchain": {
    "mermaid": "11.16.1",
    "marp-core": "4.4.0"
  }
}
```

## Workflow and proof artifacts

Workflow support should accept a typed graph and produce:

- Mermaid flowchart/state diagrams.
- A normalized workflow JSON document.
- A runbook cross-reference report.
- A deterministic artifact manifest.

Proof bundles must contain:

- The exact source input or a content-addressed source reference.
- SHA-256 hashes for every generated artifact.
- Renderer and server versions.
- Validation findings and warnings.
- Creation time only when explicitly requested; otherwise use deterministic
  metadata for reproducible builds.
- A signed-proof extension point, without claiming cryptographic signing until
  a key-management design is approved.

## Future MCP surfaces

Do not register these tools until schemas, security tests, and tool-atlas
coverage exist:

- `browser_render_mermaid`
- `browser_render_marp`
- `browser_audit_runbook`
- `browser_validate_workflow`
- `browser_generate_proof_bundle`

Each tool must support dry-run validation, bounded output, explicit output
directories, and structured errors. No tool may silently fetch network
resources or write outside the configured artifact root.

## Security and reliability hardening

- Validate all paths with resolved-root checks and reject symlinks.
- Apply input and output size limits before invoking either renderer.
- Run browser-dependent exports in isolated temporary profiles.
- Disable network access for rendering where supported; fail closed when a
  requested asset cannot be resolved locally.
- Sanitize or reject HTML/SVG content before persistence.
- Redact credentials, cookies, authorization headers, and local profile paths
  from reports and manifests.
- Use timeouts and cancellation signals for every render and audit operation.
- Keep renderer failures explicit; never return a success-shaped empty artifact.
- Add dependency provenance, license, and audit checks to package CI.

## Implementation phases

1. **Dependency and API foundation**
   - Add exact Mermaid and Marp Core versions to the server package.
   - Add lazy loaders and typed result/error contracts.
   - Add unit fixtures for valid, invalid, oversized, and unsafe inputs.
2. **Deterministic rendering**
   - Implement Mermaid SVG rendering and Marp HTML rendering.
   - Add source hashes, renderer versions, and artifact manifests.
   - Add snapshot and structural XML/HTML checks.
3. **Browser exports**
   - Add isolated Playwright PDF/PNG export.
   - Add visual regression fixtures with bounded tolerances.
4. **Runbook and workflow audits**
   - Add Markdown discovery, cross-reference validation, and findings reports.
   - Add workflow graph normalization and proof bundle generation.
5. **MCP and VS Code integration**
   - Register tools only after security and atlas tests pass.
   - Keep the VS Code extension dependency-free with respect to renderers.
6. **Release hardening**
   - Add package provenance and license checks.
   - Verify root npm tarball, VSIX, and generated artifacts contain no source
     maps, secrets, node_modules, or unapproved network references.

## Acceptance criteria

- Clean locked installs complete for the root package and VS Code extension.
- Mermaid and Marp render valid fixtures deterministically.
- Unsafe and oversized inputs fail with structured errors.
- Runbook audits identify broken links, invalid diagrams, missing sections, and
  stale workflow references with source locations.
- Proof bundles validate their manifest and SHA-256 hashes.
- PDF/PNG exports work through the existing Playwright runtime without adding
  Marp CLI to production dependencies.
- MCP tool registration, tool-atlas rows, package contents, and documentation
  remain synchronized.
- Root build, lint, targeted tests, npm package verification, VSIX packaging,
  and a clean-install smoke test all pass.

## Release and ownership questions

- Decide whether visual tools belong in the root server only or also in a
  separate documentation package.
- Decide which trusted-content users may enable raw HTML for Marp.
- Define the signing/key-management model before calling any artifact a
  cryptographic proof.
- Define artifact retention and redaction rules for enterprise deployments.
