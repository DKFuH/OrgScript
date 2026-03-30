# AST Draft v0.2

OrgScript now parses source text into a small abstract syntax tree before semantic validation and JSON export.

## Pipeline

```text
source text
-> lexer
-> parser
-> AST
-> semantic validation
-> canonical JSON model
```

## Top-level node kinds

- `ProcessNode`
- `StateflowNode`
- `RuleNode`
- `RoleNode`
- `PolicyNode`
- `MetricNode`
- `EventNode`

## Core statement nodes

- `WhenNode`
- `IfNode`
- `ElseIfNode`
- `ElseNode`
- `AssignNode`
- `TransitionNode`
- `NotifyNode`
- `CreateNode`
- `UpdateNode`
- `RequireNode`
- `StopNode`

## Supporting nodes

- `ComparisonConditionNode`
- `LogicalConditionNode`
- `FieldReferenceNode`
- `IdentifierNode`
- `LiteralNode`
- `TransitionEdgeNode`
- `PermissionNode`
- `PolicyClauseNode`

## Important design choices

- `when` is modeled separately from `if`
- policy `when ... then ...` becomes a trigger-response clause, not a generic `ThenNode`
- `require` remains a first-class semantic node
- allowlisted annotations attach directly to supported nodes
- comments are preserved as AST trivia on supported nodes but remain non-semantic
- the AST stays close to the authoring language for easier debugging

## Example shape

```json
{
  "type": "ProcessNode",
  "name": "LeadQualification",
  "body": [
    {
      "type": "WhenNode",
      "trigger": {
        "type": "FieldReferenceNode",
        "path": "lead.created"
      }
    },
    {
      "type": "IfNode",
      "condition": {
        "type": "ComparisonConditionNode",
        "left": {
          "type": "FieldReferenceNode",
          "path": "lead.source"
        },
        "operator": "=",
        "right": {
          "type": "LiteralNode",
          "valueType": "string",
          "value": "referral"
        }
      },
      "then": [
        {
          "type": "AssignNode",
          "target": {
            "type": "FieldReferenceNode",
            "path": "lead.priority"
          },
          "value": {
            "type": "LiteralNode",
            "valueType": "string",
            "value": "high"
          }
        }
      ],
      "elseIf": [],
      "else": null
    }
  ]
}
```
