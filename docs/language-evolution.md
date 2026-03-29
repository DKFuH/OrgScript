# Language Evolution

OrgScript aims to be stable, predictable, and conservative about language expansions. Changes are explicitly bounded to ensure the language remains primarily a description layer and doesn't devolve into a general-purpose programming language.

## What is a core language change?

A core language change expands the canonical syntax (`spec/grammar.ebnf`) and requires parsing updates. This includes:
- New top-level block types (e.g., beyond `process`, `stateflow`, `rule`).
- New section keywords.
- New operational statement types.
- Changes to reference semantics (e.g., scoping rules).

We treat core changes as **highly disruptive**. They break existing tooling, models, and potentially user workflows.

## Practical rule of thumb

If a user need can be solved by:

- a new exporter
- a stronger linter
- better diagnostics
- better editor support
- clearer examples or documentation

then it usually does **not** belong in the language core.

## What belongs in tooling instead?

Most new features do *not* belong in the language core. They belong in:
- **Exporters**: Emitting different diagram formats (e.g., PlantUML, BPMN XML) from the existing canonical model.
- **Linters**: Providing domain-specific warnings about modeling choices, separated from canonical grammar errors.
- **Editor Integrations**: Making OrgScript easier to read, navigate, or scaffold within IDEs.

If business logic can already be mapped deterministically into an exporter, the core language is doing its job and does not need to change.

## Handling breaking changes

OrgScript follows a strict protocol for backwards-incompatible breaks:
- We do not break canonical interpretation lightly.
- If a construct must change its semantic meaning, the version `package.json` and the corresponding `spec/language-spec.md` will bump the major version (or minor version while under `0.x`).
- Breaking changes require a migration path to be published alongside the release.

## Expected process for core changes

1. Write a short RFC using the template in `docs/governance.md`.
2. Compare the proposal against `spec/language-spec.md`.
3. Decide whether the change belongs in core, tooling, or an exporter.
4. Update the canonical spec before or alongside implementation.
5. Add examples and regression coverage.
6. Record the impact in release notes and changelog.

## Spec and Implementation Alignment

The `spec/language-spec.md` is the absolute source of truth.
No parser, linter, or syntax highlighter should silently support syntax that is not defined in the spec.

- If the CLI allows something the spec forbids, it's a bug in the CLI.
- If the spec allows something the CLI forbids, it's an unimplemented feature in the CLI. 
- Tooling upgrades should immediately reflect specification expansions to avoid divergence.
