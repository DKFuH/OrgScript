# OrgScript Logic Summary

## Contents

- [policy: LateResponseEscalation](#policy-lateresponseescalation)
- [role: Support](#role-support)

---

## Policy: LateResponseEscalation

### Security / SLA Clauses
- If `ticket.unanswered_for > 24h`, then notify `owner` with `"Ticket waiting more than 24 hours"`.
- If `ticket.unanswered_for > 48h`, then assign `ticket.owner` to `"team_lead"` and notify `team_lead` with `"Ticket escalated after 48 hours"`.

---

## Role: Support

### Permissions
- **Can** perform `view ticket`.
- **Can** perform `update ticket.status`.
- **Can** perform `create followup`.
- **Cannot** perform `close refund_case`.
