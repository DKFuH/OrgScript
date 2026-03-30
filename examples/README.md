# OrgScript Examples

This catalog is designed to help you learn OrgScript quickly through real-world scenarios.

## Suggested learning path

1. Start with **Simple** to understand the basic syntax and structure.
2. Move to **Realistic** to see end-to-end business flows.
3. Review **Advanced** to inspect mixed constructs and exporter-friendly cases.

## Simple

### [`lead-qualification.orgs`](lead-qualification.orgs)

The best first read. This is a compact single-process file showing explicit decisions, safe comments, and allowlisted annotations.

- **Models**: A basic sales lead qualification funnel.
- **Demonstrates**: `process`, `when`, `if` / `else if`, `assign`, `notify`, `stop`, `transition`, `# comments`, `@owner`, `@status`, `@note`, and `@review`.
- **Outputs available**: Mermaid diagram, Markdown summary.

## Realistic

### [`craft-business-lead-to-order.orgs`](craft-business-lead-to-order.orgs)

A fuller business flow demonstrating how multiple processes and rules interact with a shared state machine.

- **Models**: A craft business pipeline from lead intake through qualification to quote conversion and production order lifecycle.
- **Demonstrates**: Multiple `process` blocks, `stateflow`, and `rule` constructs in one scenario.
- **Outputs available**: Mermaid diagram, Markdown summary.

### [`service-escalation.orgs`](service-escalation.orgs)

A policy- and role-oriented example for support organizations.

- **Models**: Support ticket SLA escalations and role-based permissions.
- **Demonstrates**: `policy`, `when` / `then`, `role`, `can`, and `cannot`.
- **Outputs available**: Markdown summary.

## Advanced

### [`order-approval.orgs`](order-approval.orgs)

A concise, strict file showing stateflow and rule modeling together.

- **Models**: The valid state transitions of an order and a non-bypassable production rule.
- **Demonstrates**: `stateflow`, `states`, `transitions`, `rule`, `applies to`, and `require`.
- **Outputs available**: Mermaid diagram, Markdown summary.

## Generating example outputs

```bash
# Generate a Markdown summary
node ./bin/orgscript.js export markdown ./examples/lead-qualification.orgs

# Generate a Mermaid visual workflow
node ./bin/orgscript.js export mermaid ./examples/order-approval.orgs

# Run the combined quality check
node ./bin/orgscript.js check ./examples/craft-business-lead-to-order.orgs
```

Generated demo artifacts live under [`../docs/demos/`](../docs/demos/).
