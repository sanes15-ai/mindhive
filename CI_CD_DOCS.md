# CI/CD Documentation

## Overview

MindHive uses GitHub Actions for continuous integration and deployment. This document explains the workflows, their purpose, and how to configure them.

## Workflows

### 1. CI - Continuous Integration (`ci.yml`)

**Triggers:**
- Push to `main`, `develop`, or `copilot/**` branches
- Pull requests to `main` or `develop`

**Jobs:**

#### Lint & Format Check
- Runs ESLint on TypeScript files
- Checks code formatting with Prettier
- Helps maintain code quality and consistency

#### Build TypeScript
- Compiles TypeScript to JavaScript
- Generates Prisma Client
- Uploads build artifacts for deployment

#### Run Tests
- Sets up PostgreSQL and Redis test databases
- Runs all Jest tests with coverage
- Uploads coverage reports to Codecov
- Ensures code reliability

#### Validate Environment
- Checks environment configuration
- Validates Prisma schema
- Ensures all dependencies are installed

#### Docker Build Test
- Tests Docker image build
- Validates Dockerfile configuration
- Uses build cache for efficiency

**Environment Variables:**
```yaml
DATABASE_URL: postgresql://postgres:postgres@localhost:5432/mindhive_test
REDIS_HOST: localhost
REDIS_PORT: 6379
JWT_SECRET: test-secret-key-for-ci
NODE_ENV: test
```

### 2. CD - Continuous Deployment (`cd.yml`)

**Triggers:**
- Push to `main` branch
- Release tags (`v*`)
- Published releases

**Jobs:**

#### Build & Push Docker Images
- Builds production Docker image
- Pushes to GitHub Container Registry (ghcr.io)
- Optionally pushes to Docker Hub
- Tags images with version numbers

**Required Secrets:**
- `DOCKER_USERNAME` - Docker Hub username (optional)
- `DOCKER_PASSWORD` - Docker Hub password (optional)
- `GITHUB_TOKEN` - Automatically provided

#### Deploy to Staging
- Triggered on `main` branch push
- Deploys to staging environment
- Requires infrastructure setup

#### Deploy to Production
- Triggered on version tags (`v*`)
- Deploys to production environment
- Requires manual approval

**Image Tags:**
- `main` - Latest main branch
- `vX.Y.Z` - Semantic version
- `vX.Y` - Major.minor version
- `vX` - Major version
- `sha-XXXXXXX` - Git commit SHA

### 3. Security Scanning (`security.yml`)

**Triggers:**
- Push to `main` or `develop`
- Pull requests
- Weekly schedule (Sundays at midnight)

**Jobs:**

#### Dependency Vulnerability Scan
- Runs `npm audit` for known vulnerabilities
- Runs Snyk for comprehensive security analysis
- Reports high-severity issues

**Required Secrets:**
- `SNYK_TOKEN` - Snyk API token (optional)

#### CodeQL Security Analysis
- GitHub's semantic code analysis
- Scans for security vulnerabilities
- Supports JavaScript and TypeScript
- Uploads results to Security tab

#### Secret Scanning
- Uses TruffleHog to detect secrets in code
- Scans commit history
- Reports leaked credentials or API keys

#### Docker Image Scan
- Uses Trivy to scan Docker images
- Detects vulnerabilities in dependencies
- Reports critical and high-severity issues
- Uploads results to Security tab

### 4. Code Quality (`code-quality.yml`)

**Triggers:**
- Push to `main` or `develop`
- Pull requests

**Jobs:**

#### SonarCloud Analysis
- Comprehensive code quality analysis
- Tracks technical debt
- Measures test coverage
- Identifies code smells

**Required Secrets:**
- `SONAR_TOKEN` - SonarCloud token (optional)

#### Code Complexity Check
- Uses Plato to analyze code complexity
- Generates complexity reports
- Helps identify refactoring opportunities

#### TypeScript Type Coverage
- Checks TypeScript compilation
- Validates strict type checking
- Ensures type safety

#### License Compliance Check
- Scans all dependencies
- Checks for license compatibility
- Generates license summary

## Setup Instructions

### 1. GitHub Secrets Configuration

Navigate to: `Settings` → `Secrets and variables` → `Actions`

Add the following secrets:

**Optional:**
- `DOCKER_USERNAME` - For Docker Hub publishing
- `DOCKER_PASSWORD` - For Docker Hub publishing
- `SNYK_TOKEN` - For enhanced security scanning
- `SONAR_TOKEN` - For SonarCloud analysis

**Automatic:**
- `GITHUB_TOKEN` - Automatically provided by GitHub

### 2. Enable GitHub Container Registry

1. Go to package settings
2. Link repository to package
3. Set visibility (public/private)

### 3. Configure Branch Protection

Recommended settings for `main` branch:

```yaml
Require:
  - Status checks to pass before merging
    - CI / Lint & Format Check
    - CI / Build TypeScript
    - CI / Run Tests
    - Security / CodeQL
  - Pull request reviews (1 approver)
  - Up-to-date branches
```

### 4. Environment Configuration

For deployment jobs, configure environments:

**Staging:**
1. Settings → Environments → New environment
2. Name: `staging`
3. URL: `https://staging.mindhive.dev`
4. Add deployment protection rules (optional)

**Production:**
1. Settings → Environments → New environment
2. Name: `production`
3. URL: `https://mindhive.dev`
4. Required reviewers: Add team members
5. Wait timer: 5 minutes (optional)

## Monitoring Workflows

### View Workflow Runs
1. Go to `Actions` tab in GitHub
2. Select workflow from left sidebar
3. View run details and logs

### Badges
Add workflow status badges to README:

```markdown
![CI](https://github.com/sanes15-ai/mindhive/workflows/CI/badge.svg)
![Security](https://github.com/sanes15-ai/mindhive/workflows/Security%20Scanning/badge.svg)
```

## Troubleshooting

### Test Failures
1. Check PostgreSQL/Redis connectivity
2. Verify environment variables
3. Review test logs in workflow run
4. Run tests locally: `npm test`

### Build Failures
1. Check TypeScript compilation errors
2. Verify Prisma schema validity
3. Ensure all dependencies installed
4. Run build locally: `npm run build`

### Docker Build Failures
1. Review Dockerfile syntax
2. Check base image availability
3. Verify multi-stage build steps
4. Test locally: `docker build .`

### Deployment Failures
1. Verify secrets are configured
2. Check registry credentials
3. Review deployment logs
4. Ensure infrastructure is ready

## Best Practices

### 1. Commit Messages
Use conventional commits:
```
feat: add new feature
fix: fix bug
docs: update documentation
ci: update CI workflow
test: add tests
refactor: refactor code
```

### 2. Pull Requests
- Keep PRs small and focused
- Ensure all checks pass
- Request reviews from team
- Update documentation

### 3. Versioning
Follow semantic versioning:
```
vMAJOR.MINOR.PATCH

MAJOR: Breaking changes
MINOR: New features (backward compatible)
PATCH: Bug fixes
```

### 4. Security
- Never commit secrets
- Use GitHub Secrets for credentials
- Keep dependencies updated
- Review security scan results

## Cost Optimization

GitHub Actions usage:
- **Free tier:** 2,000 minutes/month for private repos
- **Public repos:** Unlimited minutes

Tips to reduce usage:
1. Use caching for dependencies
2. Run expensive jobs conditionally
3. Combine related jobs
4. Use self-hosted runners for large projects

## Further Reading

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Docker Documentation](https://docs.docker.com)
- [Codecov Documentation](https://docs.codecov.io)
- [Snyk Documentation](https://docs.snyk.io)
- [SonarCloud Documentation](https://docs.sonarcloud.io)

## Support

For issues or questions:
- GitHub Issues: https://github.com/sanes15-ai/mindhive/issues
- GitHub Discussions: https://github.com/sanes15-ai/mindhive/discussions
