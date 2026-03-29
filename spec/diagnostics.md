# Diagnostics Contract

OrgScript diagnostics are designed for both humans and machines.

Human-readable output is intended for direct CLI usage.
Machine-readable diagnostics are intended for CI, editors, AI systems, and downstream tooling.

## Supported commands

- `orgscript validate <file> --json`
- `orgscript lint <file> --json`
- `orgscript check <file> --json`

## Output shape

`validate` on `examples/craft-business-lead-to-order.orgs`:

```json
{
  "command": "validate",
  "file": "examples/craft-business-lead-to-order.orgs",
  "ok": true,
  "valid": true,
  "summary": {
    "topLevelBlocks": 4,
    "statements": 47,
    "diagnostics": 0,
    "error": 0,
    "warning": 0,
    "info": 0
  },
  "diagnostics": []
}
```

`lint` on `tests/lint/process-missing-trigger.orgs`:

```json
{
  "command": "lint",
  "file": "tests/lint/process-missing-trigger.orgs",
  "ok": true,
  "clean": true,
  "summary": {
    "diagnostics": 1,
    "error": 0,
    "warning": 1,
    "info": 0
  },
  "diagnostics": [
    {
      "source": "lint",
      "code": "process-missing-trigger",
      "severity": "warning",
      "line": 1,
      "message": "Process `MissingTrigger` has no `when` trigger."
    }
  ]
}
```

`check` on `examples/craft-business-lead-to-order.orgs`:

```json
{
  "command": "check",
  "file": "examples/craft-business-lead-to-order.orgs",
  "ok": true,
  "summary": {
    "diagnostics": 0,
    "error": 0,
    "warning": 0,
    "info": 0
  },
  "validate": {
    "ok": true,
    "valid": true,
    "skipped": false,
    "summary": {
      "topLevelBlocks": 4,
      "statements": 47,
      "diagnostics": 0,
      "error": 0,
      "warning": 0,
      "info": 0
    },
    "diagnostics": []
  },
  "lint": {
    "ok": true,
    "clean": true,
    "skipped": false,
    "summary": {
      "diagnostics": 0,
      "error": 0,
      "warning": 0,
      "info": 0
    },
    "diagnostics": []
  },
  "format": {
    "ok": true,
    "canonical": true,
    "skipped": false,
    "summary": {
      "diagnostics": 0,
      "error": 0,
      "warning": 0,
      "info": 0
    },
    "diagnostics": []
  }
}
```

## Diagnostic fields

Each diagnostic entry contains:

- `source`: `cli`, `syntax`, `semantic`, `lint`, or `format`
- `code`: stable machine-readable identifier when available
- `severity`: `error`, `warning`, or `info`
- `line`: 1-based line number
- `message`: human-readable explanation

`check` embeds stage-local diagnostics under `validate`, `lint`, and `format`. Stages that could not run because validation failed are marked with `skipped: true`.

## Exit codes

### `validate`

- `0`: file is valid
- `1`: file is invalid or CLI usage failed

### `lint`

- `0`: findings contain only `warning` and `info`, or no findings exist
- `1`: findings contain at least one `error`, or CLI usage failed

Warnings are intentionally non-failing so OrgScript linting can be used as advisory tooling in CI and editor workflows.

### `check`

- `0`: validation passed, lint contains no `error`, and formatting is canonical
- `1`: validation failed, lint contains at least one `error`, formatting is non-canonical, or CLI usage failed
