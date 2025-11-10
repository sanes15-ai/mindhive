# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take the security of MindHive seriously. If you discover a security vulnerability, please report it to us responsibly.

### How to Report

1. **DO NOT** open a public GitHub issue for security vulnerabilities
2. Contact [@sanes15-ai](https://github.com/sanes15-ai) directly via GitHub
3. Include detailed information:
   - Type of vulnerability
   - Steps to reproduce
   - Potential impact
   - Suggested fix (if any)

### What to Expect

- **Initial Response:** Within 48 hours
- **Status Update:** Within 7 days
- **Fix Timeline:** 
  - Critical vulnerabilities: 24-72 hours
  - High severity: 1-2 weeks
  - Medium/Low severity: 2-4 weeks

### Disclosure Policy

- We will acknowledge your report within 48 hours
- We will provide a detailed response within 7 days
- We will work with you to understand and resolve the issue
- We will credit you in our security acknowledgments (unless you prefer to remain anonymous)
- We will coordinate public disclosure after the fix is deployed

## Security Best Practices

### For Users

1. **Protect API Keys:**
   - Never commit `.env` files to Git
   - Use environment variables for sensitive data
   - Rotate API keys regularly

2. **Database Security:**
   - Use strong PostgreSQL passwords
   - Enable SSL/TLS for database connections
   - Restrict database access by IP

3. **JWT Security:**
   - Keep `JWT_SECRET` secure and random (≥32 characters)
   - Never share authentication tokens
   - Tokens expire after 7 days

4. **Network Security:**
   - Use HTTPS in production
   - Configure firewall rules
   - Enable rate limiting

### For Contributors

1. **Code Review:**
   - All PRs require security review
   - No hardcoded secrets or credentials
   - Follow OWASP Top 10 guidelines

2. **Dependencies:**
   - Run `npm audit` before submitting PRs
   - Update vulnerable dependencies
   - Use `npm audit fix` for automatic fixes

3. **Testing:**
   - Include security tests for new features
   - Test authentication and authorization
   - Validate input/output sanitization

## Security Features

MindHive includes built-in security features:

- ✅ **JWT Authentication** - Secure token-based auth
- ✅ **bcrypt Password Hashing** - Industry-standard hashing
- ✅ **Rate Limiting** - 100 requests per 15 minutes
- ✅ **CORS Protection** - Configurable origin whitelist
- ✅ **Helmet.js** - Security headers
- ✅ **OWASP Scanning** - Automated vulnerability detection
- ✅ **Input Validation** - Request sanitization
- ✅ **SQL Injection Prevention** - Parameterized queries via Prisma

## Known Vulnerabilities

Currently, there are no known security vulnerabilities in MindHive.

Last updated: January 2025

## Security Updates

Security updates are released as soon as fixes are available:

- **Critical:** Immediate patch release
- **High:** Within 7 days
- **Medium/Low:** Next minor version

Subscribe to [GitHub Releases](https://github.com/sanes15-ai/mindhive/releases) for notifications.

## Contact

For security concerns, contact:
- **GitHub:** [@sanes15-ai](https://github.com/sanes15-ai)
- **Repository:** [github.com/sanes15-ai/mindhive](https://github.com/sanes15-ai/mindhive)

---

**Built by Elexiz LLC**  
**Maintained by Abdur Rehman**
