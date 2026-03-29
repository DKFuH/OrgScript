# Canonical Model Draft

OrgScript text should compile into a language-neutral canonical model.

The current reference implementation already exports a draft canonical JSON model through:

```text
orgscript export json <file>
```

## Goals of the canonical model

- Preserve meaning independent of formatting
- Support validation and linting
- Make exports predictable
- Give AI systems a stable intermediate representation

## Suggested high-level shape

```json
{
  "version": "0.1",
  "documents": [
    {
      "kind": "process",
      "name": "LeadQualification",
      "statements": [
        {
          "type": "when",
          "event": "lead.created"
        },
        {
          "type": "if",
          "branches": [
            {
              "condition": {
                "left": "lead.source",
                "operator": "=",
                "right": "referral"
              },
              "statements": [
                {
                  "type": "assign",
                  "target": "lead.priority",
                  "value": "high"
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## Canonical node families

- document nodes
- structural nodes
- conditional nodes
- action nodes
- expression nodes

## Suggested document kinds

- `process`
- `stateflow`
- `rule`
- `role`
- `policy`
- `metric`
- `event`

## Suggested action types

- `assign`
- `transition`
- `notify`
- `create`
- `update`
- `require`
- `stop`

## Suggested validation rules

- Unknown keywords are invalid
- Undefined state transitions should fail validation
- Empty blocks should be rejected where structure requires content
- `else` without preceding `if` is invalid
- Duplicate state names in one stateflow are invalid
- Duplicate top-level names within the same namespace should warn or fail based on policy
