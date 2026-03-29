# Language Principles

## 1. Human-readable first

A business owner, operator, team lead, or analyst should be able to understand the structure of a file without learning software engineering.

## 2. Machine-parseable by design

The syntax must be deterministic enough for parsers, validators, linters, and transformations.

## 3. AI-friendly structure

Statements should be explicit and semantically narrow so AI systems can interpret intent with minimal ambiguity.

## 4. One keyword, one primary meaning

Each keyword should have one clear semantic purpose in the language.

## 5. Explicit over implicit

Avoid hidden defaults, invisible transitions, or inferred side effects.

## 6. Text-first

OrgScript should work well in plain text, Markdown, Git diffs, code review, and chat-based workflows.

## 7. Business-domain focused

The language should model operational logic, not general software behavior.

## 8. Non-Turing-complete by default

OrgScript must resist drift toward loops, arbitrary functions, and unrestricted programming constructs.

## 9. Small core, strong composition

Prefer a compact vocabulary and composable blocks over feature sprawl.

## 10. English-first canonical syntax

The reference syntax is English. Localization may be added later through controlled language packs, not by loosening the core semantics.
