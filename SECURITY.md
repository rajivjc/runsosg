# Security Policy

## Overview

Running Club Hub handles personal data for athletes with special needs, including names, running metrics, coaching notes, and caregiver relationships. Some athletes may be minors or adults with intellectual and developmental disabilities, making robust data protection essential. We take the security of this data seriously.

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| latest  | :white_check_mark: |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do NOT** open a public GitHub issue for security vulnerabilities.
2. Email the address configured in the `CONTACT_EMAIL` environment variable for your deployment with:
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
- Athlete PIN authentication: 4-digit bcrypt-hashed PINs with rate limiting (5 attempts per 15-minute window)
- Athlete session cookies: HttpOnly, Secure, SameSite=Strict, 24-hour expiry
- OTP resend protection with exponential backoff

### Data Protection
- Row Level Security (RLS) enabled on all database tables
- Service-role keys restricted to server-side code only
- Environment variables excluded from version control
- Caregiver access scoped to linked athletes only
- Audit log for all admin and sensitive coach actions (user invites, role changes, athlete creation/deletion, session deletion, PIN changes)
- Caregiver sharing veto: caregivers can disable public sharing for their linked athlete, overriding coach settings
- Athlete pages never expose medical information, coach notes, cues, or feel ratings

### Infrastructure
- HTTPS enforced with HSTS headers
- Security headers: X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy
- Supabase-managed encryption at rest and in transit
- Content-Security-Policy (CSP) header with restricted script-src, connect-src, img-src, and frame-ancestors directives
- API rate limiting on photo uploads, push subscriptions, and public endpoints (in-memory sliding window; Upstash Redis recommended for production scale)
- Push notification quiet hours (10pm–7am in the club's configured timezone)

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
- Club configuration (name, timezone, locale) is read from the database at runtime — no sensitive club data is hardcoded in source code
