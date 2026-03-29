# Canonical Model v0.2

OrgScript text compiles into a language-neutral canonical model. This model is the intermediate representation used by all exporters (JSON, Markdown, Mermaid, HTML) and analysis tools.

The reference implementation exports this model through:

```text
orgscript export json <file>
```

## Goals of the canonical model

- **Stability**: Surrounding tooling and AI systems can rely on a fixed schema.
- **Portability**: The model can be consumed by non-Node.js systems.
- **Independence**: The model is decoupled from the concrete syntax of `.orgs` files.
- **Artifact Generation**: Provides a clean tree for document generation.

## Model structure

The top-level object represents an OrgScript document.

```json
{
  "version": "0.2",
  "type": "document",
  "body": [
    {
      "type": "process",
      "name": "LeadQualification",
      "body": [
        {
          "type": "when",
          "trigger": "lead.created"
        },
        {
          "type": "if",
          "condition": {
            "type": "comparison",
            "left": { "type": "field", "path": "lead.source" },
            "operator": "=",
            "right": { "type": "string", "value": "referral" }
          },
          "then": [
            {
              "type": "assign",
              "target": "lead.priority",
              "value": { "type": "string", "value": "high" }
            }
          ],
          "elseIf": [],
          "else": null
        }
      ]
    }
  ]
}
```

## Supported Block Types

- `process`: Operational flow with triggers and branching.
- `stateflow`: Finite state machine with states and transitions.
- `rule`: Conditional constraints applied to a specific scope.
- `role`: Permission and capability mapping for actors.
- `policy`: High-level security or SLA clauses.
- `metric`: Measurement and target definitions.
- `event`: Automated system reactions.

## Statement Types

- `when`: Declares an external trigger.
- `if`: Conditional branching.
- `assign`: Sets a value.
- `transition`: Moves an entity between states.
- `notify`: Sends a message to a target.
- `create`: Instantiates a new entity.
- `update`: Modifies an existing entity field.
- `require`: Declares a dependency or mandatory check.
- `stop`: Terminates execution of the current branch/block.

## Stability Policy

As of v0.6.0, the canonical model structure is considered stable for the current feature set. Breaking changes to the JSON schema will trigger a minor version bump (e.g., v0.2 to v0.3). Tooling developers should check the `version` field.
