# Security Policy

## Supported versions

OrgScript is still evolving quickly. In practice, the latest released version is the supported version for security fixes.

## Reporting a vulnerability

Please do not open a public GitHub issue for a suspected security vulnerability.

Instead, report it privately to the maintainer through the repository owner's GitHub contact route or the published repository contact information.

When possible, include:

- a short description of the issue
- affected version or commit
- steps to reproduce
- expected impact
- any suggested mitigation if known

We will review the report, reproduce it where possible, and determine the appropriate fix and disclosure path.

## Disclosure approach

OrgScript aims for responsible disclosure:

- acknowledge valid reports
- work on a fix before broad public disclosure when practical
- publish relevant release notes once a fix is available

## Security posture note

The OrgScript repository has undergone an automated enterprise security scan with the following outcome:

- no sensitive data such as passwords, tokens, or private keys were found in source control
- no hardcoded credentials or obvious insecure patterns were detected in production code
- external URLs and localhost references appear only in docs, metadata, or demo/export artifacts
- `require`/`import`/`export` usage is limited to module structure and build/test scripts
- no indications of unsafe cryptography or dangerous defaults

This is a point-in-time summary. For enterprise production use, we still recommend:

- reviewing the build and deployment pipeline
- monitoring dependencies for security advisories
- periodic penetration testing aligned with your risk profile
