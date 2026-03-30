# OrgScript Logic Summary

## Contents

- [stateflow: IncidentLifecycle](#stateflow-incidentlifecycle)
- [role: OnCallEngineer](#role-oncallengineer)
- [role: IncidentManager](#role-incidentmanager)
- [policy: EscalationPolicy](#policy-escalationpolicy)
- [process: IncidentHandling](#process-incidenthandling)

---

## Stateflow: IncidentLifecycle

### States
- `open`
- `triaged`
- `investigating`
- `mitigated`
- `resolved`
- `closed`

### Transitions
- From `open` to `triaged`.
- From `triaged` to `investigating`.
- From `triaged` to `mitigated`.
- From `investigating` to `mitigated`.
- From `mitigated` to `resolved`.
- From `resolved` to `closed`.

---

## Role: OnCallEngineer

### Permissions
- **Can** perform `triage incident`.
- **Can** perform `assign responder`.
- **Can** perform `update status`.
- **Can** perform `resolve incident`.

---

## Role: IncidentManager

### Permissions
- **Can** perform `escalate incident`.
- **Can** perform `declare major incident`.
- **Can** perform `notify stakeholders`.

---

## Policy: EscalationPolicy

### Security / SLA Clauses
- If `incident.severity = "high" and incident.status = "open"`, then require `triage_sla` and notify `on_call_manager` with `"SLA Warning: High severity incident untriaged"`.
- If `incident.status = "investigating"`, then require `regular_status_updates`.

---

## Process: IncidentHandling

### Trigger
- Triggered when `system.alert_received`.

### Flow Summary
- create `incident`, assign `incident.severity` to `"medium"`, and transition `incident.status` to `"open"`.
- If `alert.source = "critical_infrastructure"`, assign `incident.severity` to `"high"` and notify `on_call_team` with `"Critical alert detected"`.
- If `incident.status = "triaged"`, assign `incident.primary_responder` to `"on_call_engineer"` and transition `incident.status` to `"investigating"`.
- Otherwise, notify `incident_manager` with `"Incident requiring triage"`.
