# CLI Plan

The first OrgScript CLI exists to prove that the language is more than documentation.

## Goal

Provide a small command-line interface that can parse and validate OrgScript files and prepare the way for formatter, linter, and exporter features.

## Current status

Implemented:

- `validate`
- `export json`

Planned next:

- `format`
- `lint`

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
- optional `--check` mode later

### `orgscript lint <file>`

Checks for semantic and modeling issues beyond syntax.

Initial lint rules:

- duplicate state names
- invalid or duplicate transitions
- empty control blocks
- `else` without matching `if`
- unreachable or unused states where detectable
- duplicate top-level names in the same file

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
- Invalid files produce useful errors with line references.
- Valid files can be exported to canonical JSON.
- Formatter output is deterministic.
- Linter catches at least a handful of high-value modeling mistakes.
