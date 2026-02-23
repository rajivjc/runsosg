# Security Policy

## Overview

SOSG Running Club Hub handles personal data for athletes with special needs, including names, running metrics, coaching notes, and caregiver relationships. We take the security of this data seriously.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** open a public GitHub issue for security vulnerabilities.
2. Email the maintainers directly with:
   - A description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact assessment
3. You will receive an acknowledgment within 48 hours.
4. We will work with you to understand and address the issue before any public disclosure.

## Security Measures

### Authentication & Authorization
- Magic-link authentication (no passwords stored)
- Role-based access control (admin, coach, caregiver)
- Active user flag enforcement in middleware
- Server-side auth verification on all protected actions

### Data Protection
- Row Level Security (RLS) enabled on all database tables
- Service-role keys restricted to server-side code only
- Environment variables excluded from version control
- Caregiver access scoped to linked athletes only

### Infrastructure
- HTTPS enforced with HSTS headers
- Security headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- Supabase-managed encryption at rest and in transit

### Automated Security Scanning
- **Dependabot** — weekly dependency vulnerability checks with automated PRs
- **CodeQL** — static analysis for JavaScript/TypeScript security patterns on every PR
- **gitleaks** — scans for accidentally committed secrets
- **Trivy** — filesystem and configuration vulnerability scanning
- **npm audit** — dependency audit for production packages in CI

## Data Handling Principles

- Personal data is collected only as needed for club operations
- Caregiver access is read-only and limited to their linked athlete
- Coach notes and cues are accessible only to authenticated coaches and admins
- No data is shared with third parties beyond Strava (opt-in by coaches for activity sync)
