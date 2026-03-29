# Contributing

Thanks for helping shape OrgScript.

## What to optimize for

- Clarity over cleverness
- Explicit semantics over shorthand
- Human readability and machine parseability at the same time
- Small, composable language features
- Strong examples from real operational workflows

## Before proposing syntax

Check new ideas against these questions:

1. Does this help describe business logic more clearly?
2. Can a non-programmer still read it?
3. Can a parser interpret it deterministically?
4. Does it avoid turning OrgScript into a programming language?
5. Can AI reason about it without guessing hidden meaning?

## Good first contribution areas

- Improve examples from real domains
- Tighten wording in the specification
- Propose canonical model fields
- Build parser test cases and fixtures
- Contribute localization design notes without changing the English core

## First implementation targets

- `orgscript validate`
- canonical AST node definitions
- JSON export for parsed files
- deterministic formatting rules
- first semantic lint rules

## Test discipline

- add or update golden snapshots when valid language behavior changes
- add invalid fixtures for every bug fix in parsing or validation
- keep AST and canonical model snapshots stable and reviewable

## Scope discipline

Please avoid proposals for:

- loops
- functions
- custom operators
- hidden side effects
- implicit state mutation
- free-form natural language parsing

These may look powerful, but they weaken the core purpose of the language.
