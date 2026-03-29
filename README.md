# OrgScript

Describe how your business works in a way humans and machines both understand.

OrgScript is a human-readable, AI-friendly description language for business logic, operational processes, rules, roles, and state transitions.

It is not a programming language. It is a text-first layer between plain-language documentation and technical execution.

## Why OrgScript exists

Organizations usually describe their logic in a mix of SOPs, tickets, spreadsheets, chat messages, CRM fields, and tribal knowledge. That makes processes hard to review, automate, validate, and improve.

OrgScript aims to provide one shared layer between plain-language documentation and technical execution.

```text
OrgScript text
-> parser
-> AST
-> canonical model
-> exports, validation, documentation, automation, AI analysis
```

## Design goals

- Human-readable and easy to author
- Strict enough for parsers and algorithms
- AI-friendly by default
- Text-first and diff-friendly
- Focused on business logic, not software implementation
- English-first, with localization as a later extension

## Non-goals

- General-purpose programming
- Turing-complete logic
- Workflow execution in the core language
- Replacing BPMN, CRMs, or task tools directly
- Free-form natural language without structure

## Example

Hero example: a craft business flow from lead intake to production approval.

```orgs
process CraftBusinessLeadToOrder

  when lead.created

  if lead.source = "referral" then
    assign lead.priority = "high"
    assign lead.sales_path = "premium"
    notify sales with "Handle referral lead first"

  else if lead.source = "aroundhome" then
    assign lead.priority = "low"
    assign lead.sales_path = "standard"

  if lead.project_type != "kitchen" and lead.project_type != "interior" then
    transition lead.status to "disqualified"
    notify sales with "Outside target project type"
    stop

  if lead.estimated_value < 10000 then
    transition lead.status to "disqualified"
    notify sales with "Below minimum project value"
    stop

  transition lead.status to "qualified"
  assign lead.owner = "sales"
```

See the full example in [`examples/craft-business-lead-to-order.orgs`](examples/craft-business-lead-to-order.orgs).

## Why this matters

- Teams get a shared source of truth for operational logic.
- AI can analyze process gaps without guessing from prose.
- Automation can be derived from structured text instead of tribal knowledge.
- Git diffs and code review become possible for business logic.

## What OrgScript is

- A description language for processes, rules, roles, policies, events, and stateflows
- Human-readable enough for operators and managers
- Structured enough for parsers, validators, and AI systems
- English-first in its canonical syntax

## What OrgScript is not

- A general-purpose programming language
- A workflow engine
- A replacement for BPMN, CRMs, or ERP systems
- Free-form natural language

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
- [`docs/repository-structure.md`](docs/repository-structure.md)
- [`docs/syntax.md`](docs/syntax.md)
- [`docs/semantics.md`](docs/semantics.md)
- [`spec/grammar.ebnf`](spec/grammar.ebnf)
- [`spec/canonical-model.md`](spec/canonical-model.md)
- [`examples/craft-business-lead-to-order.orgs`](examples/craft-business-lead-to-order.orgs)
- [`examples/lead-qualification.orgs`](examples/lead-qualification.orgs)
- [`examples/order-approval.orgs`](examples/order-approval.orgs)
- [`examples/service-escalation.orgs`](examples/service-escalation.orgs)
- [`packages/parser/README.md`](packages/parser/README.md)
- [`packages/cli/README.md`](packages/cli/README.md)
- [`packages/formatter/README.md`](packages/formatter/README.md)
- [`packages/linter/README.md`](packages/linter/README.md)

## Available now

- Draft language specification
- Examples from realistic business scenarios
- AST-backed validation: `orgscript validate <file>`
- AST-backed formatting: `orgscript format <file>`
- Canonical JSON export: `orgscript export json <file>`
- Golden snapshot tests for AST and canonical model

## Quick start

```text
npm install
node ./bin/orgscript.js validate ./examples/craft-business-lead-to-order.orgs
node ./bin/orgscript.js format ./examples/craft-business-lead-to-order.orgs
node ./bin/orgscript.js export json ./examples/craft-business-lead-to-order.orgs
```

## Near-term plan

1. Build a parser that validates `.orgs` files.
2. Emit a canonical AST for downstream tooling.
3. Add a formatter for deterministic file layout.
4. Add a linter for operational modeling mistakes.
5. Expand the examples with real-world business cases.

## CLI

Available now:

```text
orgscript validate file.orgs
orgscript format file.orgs
orgscript export json file.orgs
```

Planned next:

```text
orgscript lint file.orgs
```

See [`docs/cli-v0.1-plan.md`](docs/cli-v0.1-plan.md) for the implementation plan.

## Testing

```text
npm test
npm run golden:generate
```

## License

Apache-2.0

See [`LICENSE`](LICENSE) and [`NOTICE`](NOTICE).
