# OrgScript Mermaid Export

## Process: LeadQualification

```mermaid
flowchart TD
  p1_start_1(["LeadQualification"])
  class p1_start_1 success
  p1_trigger_2[/ "when lead.created" /]
  class p1_trigger_2 trigger
  p1_decision_3{"if lead.source = 'referral'"}
  class p1_decision_3 decision
  p1_action_4["assign lead.priority = 'high'"]
  class p1_action_4 action
  p1_action_5["assign lead.path = 'premium'"]
  class p1_action_5 action
  p1_action_6["notify sales with #quot;New referral lead#quot;"]
  class p1_action_6 action
  p1_decision_7{"if lead.source = 'ads'"}
  class p1_decision_7 decision
  p1_action_8["assign lead.priority = 'normal'"]
  class p1_action_8 action
  p1_action_9["assign lead.path = 'standard'"]
  class p1_action_9 action
  p1_decision_10{"if lead.budget < 10000"}
  class p1_decision_10 decision
  p1_action_11["transition lead.status to 'disqualified'"]
  class p1_action_11 action
  p1_action_12["notify sales with #quot;Budget below threshold#quot;"]
  class p1_action_12 action
  p1_stop_13(["stop"])
  class p1_stop_13 stop
  p1_action_14["transition lead.status to 'qualified'"]
  class p1_action_14 action
  p1_end_15(["done"])
  class p1_end_15 success
  p1_start_1 --> p1_trigger_2
  p1_trigger_2 --> p1_decision_3
  p1_decision_3 -->|yes| p1_action_4
  p1_action_4 --> p1_action_5
  p1_action_5 --> p1_action_6
  p1_decision_3 -->|no| p1_decision_7
  p1_decision_7 -->|yes| p1_action_8
  p1_action_8 --> p1_action_9
  p1_action_6 --> p1_decision_10
  p1_action_9 --> p1_decision_10
  p1_decision_7 -->|no| p1_decision_10
  p1_decision_10 -->|yes| p1_action_11
  p1_action_11 --> p1_action_12
  p1_action_12 --> p1_stop_13
  p1_decision_10 -->|no| p1_action_14
  p1_action_14 --> p1_end_15

  %% Styling
  classDef trigger fill:#f0f4ff,stroke:#5c7cfa,stroke-width:2px
  classDef decision fill:#fff9db,stroke:#fab005,stroke-width:2px
  classDef action fill:#fff,stroke:#adb5bd,stroke-width:1px
  classDef stop fill:#fff5f5,stroke:#ff8787,stroke-width:2px
  classDef success fill:#f4fce3,stroke:#94d82d,stroke-width:2px
```
