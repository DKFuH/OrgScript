# OrgScript Manual (English)

OrgScript is a human-readable, AI-friendly description language for business logic, workflows, roles, rules, and state transitions.

This manual is the short practical entry point. The canonical language contract lives in `spec/language-spec.md`.

## What OrgScript is for

Use OrgScript when you want one text-first source of truth for:

- operational processes
- approval logic
- permission boundaries
- state transitions
- escalation policies
- business metrics
- AI/tooling context generation

OrgScript sits between narrative documentation and implementation code. It is descriptive, not executable.

## Core building blocks

### `process`

Use `process` for step-by-step operational flows.

Typical examples:

- lead qualification
- quote to order
- onboarding
- refund handling

### `stateflow`

Use `stateflow` for legal states and allowed transitions.

Typical examples:

- order lifecycle
- ticket lifecycle
- lead lifecycle

### `rule`

Use `rule` for constraints that must hold whenever a condition matches.

### `role`

Use `role` for permissions and boundaries through `can` and `cannot`.

### `policy`

Use `policy` for context-based or time-based organizational behavior.

### `event`

Use `event` for named triggers with standard reactions.

### `metric`

Use `metric` for tracked business measures with formula, owner, and target.

## First useful commands

```bash
orgscript check ./examples/craft-business-lead-to-order.orgs
orgscript export mermaid ./examples/craft-business-lead-to-order.orgs
orgscript export markdown ./examples/lead-qualification.orgs --with-annotations
orgscript export context ./examples/lead-qualification.orgs
```

What they do:

- `check` validates syntax, lint rules, and canonical formatting
- `export mermaid` creates a diagram-friendly artifact
- `export markdown` creates a short human-readable summary
- `export context` creates a structured AI/tooling context bundle

## Comments and annotations

OrgScript supports two documentation layers:

- `# comment`
- `@key "value"`

Comments:

- are human-only notes
- must use whole-line `# ...` form in v1
- are non-authoritative
- are excluded from canonical export, AI context, and analysis

Annotations:

- are parseable metadata
- attach to the following supported block or statement
- are included in the AST and canonical model
- do not change semantics

Allowed annotation keys in v1:

- `@note`
- `@owner`
- `@todo`
- `@source`
- `@status`
- `@review`

Example:

```orgs
# Shared lead qualification path for inbound leads.
@owner "sales_ops"
@status "active"
process LeadQualification

  when lead.created

  @note "Track referral lead handling separately."
  if lead.source = "referral" then
    assign lead.priority = "high"
    notify sales with "New referral lead"
```

Important rule:

If business logic matters, write it as OrgScript logic, not as a comment.

Bad:

```orgs
# Always require deposit before confirmation.
```

Good:

```orgs
if order.deposit_received = false then
  require finance_clearance
  stop
```

## Export behavior

Default exporter policy:

- comments stay out of all machine-facing exports
- comments stay out of Markdown, Mermaid, and HTML by default
- annotations are included in canonical JSON
- annotations are included in `export context`
- annotations appear in Markdown and HTML only when you pass `--with-annotations`

This keeps business meaning explicit and prevents comments from becoming a hidden second language.

## Writing guidelines

- keep one statement per line
- prefer explicit logic over implied logic
- use stable names
- keep blocks small
- do not hide approvals, thresholds, or permissions in prose
- use comments sparingly for orientation
- use annotations for structured metadata, not semantics

## Recommended reading path

If you want the full project context:

1. `docs/manifesto.md`
2. `docs/language-principles.md`
3. `spec/language-spec.md`
4. `docs/orgscript-for-humans.md`
5. `docs/orgscript-for-ai.md`

## Practical workflow

For most teams, the safe loop is:

1. model the logic in `.orgs`
2. run `orgscript check`
3. export Markdown or Mermaid for review
4. export context for AI/tooling consumers
5. keep the `.orgs` file as the maintained source of truth
