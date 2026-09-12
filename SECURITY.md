# Security Policy

Security is a top priority at Tidyorg. This document explains how to report vulnerabilities securely.

## Supported Versions

We provide security updates for the current major version and the immediately preceding major version. Older majors receive no fixes.

Released versions are listed on the repository's Releases page. If this repository has no releases yet, the default branch is the only supported version.

## Reporting a Vulnerability

**DO NOT** create a public GitHub issue for security vulnerabilities. This exposes the organization to unnecessary risk.

1. Email your findings directly to `security@example.com`.

2. Include detailed steps to reproduce the vulnerability, environmental factors, and potential impact.

3. Our security team will acknowledge receipt of your email within 48 hours.

4. We will provide a timeline for the fix and notify you once the patch is deployed.

## Leaked Credentials

If a secret (API key, token, password) was ever committed, deleting the file is **not enough** — it stays in the git history. Revoke and rotate the credential first, then clean up.
