# OrgScript Logic Summary

## Contents

- [process: CraftBusinessLeadToOrder](#process-craftbusinessleadtoorder)
- [process: QuoteToOrder](#process-quotetoorder)
- [stateflow: OrderLifecycle](#stateflow-orderlifecycle)
- [rule: NoProductionWithoutDeposit](#rule-noproductionwithoutdeposit)

---

## Process: CraftBusinessLeadToOrder

### Trigger
- Triggered when `lead.created`.

### Flow Summary
- If `lead.source = "referral"`, assign `lead.priority` to `"high"`, assign `lead.sales_path` to `"premium"`, and notify `sales` with `"Handle referral lead first"`.
- Else if `lead.source = "aroundhome"`, assign `lead.priority` to `"low"` and assign `lead.sales_path` to `"standard"`.
- If `lead.project_type != "kitchen" and lead.project_type != "interior"`, transition `lead.status` to `"disqualified"`, notify `sales` with `"Outside target project type"`, and stop execution.
- If `lead.estimated_value < 10000`, transition `lead.status` to `"disqualified"`, notify `sales` with `"Below minimum project value"`, and stop execution.
- Then transition `lead.status` to `"qualified"` and assign `lead.owner` to `"sales"`.

---

## Process: QuoteToOrder

### Trigger
- Triggered when `quote.accepted`.

### Flow Summary
- If `order.deposit_received = false`, transition `order.status` to `"awaiting_deposit"`, notify `finance` with `"Deposit required before confirmation"`, and stop execution.
- Then transition `order.status` to `"confirmed"`, create `production_order`, and notify `operations` with `"Order ready for production planning"`.

---

## Stateflow: OrderLifecycle

### States
- `qualified`
- `quoted`
- `awaiting_deposit`
- `confirmed`
- `in_production`
- `scheduled_for_installation`
- `completed`
- `cancelled`

### Transitions
- From `qualified` to `quoted`.
- From `quoted` to `awaiting_deposit`.
- From `quoted` to `confirmed`.
- From `awaiting_deposit` to `confirmed`.
- From `confirmed` to `in_production`.
- From `in_production` to `scheduled_for_installation`.
- From `scheduled_for_installation` to `completed`.
- From `qualified` to `cancelled`.
- From `quoted` to `cancelled`.
- From `awaiting_deposit` to `cancelled`.

---

## Rule: NoProductionWithoutDeposit

### Scope
- Applies to `order`.

### Rule Behavior
- If `order.deposit_received = false`, require `finance_clearance` and notify `operations` with `"Production blocked until deposit is received"`.
