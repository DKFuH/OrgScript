# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows Semantic Versioning.

## [Unreleased]

- Added `orgscript format <file> --check` for canonical formatting checks without rewriting files.
- Added `npm run format:check:all` and integrated formatting checks into CI.

## [0.3.0] - 2026-03-29

- Added the first AST-backed formatter via `orgscript format <file>`.
- Added formatter stability tests to ensure canonical example files remain idempotent.
- Added the first AST-backed linter via `orgscript lint <file>`.
- Added lint fixtures for process triggers, unreachable statements, orphan states, and conflicting role permissions.
- Formalized lint severities as `error`, `warning`, and `info`.
- Stabilized lint output with deterministic ordering and a severity summary line.
- Added machine-readable diagnostics for `validate --json` and `lint --json`.
- Made lint exit codes CI-friendly by failing only when findings contain `error`.
- Added GitHub Actions CI for tests, example validation, and example linting.
- Added human and AI usage guides plus a documented diagnostics contract.

## [0.2.0] - 2026-03-29

- Established the OrgScript project foundation, manifesto, syntax, semantics, and canonical model drafts.
- Added a working CLI with `validate` and `export json`.
- Implemented a lexer, parser, AST layer, semantic validation, and canonical JSON export.
- Added realistic example files and a fully English hero example.
- Added golden snapshot tests for AST and canonical model output, plus invalid fixtures.
- Switched the project license to Apache-2.0 and added a `NOTICE` file.
