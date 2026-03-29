# OrgScript

**Describe how your business works in a way humans and machines both understand.**

OrgScript is a human-readable, AI-friendly description language for business logic, operational processes, rules, roles, and state transitions. It provides a shared, structured layer between plain-language documentation and technical execution.

---

## Why OrgScript?

- **Shared Truth**: Teams get logic they can read and review directly in Git.
- **AI-Ready**: Reliable context for LLMs and agents without guessing from unstructured prose.
- **Artifact-First**: Generate diagrams, summaries, and HTML docs from a single source.
- **CI/CD Ready**: Validate, lint, and check logic integrity in your pipeline.

## Quick Start

### Installation

```bash
# Global installation
npm install -g .

# Or run via npx
npx orgscript --help
```

### Usage

```bash
# 1. Comprehensive health check (validate + lint + format-check)
orgscript check ./examples/hiring-process.orgs

# 2. Structural Metrics & Analysis (WP1)
orgscript analyze ./examples/hiring-process.orgs

# 3. Export AI Context (WP2)
orgscript export context ./examples/hiring-process.orgs > logic-context.json

# 4. Generate Visual Support
orgscript export mermaid ./examples/craft-business-lead-to-order.orgs
orgscript export html ./examples/order-approval.orgs
```

## The Artifact Flow

OrgScript transforms simple text into powerful operational assets:

1.  **Source (`.orgs`)**: A diff-friendly, indentation-based logic source.
2.  **Analysis**: Numerical metrics and complexity hints for your processes.
3.  **Diagram (Mermaid)**: Automatic workflow and state-diagram generation.
4.  **Summary (Markdown)**: Concise, stakeholder-ready documentation.
5.  **Docs (HTML)**: Professional-grade static documentation site.
6.  **AI Context**: Bundled logic package optimized for agent ingest.

## Core Blocks

- `process`: Step-by-step operational workflows.
- `stateflow`: State transitions and lifecycle management.
- `rule`: Cross-cutting guardrails and validation.
- `role`: Permission boundaries (`can`, `cannot`).
- `policy`: Governance and SLA requirements.
- `metric`: Performance and data tracking definitions.

## Integration & Ecosystem

- **VS Code Extension**: Official highlighting and language support under `editors/vscode`.
- **Quality Automation**: CI checks for tests and example validation live in `.github/workflows`.
- **Showcase**: Generated demo artifacts live in `docs/demos` and can be rebuilt locally with `npm run demo:generate`.

## Testing

```bash
npm test                # Run core logic tests
npm run check:all        # Verify all examples
npm run demo:generate    # Regenerate all showcase artifacts
```

## License

Apache-2.0
