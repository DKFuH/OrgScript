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

## Unreleased

- Add first AST-backed formatter command
- Enforce formatter stability through parser/formatter roundtrip tests
- Add first AST-backed linter command
- Add lint fixtures for suspicious but syntactically valid models
- Formalize lint severities and stable lint output ordering
- Add machine-readable diagnostics for validate and lint
- Add CI workflows for tests, validation, and example linting

## Later

- Ecosystem integrations
- Editor tooling
- AI-assisted modeling workflows
- Reference transforms into automation platforms
