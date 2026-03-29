# OrgScript Logic Summary

## Process: LeadQualification

### Trigger
- Triggered when `lead.created`.

### Flow Summary
- If `lead.source = "referral"`, assign `lead.priority` to `"high"`, assign `lead.path` to `"premium"`, and notify `sales` with `"New referral lead"`.
- Else if `lead.source = "ads"`, assign `lead.priority` to `"normal"` and assign `lead.path` to `"standard"`.
- If `lead.budget < 10000`, transition `lead.status` to `"disqualified"`, notify `sales` with `"Budget below threshold"`, and stop execution.
- Then transition `lead.status` to `"qualified"`.
