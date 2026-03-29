# Repository Structure

This document defines the intended layout of the OrgScript repository as the project moves from specification to tooling.

## Current structure

```text
docs/
examples/
spec/
```

## Target structure

```text
docs/
  governance.md
  cli-v0.1-plan.md
  language-principles.md
  manifesto.md
  repository-structure.md
  semantics.md
  syntax.md

examples/
  README.md
  craft-business-lead-to-order.orgs
  lead-qualification.orgs
  order-approval.orgs
  service-escalation.orgs

editors/
  vscode/
    README.md
    language-configuration.json
    package.json
    syntaxes/
      orgscript.tmLanguage.json

scripts/
  validate-all.js

src/
  ast.js
  cli.js
  export-json.js
  lexer.js
  parser.js
  semantic-validation.js
  validate.js

packages/
  cli/
    README.md
  formatter/
    README.md
  linter/
    README.md
  parser/
    README.md

spec/
  canonical-model.md
  diagnostics.md
  grammar.ebnf
  language-spec.md
```

## Structure principles

- `docs/` explains purpose, language behavior, governance, and roadmap
- `examples/` demonstrates realistic domain use cases
- `editors/` contains language-support scaffolds and editor integrations
- `spec/` holds normative language definitions
- `src/` contains the current reference implementation
- `packages/` contains implementation units

## Why this structure

It keeps the project legible for three audiences at once:

- contributors interested in language design
- developers building tooling
- operators and teams reading examples
