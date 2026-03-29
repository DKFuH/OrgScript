# OrgScript Mermaid Export

## Process: CraftBusinessLeadToOrder

```mermaid
flowchart TD
  p1_start_1(["CraftBusinessLeadToOrder"])
  class p1_start_1 success
  p1_trigger_2[/ "when lead.created" /]
  class p1_trigger_2 trigger
  p1_decision_3{"if lead.source = 'referral'"}
  class p1_decision_3 decision
  p1_action_4["assign lead.priority = 'high'"]
  class p1_action_4 action
  p1_action_5["assign lead.sales_path = 'premium'"]
  class p1_action_5 action
  p1_action_6["notify sales with #quot;Handle referral lead first#quot;"]
  class p1_action_6 action
  p1_decision_7{"if lead.source = 'aroundhome'"}
  class p1_decision_7 decision
  p1_action_8["assign lead.priority = 'low'"]
  class p1_action_8 action
  p1_action_9["assign lead.sales_path = 'standard'"]
  class p1_action_9 action
  p1_decision_10{"if lead.project_type != 'kitchen' and lead.project_type != 'interior'"}
  class p1_decision_10 decision
  p1_action_11["transition lead.status to 'disqualified'"]
  class p1_action_11 action
  p1_action_12["notify sales with #quot;Outside target project type#quot;"]
  class p1_action_12 action
  p1_stop_13(["stop"])
  class p1_stop_13 stop
  p1_decision_14{"if lead.estimated_value < 10000"}
  class p1_decision_14 decision
  p1_action_15["transition lead.status to 'disqualified'"]
  class p1_action_15 action
  p1_action_16["notify sales with #quot;Below minimum project value#quot;"]
  class p1_action_16 action
  p1_stop_17(["stop"])
  class p1_stop_17 stop
  p1_action_18["transition lead.status to 'qualified'"]
  class p1_action_18 action
  p1_action_19["assign lead.owner = 'sales'"]
  class p1_action_19 action
  p1_end_20(["done"])
  class p1_end_20 success
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
  p1_decision_10 -->|no| p1_decision_14
  p1_decision_14 -->|yes| p1_action_15
  p1_action_15 --> p1_action_16
  p1_action_16 --> p1_stop_17
  p1_decision_14 -->|no| p1_action_18
  p1_action_18 --> p1_action_19
  p1_action_19 --> p1_end_20

  %% Styling
  classDef trigger fill:#f0f4ff,stroke:#5c7cfa,stroke-width:2px
  classDef decision fill:#fff9db,stroke:#fab005,stroke-width:2px
  classDef action fill:#fff,stroke:#adb5bd,stroke-width:1px
  classDef stop fill:#fff5f5,stroke:#ff8787,stroke-width:2px
  classDef success fill:#f4fce3,stroke:#94d82d,stroke-width:2px
```

## Process: QuoteToOrder

```mermaid
flowchart TD
  p2_start_1(["QuoteToOrder"])
  class p2_start_1 success
  p2_trigger_2[/ "when quote.accepted" /]
  class p2_trigger_2 trigger
  p2_decision_3{"if order.deposit_received = false"}
  class p2_decision_3 decision
  p2_action_4["transition order.status to 'awaiting_deposit'"]
  class p2_action_4 action
  p2_action_5["notify finance with #quot;Deposit required before confirmation#quot;"]
  class p2_action_5 action
  p2_stop_6(["stop"])
  class p2_stop_6 stop
  p2_action_7["transition order.status to 'confirmed'"]
  class p2_action_7 action
  p2_action_8["create production_order"]
  class p2_action_8 action
  p2_action_9["notify operations with #quot;Order ready for production planning#quot;"]
  class p2_action_9 action
  p2_end_10(["done"])
  class p2_end_10 success
  p2_start_1 --> p2_trigger_2
  p2_trigger_2 --> p2_decision_3
  p2_decision_3 -->|yes| p2_action_4
  p2_action_4 --> p2_action_5
  p2_action_5 --> p2_stop_6
  p2_decision_3 -->|no| p2_action_7
  p2_action_7 --> p2_action_8
  p2_action_8 --> p2_action_9
  p2_action_9 --> p2_end_10

  %% Styling
  classDef trigger fill:#f0f4ff,stroke:#5c7cfa,stroke-width:2px
  classDef decision fill:#fff9db,stroke:#fab005,stroke-width:2px
  classDef action fill:#fff,stroke:#adb5bd,stroke-width:1px
  classDef stop fill:#fff5f5,stroke:#ff8787,stroke-width:2px
  classDef success fill:#f4fce3,stroke:#94d82d,stroke-width:2px
```

## Stateflow: OrderLifecycle

```mermaid
stateDiagram-v2
  state "qualified" as s3_state_1
  [*] --> s3_state_1
  state "quoted" as s3_state_2
  state "awaiting_deposit" as s3_state_3
  state "confirmed" as s3_state_4
  state "in_production" as s3_state_5
  state "scheduled_for_installation" as s3_state_6
  state "completed" as s3_state_7
  state "cancelled" as s3_state_8
  s3_state_1 --> s3_state_2
  s3_state_2 --> s3_state_3
  s3_state_2 --> s3_state_4
  s3_state_3 --> s3_state_4
  s3_state_4 --> s3_state_5
  s3_state_5 --> s3_state_6
  s3_state_6 --> s3_state_7
  s3_state_1 --> s3_state_8
  s3_state_2 --> s3_state_8
  s3_state_3 --> s3_state_8
  s3_state_7 --> [*]
  s3_state_8 --> [*]
```

> Note: Mermaid export currently supports only process and stateflow blocks. Skipped: rule NoProductionWithoutDeposit.
