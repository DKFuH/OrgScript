# OrgScript Mermaid Export

## Stateflow: ApplicationLifecycle

```mermaid
stateDiagram-v2
  state "received" as s1_state_1
  [*] --> s1_state_1
  state "screening" as s1_state_2
  state "interview-round-1" as s1_state_3
  state "interview-round-2" as s1_state_4
  state "offer_sent" as s1_state_5
  state "background_check" as s1_state_6
  state "hired" as s1_state_7
  state "rejected" as s1_state_8
  s1_state_1 --> s1_state_2
  s1_state_2 --> s1_state_3
  s1_state_2 --> s1_state_8
  s1_state_3 --> s1_state_4
  s1_state_3 --> s1_state_8
  s1_state_4 --> s1_state_5
  s1_state_4 --> s1_state_8
  s1_state_5 --> s1_state_6
  s1_state_5 --> s1_state_8
  s1_state_6 --> s1_state_7
  s1_state_6 --> s1_state_8
  s1_state_7 --> [*]
  s1_state_8 --> [*]
```

## Process: StandardHiring

```mermaid
flowchart TD
  p2_start_1(["StandardHiring"])
  class p2_start_1 success
  p2_trigger_2[/ "when candidate.application_submitted" /]
  class p2_trigger_2 trigger
  p2_action_3["transition application.status to 'received'"]
  class p2_action_3 action
  p2_action_4["notify hr_team with #quot;New candidate application#quot;"]
  class p2_action_4 action
  p2_decision_5{"if candidate.role_match_score > 70"}
  class p2_decision_5 decision
  p2_action_6["transition application.status to 'screening'"]
  class p2_action_6 action
  p2_action_7["assign application.assigned_to = 'hiring_manager'"]
  class p2_action_7 action
  p2_action_8["transition application.status to 'rejected'"]
  class p2_action_8 action
  p2_action_9["notify candidate with #quot;Thank you for your interest#quot;"]
  class p2_action_9 action
  p2_stop_10(["stop"])
  class p2_stop_10 stop
  p2_decision_11{"if application.screening_outcome = 'positive'"}
  class p2_decision_11 decision
  p2_action_12["transition application.status to 'interview-round-1'"]
  class p2_action_12 action
  p2_action_13["create interview_invite"]
  class p2_action_13 action
  p2_action_14["transition application.status to 'rejected'"]
  class p2_action_14 action
  p2_stop_15(["stop"])
  class p2_stop_15 stop
  p2_end_16(["done"])
  class p2_end_16 success
  p2_start_1 --> p2_trigger_2
  p2_trigger_2 --> p2_action_3
  p2_action_3 --> p2_action_4
  p2_action_4 --> p2_decision_5
  p2_decision_5 -->|yes| p2_action_6
  p2_action_6 --> p2_action_7
  p2_decision_5 -->|no| p2_action_8
  p2_action_8 --> p2_action_9
  p2_action_9 --> p2_stop_10
  p2_action_7 --> p2_decision_11
  p2_decision_11 -->|yes| p2_action_12
  p2_action_12 --> p2_action_13
  p2_decision_11 -->|no| p2_action_14
  p2_action_14 --> p2_stop_15
  p2_action_13 --> p2_end_16

  %% Styling
  classDef trigger fill:#f0f4ff,stroke:#5c7cfa,stroke-width:2px
  classDef decision fill:#fff9db,stroke:#fab005,stroke-width:2px
  classDef action fill:#fff,stroke:#adb5bd,stroke-width:1px
  classDef stop fill:#fff5f5,stroke:#ff8787,stroke-width:2px
  classDef success fill:#f4fce3,stroke:#94d82d,stroke-width:2px
```

> Note: Mermaid export currently supports only process and stateflow blocks. Skipped: role HiringManager, role HumanResources, role Candidate, policy GDPRCompliance, rule ScreeningMandatory.
