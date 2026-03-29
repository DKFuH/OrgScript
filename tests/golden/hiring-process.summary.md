# OrgScript Logic Summary

## Contents

- [stateflow: ApplicationLifecycle](#stateflow-applicationlifecycle)
- [role: HiringManager](#role-hiringmanager)
- [role: HumanResources](#role-humanresources)
- [role: Candidate](#role-candidate)
- [policy: GDPRCompliance](#policy-gdprcompliance)
- [rule: ScreeningMandatory](#rule-screeningmandatory)
- [process: StandardHiring](#process-standardhiring)

---

## Stateflow: ApplicationLifecycle

### States
- `received`
- `screening`
- `interview-round-1`
- `interview-round-2`
- `offer_sent`
- `background_check`
- `hired`
- `rejected`

### Transitions
- From `received` to `screening`.
- From `screening` to `interview-round-1`.
- From `screening` to `rejected`.
- From `interview-round-1` to `interview-round-2`.
- From `interview-round-1` to `rejected`.
- From `interview-round-2` to `offer_sent`.
- From `interview-round-2` to `rejected`.
- From `offer_sent` to `background_check`.
- From `offer_sent` to `rejected`.
- From `background_check` to `hired`.
- From `background_check` to `rejected`.

---

## Role: HiringManager

### Permissions
- **Can** perform `shortlist candidate`.
- **Can** perform `interview candidate`.
- **Can** perform `approve offer`.

---

## Role: HumanResources

### Permissions
- **Can** perform `create job posting`.
- **Can** perform `schedule interview`.
- **Can** perform `send offer`.
- **Can** perform `verify background`.

---

## Role: Candidate

### Permissions
- **Can** perform `submit application`.
- **Can** perform `accept offer`.

---

## Policy: GDPRCompliance

### Security / SLA Clauses
- If `candidate.data_processing_consent = false`, then require `data_anonymization` and notify `dpo` with `"Non-consenting candidate record created"`.

---

## Rule: ScreeningMandatory

### Scope
- Applies to `application`.

### Rule Behavior
- If `application.status = "interview-round-1"`, require `screening_notes`.

---

## Process: StandardHiring

### Trigger
- Triggered when `candidate.application_submitted`.

### Flow Summary
- transition `application.status` to `"received"` and notify `hr_team` with `"New candidate application"`.
- If `candidate.role_match_score > 70`, transition `application.status` to `"screening"` and assign `application.assigned_to` to `"hiring_manager"`.
- If `application.screening_outcome = "positive"`, transition `application.status` to `"interview-round-1"` and create `interview_invite`.
