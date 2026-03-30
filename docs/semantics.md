# Semantics Draft v0.1

## Conceptual model

OrgScript describes business logic as structured declarations that can be transformed into a canonical model.

The canonical model is the source for:

- validation
- formatting
- documentation
- export
- AI analysis

## Meaning of top-level blocks

- `process`: a directed operational flow with explicit actions and decisions
- `stateflow`: a definition of allowed states and transitions
- `rule`: a constraint or mandatory business rule
- `role`: a permission boundary
- `policy`: time-based or context-based organizational behavior
- `metric`: a tracked success measure
- `event`: a named trigger with associated reactions

## Meaning of core statements

- `when`: declares the trigger or context in which logic applies
- `if`: declares a conditional branch
- `else if`: declares an additional conditional branch
- `else`: declares the fallback branch
- `assign`: sets a modeled value
- `transition`: changes a modeled state
- `notify`: emits a message or alert to a target actor or system
- `create`: declares creation of a modeled entity
- `update`: declares mutation of a modeled field
- `require`: declares a prerequisite or approval requirement
- `stop`: ends the current process branch

## Comments and annotations

- `#` comments are non-authoritative human notes.
- Comments do not affect parsing semantics, semantic validation, analysis, canonical export, or transition legality.
- `@key "value"` annotations are parseable metadata.
- Annotations are included in the AST and canonical model.
- Annotations are explicitly non-semantic in v1.

If business logic matters, it must be modeled in OrgScript constructs instead of comments.

## `when`, `if`, and `then`

- In a `process`, `when` names the entry trigger for the process.
- In a `policy`, `when` introduces a conditional situation that is followed by a block-level `then`.
- In `if ... then`, `then` is part of the conditional statement itself.
- These forms are intentionally distinct and should remain distinct in the parser and formatter.

## `require`

`require` expresses a named gate that must be satisfied before the surrounding logic may proceed.

In v0.1 it should be interpreted as a symbolic requirement reference rather than a free-form sentence. Downstream tools may later map it to approvals, checklists, status gates, or blocking conditions.

## Interpretation rules

1. Statements are evaluated in file order within a block.
2. Indentation defines containment.
3. `if` branches only affect statements within their indented block.
4. `stop` ends the current process branch and prevents later sibling statements from applying to that branch.
5. `stateflow` transitions define legal movement, not execution order.
6. `rule` blocks define constraints that should remain true whenever their conditions match.
7. `policy` blocks may contain multiple trigger-response sections.

## Execution boundary

OrgScript does not execute itself.

It describes intent in a structured way so other systems can:

- validate it
- simulate it
- transform it
- render it
- map it into executable platforms

## Ambiguity policy

If a statement could mean more than one thing, the language should prefer a more explicit form instead of inference or shorthand.
