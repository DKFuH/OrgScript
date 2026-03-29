# CLI Plan

The first OrgScript CLI exists to prove that the language is more than documentation.

## Goal

Provide a small command-line interface that can parse and validate OrgScript files and prepare the way for formatter, linter, and exporter features.

## Current status

Implemented:

- `validate`
- `format`
- `format --check`
- `lint`
- `export json`
- `validate --json`
- `lint --json`
- `check`

Planned next:

- `lint --strict`

## Command behavior

### `orgscript validate <file>`

Checks:

- file can be tokenized
- indentation is valid
- top-level blocks are valid
- statements are valid for their block type
- conditions and actions use allowed forms

Output:

- success confirmation on valid files
- file path, line, and message on errors
- optional machine-readable diagnostics via `--json`

### `orgscript export json <file>`

Exports the parsed document into the canonical JSON model.

### `orgscript format <file>`

Normalizes:

- indentation
- blank lines
- keyword casing
- string quoting

Output:

- formatted file in place
- idempotent output for already canonical files
- `--check` reports whether a file is already canonical without modifying it

### `orgscript lint <file>`

Checks for semantic and modeling issues beyond syntax.

Severity model:

- `error`: contradictory or structurally dangerous modeling
- `warning`: likely modeling problems that should usually be fixed
- `info`: useful guidance that does not fail the lint command by itself

Output model:

- deterministic finding order
- one summary line with counts by severity
- one stable line per finding using severity, code, line, and message
- optional machine-readable diagnostics via `--json`

### `orgscript check <file>`

Runs the quality pipeline in one command:

- `validate`
- `lint`
- `format --check`

Output:

- compact pass/fail summary for each stage
- clear indication of which stage failed
- stable text output suitable for CI logs

Exit behavior:

- `0` when validation passes, lint has no `error`, and formatting is canonical
- `1` when validation fails, lint finds at least one `error`, or formatting drift is detected
- warnings and info findings alone do not fail the command

Initial lint rules:

- duplicate state names
- invalid or duplicate transitions
- empty control blocks
- `else` without matching `if`
- unreachable or unused states where detectable
- duplicate top-level names in the same file
- missing process trigger
- multiple process triggers
- late process trigger after operational statements
- unreachable statements after guaranteed `stop`
- rule without `applies to`
- conflicting role permissions

## Suggested package structure

```text
packages/
  parser/
  cli/
  formatter/
  linter/
```

## Suggested implementation order

1. lexer
2. parser
3. AST types
4. `validate` command
5. JSON export
6. formatter
7. linter

## Technology recommendation

TypeScript is the fastest start:

- strong ecosystem for CLI tooling
- easy JSON handling
- good developer accessibility
- straightforward path to parser libraries or hand-written parsing

## Success criteria for v0.1

- One can run `orgscript validate` on example files.
- One can run `orgscript validate --json` and `orgscript lint --json` for downstream tooling.
- One can run `orgscript format` on example files without changing canonical files.
- One can run `orgscript format --check` in CI or pre-commit workflows.
- One can run `orgscript check` to combine validation, linting, and format checks.
- One can run `orgscript lint` on valid but suspicious models and get stable findings.
- Lint exit codes are safe for CI use with advisory warnings.
- Invalid files produce useful errors with line references.
- Valid files can be exported to canonical JSON.
- Formatter output is deterministic.
- Linter catches at least a handful of high-value modeling mistakes.
