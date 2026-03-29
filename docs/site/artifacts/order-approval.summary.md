# OrgScript Logic Summary

## Contents

- [stateflow: OrderStatus](#stateflow-orderstatus)
- [rule: NoProductionWithoutApproval](#rule-noproductionwithoutapproval)

---

## Stateflow: OrderStatus

### States
- `draft`
- `pending_approval`
- `approved`
- `production`
- `completed`
- `cancelled`

### Transitions
- From `draft` to `pending_approval`.
- From `pending_approval` to `approved`.
- From `approved` to `production`.
- From `production` to `completed`.
- From `draft` to `cancelled`.
- From `pending_approval` to `cancelled`.

---

## Rule: NoProductionWithoutApproval

### Scope
- Applies to `order`.

### Rule Behavior
- If `order.approved = false`, require `management_approval` and notify `operations` with `"Order cannot enter production"`.
