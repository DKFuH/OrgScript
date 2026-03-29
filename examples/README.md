# OrgScript Examples

This catalog is designed to help you learn OrgScript quickly through real-world scenarios. We have curated these examples to focus on quality and clarity.

## Suggested Learning Path

1. Start with **Simple** to understand the basic syntax and structure.
2. Move to **Realistic** to see how end-to-end business flows are modeled.
3. Review **Advanced** to see mixed constructs and prepare for programmatic exports.

---

## 🟢 Simple

### [`lead-qualification.orgs`](lead-qualification.orgs)
The best first read. This is a compact, single-process file showing how to make decisions based on input data.

- **Models**: A basic sales lead qualification funnel.
- **Demonstrates**: `process`, `when`, `if`/`else if`, `assign`, `notify`, `stop`, `transition`.
- **Outputs available**: Mermaid diagram, Markdown summary.

---

## 🟡 Realistic

### [`craft-business-lead-to-order.orgs`](craft-business-lead-to-order.orgs)
A fuller business flow demonstrating how multiple processes and rules interact with a shared state machine.

- **Models**: A craft business pipeline from lead intake, through qualification, to quote conversion and production order lifecycle.
- **Demonstrates**: Multiple `process` blocks, `stateflow`, and `rule` constructs in a unified scenario.
- **Outputs available**: Mermaid diagram, Markdown summary.

### [`service-escalation.orgs`](service-escalation.orgs)
A policy- and event-oriented example for support organizations, focusing on declarative rules over sequential processes.

- **Models**: Support ticket SLA escalations and basic role-based permissions.
- **Demonstrates**: `policy`, `when`/`then`, `role`, `can` / `cannot`.
- **Outputs available**: Markdown summary.

---

## 🔴 Advanced

### [`order-approval.orgs`](order-approval.orgs)
A concise, strict file showing stateflow and rule modeling together, highly useful for building downstream tooling or validators.

- **Models**: The valid state transitions of an order, and a non-bypassable rule for production entry.
- **Demonstrates**: `stateflow`, `states`, `transitions`, `rule`, `applies to`, `require`.
- **Outputs available**: Mermaid diagram, Markdown summary.

---

## Generating Example Outputs

OrgScript can transform these files into artifacts. You can test this locally:

```bash
# Generate a Markdown summary
node ./bin/orgscript.js export markdown ./examples/lead-qualification.orgs

# Generate a Mermaid visual workflow
node ./bin/orgscript.js export mermaid ./examples/order-approval.orgs
```

You can also run validation and canonical format checks on any example:

```bash
node ./bin/orgscript.js check ./examples/craft-business-lead-to-order.orgs
```

See the generated demo artifacts in [`../docs/demos/`](../docs/demos/).
