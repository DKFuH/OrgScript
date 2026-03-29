# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog, and this project follows Semantic Versioning.

## [Unreleased]

## [0.7.0] - 2026-03-29

- Enhanced CLI for professional distribution: added `--version` and improved help text.
- Enabled global installation support via `npm install -g orgscript`.
- Prepared VS Code extension for marketplace: fixed manifest warnings and updated metadata.
- Automated a documentation site via `scripts/build-docs.js` for GitHub Pages.
- Added a comprehensive "Hiring Process" hero example to demonstrate advanced process modeling.
- Stabilized the repository structure and baseline artifacts for public adoption.

## [0.6.0] - 2026-03-29

- Added first HTML documentation exporter via `orgscript export html <file>`.
- Refined Mermaid export with improved styling, parallelogram shapes for triggers, and semantic markers for state diagrams.
- Upgraded Markdown summary export (v2) with Table of Contents (TOC), inter-block separators, and better header hierarchy.
- Reorganized and expanded the demo suite under `docs/demos/` to include HTML, Markdown, and Mermaid artifacts for all hero examples.
- Stabilized the canonical JSON model (v0.2) and updated its specification in `spec/canonical-model.md`.
- Improved business-level phrasing in all summary exporters for better stakeholder readability.
- Consolidated "Artiflow Flow" in documentation to show the path from `.orgs` to visual/structured outputs.

## [0.5.0] - 2026-03-29

- Refined VS Code TextMate grammar to support inline keywords and dotted properties correctly.
- Improved VS Code extension onboarding and local testing documentation.
- Revamped `README.md` with a 60-second quickstart and a visual "Three-Value Flow" showcase.
- Curated the example catalog into Simple, Realistic, and Advanced categories with clearer descriptions.
- Polished CLI diagnostics UX with bracketed codes, padded severities, and "passed" status messaging.
- Added `docs/language-evolution.md` for clear governance on language vs. tooling growth.
- Updated the diagnostics text contract in `spec/diagnostics.md` to match reality.

## [0.4.0] - 2026-03-29

- Added `orgscript format <file> --check` for canonical formatting checks without rewriting files.
- Added `npm run format:check:all` and integrated formatting checks into CI.
- Added `orgscript check <file>` as the combined quality command for validation, linting, and formatting checks.
- Added `orgscript check <file> --json` for machine-readable combined quality diagnostics.
- Added `npm run check:all` and switched CI to the combined quality path.
- Added `orgscript export markdown <file>` for concise Markdown summaries of OrgScript files.
- Added Markdown summary golden snapshots and demo outputs.
- Added `orgscript export mermaid <file>` for first-pass Mermaid exports of processes and stateflows.
- Added `npm run demo:generate` plus a Mermaid demo package with generated Markdown and `.mmd` artifacts.
- Added a canonical master language spec and lightweight governance guidance.
- Added an example catalog and an initial VS Code syntax-highlighting scaffold.
- Unified CLI diagnostics across `validate`, `lint`, `check`, and `format --check`.
- Added stable diagnostic code namespaces for syntax, semantic validation, lint, format, and CLI usage errors.
- Added `format --check --json` and documented JSON diagnostics with real examples.
- Upgraded the VS Code OrgScript extension from a scaffold to a usable first TextMate-based syntax-highlighting integration.

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
