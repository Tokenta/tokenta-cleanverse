# Security Policy

## Supported Code

Security fixes are evaluated against the current default branch. This repository is a public engineering prototype with testnet and mock paths; it must not be treated as audited production financial infrastructure.

## Reporting a Vulnerability

Do not open a public GitHub issue for a vulnerability, leaked credential, or exploitable configuration.

Use GitHub's private vulnerability reporting for this repository when it is available. Otherwise email `hello@tokenta.space` with the subject `Tokenta security report` and include:

- the affected route, module, or commit;
- reproduction steps or a minimal proof of concept;
- the expected and observed behavior;
- the likely impact;
- any suggested mitigation.

Do not include live third-party credentials, private keys, or user data. Revoke any credential that may already have been exposed before sending the report.

The maintainers will confirm receipt, reproduce the issue, assess affected versions, and coordinate a fix and disclosure. Response and remediation times depend on severity and reproducibility; this project does not publish an unsupported response-time guarantee.

## Security Model

The server is designed to keep provider and settlement credentials outside browser code. Authentication, wallet/JWT validation, request signatures, encrypted credential storage, key zeroization, audit trails, and dry-run settlement controls are individually configurable and tested. Development defaults are not a production hardening profile.

Before exposing a deployment publicly:

- replace every example secret and disable development authentication shortcuts;
- use a managed secret store and rotate credentials regularly;
- enable the appropriate API, wallet, JWT, and signature checks;
- use PostgreSQL and a durable queue where required;
- keep settlement in dry-run until addresses, signer custody, and transaction policy are reviewed;
- run dependency, application, and infrastructure security checks;
- establish monitoring, backups, incident response, and recovery procedures for the actual deployment.
