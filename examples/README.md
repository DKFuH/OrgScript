# OrgScript Examples

This folder is the quickest way to learn OrgScript by reading real files.

## Suggested path

1. Start with `simple` if you want the smallest readable process example.
2. Move to `realistic` when you want end-to-end business flows.
3. Use `advanced` when you want mixed block types and exporter coverage.

## Simple

- [`lead-qualification.orgs`](lead-qualification.orgs)
  Best first read. A compact process example focused on trigger, branching, assignment, and transition.

## Realistic

- [`craft-business-lead-to-order.orgs`](craft-business-lead-to-order.orgs)
  A fuller business flow from lead intake through qualification, quote conversion, and order lifecycle.
- [`service-escalation.orgs`](service-escalation.orgs)
  A policy- and event-oriented example for support handling, escalation, and role-based action.

## Advanced

- [`order-approval.orgs`](order-approval.orgs)
  A mixed file showing stateflow and rule modeling together, useful for exports and downstream tooling.

## Quick index

- `lead-qualification.orgs` - smallest onboarding example
- `craft-business-lead-to-order.orgs` - craft-business pipeline and qualification logic
- `service-escalation.orgs` - support escalation, policy flow, and permissions
- `order-approval.orgs` - stateflow plus rule modeling in one file

## How to use the examples

- Read `lead-qualification.orgs` first to learn the smallest useful pattern.
- Read `craft-business-lead-to-order.orgs` next to see a fuller real-world process.
- Read `service-escalation.orgs` to see policy and role behavior.
- Read `order-approval.orgs` when you want to see stateflow and rule modeling together.

## Suggested commands

```text
node ./bin/orgscript.js validate ./examples/lead-qualification.orgs
node ./bin/orgscript.js check ./examples/craft-business-lead-to-order.orgs
node ./bin/orgscript.js export markdown ./examples/order-approval.orgs
node ./bin/orgscript.js export mermaid ./examples/order-approval.orgs
```

For generated Mermaid demo artifacts, see [`../docs/demos/mermaid/README.md`](../docs/demos/mermaid/README.md).

For generated Markdown summary demo artifacts, see [`../docs/demos/markdown/README.md`](../docs/demos/markdown/README.md).
