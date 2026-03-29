# OrgScript Governance

This note defines how the language evolves without losing its canonical shape.

## Principles

- Protect the small core.
- Prefer explicit semantics over convenience features.
- Preserve backward compatibility where possible.
- Treat keyword meaning as stable once documented.
- Keep the language readable for humans and deterministic for machines.

## Change policy

- Any change to keywords, grammar, canonical modeling, or diagnostics is a spec change.
- New features should start as a documented proposal before implementation.
- Experimental ideas should stay out of the canonical spec until they are stable enough to support long-term tooling.
- If a change can be expressed with existing language forms, prefer that over adding a new construct.

## Core vs tooling vs exporters

- Core language changes affect keywords, grammar, semantics, formatting rules, or the canonical model.
- Tooling changes affect CLI behavior, diagnostics presentation, editor support, and developer workflow.
- Exporter changes affect derived outputs such as JSON, Mermaid, Markdown summaries, or HTML documentation.
- Prefer exporter or tooling extensions over core-language growth when the same user need can be met without changing OrgScript syntax.

## Review expectations

- Check alignment with `spec/language-spec.md`.
- Check alignment with the manifesto and language principles.
- Check parser and formatter impact before approving syntax changes.
- Check canonical model and diagnostic impact before approving semantic changes.

## Versioning guidance

- Make breaking changes only with an explicit version plan.
- Keep release notes aligned with the canonical spec.
- When a feature is promoted from draft to canonical, update the spec first and then the supporting docs.
