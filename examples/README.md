# OrgScript Examples

This folder shows OrgScript at three adoption levels.

## Simple

- [`lead-qualification.orgs`](lead-qualification.orgs)
  A compact process example focused on trigger, branching, assignment, and transition.

## Realistic

- [`craft-business-lead-to-order.orgs`](craft-business-lead-to-order.orgs)
  A fuller business flow from lead intake through qualification, quote conversion, and order lifecycle.
- [`service-escalation.orgs`](service-escalation.orgs)
  A policy- and event-oriented example for support and response handling.

## Advanced

- [`order-approval.orgs`](order-approval.orgs)
  A mixed file showing stateflow and rule modeling together, useful for exports and downstream tooling.

## How to use the examples

- Start with the `Simple` example if you are learning the language.
- Move to `Realistic` once you want to model operational flows end to end.
- Use `Advanced` when testing exports, linting, or tooling assumptions across multiple block types.

## Suggested commands

```text
node ./bin/orgscript.js validate ./examples/lead-qualification.orgs
node ./bin/orgscript.js check ./examples/craft-business-lead-to-order.orgs
node ./bin/orgscript.js export mermaid ./examples/order-approval.orgs
```

For generated Mermaid demo artifacts, see [`../docs/demos/mermaid/README.md`](../docs/demos/mermaid/README.md).
