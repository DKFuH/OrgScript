# OrgScript

**Describe how your business works in a way that humans and machines can both interpret reliably.**

OrgScript is a human-readable, AI-friendly description language for business logic, operational processes, rules, roles, and state transitions. It sits between plain-language documentation and technical execution as a shared, text-first source of truth.

OrgScript is designed for operators, team leads, analysts, and engineers who need a shared, text-first source of truth for business logic.

## What It Is

- A shared text layer for business logic
- Readable by people
- Parseable by software
- Stable in Git and code review
- Structured for AI analysis, validation, and export

## What It Is Not

- Not a general-purpose programming language
- Not a workflow engine
- Not free-form prose or narrative documentation
- Not a replacement for implementation code

## Quickstart in 60 Seconds

Assuming you have the OrgScript CLI installed:

```bash
# 1. Check a complete example end to end
orgscript check ./examples/craft-business-lead-to-order.orgs

# 2. Generate a diagram
orgscript export mermaid ./examples/craft-business-lead-to-order.orgs

# 3. Generate a stakeholder-friendly summary
orgscript export markdown ./examples/craft-business-lead-to-order.orgs
```

If you want the fastest first read, start with:

- [craft-business-lead-to-order.orgs](./examples/craft-business-lead-to-order.orgs)
- [examples/README.md](./examples/README.md)

## Read This in Order

If you are new to OrgScript, this is the intended reading path:

1. [docs/manifesto.md](./docs/manifesto.md) - Why OrgScript exists.
2. [docs/language-principles.md](./docs/language-principles.md) - The design constraints and non-negotiable rules.
3. [spec/language-spec.md](./spec/language-spec.md) - The canonical language definition.
4. [docs/orgscript-for-humans.md](./docs/orgscript-for-humans.md) - How to write maintainable OrgScript files.
5. [docs/orgscript-for-ai.md](./docs/orgscript-for-ai.md) - How tools and AI must interpret OrgScript without guessing.

## Canonical Source of Truth

The normative language reference is:

- [spec/language-spec.md](./spec/language-spec.md)

Supporting docs exist to help people adopt, use, and govern the language. If implementation and docs ever disagree, the canonical spec wins.

## From Source to Artifact

OrgScript is intentionally artifact-first. A single `.orgs` file can produce multiple useful outputs:

1. Source logic in plain text
2. Validation and linting diagnostics
3. Mermaid diagrams
4. Markdown summaries
5. HTML documentation
6. AI-ready structured JSON exports

Generated examples live under:

- [docs/demos](./docs/demos)

## Hero Demo: Craft Business Lead to Order

The main showcase flow is:

- Source: [craft-business-lead-to-order.orgs](./examples/craft-business-lead-to-order.orgs)
- Mermaid demo: [docs/demos/mermaid/craft-business-lead-to-order.mermaid.md](./docs/demos/mermaid/craft-business-lead-to-order.mermaid.md)
- Markdown demo: [docs/demos/markdown/craft-business-lead-to-order.summary.md](./docs/demos/markdown/craft-business-lead-to-order.summary.md)

## Core Blocks

- `process`: step-by-step operational workflows
- `stateflow`: legal states and transitions
- `rule`: cross-cutting constraints and requirements
- `role`: permission boundaries
- `policy`: context-driven or time-driven behavior
- `event`: named triggers with reactions
- `metric`: tracked business measures

## CLI Quick Reference

```bash
orgscript validate <file> [--json]
orgscript lint <file> [--json]
orgscript check <file> [--json]
orgscript format <file> [--check]
orgscript export json <file>
orgscript export markdown <file>
orgscript export mermaid <file>
orgscript export html <file>
orgscript export context <file>
orgscript analyze <file> [--json]
```

## Developer Path

If you want to contribute to the tooling or language, this is a practical sequence:

1. Read [examples/README.md](./examples/README.md)
2. Run `orgscript check` on a real example
3. Inspect generated Mermaid or Markdown output
4. Read the canonical spec
5. Use [docs/governance.md](./docs/governance.md) before proposing core language changes

## Testing

```bash
npm test
npm run check:all
npm run demo:generate
```

## Ecosystem

- VS Code extension: [editors/vscode](./editors/vscode)
- Governance: [docs/governance.md](./docs/governance.md)
- Language evolution: [docs/language-evolution.md](./docs/language-evolution.md)
- Changelog: [CHANGELOG.md](./CHANGELOG.md)

## License

Apache-2.0
