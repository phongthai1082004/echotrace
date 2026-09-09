# CI/CD Checklist (GitHub Actions)

> **📐 Architecture Reference:** View the complete framework architecture at [`framework-architecture.html`](framework-architecture.html). The CI/CD pipeline orchestrates testing, building Docker images, and deploying updates across the entire stack.

## GitHub Actions Setup

### Repository Configuration
- [x] Enable GitHub Actions in repository settings
- [o] Configure branch protection rules
- [o] Require status checks before PR merge
- [o] Require code review before merge
- [x] Create GitHub Secrets for sensitive data (API keys, tokens)
- [-] Configure webhook settings if needed

### GitHub Secrets to Configure
- [-] `DOCKERHUB_USERNAME` - Docker Hub username
- [-] `DOCKERHUB_TOKEN` - Docker Hub access token
- [x] `DEPLOY_KEY` - SSH key for VPS deployment
- [x] `VPS_HOST` - VPS server hostname/IP
- [x] `VPS_USER` - VPS SSH user
- [x] `DATABASE_URL` - Production database connection string
- [-] `SENTRY_DSN` - Sentry error tracking DSN
- [x] Any other production API keys/tokens

---

## Workflow Files Location
```
.github/workflows/
├── test.yml
├── build.yml
├── deploy.yml
└── security-scan.yml
```

---

## Test Workflow (.github/workflows/test.yml)

### Triggers
- [x] Run on: `push` to main/develop branches
- [x] Run on: `pull_request` to main/develop branches

### Frontend Tests
- [x] Setup Node.js runtime
- [x] Cache dependencies (npm cache)
- [x] Install dependencies: `npm ci`
- [-] Run linter: `npm run lint`
- [x] Run type check: `npm run type-check` (TypeScript)
- [o] Run tests: `npm run test -- --run`
- [-] Upload coverage reports (optional)

### Backend Tests
- [x] Setup Node.js runtime
- [x] Cache dependencies (npm cache)
- [-] Setup PostgreSQL service container
- [x] Install dependencies: `npm ci`
- [o] Run migrations: `npm run migrate`
- [-] Run linter: `npm run lint`
- [x] Run type check: `npm run type-check`
- [o] Run unit tests: `npm run test:unit -- --run`
- [-] Run integration tests: `npm run test:integration -- --run`
- [-] Upload coverage reports (optional)

### Coverage Thresholds
- [o] Minimum line coverage: 70%
- [o] Minimum branch coverage: 65%
- [o] Minimum function coverage: 70%
- [-] Generate coverage badges (optional)

---

## Build Workflow (.github/workflows/build.yml)

### Triggers
- [x] Run on: `push` to main branch
- [-] Run on: tag creation (semantic versioning)

### Frontend Build
- [x] Setup Node.js runtime
- [x] Cache dependencies
- [x] Install dependencies: `npm ci`
- [x] Build: `npm run build`
- [x] Generate build artifacts
- [x] Upload build to artifact storage (S3, or GitHub artifacts)

### Backend Build & Docker Image
- [x] Setup Node.js runtime
- [x] Setup Docker buildx (for multi-platform builds)
- [x] Login to Docker Hub or Docker registry
- [x] Build Docker image: `docker build -t image:tag .`
- [x] Tag image with version: `docker tag image:${{ github.sha }}`
- [x] Push to Docker registry: `docker push image:tag`
- [x] Generate SBoM (Software Bill of Materials) - optional
- [x] Scan image for vulnerabilities (Trivy, etc.)

---

## Deploy Workflow (.github/workflows/deploy.yml)

### Triggers
- [x] Run on: `push` to main branch (automatic deployment)
- [o] Allow manual trigger with `workflow_dispatch`

### Deploy to Staging
- [x] Checkout code
- [-] SSH into staging VPS using deploy key
- [x] Pull latest code from git
- [x] Install dependencies: `npm ci --production`
- [-] Run database migrations (if needed)
- [-] Build frontend (if needed)
- [-] Restart services with PM2
- [o] Run health checks
- [-] Post notification to Slack/Discord (optional)

### Deploy to Production
- [-] Run only on manual trigger or tag
- [x] Checkout code
- [x] SSH into production VPS using deploy key
- [o] Create backup of database
- [-] Create backup of current code
- [x] Pull latest code from git
- [x] Install dependencies: `npm ci --production`
- [o] Run database migrations (if needed)
- [-] Build frontend (if needed)
- [o] Run pre-deployment tests (smoke tests)
- [-] Restart services with PM2
- [o] Run post-deployment validation
- [-] Monitor error tracking for anomalies
- [-] Post notification to Slack/Discord

### Rollback Strategy
- [x] Keep previous deployment available
- [o] Document rollback procedure
- [o] Have manual rollback script ready
- [-] Test rollback in staging before using in production

---

## Security Scan Workflow (.github/workflows/security-scan.yml)

### Triggers
- [x] Run on: `push` (daily or weekly)
- [x] Run on: `pull_request`
- [x] Run on: schedule (nightly)

### Dependency Scanning
- [o] Run `npm audit` to check for vulnerabilities
- [o] Parse results and fail if high/critical found
- [o] Optional: Use Dependabot for automated checks
- [-] Optional: Use Snyk for advanced vulnerability scanning

### SAST (Static Application Security Testing)
- [o] Run ESLint with security rules
- [-] Scan for common security patterns (hardcoded credentials, etc.)
- [-] Optional: Use GitHub CodeQL for deeper analysis

### Container Image Scanning
- [o] Scan built Docker images for vulnerabilities
- [o] Use Trivy or similar tools
- [o] Fail if critical vulnerabilities found
- [-] Generate SBOM (Software Bill of Materials)

### Secret Detection
- [o] Scan for exposed secrets (API keys, tokens, etc.)
- [o] Use tools like GitGuardian or TruffleHog
- [o] Fail pipeline if secrets detected

---

## Workflow Configuration Best Practices

### Environment-Specific Secrets
- [-] Use separate secrets for staging and production
- [-] Prefix secrets by environment: `STAGING_*`, `PROD_*`
- [o] Rotate secrets regularly (every 90 days)
- [x] Never log secrets in workflow output

### Notifications
- [-] Configure Slack/Discord notifications on failure
- [-] Send notifications to email on production deployments
- [-] Include deployment details in notification (version, changes, etc.)

### Concurrency
- [o] Limit concurrent deployments (prevent race conditions)
- [o] Configure: `concurrency: deploy-${{ github.ref }}`
- [-] Cancel in-progress workflows when new push occurs

### Timeouts
- [o] Set reasonable timeouts for each job (e.g., 30 min)
- [-] Set timeouts for individual steps (e.g., 10 min)
- [o] Prevent runaway workflows

### Caching
- [x] Cache npm dependencies (`.npm` or `~/.npm`)
- [x] Cache Docker layers
- [x] Invalidate cache on dependency changes

### Artifact Management
- [-] Upload build artifacts (for debugging)
- [-] Set retention period (e.g., 7 days)
- [-] Clean up old artifacts periodically

---

## Advanced Workflows

### Environment-Specific Workflows
- [-] Create separate workflow for staging deployment
- [-] Create separate workflow for production deployment
- [-] Use environment secrets for each environment
- [-] Configure different approval requirements per environment
- [-] Setup environment-specific database migrations
- [-] Configure environment-specific feature flags

### Scheduled Workflows
- [o] Setup nightly security scans: `schedule: '0 2 * * *'`
- [o] Setup daily dependency update checks
- [-] Setup weekly performance benchmarks
- [-] Setup monthly security audits
- [-] Setup cleanup jobs (old artifacts, logs, etc.)
- [-] Configure scheduled reports (coverage, performance, etc.)

### Manual Approval Gates
- [-] Require manual approval before production deployment
- [-] Add approval step with assigned reviewers
- [-] Add deployment notes/comments requirement
- [-] Configure approval timeout (e.g., 24 hours)
- [-] Notify reviewers via Slack/email
- [-] Log all approvals for audit trail

### Performance Testing Workflow
- [-] Install performance testing tool (k6, Apache JMeter, etc.)
- [-] Create performance test scripts
- [-] Run tests against staging environment
- [-] Compare performance against baseline
- [-] Fail build if performance degrades > 10%
- [-] Generate performance report
- [-] Upload performance metrics to monitoring service

### Accessibility Testing Workflow
- [-] Install accessibility testing tool (axe, Lighthouse, etc.)
- [-] Run accessibility scans on frontend
- [-] Fail build if critical issues found
- [-] Generate accessibility report
- [-] Track accessibility score trends

### Database Migration Workflow
- [x] Checkout code with migrations
- [o] Create database backup before migration
- [-] Run migration against staging database
- [o] Verify data integrity after migration
- [-] Generate migration report
- [o] Only allow deployment if migration successful

---

## Webhook Integration

### Slack/Discord Notifications
- [-] Send workflow start notification
- [-] Send on test success/failure
- [-] Send on build success/failure
- [-] Send on deployment success/failure
- [-] Include build/deployment details (commit, author, duration)
- [-] Include error messages and logs (if failed)
- [-] Include performance metrics (optional)
- [-] Use thread replies for deployment steps

### Email Notifications
- [-] Send production deployment notifications
- [-] Include changelog in email
- [-] Include deployment status page link
- [-] Send to stakeholders list
- [-] Send incident notifications (critical failures)

---

## Security Scanning Details

### OWASP Top 10 Checks
- [-] Scan for SQL Injection vulnerabilities
- [-] Scan for Cross-Site Scripting (XSS)
- [-] Scan for Cross-Site Request Forgery (CSRF)
- [-] Scan for authentication bypass
- [-] Scan for sensitive data exposure
- [-] Scan for XML External Entities (XXE)
- [-] Scan for broken access control
- [-] Scan for security misconfiguration

### Dependency Security
- [o] Check npm packages for known vulnerabilities
- [o] Check for outdated packages
- [-] Check for unmaintained packages
- [-] Check for license compliance
- [-] Check for supply chain attacks (typosquatting)
- [-] Verify package integrity (checksums)

### Container Security
- [o] Scan Docker image for vulnerability layers
- [o] Check base image for vulnerabilities
- [-] Verify image signed properly
- [o] Check for hardcoded secrets in image
- [-] Verify image built from Dockerfile
- [-] Check image size for bloat

---

## Workflow Monitoring & Debugging

### Workflow Logs
- [x] Access workflow logs from Actions tab
- [-] Download artifacts for debugging
- [-] Enable debug logging: `secrets.ACTIONS_STEP_DEBUG=true`
- [x] Review step execution logs
- [x] Check for warnings and deprecations

### Troubleshooting
- [-] Diagnose permission issues
- [o] Diagnose secret configuration
- [o] Diagnose environment variable issues
- [-] Test locally with act (GitHub Actions emulator)
- [x] Review GitHub Actions documentation
- [-] Check GitHub status page for outages

---

## Example Workflow for Staging Deployment

```yaml
name: Deploy to Staging

on:
  push:
    branches: [develop]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20.x'
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run test -- --run
      
  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: docker build -t staging:${{ github.sha }} .
      - name: Push to registry
        run: |
          echo ${{ secrets.STAGING_DOCKERHUB_TOKEN }} | docker login -u ${{ secrets.STAGING_DOCKERHUB_USER }} --password-stdin
          docker push staging:${{ github.sha }}

  deploy-staging:
    needs: build
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.STAGING_VPS_HOST }}
          username: ${{ secrets.STAGING_VPS_USER }}
          key: ${{ secrets.STAGING_DEPLOY_KEY }}
          script: |
            cd /var/staging
            git pull origin develop
            npm ci --production
            npm run migrate
            pm2 restart staging
      - name: Run health checks
        run: curl http://staging.your-domain.com/health
      - name: Notify Slack
        uses: slackapi/slack-github-action@v1
        with:
          webhook-url: ${{ secrets.SLACK_WEBHOOK }}
          payload: |
            {
              "text": "✅ Deployed to staging",
              "blocks": [
                {
                  "type": "section",
                  "text": { "type": "mrkdwn", "text": "Staging deployment successful" }
                }
              ]
            }
```

---

## Example GitHub Actions Workflow Structure

```yaml
name: Test & Deploy

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  workflow_dispatch:

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'
      - run: npm ci
      - run: npm run lint
      - run: npm run test -- --run
      
  build:
    needs: test
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Build Docker image
        run: docker build -t myapp:${{ github.sha }} .
      - name: Push to registry
        run: |
          echo ${{ secrets.DOCKERHUB_TOKEN }} | docker login -u ${{ secrets.DOCKERHUB_USERNAME }} --password-stdin
          docker push myapp:${{ github.sha }}
          
  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to production
        uses: appleboy/ssh-action@master
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.DEPLOY_KEY }}
          script: |
            cd /var/app
            git pull origin main
            npm ci --production
            npm run build
            pm2 restart app
```
