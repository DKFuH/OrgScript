# Mermaid demos

This folder shows the shortest useful path from OrgScript source to generated diagram artifacts.

Each demo keeps the source file in `examples/` and generates two downstream artifacts here:

- `*.mermaid.md`: a Markdown document ready for GitHub rendering
- `*.mmd`: the first extracted Mermaid diagram block for direct Mermaid tooling use

## Generate

```text
npm run demo:generate
```

## Demos

| Demo | Source | Markdown artifact | Mermaid artifact |
| --- | --- | --- | --- |
| Craft Business: Lead to Order | [craft-business-lead-to-order.orgs](../../../examples/craft-business-lead-to-order.orgs) | [craft-business-lead-to-order.mermaid.md](./craft-business-lead-to-order.mermaid.md) | [craft-business-lead-to-order.mmd](./craft-business-lead-to-order.mmd) |
|  |  |  | Our hero example showcasing multi-block processes, rules, and stateflows in a realistic business scenario. |
| Lead qualification process | [lead-qualification.orgs](../../../examples/lead-qualification.orgs) | [lead-qualification.mermaid.md](./lead-qualification.mermaid.md) | [lead-qualification.mmd](./lead-qualification.mmd) |
|  |  |  | A compact process example that shows trigger, branching, assignment, notification, and state transition. |
| Order approval stateflow | [order-approval.orgs](../../../examples/order-approval.orgs) | [order-approval.mermaid.md](./order-approval.mermaid.md) | [order-approval.mmd](./order-approval.mmd) |
|  |  |  | A stateflow-focused example that also demonstrates how Mermaid export skips unsupported blocks while still producing useful output. |

## Notes

- These artifacts are generated from the current exporter implementation.
- `order-approval` intentionally demonstrates the current behavior where unsupported blocks are skipped and called out in the generated Markdown.
- If you change Mermaid export behavior, regenerate this folder with `npm run demo:generate` and review the diffs.

