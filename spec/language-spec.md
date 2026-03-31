# OrgScript Language Specification

This document is the canonical language spec for OrgScript. It consolidates the reference syntax, semantics, canonical model, and diagnostic contract from the supporting docs and supersedes draft-only wording in `docs/syntax.md`, `docs/semantics.md`, `spec/canonical-model.md`, and `spec/diagnostics.md`.

## 1. Purpose

OrgScript is a description language for organizational logic. It is designed to be:

- readable by people
- deterministic for parsers and validators
- stable in version control
- analyzable by AI
- portable across downstream tools and exports

OrgScript is not a general-purpose programming language. It describes business logic, not executable software.

## 2. File format

- Plain text
- UTF-8
- Indentation uses spaces
- One statement per line
- Keywords are lowercase
- Strings use double quotes
- Suggested extension: `.orgs`
- Optional document language header uses `orgscript 1`
- Document language metadata uses whole-line `source-language "en"`-style fields in v1
- Comments use whole-line `# ...` form in v1
- Structured annotations use whole-line `@key "value"` form in v1

## 3. Top-level blocks

An OrgScript file contains one or more top-level blocks of these kinds:

- `process`
- `stateflow`
- `rule`
- `role`
- `policy`
- `metric`
- `event`

Each block name is a canonical identifier. Block names use `PascalCase`. Entity and field references use lowercase dotted notation such as `lead.status` or `order.paid`.

## 4. Block meanings

- `process`: a directed operational flow with explicit trigger, decisions, and actions
- `stateflow`: the allowed states and legal transitions for a modeled entity
- `rule`: a constraint or mandatory business rule
- `role`: a permission boundary
- `policy`: time-based or context-based organizational behavior
- `metric`: a tracked business measure
- `event`: a named trigger with associated reactions

## 5. Core statements

The language recognizes these core statements:

- `when`: declares an entry trigger or condition context
- `if`: declares a conditional branch
- `else if`: declares an additional conditional branch
- `else`: declares the fallback branch
- `assign`: sets a modeled value
- `transition`: changes a modeled state
- `notify`: emits a message to a target actor or system
- `create`: declares creation of a modeled entity
- `update`: declares mutation of a modeled field
- `require`: declares a named prerequisite or approval gate
- `stop`: ends the current branch

The same keyword must keep the same primary meaning across the language.

## 6. Syntax contract

OrgScript uses indentation-based blocks and lexical keywords. The reference grammar is defined in `spec/grammar.ebnf`.

### 6.0 Comments and annotations

OrgScript supports three non-executable documentation forms:

- document language metadata
- comments
- annotations

Document language metadata:

- may appear only in an optional document header at the start of the file
- begins with `orgscript 1`
- uses whole-line fields:
  - `source-language "en"`
  - `comment-language "de"`
  - `annotation-language "de"`
  - `context-language "de"`
- is document-level metadata, not executable logic
- is included in the AST and canonical model
- does not change parsing semantics or execution semantics
- is binding as a documentation contract for the corresponding human-authored text areas

Rules for the document header in v1:

- if present, it must be the first non-blank construct in the file
- `source-language` is canonical source syntax metadata and only `en` is supported in v1
- values must use ISO-style language codes such as `en`, `de`, `pt`, `es`, or `eo`
- document metadata does not localize OrgScript keywords

Comments:

- begin with `#`
- must occupy their own logical line in v1
- are human-oriented only
- are not authoritative business logic
- do not change parsing semantics, semantic validation, analysis, or transition legality
- may be linted if they clearly conflict with a declared `comment-language`

Annotations:

- use `@key "value"`
- attach to the immediately following supported block or statement
- are parseable metadata
- are non-semantic
- are included in the AST and canonical model
- may be linted if their values clearly conflict with a declared `annotation-language`

Supported annotation keys in v1:

- `@note`
- `@owner`
- `@todo`
- `@source`
- `@status`
- `@review`

In v1, comments and annotations are supported on:

- top-level block declarations
- `when`
- `if`
- action statements such as `assign`, `transition`, `notify`, `create`, `update`, `require`, and `stop`

They are not supported on list sections such as `states`, `transitions`, `can`, `cannot`, or raw field lines such as `formula`, `owner`, `target`, and `applies to`.

### 6.1 Processes

`process` describes linear operational logic with explicit decisions and actions.

- `when` inside a `process` is the entry trigger
- `if` and `else if` express branching logic
- `then` is part of the conditional form `if ... then`
- `stop` terminates the current branch and prevents later sibling statements from applying to that branch

### 6.2 Stateflows

`stateflow` declares legal states and legal transitions only. It does not define execution order.

### 6.3 Rules

`rule` declares a constraint that should remain true whenever its condition matches.

### 6.4 Roles

`role` declares compact permissions through `can` and `cannot` sections.

### 6.5 Policies

`policy` declares context-based or time-based responses.

- `when` introduces the condition
- `then` starts the response block for that condition
- a policy may contain multiple trigger-response sections

### 6.6 Metrics

`metric` declares a measurable outcome with a formula, owner, and target.

### 6.7 Events

`event` declares a named trigger with associated actions.

## 7. Semantic rules

The canonical reading rules are:

- File order matters within a block
- Indentation defines containment
- Block type is semantically significant
- `when` in `process` is distinct from `when` in `policy`
- `if` is distinct from `when`
- `stateflow` defines legality, not execution
- `require` is a first-class prerequisite reference, not prose
- `stop` ends the current branch
- explicit values and branch order must be preserved
- comments are ignored by semantic interpretation
- annotations are metadata only and do not alter semantics
- document language metadata is metadata only and does not alter semantics

OrgScript prefers explicit description over inference. If a statement is ambiguous, the language should favor a more explicit form rather than hidden defaults or shorthand.

If business logic matters, it must be modeled in OrgScript constructs, not hidden in comments.

## 8. Canonical model

OrgScript text compiles into a language-neutral canonical model. The canonical model is the stable intermediate representation used for:

- validation
- formatting
- documentation
- export
- AI analysis

Canonical model guidelines:

- preserve meaning independent of formatting
- preserve document kind, statement order, and branch order
- preserve explicit identifiers and values exactly
- keep the model close to the source AST
- do not invent business semantics during export
- include document language metadata when present
- include annotations on supported nodes
- exclude comments

Canonical node families include:

- document nodes
- structural nodes
- conditional nodes
- action nodes
- expression nodes

Suggested document kinds match the top-level blocks listed above.

## 9. Diagnostics contract

Diagnostics must serve both humans and machines.

### 9.1 Command surface

- `orgscript validate <file> --json`
- `orgscript lint <file> --json`
- `orgscript check <file> --json`

### 9.2 Diagnostic fields

Each diagnostic entry should include:

- `source`
- `code`
- `severity`
- `line`
- `message`

Combined `check --json` output should also preserve stage-local status fields such as `valid`, `clean`, `canonical`, and `skipped`.

### 9.3 Exit codes

- `validate`: `0` for valid, `1` for invalid or CLI failure
- `lint`: `0` for warnings only or no findings, `1` for errors or CLI failure
- `check`: `0` for valid, lint-clean, canonically formatted files; `1` otherwise

## 10. Validation rules

At minimum, validation should reject or flag:

- unknown keywords
- invalid block structure
- `else` without a preceding `if`
- duplicate state names in one `stateflow`
- undefined or illegal state transitions
- empty blocks where content is required
- duplicate top-level names within the same namespace, according to policy
- malformed document headers
- malformed or misplaced document language metadata
- malformed annotation syntax
- unsupported `source-language` values
- unsupported annotation keys
- misplaced annotations
- inline `#` comments after code, which are intentionally unsupported in v1

## 11. Evolution policy

OrgScript evolves conservatively.

- keep the core vocabulary small
- prefer backward-compatible additions
- preserve keyword meanings once shipped
- add new constructs only when existing ones cannot express the need clearly
- avoid turning OrgScript into a general-purpose programming language
- document any new keyword, grammar rule, or semantic change before it becomes canonical

If a change affects parsing, canonical modeling, or diagnostics, it must be treated as a spec change, not just an implementation detail.

## 12. Reference docs

Supporting material lives in:

- `docs/manifesto.md`
- `docs/language-principles.md`
- `docs/syntax.md`
- `docs/semantics.md`
- `spec/grammar.ebnf`
- `spec/canonical-model.md`
- `spec/diagnostics.md`
- `docs/orgscript-for-humans.md`
- `docs/orgscript-for-ai.md`
