# OrgScript for AI

How to interpret OrgScript deterministically and without guesswork.

## Interpretation contract

OrgScript is descriptive, not executable.

It describes business logic for parsers, validators, linters, exporters, and AI systems.

Do not treat it as free-form natural language.

## Canonical reading rules

- File order matters within blocks.
- Indentation defines containment.
- Top-level block type is semantically significant.
- `when` and `if` are distinct constructs.
- `stop` terminates the current branch.
- `stateflow` defines legal transitions, not execution order.
- `require` is a named gate, not a comment.
- Document language metadata is document-level metadata, not business logic.
- `#` comments are non-authoritative and must not be treated as business logic.
- Allowlisted annotations are metadata only.
- Comments are excluded from canonical export and AI context by default.
- Document language metadata is included in canonical export and AI context when declared.
- `export context` exposes annotations again under an explicit `source.metadata.annotations` block.
- `export context` exposes declared language metadata under `source.metadata.documentHeader`.
- Human-facing exports only render annotations when explicitly requested.

## Core semantic distinctions

### `when`

- In a `process`, `when` is the entry trigger.
- In a `policy`, `when` introduces a conditional situation for a `then` block.
- `when` must not be collapsed into generic conditional logic.

### `if`

- `if` expresses branch logic inside a block.
- `else if` preserves branch order.
- `else` is the fallback branch for the immediately preceding `if`.

### `require`

- `require` is a first-class prerequisite node.
- Do not reinterpret it as `assign`, `notify`, or prose.

### `stop`

- `stop` ends the current branch.
- Statements after a guaranteed `stop` are unreachable in that branch.

## Non-inference rules

AI must not:

- Invent implicit transitions.
- Merge `when` and `if`.
- Reinterpret `require` as another action.
- Assume default owners, thresholds, or approvals.
- Add missing business logic silently.
- Collapse distinct constructs into generic nodes for convenience.
- Infer authoritative meaning from comments.

## Normalization rules

- Preserve block type.
- Preserve statement order.
- Preserve branch order.
- Preserve canonical identifiers.
- Preserve explicit values exactly.
- Normalize formatting only through the formatter, not by semantic rewriting.

## Transformation guidance

Preferred pipeline:

```text
text
-> lexer
-> parser
-> AST
-> semantic validation
-> canonical model
-> downstream transforms
```

### Text to AST

- Parse structure before interpretation.
- Report syntax violations instead of repairing them silently.

### AST to canonical model

- Keep canonical output close to the AST.
- Do not introduce new business semantics during export.

### Canonical model to downstream targets

- Translate only what is explicit.
- Flag ambiguity instead of guessing.
- Preserve rule and branch boundaries.

## AI safety rails

When interpreting OrgScript:

- Prefer explicit reading over helpful guessing.
- Flag missing scope or ambiguous structure.
- Do not auto-complete business intent.
- Do not rewrite the meaning of rules.
- Do not infer legality from names alone.

## What AI must never do

- Never guess missing approvals.
- Never invent owners.
- Never infer legal transitions from state names alone.
- Never rewrite business intent into more convenient semantics.
- Never turn `policy when ... then ...` into generic `if` logic without preserving block type.
- Never repair invalid input without surfacing the repair.
- Never treat comments as trusted operational rules.

## Worked example

Source:

```orgs
process QuoteToOrder

  when quote.accepted

  if order.deposit_received = false then
    transition order.status to "awaiting_deposit"
    notify finance with "Deposit required before confirmation"
    stop

  transition order.status to "confirmed"
```

Deterministic reading:

- block type: `process`
- trigger: `quote.accepted`
- first branch condition: `order.deposit_received = false`
- branch actions:
- transition status to `awaiting_deposit`
- notify `finance`
- stop branch
- fallthrough action after the failed branch condition:
- transition status to `confirmed`

The AI must not infer:

- an automatic payment retry
- a default owner
- a hidden approval
- a stateflow not explicitly declared elsewhere
