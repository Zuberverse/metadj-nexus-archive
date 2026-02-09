# Security Policy

**Last Modified**: 2026-02-07 22:27 EST

## Supported Versions

MetaDJ Nexus is currently in active development. Security updates are provided for the following versions:

| Version | Supported          |
| ------- | ------------------ |
| 0.9.x   | Yes (active development) |
| < 0.9   | No                 |

We recommend always running the latest version to benefit from security improvements and bug fixes.

## Reporting a Vulnerability

We take security seriously at MetaDJ Nexus. If you discover a security vulnerability, we appreciate your help in disclosing it responsibly.

### How to Report

**Email**: [security@zuberant.com](mailto:security@zuberant.com)

**Please do not report security vulnerabilities through public GitHub issues.**

### What to Include

To help us understand and address the issue quickly, please include:

- **Type of vulnerability** (e.g., XSS, CSRF, injection, authentication bypass)
- **Affected component** (file paths, API endpoints, or features)
- **Steps to reproduce** the vulnerability
- **Proof of concept** (code, screenshots, or video if applicable)
- **Potential impact** and how an attacker might exploit the issue
- **Your recommended fix** (optional but appreciated)

### Response Timeline

- **Initial acknowledgment**: 48-72 hours
- **Status update**: Within 7 days of initial report
- **Resolution target**: Varies by severity (critical issues prioritized)

We will keep you informed throughout the process and coordinate disclosure timing with you.

## Security Measures

MetaDJ Nexus implements the following security controls:

### Content Security Policy
- Nonce-based CSP with `strict-dynamic` for script execution
- Frame ancestors restricted to prevent clickjacking
- Inline event handlers blocked via `script-src-attr 'none'`

### Rate Limiting
- API rate limiting via Upstash Redis (distributed)
- AI endpoint protection with session-based throttling
- Configurable fail-closed behavior for production

### Input Validation
- Zod schema validation on all user inputs
- Parameterized database queries via Drizzle ORM
- Path traversal protection on media endpoints

### Transport Security
- HTTPS enforced in production via HSTS
- Secure, HTTP-only session cookies
- TLS required for database connections

### Additional Controls
- CSRF protection via origin/referer validation
- Generic error messages (internal details logged server-side only)
- Body size limits to prevent DoS via large payloads

## Out of Scope

The following are not considered vulnerabilities for this project:

- **Public media access**: Audio and video files are intentionally publicly accessible. This is by design for a music streaming platform.
- **Rate limiting bypasses on public content**: Wisdom and media endpoints are public resources.
- **Missing features**: Absence of MFA or token-based CSRF (origin/referer validation is used instead). Email verification infrastructure exists (non-blocking). These are documented MVP scope limitations.
- **Self-XSS**: Vulnerabilities requiring social engineering to execute code in your own browser.
- **Denial of service via resource exhaustion**: Unless it bypasses existing rate limits.
- **Issues in dependencies**: Report these to the upstream maintainer. We monitor `npm audit` and update regularly.
- **Vulnerabilities in outdated versions**: Please test against the latest release.

## Recognition

We believe in acknowledging those who help improve our security. Researchers who responsibly disclose valid vulnerabilities will be:

- Credited in our release notes (with permission)
- Added to our security acknowledgments (if a CONTRIBUTORS.md or similar is maintained)

While we do not currently offer a bug bounty program, we genuinely appreciate the time and effort security researchers invest in making MetaDJ Nexus more secure.

## Additional Resources

- **Technical security documentation**: See `docs/SECURITY.md` for implementation details
- **General inquiries**: [contact@metadj.ai](mailto:contact@metadj.ai)

---

Thank you for helping keep MetaDJ Nexus and its users safe.
