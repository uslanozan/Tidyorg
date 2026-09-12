# Security Policy

Security is a top priority at Tidyorg. This document explains how to report vulnerabilities securely.

## Supported Versions

Tidyorg is currently pre-1.0. Security fixes are provided for the latest minor
release line and the default branch.

| Version | Supported |
| :--- | :--- |
| `0.1.x` | Yes |
| `< 0.1` | No |

## Reporting a Vulnerability

**DO NOT** create a public GitHub issue for security vulnerabilities. This exposes the organization to unnecessary risk.

1. Email your findings directly to
   **[uslanozan@gmail.com](mailto:uslanozan@gmail.com)**.

2. Include detailed steps to reproduce the vulnerability, environmental factors, and potential impact.

3. The maintainer aims to acknowledge receipt within five business days.

4. We will provide a timeline for the fix and notify you once the patch is deployed.

## Leaked Credentials

If a secret (API key, token, password) was ever committed, deleting the file is **not enough** — it stays in the git history. Revoke and rotate the credential first, then clean up.
