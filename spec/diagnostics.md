# Diagnostics Contract

OrgScript diagnostics are designed to be stable for humans, CI, editors, AI systems, and downstream tooling.

The contract below covers:

- `orgscript validate <file> --json`
- `orgscript lint <file> --json`
- `orgscript check <file> --json`
- `orgscript format <file> --check --json`

## Severity model

OrgScript uses exactly three severities:

- `error`
- `warning`
- `info`

Severity meanings:

- `error`: invalid input or blocking quality issue
- `warning`: non-blocking but notable issue
- `info`: advisory finding

## Diagnostic object shape

Each diagnostic object uses the same core fields:

```json
{
  "source": "lint",
  "severity": "error",
  "code": "lint.process-multiple-triggers",
  "file": "tests/lint/process-multiple-triggers.orgs",
  "line": 5,
  "message": "Process `MultipleTriggers` declares multiple `when` triggers."
}
```

Fields:

- `source`: `cli`, `syntax`, `semantic`, `lint`, or `format`
- `severity`: `error`, `warning`, or `info`
- `code`: stable machine-readable identifier
- `file`: repository-relative path when available
- `line`: 1-based line number
- `message`: human-readable explanation

## Code namespaces

Diagnostic codes are stable and namespaced by origin:

- `cli.*`
- `syntax.*`
- `semantic.*`
- `lint.*`
- `format.*`

Examples:

- `cli.file-not-found`
- `syntax.unknown-top-level-block`
- `syntax.invalid-indentation`
- `semantic.transition-target-undeclared`
- `lint.process-multiple-triggers`
- `format.not-canonical`
- `syntax.invalid-annotation`
- `syntax.dangling-annotation`
- `syntax.annotation-target-not-supported`
- `syntax.comment-target-not-supported`
- `syntax.inline-comments-not-supported`
- `semantic.unsupported-annotation-key`
- `semantic.duplicate-annotation-key`
- `lint.comment-hidden-business-rule`
- `lint.comment-hidden-requirement`
- `lint.comment-hidden-permission`

## Top-level JSON structure

All supported JSON commands expose:

- `command`
- `file`
- `ok`
- `summary`
- `diagnostics`

### `validate --json`

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

### `lint --json`

```json
{
  "command": "lint",
  "file": "tests/lint/process-multiple-triggers.orgs",
  "ok": false,
  "clean": false,
  "summary": {
    "diagnostics": 2,
    "error": 1,
    "warning": 0,
    "info": 1
  },
  "diagnostics": [
    {
      "source": "lint",
      "severity": "error",
      "code": "lint.process-multiple-triggers",
      "file": "tests/lint/process-multiple-triggers.orgs",
      "line": 5,
      "message": "Process `MultipleTriggers` declares multiple `when` triggers."
    },
    {
      "source": "lint",
      "severity": "info",
      "code": "lint.process-trigger-order",
      "file": "tests/lint/process-multiple-triggers.orgs",
      "line": 5,
      "message": "Process `MultipleTriggers` declares a `when` trigger after operational statements."
    }
  ]
}
```

If `lint` cannot run because the file is syntactically or semantically invalid, the response stays `command: "lint"` and returns syntax or semantic diagnostics with `inputValid: false`.

### `check --json`

`check` combines validation, linting, and canonical format checking.

```json
{
  "command": "check",
  "file": "examples/order-approval.orgs",
  "ok": true,
  "summary": {
    "diagnostics": 0,
    "error": 0,
    "warning": 0,
    "info": 0
  },
  "diagnostics": [],
  "validate": {
    "ok": true,
    "valid": true,
    "skipped": false,
    "summary": {
      "topLevelBlocks": 2,
      "statements": 15,
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

`check` also exposes a flattened top-level `diagnostics` array in addition to the stage-local arrays.

### `format --check --json`

```json
{
  "command": "format",
  "file": "examples/order-approval.orgs",
  "ok": true,
  "canonical": true,
  "check": true,
  "mode": "check",
  "summary": {
    "diagnostics": 0,
    "error": 0,
    "warning": 0,
    "info": 0
  },
  "diagnostics": []
}
```

If canonical formatting differs, `format --check --json` returns an `error` diagnostic with code `format.not-canonical`.

If the input file is invalid, the response stays `command: "format"` and returns syntax or semantic diagnostics with `inputValid: false`.

## Comments and annotations

Comments:

- start with whole-line `#`
- are excluded from canonical export
- are excluded from AI context by default
- do not appear in JSON diagnostics unless the comment itself causes a lint finding

Annotations:

- use `@key "value"`
- are validated for syntax and allowlisted keys
- appear in the canonical model when valid
- are non-semantic metadata

Typical annotation and comment-related diagnostics:

- `syntax.invalid-annotation`
- `syntax.dangling-annotation`
- `syntax.annotation-target-not-supported`
- `syntax.comment-target-not-supported`
- `syntax.inline-comments-not-supported`
- `semantic.unsupported-annotation-key`
- `semantic.duplicate-annotation-key`
- `lint.comment-hidden-business-rule`
- `lint.comment-hidden-requirement`
- `lint.comment-hidden-permission`

## Text output contract

Human-readable CLI output is deterministic and follows the same ordering principles:

- heading first
- status second
- summary third
- diagnostics sorted deterministically
- summary result last when applicable

Diagnostic lines use this order:

- severity
- code
- file
- line
- message

Example:

```text
LINT tests/lint/process-multiple-triggers.orgs
  status: failed
  summary: 1 error(s), 0 warning(s), 1 info
  ERROR   [lint.process-multiple-triggers] tests/lint/process-multiple-triggers.orgs:5 - Process `MultipleTriggers` declares multiple `when` triggers.
  INFO    [lint.process-trigger-order] tests/lint/process-multiple-triggers.orgs:5 - Process `MultipleTriggers` declares a `when` trigger after operational statements.
Result: FAIL
```

`format --check` uses the same structural pattern:

```text
FORMAT tests/invalid/unknown-top-level.orgs
  status: failed
  summary: 1 error(s), 0 warning(s), 0 info
  stats: 1 top-level block(s), 0 statement(s)
  ERROR   [syntax.unknown-top-level-block] tests/invalid/unknown-top-level.orgs:1 - Unknown top-level block `workflow`.
Result: FAIL
```

`check` uses explicit stage lines:

- `validate: passed|failed`
- `lint: passed|failed|skipped`
- `format: passed|failed|skipped`

## Exit codes

### `validate`

- `0`: file is valid
- `1`: file is invalid or CLI usage failed

### `lint`

- `0`: only `warning` or `info` findings, or no findings
- `1`: at least one `error`, invalid input, or CLI usage failed

### `check`

- `0`: validation passed, lint has no `error`, and formatting is canonical
- `1`: validation failed, lint has at least one `error`, formatting is non-canonical, or CLI usage failed

### `format --check`

- `0`: file is canonically formatted
- `1`: canonical formatting differs, input is invalid, or CLI usage failed
