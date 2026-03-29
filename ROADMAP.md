# Roadmap

## v0.1

- Define project identity and scope
- Publish manifesto and language principles
- Draft syntax and semantics
- Draft canonical model
- Add example files from real business scenarios
- Finalize repository structure for tooling
- Define the first CLI command surface

## v0.2

- Build lexer and parser
- Validate syntax into a canonical AST
- Implement `validate`
- Implement `export json`
- Separate syntax and semantic validation
- Document the AST structure

## v0.3

- Implement AST-backed formatter
- Implement linter rules for common modeling errors
- Freeze AST, model, and formatter output with golden snapshots
- Add machine-readable diagnostics for validation and linting
- Add CI-ready command behavior and GitHub Actions
- Generate diagrams and documentation from the model
- Add localization architecture for keyword packs

## v0.4

- Add `format --check` for CI and pre-commit workflows
- Document real JSON diagnostics examples in README and diagnostics spec
- Add `orgscript check` as a combined quality command
- Improve consistency of human-readable CLI diagnostics
- Add an initial VS Code syntax highlighting scaffold

## Unreleased

- Open the v0.4.0 developer-experience milestone
- Prepare issue drafts for formatter checks, diagnostics docs, combined quality checks, diagnostics consistency, and editor support
- Publish the canonical language spec and governance notes
- Add the first editor integration scaffold for VS Code
- Expand diagnostics guidance and example indexing for contributors

## Later

- Ecosystem integrations
- Editor tooling
- AI-assisted modeling workflows
- Reference transforms into automation platforms
