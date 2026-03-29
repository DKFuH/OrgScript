# HTML documentation demos

This folder shows the shortest path from OrgScript source to a shareable HTML documentation artifact.

Each demo keeps the source file in `examples/` and generates one downstream artifact here:

- `*.html`: a static HTML page with embedded logic summaries and live Mermaid diagrams

## Generate

```text
npm run demo:generate
```

## Demos

| Demo | Source | HTML artifact |
| --- | --- | --- |
| Craft Business: Lead to Order | [craft-business-lead-to-order.orgs](../../../examples/craft-business-lead-to-order.orgs) | [craft-business-lead-to-order.html](./craft-business-lead-to-order.html) |
|  |  | Our hero example showcasing multi-block processes, rules, and stateflows in a realistic business scenario. |
| Lead qualification process | [lead-qualification.orgs](../../../examples/lead-qualification.orgs) | [lead-qualification.html](./lead-qualification.html) |
|  |  | A compact process example that shows trigger, branching, assignment, notification, and state transition. |
| Order approval stateflow | [order-approval.orgs](../../../examples/order-approval.orgs) | [order-approval.html](./order-approval.html) |
|  |  | A stateflow-focused example that also demonstrates how Mermaid export skips unsupported blocks while still producing useful output. |

## Notes

- These artifacts are generated using the current HTML exporter implementation.
- The diagrams are rendered by loading `mermaid.js` from a CDN within the HTML page.

