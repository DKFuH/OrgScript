# OrgScript Manifesto

OrgScript exists to describe how organizations work in plain text with enough precision for machines and AI to understand.

## The problem

Operational logic is usually scattered across documents, chat messages, onboarding notes, spreadsheets, CRM fields, automation tools, and people's heads.

That creates ambiguity, hidden dependencies, and inconsistent execution.

## The belief

Business logic should be describable in a shared language that is:

- readable by people
- reviewable in version control
- parseable by software
- analyzable by AI
- stable enough to generate downstream artifacts

## The position

OrgScript is not a programming language.

OrgScript is a description language for:

- processes
- state transitions
- rules
- roles and permissions
- events
- policies
- metrics

## The principle

Describe work, do not implement software.

OrgScript should sit between natural-language documents and executable systems.

## The promise

If organizations can describe their logic clearly:

- teams can align faster
- automation becomes safer
- onboarding becomes easier
- hidden rules become visible
- AI can support analysis and transformation without guessing

## First 10 minutes with OrgScript

Start with one real example and one real command path:

1. Open `examples/craft-business-lead-to-order.orgs`
2. Run `orgscript check ./examples/craft-business-lead-to-order.orgs`
3. Run `orgscript export mermaid ./examples/craft-business-lead-to-order.orgs`
4. Run `orgscript export markdown ./examples/craft-business-lead-to-order.orgs`

That gives you the shortest path from idea to validation to visible output.

Then continue with:

- `examples/README.md` for the example catalog
- `spec/language-spec.md` for the canonical definition
- `docs/orgscript-for-humans.md` for authoring guidance
