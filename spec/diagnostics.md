# Diagnostics Contract

OrgScript diagnostics are designed for both humans and machines.

Human-readable output is intended for direct CLI usage.
Machine-readable diagnostics are intended for CI, editors, AI systems, and downstream tooling.

## Supported commands

- `orgscript validate <file> --json`
- `orgscript lint <file> --json`

## Output shape

```json
{
  "command": "lint",
  "file": "examples/craft-business-lead-to-order.orgs",
  "ok": true,
  "clean": true,
  "summary": {
    "diagnostics": 0,
    "error": 0,
    "warning": 0,
    "info": 0
  },
  "diagnostics": []
}
```

`validate` uses `valid` instead of `clean`:

```json
{
  "command": "validate",
  "file": "examples/craft-business-lead-to-order.orgs",
  "ok": true,
  "valid": true,
  "summary": {
    "topLevelBlocks": 3,
    "statements": 17,
    "diagnostics": 0,
    "error": 0,
    "warning": 0,
    "info": 0
  },
  "diagnostics": []
}
```

## Diagnostic fields

Each diagnostic entry contains:

- `source`: `cli`, `syntax`, `semantic`, or `lint`
- `code`: stable machine-readable identifier when available
- `severity`: `error`, `warning`, or `info`
- `line`: 1-based line number
- `message`: human-readable explanation

## Exit codes

### `validate`

- `0`: file is valid
- `1`: file is invalid or CLI usage failed

### `lint`

- `0`: findings contain only `warning` and `info`, or no findings exist
- `1`: findings contain at least one `error`, or CLI usage failed

Warnings are intentionally non-failing so OrgScript linting can be used as advisory tooling in CI and editor workflows.
