# OrgScript for Humans

How to write clear, maintainable OrgScript files.

## What OrgScript is

OrgScript is a description language for business logic.

Use it to describe:

- processes
- rules
- roles
- policies
- state transitions
- events
- metrics

Do not use it as a programming language.

## When to use which block

### `process`

Use `process` to describe how work moves.

Examples:

- lead qualification
- quote to order
- approval flow
- onboarding flow

### `stateflow`

Use `stateflow` to define legal states and allowed transitions.

Examples:

- lead lifecycle
- order lifecycle
- ticket lifecycle

### `rule`

Use `rule` for constraints that should always hold.

Examples:

- no production without deposit
- no refund without approval
- no order without customer data

### `role`

Use `role` to describe permissions.

### `policy`

Use `policy` for escalation or time-based organizational behavior.

### `event`

Use `event` for named triggers with standard reactions.

### `metric`

Use `metric` to define a tracked business measure.

## Writing style

- Keep one statement per line.
- Prefer explicit logic over implied logic.
- Keep blocks small.
- Use stable names.
- Use English for public OrgScript files.
- Avoid prose paragraphs inside OrgScript.
- Use the optional document language header when comments, annotations, or generated context should be read in a known human language.
- Use `#` comments for human notes only.
- Use annotations for structured metadata such as `@owner "sales_ops"`.

## Document language header, comments, and annotations

If you want the file to declare the intended language of comments, annotation values, or generated context, put a language header at the top:

```orgs
orgscript 1

source-language "en"
comment-language "de"
annotation-language "de"
context-language "de"
```

This header does not change OrgScript keywords. It only declares the language contract for human-authored text areas.

## Comments and annotations

Use comments to help a reader orient themselves:

```orgs
orgscript 1

source-language "en"
comment-language "en"
annotation-language "en"

# Shared lead qualification path for inbound leads.
@owner "sales_ops"
@status "active"
process LeadQualification
```

In v1, comments and annotations must live on their own line and are intended for top-level blocks and statement lines.

Do not hide rules in comments.

Bad:

```orgs
# Always require deposit before confirmation.
```

Good:

```orgs
if order.deposit_received = false then
  require finance_clearance
  stop
```

## Common authoring patterns

### Lead qualification

```orgs
process LeadQualification

  when lead.created

  if lead.source = "referral" then
    assign lead.priority = "high"

  if lead.budget < 10000 then
    transition lead.status to "disqualified"
    stop

  transition lead.status to "qualified"
```

### Approval rule

```orgs
rule NoProductionWithoutApproval

  applies to order

  if order.approved = false then
    require management_approval
```

### Escalation policy

```orgs
policy LateResponseEscalation

  when ticket.unanswered_for > 24h
  then
    notify owner with "Ticket waiting too long"
```

## Common mistakes

### Mixing `when` and `if`

Use `when` for the process trigger.

Use `if` for decisions inside the process.

### Giant process blocks

If a process becomes too long, split it into smaller processes or move state legality into a `stateflow`.

### Hidden assumptions

Do not rely on tribal knowledge.

Write thresholds, approvals, and owners explicitly.

### Weak names

Prefer names like `LeadQualification` or `OrderLifecycle` over vague names like `Flow1`.

## From business process to OrgScript

Business sentence:

`If a referral lead comes in, prioritize it. If the value is too low, reject it. Otherwise qualify it.`

OrgScript version:

```orgs
process LeadQualification

  when lead.created

  if lead.source = "referral" then
    assign lead.priority = "high"

  if lead.estimated_value < 10000 then
    transition lead.status to "disqualified"
    stop

  transition lead.status to "qualified"
```

## Practical checklist

Before committing an OrgScript file:

- Is the block type correct?
- Is the trigger explicit?
- Are decisions written as `if` statements?
- Are names specific and stable?
- If you declared language metadata, do comments and annotation values actually follow it?
- Did you avoid prose and hidden assumptions?
- Does `orgscript validate` pass?
- Does `orgscript format` keep the file stable?
