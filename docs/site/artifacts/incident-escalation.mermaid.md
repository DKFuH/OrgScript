# OrgScript Mermaid Export

## Stateflow: IncidentLifecycle

```mermaid
stateDiagram-v2
  state "open" as s1_state_1
  [*] --> s1_state_1
  state "triaged" as s1_state_2
  state "investigating" as s1_state_3
  state "mitigated" as s1_state_4
  state "resolved" as s1_state_5
  state "closed" as s1_state_6
  s1_state_1 --> s1_state_2
  s1_state_2 --> s1_state_3
  s1_state_2 --> s1_state_4
  s1_state_3 --> s1_state_4
  s1_state_4 --> s1_state_5
  s1_state_5 --> s1_state_6
  s1_state_6 --> [*]
```

## Process: IncidentHandling

```mermaid
flowchart TD
  p2_start_1(["IncidentHandling"])
  class p2_start_1 success
  p2_trigger_2[/ "when system.alert_received" /]
  class p2_trigger_2 trigger
  p2_action_3["create incident"]
  class p2_action_3 action
  p2_action_4["assign incident.severity = 'medium'"]
  class p2_action_4 action
  p2_action_5["transition incident.status to 'open'"]
  class p2_action_5 action
  p2_decision_6{"if alert.source = 'critical_infrastructure'"}
  class p2_decision_6 decision
  p2_action_7["assign incident.severity = 'high'"]
  class p2_action_7 action
  p2_action_8["notify on_call_team with #quot;Critical alert detected#quot;"]
  class p2_action_8 action
  p2_decision_9{"if incident.status = 'triaged'"}
  class p2_decision_9 decision
  p2_action_10["assign incident.primary_responder = 'on_call_engineer'"]
  class p2_action_10 action
  p2_action_11["transition incident.status to 'investigating'"]
  class p2_action_11 action
  p2_action_12["notify incident_manager with #quot;Incident requiring triage#quot;"]
  class p2_action_12 action
  p2_end_13(["done"])
  class p2_end_13 success
  p2_start_1 --> p2_trigger_2
  p2_trigger_2 --> p2_action_3
  p2_action_3 --> p2_action_4
  p2_action_4 --> p2_action_5
  p2_action_5 --> p2_decision_6
  p2_decision_6 -->|yes| p2_action_7
  p2_action_7 --> p2_action_8
  p2_action_8 --> p2_decision_9
  p2_decision_6 -->|no| p2_decision_9
  p2_decision_9 -->|yes| p2_action_10
  p2_action_10 --> p2_action_11
  p2_decision_9 -->|no| p2_action_12
  p2_action_11 --> p2_end_13
  p2_action_12 --> p2_end_13

  %% Styling
  classDef trigger fill:#f0f4ff,stroke:#5c7cfa,stroke-width:2px
  classDef decision fill:#fff9db,stroke:#fab005,stroke-width:2px
  classDef action fill:#fff,stroke:#adb5bd,stroke-width:1px
  classDef stop fill:#fff5f5,stroke:#ff8787,stroke-width:2px
  classDef success fill:#f4fce3,stroke:#94d82d,stroke-width:2px
```

> Note: Mermaid export currently supports only process and stateflow blocks. Skipped: role OnCallEngineer, role IncidentManager, policy EscalationPolicy.
