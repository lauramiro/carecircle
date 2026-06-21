# Security Policy

## Supported Versions

Use this section to tell people about which versions of your project are currently being supported with security updates.

| Version | Supported          |
| ------- | ------------------ |
| v1.0.0  | :white_check_mark: |
| < v1.0.0 | :x:                |

## Reporting a Vulnerability

Please report any security vulnerabilities by contacting the development team directly. Do not open public issues for security vulnerabilities.

Upon receiving a vulnerability report:
1. The team will acknowledge the receipt of the report.
2. The team will investigate the issue and determine the severity.
3. If confirmed, a fix will be developed and released.
4. The reporter will be notified when the fix is deployed.

## Security Practices
- **CI/CD Security:** All pull requests are subject to automated linting, unit testing, integration testing, and build validation before merging.
- **Dependency Scanning:** We periodically update and scan dependencies for known vulnerabilities.
- **Row Level Security (RLS):** Supabase database tables are protected with Row Level Security to ensure data isolation.
