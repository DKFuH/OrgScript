# Syntax Draft v0.1

OrgScript uses indentation-based blocks and a small set of reserved keywords.

## File format

- Plain text
- Suggested extension: `.orgs`
- UTF-8
- Spaces for indentation
- Whole-line comments use `#`
- Whole-line annotations use `@key "value"`

## Comments and annotations

Comments are human-readable notes:

```orgs
# This note explains the flow to human readers.
process LeadQualification
```

Annotations are structured metadata:

```orgs
@owner "sales_ops"
@status "active"
process LeadQualification
```

Rules for v1:

- comments must be on their own line
- inline `#` comments after code are intentionally unsupported
- annotations must use `@key "value"`
- supported annotation keys are `@note`, `@owner`, `@todo`, `@source`, `@status`, and `@review`
- comments and annotations may attach to top-level blocks and statement lines
- comments and annotations are not supported on `states`, `transitions`, `can`, `cannot`, `formula`, `owner`, `target`, or `applies to` lines in v1

## Top-level blocks

An OrgScript file may contain one or more top-level blocks:

- `process`
- `stateflow`
- `rule`
- `role`
- `policy`
- `metric`
- `event`

## Processes

Processes describe linear operational logic with explicit decisions and actions.

Interpretation rule:

- `when` in a `process` declares the entry trigger
- `if` declares decision logic inside that process
- `then` is inline in `if ... then` statements

```orgs
process LeadQualification

  when lead.created

  if lead.source = "referral" then
    assign lead.priority = "high"
    notify sales with "Handle as referral"

  else if lead.source = "ads" then
    assign lead.priority = "normal"

  if lead.budget < 10000 then
    transition lead.status to "disqualified"
    stop

  transition lead.status to "qualified"
```

Allowed statements inside a process:

- `when <event-reference>`
- `if <condition> then`
- `else if <condition> then`
- `else`
- `assign <field-reference> = <value>`
- `transition <field-reference> to <value>`
- `notify <target> with <string>`
- `create <entity-name>`
- `update <field-reference> = <value>`
- `require <requirement-name>`
- `stop`

Important distinction:

- `when` in a process is not a general condition block
- `when` inside a process should point to an event-like trigger such as `lead.created`
- branching logic after entry belongs in `if` statements

## Stateflows

Stateflows define allowed states and legal transitions.

```orgs
stateflow LeadStatus

  states
    new
    qualified
    quoted
    won
    lost
    disqualified

  transitions
    new -> qualified
    qualified -> quoted
    quoted -> won
    quoted -> lost
    new -> disqualified
```

## Rules

Rules define invariant business logic.

```orgs
rule NoOrderWithoutDeposit

  applies to order

  if order.deposit_received = false then
    require finance_review
    notify finance with "Deposit missing"
```

`require` introduces a named gate, prerequisite, or approval token. In v0.1 it is intentionally narrow and should reference one explicit requirement identifier, such as `finance_review`, `management_approval`, or `deposit_received`.

## Roles

Roles describe permissions in a compact form.

```orgs
role Sales

  can
    view lead
    update lead.status
    create quote

  cannot
    delete lead
    approve refund
```

## Policies

Policies describe time-based or situational escalation behavior.

Interpretation rule:

- `when` in a `policy` declares a conditional situation
- `then` starts the response block for that policy condition
- this is intentionally different from inline `if ... then` inside processes

```orgs
policy LateResponseEscalation

  when lead.unanswered_for > 24h
  then
    notify owner with "Lead waiting too long"

  when lead.unanswered_for > 48h
  then
    assign lead.owner = "team_lead"
    notify team_lead with "Lead escalated"
```

## Metrics

Metrics define measurable operational outcomes.

```orgs
metric CloseRate

  formula won_quotes / total_quotes
  owner sales_management
  target >= 0.35
```

## Events

Events describe system-relevant triggers and their standard reactions.

```orgs
event order.paid

  notify production with "Order is paid"
  transition order.status to "ready_for_production"
```

## Identifiers

- Block names use `PascalCase`
- Field references use dotted notation such as `lead.status`
- Entity-like nouns use lowercase words such as `lead`, `order`, `quote`

## Conditions

Supported comparison forms in v0.1:

- `=`
- `!=`
- `<`
- `<=`
- `>`
- `>=`

Supported logical connectors in v0.1:

- `and`
- `or`

## Formatting conventions

- One statement per line
- One indentation level per block
- Blank lines may separate logical sections
- Keywords are lowercase
- Strings use double quotes
- Indentation uses multiples of two spaces
