# OrgScript

Describe how your business works in a way humans and machines both understand.

OrgScript is a human-readable, AI-friendly description language for business logic, operational processes, rules, roles, and state transitions.

It is not a programming language. It is a text-first layer between plain-language documentation and technical execution.

## Why OrgScript?

Organizations usually describe their logic in a mix of SOPs, tickets, spreadsheets, chat messages, CRM fields, and tribal knowledge. That makes processes hard to review, automate, validate, and improve.

OrgScript provides one shared, structured layer between plain-language documentation and technical execution:
- **Teams** get a shared source of truth they can read and review directly.
- **AI** can analyze process gaps without guessing from unstructured prose.
- **Automation** can be derived from predictable, typed text.
- **Developers** get Git diffs, pull request reviews, and CI-ready checks for business logic.

## Quickstart

Validate, format, and export business logic in under 60 seconds:

```text
# 1. Install CLI
npm install

# 2. Check a file (runs validate, lint, and format --check in one step)
node ./bin/orgscript.js check ./examples/craft-business-lead-to-order.orgs

# 3. Get machine-readable JSON diagnostics for editors and CI
node ./bin/orgscript.js check ./examples/craft-business-lead-to-order.orgs --json

# 4. Generate visual and documentation artifacts
node ./bin/orgscript.js export mermaid ./examples/craft-business-lead-to-order.orgs
node ./bin/orgscript.js export markdown ./examples/craft-business-lead-to-order.orgs
node ./bin/orgscript.js export html ./examples/craft-business-lead-to-order.orgs
```

## The Artifact Flow

Write simple text, get powerful artifacts. OrgScript transforms a single source of truth into multiple formats for different audiences.

### 1. Source (`.orgs`)

A descriptive, diff-friendly source of truth.

```orgs
process CraftBusinessLeadToOrder

  when lead.created

  if lead.source = "referral" then
    assign lead.priority = "high"
    notify sales with "Handle referral lead first"

  transition lead.status to "qualified"
```

### 2. Diagram (Mermaid)

Directly generate clear workflow diagrams.

```text
node ./bin/orgscript.js export mermaid ./examples/craft-business-lead-to-order.orgs
```
*See generated examples in [`docs/demos/mermaid/`](docs/demos/mermaid/README.md).*

### 3. Summary (Markdown)

Export readable documentation for stakeholders.
*See generated summaries in [`docs/demos/markdown/`](docs/demos/markdown/README.md).*

### 4. Documentation (HTML)

Generate a self-contained, shareable HTML documentation page with live diagrams.
*See generated pages in [`docs/demos/html/`](docs/demos/html/README.md).*

## Core building blocks in v0.1

- `process`
- `stateflow`
- `rule`
- `role`
- `policy`
- `metric`
- `event`
- `when`
- `if`, `else`, `then`
- `assign`
- `transition`
- `notify`
- `create`
- `update`
- `require`
- `stop`

## Repo layout

- [`docs/manifesto.md`](docs/manifesto.md)
- [`docs/ast-v0.2.md`](docs/ast-v0.2.md)
- [`docs/cli-v0.1-plan.md`](docs/cli-v0.1-plan.md)
- [`docs/language-principles.md`](docs/language-principles.md)
- [`docs/github-labels.md`](docs/github-labels.md)
- [`docs/github-project-setup.md`](docs/github-project-setup.md)
- [`docs/governance.md`](docs/governance.md)
- [`docs/orgscript-for-humans.md`](docs/orgscript-for-humans.md)
- [`docs/orgscript-for-ai.md`](docs/orgscript-for-ai.md)
- [`docs/roadmaps/v0.4.0.md`](docs/roadmaps/v0.4.0.md)
- [`docs/roadmaps/v0.5.0.md`](docs/roadmaps/v0.5.0.md)
- [`docs/repository-structure.md`](docs/repository-structure.md)
- [`docs/syntax.md`](docs/syntax.md)
- [`docs/semantics.md`](docs/semantics.md)
- [`docs/demos/markdown/README.md`](docs/demos/markdown/README.md)
- [`docs/demos/mermaid/README.md`](docs/demos/mermaid/README.md)
- [`examples/README.md`](examples/README.md)
- [`spec/grammar.ebnf`](spec/grammar.ebnf)
- [`spec/language-spec.md`](spec/language-spec.md)
- [`spec/canonical-model.md`](spec/canonical-model.md)
- [`spec/diagnostics.md`](spec/diagnostics.md)
- [`examples/craft-business-lead-to-order.orgs`](examples/craft-business-lead-to-order.orgs)
- [`examples/lead-qualification.orgs`](examples/lead-qualification.orgs)
- [`examples/order-approval.orgs`](examples/order-approval.orgs)
- [`examples/service-escalation.orgs`](examples/service-escalation.orgs)
- [`editors/vscode/README.md`](editors/vscode/README.md)
- [`packages/parser/README.md`](packages/parser/README.md)
- [`packages/cli/README.md`](packages/cli/README.md)
- [`packages/formatter/README.md`](packages/formatter/README.md)
- [`packages/linter/README.md`](packages/linter/README.md)

## Available now

- Draft language specification
- Examples from realistic business scenarios
- Separate guides for human authors and AI/tooling
- AST-backed validation: `orgscript validate <file>`
- AST-backed formatting: `orgscript format <file>`
- Canonical format checks: `orgscript format <file> --check`
- AST-backed linting: `orgscript lint <file>`
- Combined quality checks: `orgscript check <file>`
- Machine-readable combined checks: `orgscript check <file> --json`
- Machine-readable format checks: `orgscript format <file> --check --json`
- Canonical JSON export: `orgscript export json <file>`
- Markdown summary export: `orgscript export markdown <file>`
- Mermaid diagram export: `orgscript export mermaid <file>`
- HTML documentation export: `orgscript export html <file>`
- Machine-readable diagnostics: `orgscript validate <file> --json`, `orgscript lint <file> --json`, `orgscript check <file> --json`
- Stable diagnostic codes across syntax, semantic validation, lint, format, and CLI usage errors
- Golden snapshot tests for AST, canonical model, and formatter output
- Stable lint severities: `error`, `warning`, `info`
- Canonical master spec: [`spec/language-spec.md`](spec/language-spec.md)
- Initial VS Code syntax-highlighting extension: [`editors/vscode`](editors/vscode)
- Generated demo artifacts for Mermaid and Markdown summaries under [`docs/demos`](docs/demos)

## Quick start

```text
npm install
node ./bin/orgscript.js validate ./examples/craft-business-lead-to-order.orgs
node ./bin/orgscript.js validate ./examples/craft-business-lead-to-order.orgs --json
node ./bin/orgscript.js check ./examples/craft-business-lead-to-order.orgs
node ./bin/orgscript.js check ./examples/craft-business-lead-to-order.orgs --json
node ./bin/orgscript.js format ./examples/craft-business-lead-to-order.orgs
node ./bin/orgscript.js format ./examples/craft-business-lead-to-order.orgs --check
node ./bin/orgscript.js format ./examples/craft-business-lead-to-order.orgs --check --json
node ./bin/orgscript.js lint ./tests/lint/process-missing-trigger.orgs
node ./bin/orgscript.js lint ./tests/lint/process-missing-trigger.orgs --json
node ./bin/orgscript.js export json ./examples/craft-business-lead-to-order.orgs
node ./bin/orgscript.js export markdown ./examples/craft-business-lead-to-order.orgs
node ./bin/orgscript.js export mermaid ./examples/craft-business-lead-to-order.orgs
```

Exit codes are CI-friendly:

- `validate` returns `0` for valid files and `1` for invalid files.
- `lint` returns `0` when findings contain only `warning` and `info`, and `1` when findings contain at least one `error`.
- `check` returns `0` only when validation passes, lint has no `error`, and formatting is canonical. Warnings and info findings alone do not fail `check`.

## JSON diagnostics

OrgScript exposes stable JSON diagnostics for CI, editors, AI systems, and downstream tooling.

`validate --json` on a canonical example:

```json
{
  "command": "validate",
  "file": "examples/craft-business-lead-to-order.orgs",
  "ok": true,
  "valid": true,
  "summary": {
    "topLevelBlocks": 4,
    "statements": 47,
    "diagnostics": 0,
    "error": 0,
    "warning": 0,
    "info": 0
  },
  "diagnostics": []
}
```

`lint --json` on an error-producing fixture:

```json
{
  "command": "lint",
  "file": "tests/lint/process-multiple-triggers.orgs",
  "ok": false,
  "clean": false,
  "summary": {
    "diagnostics": 2,
    "error": 1,
    "warning": 0,
    "info": 1
  },
  "diagnostics": [
    {
      "source": "lint",
      "severity": "error",
      "code": "lint.process-multiple-triggers",
      "file": "tests/lint/process-multiple-triggers.orgs",
      "line": 5,
      "message": "Process `MultipleTriggers` declares multiple `when` triggers."
    },
    {
      "source": "lint",
      "severity": "info",
      "code": "lint.process-trigger-order",
      "file": "tests/lint/process-multiple-triggers.orgs",
      "line": 5,
      "message": "Process `MultipleTriggers` declares a `when` trigger after operational statements."
    }
  ]
}
```

`check --json` on a clean file:

```json
{
  "command": "check",
  "file": "examples/craft-business-lead-to-order.orgs",
  "ok": true,
  "summary": {
    "diagnostics": 0,
    "error": 0,
    "warning": 0,
    "info": 0
  },
  "validate": {
    "ok": true,
    "valid": true,
    "skipped": false,
    "summary": {
      "topLevelBlocks": 4,
      "statements": 47,
      "diagnostics": 0,
      "error": 0,
      "warning": 0,
      "info": 0
    },
    "diagnostics": []
  },
  "lint": {
    "ok": true,
    "clean": true,
    "skipped": false,
    "summary": {
      "diagnostics": 0,
      "error": 0,
      "warning": 0,
      "info": 0
    },
    "diagnostics": []
  },
  "format": {
    "ok": true,
    "canonical": true,
    "skipped": false,
    "summary": {
      "diagnostics": 0,
      "error": 0,
      "warning": 0,
      "info": 0
    },
    "diagnostics": []
  }
}
```

`format --check --json` on a canonical file:

```json
{
  "command": "format",
  "file": "examples/order-approval.orgs",
  "ok": true,
  "canonical": true,
  "check": true,
  "mode": "check",
  "summary": {
    "diagnostics": 0,
    "error": 0,
    "warning": 0,
    "info": 0
  },
  "diagnostics": []
}
```

## Guides

- Human authoring guide: [`docs/orgscript-for-humans.md`](docs/orgscript-for-humans.md)
- AI interpretation guide: [`docs/orgscript-for-ai.md`](docs/orgscript-for-ai.md)
- Diagnostics contract: [`spec/diagnostics.md`](spec/diagnostics.md)
- Canonical language spec: [`spec/language-spec.md`](spec/language-spec.md)
- Language governance: [`docs/governance.md`](docs/governance.md)
- Example catalog: [`examples/README.md`](examples/README.md)
- VS Code editor scaffold: [`editors/vscode/README.md`](editors/vscode/README.md)

## Visible outputs

OrgScript currently produces two human-facing output types from the same source file:

- Mermaid diagrams via `orgscript export mermaid <file>`
- Markdown summaries via `orgscript export markdown <file>`
- HTML documentation pages via `orgscript export html <file>`

## Editor support

OrgScript now ships with a first usable VS Code syntax-highlighting extension under [`editors/vscode`](editors/vscode).

It currently covers:

- `.orgs` file association
- top-level blocks and block names
- core statements and section keywords
- strings, booleans, numbers, and operators
- dotted references such as `lead.status` and `lead.created`

See [`editors/vscode/README.md`](editors/vscode/README.md) for local installation and usage notes.

## Near-term plan

1. Expand diagnostics examples and integration guidance around CI and editors.
2. Improve diagnostics consistency further across human-readable CLI output.
3. Grow the example catalog across `simple`, `realistic`, and `advanced` scenarios.
4. Extend editor support beyond the initial VS Code syntax-highlighting scaffold.
5. Add additional downstream exporters and documentation views.

See [`docs/roadmaps/v0.5.0.md`](docs/roadmaps/v0.5.0.md) for the current milestone plan.

## CLI

Available now:

```text
orgscript validate file.orgs
orgscript validate file.orgs --json
orgscript format file.orgs
orgscript format file.orgs --check
orgscript format file.orgs --check --json
orgscript lint file.orgs
orgscript lint file.orgs --json
orgscript export json file.orgs
orgscript export markdown file.orgs
orgscript export mermaid file.orgs
orgscript export html file.orgs
orgscript check file.orgs
orgscript check file.orgs --json
```

`orgscript check` runs `validate`, `lint`, and `format --check` in that order and fails on validation errors, lint errors, or formatting drift. Warnings and info findings alone do not fail the command.

`orgscript export mermaid` currently supports `process` and `stateflow` blocks and emits a Markdown document with Mermaid code blocks for direct use in GitHub or docs.

See [`docs/cli-v0.1-plan.md`](docs/cli-v0.1-plan.md) for the implementation plan.

## Testing

```text
npm test
npm run export:markdown
npm run export:mermaid
npm run demo:generate
npm run check
npm run check:all
npm run format:check:all
npm run validate:all
npm run lint:all
npm run golden:generate
```

## License

Apache-2.0

See [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE).
