# OrgScript Governance

This note defines how the language evolves without losing its canonical shape.

## Principles

- Protect the small core.
- Prefer explicit semantics over convenience features.
- Preserve backward compatibility where possible.
- Treat keyword meaning as stable once documented.
- Keep the language readable for humans and deterministic for machines.
- Keep comments non-authoritative and annotations non-semantic unless the spec explicitly changes.

## Stability levels

- `canonical`: part of the normative language surface and safe to build against
- `draft`: documented but not yet treated as a long-term compatibility promise
- `experimental`: implementation or tooling exploration, not part of the canonical language contract

Unless explicitly marked otherwise, the language surface described in `spec/language-spec.md` is treated as `canonical`.

## Change policy

- Any change to keywords, grammar, canonical modeling, or diagnostics is a spec change.
- New features should start as a documented proposal before implementation.
- Experimental ideas should stay out of the canonical spec until they are stable enough to support long-term tooling.
- If a change can be expressed with existing language forms, prefer that over adding a new construct.

## Change matrix

| Change type | Needs RFC | Needs spec update | Version impact |
| --- | --- | --- | --- |
| README, examples, tutorials | No | No | None |
| Exporter behavior | Usually no | Only if contract changes | Patch or minor |
| CLI output wording | No | Yes if diagnostics contract changes | Patch or minor |
| Diagnostics structure or codes | Yes | Yes | Minor |
| New lint rule | No, unless semantic | Only if normative | Patch or minor |
| New keyword or grammar rule | Yes | Yes | Minor while `0.x`, major after `1.0` |
| Semantic reinterpretation of an existing keyword | Yes | Yes | Breaking |
| Canonical model breaking change | Yes | Yes | Breaking |

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

## RFC template

Use a lightweight RFC note when proposing a core change:

```md
# RFC: <short title>

## Motivation

Why is the change needed?

## Proposed change

Describe the exact language or semantic change.

## Backward impact

Is this backward compatible? If not, what breaks?

## Alternatives considered

What else was considered and why was it rejected?

## Spec impact

Which files need updates?

## Decision log

- proposed:
- accepted/rejected:
- release target:
```

## Versioning guidance

- Make breaking changes only with an explicit version plan.
- Keep release notes aligned with the canonical spec.
- When a feature is promoted from draft to canonical, update the spec first and then the supporting docs.
