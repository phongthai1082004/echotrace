# CI/CD Checklist (GitHub Actions)

> **📐 Architecture Reference:** View the complete framework architecture at [`framework-architecture.html`](framework-architecture.html). The CI/CD pipeline orchestrates testing, building Docker images, and deploying updates across the entire stack.

## GitHub Actions Setup

### Repository Configuration
- [ ] Enable GitHub Actions in repository settings
- [ ] Configure branch protection rules
- [ ] Require status checks before PR merge
- [ ] Require code review before merge
- [ ] Create GitHub Secrets for sensitive data (API keys, tokens)
- [ ] Configure webhook settings if needed

### GitHub Secrets to Configure
- [ ] `DOCKERHUB_USERNAME` - Docker Hub username
- [ ] `DOCKERHUB_TOKEN` - Docker Hub access token
- [ ] `DEPLOY_KEY` - SSH key for VPS deployment
- [ ] `VPS_HOST` - VPS server hostname/IP
- [ ] `VPS_USER` - VPS SSH user
- [ ] `DATABASE_URL` - Production database connection string
- [ ] `SENTRY_DSN` - Sentry error tracking DSN
- [ ] Any other production API keys/tokens

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
- [ ] Run on: `push` to main/develop branches
- [ ] Run on: `pull_request` to main/develop branches

### Frontend Tests
- [ ] Setup Node.js runtime
- [ ] Cache dependencies (npm cache)
- [ ] Install dependencies: `npm ci`
- [ ] Run linter: `npm run lint`
- [ ] Run type check: `npm run type-check` (TypeScript)
- [ ] Run tests: `npm run test -- --run`
- [ ] Upload coverage reports (optional)

### Backend Tests
- [ ] Setup Node.js runtime
- [ ] Cache dependencies (npm cache)
- [ ] Setup PostgreSQL service container
- [ ] Install dependencies: `npm ci`
- [ ] Run migrations: `npm run migrate`
- [ ] Run linter: `npm run lint`
- [ ] Run type check: `npm run type-check`
- [ ] Run unit tests: `npm run test:unit -- --run`
- [ ] Run integration tests: `npm run test:integration -- --run`
- [ ] Upload coverage reports (optional)

### Coverage Thresholds
- [ ] Minimum line coverage: 70%
- [ ] Minimum branch coverage: 65%
- [ ] Minimum function coverage: 70%
- [ ] Generate coverage badges (optional)

---

## Build Workflow (.github/workflows/build.yml)

### Triggers
- [ ] Run on: `push` to main branch
- [ ] Run on: tag creation (semantic versioning)

### Frontend Build
- [ ] Setup Node.js runtime
- [ ] Cache dependencies
- [ ] Install dependencies: `npm ci`
- [ ] Build: `npm run build`
- [ ] Generate build artifacts
- [ ] Upload build to artifact storage (S3, or GitHub artifacts)

### Backend Build & Docker Image
- [ ] Setup Node.js runtime
- [ ] Setup Docker buildx (for multi-platform builds)
- [ ] Login to Docker Hub or Docker registry
- [ ] Build Docker image: `docker build -t image:tag .`
- [ ] Tag image with version: `docker tag image:${{ github.sha }}`
- [ ] Push to Docker registry: `docker push image:tag`
- [ ] Generate SBoM (Software Bill of Materials) - optional
- [ ] Scan image for vulnerabilities (Trivy, etc.)

---

## Deploy Workflow (.github/workflows/deploy.yml)

### Triggers
- [ ] Run on: `push` to main branch (automatic deployment)
- [ ] Allow manual trigger with `workflow_dispatch`

### Deploy to Staging
- [ ] Checkout code
- [ ] SSH into staging VPS using deploy key
- [ ] Pull latest code from git
- [ ] Install dependencies: `npm ci --production`
- [ ] Run database migrations (if needed)
- [ ] Build frontend (if needed)
- [ ] Restart services with PM2
- [ ] Run health checks
- [ ] Post notification to Slack/Discord (optional)

### Deploy to Production
- [ ] Run only on manual trigger or tag
- [ ] Checkout code
- [ ] SSH into production VPS using deploy key
- [ ] Create backup of database
- [ ] Create backup of current code
- [ ] Pull latest code from git
- [ ] Install dependencies: `npm ci --production`
- [ ] Run database migrations (if needed)
- [ ] Build frontend (if needed)
- [ ] Run pre-deployment tests (smoke tests)
- [ ] Restart services with PM2
- [ ] Run post-deployment validation
- [ ] Monitor error tracking for anomalies
- [ ] Post notification to Slack/Discord

### Rollback Strategy
- [ ] Keep previous deployment available
- [ ] Document rollback procedure
- [ ] Have manual rollback script ready
- [ ] Test rollback in staging before using in production

---

## Security Scan Workflow (.github/workflows/security-scan.yml)

### Triggers
- [ ] Run on: `push` (daily or weekly)
- [ ] Run on: `pull_request`
- [ ] Run on: schedule (nightly)

### Dependency Scanning
- [ ] Run `npm audit` to check for vulnerabilities
- [ ] Parse results and fail if high/critical found
- [ ] Optional: Use Dependabot for automated checks
- [ ] Optional: Use Snyk for advanced vulnerability scanning

### SAST (Static Application Security Testing)
- [ ] Run ESLint with security rules
- [ ] Scan for common security patterns (hardcoded credentials, etc.)
- [ ] Optional: Use GitHub CodeQL for deeper analysis

### Container Image Scanning
- [ ] Scan built Docker images for vulnerabilities
- [ ] Use Trivy or similar tools
- [ ] Fail if critical vulnerabilities found
- [ ] Generate SBOM (Software Bill of Materials)

### Secret Detection
- [ ] Scan for exposed secrets (API keys, tokens, etc.)
- [ ] Use tools like GitGuardian or TruffleHog
- [ ] Fail pipeline if secrets detected

---

## Workflow Configuration Best Practices

### Environment-Specific Secrets
- [ ] Use separate secrets for staging and production
- [ ] Prefix secrets by environment: `STAGING_*`, `PROD_*`
- [ ] Rotate secrets regularly (every 90 days)
- [ ] Never log secrets in workflow output

### Notifications
- [ ] Configure Slack/Discord notifications on failure
- [ ] Send notifications to email on production deployments
- [ ] Include deployment details in notification (version, changes, etc.)

### Concurrency
- [ ] Limit concurrent deployments (prevent race conditions)
- [ ] Configure: `concurrency: deploy-${{ github.ref }}`
- [ ] Cancel in-progress workflows when new push occurs

### Timeouts
- [ ] Set reasonable timeouts for each job (e.g., 30 min)
- [ ] Set timeouts for individual steps (e.g., 10 min)
- [ ] Prevent runaway workflows

### Caching
- [ ] Cache npm dependencies (`.npm` or `~/.npm`)
- [ ] Cache Docker layers
- [ ] Invalidate cache on dependency changes

### Artifact Management
- [ ] Upload build artifacts (for debugging)
- [ ] Set retention period (e.g., 7 days)
- [ ] Clean up old artifacts periodically

---

## Advanced Workflows

### Environment-Specific Workflows
- [ ] Create separate workflow for staging deployment
- [ ] Create separate workflow for production deployment
- [ ] Use environment secrets for each environment
- [ ] Configure different approval requirements per environment
- [ ] Setup environment-specific database migrations
- [ ] Configure environment-specific feature flags

### Scheduled Workflows
- [ ] Setup nightly security scans: `schedule: '0 2 * * *'`
- [ ] Setup daily dependency update checks
- [ ] Setup weekly performance benchmarks
- [ ] Setup monthly security audits
- [ ] Setup cleanup jobs (old artifacts, logs, etc.)
- [ ] Configure scheduled reports (coverage, performance, etc.)

### Manual Approval Gates
- [ ] Require manual approval before production deployment
- [ ] Add approval step with assigned reviewers
- [ ] Add deployment notes/comments requirement
- [ ] Configure approval timeout (e.g., 24 hours)
- [ ] Notify reviewers via Slack/email
- [ ] Log all approvals for audit trail

### Performance Testing Workflow
- [ ] Install performance testing tool (k6, Apache JMeter, etc.)
- [ ] Create performance test scripts
- [ ] Run tests against staging environment
- [ ] Compare performance against baseline
- [ ] Fail build if performance degrades > 10%
- [ ] Generate performance report
- [ ] Upload performance metrics to monitoring service

### Accessibility Testing Workflow
- [ ] Install accessibility testing tool (axe, Lighthouse, etc.)
- [ ] Run accessibility scans on frontend
- [ ] Fail build if critical issues found
- [ ] Generate accessibility report
- [ ] Track accessibility score trends

### Database Migration Workflow
- [ ] Checkout code with migrations
- [ ] Create database backup before migration
- [ ] Run migration against staging database
- [ ] Verify data integrity after migration
- [ ] Generate migration report
- [ ] Only allow deployment if migration successful

---

## Webhook Integration

### Slack/Discord Notifications
- [ ] Send workflow start notification
- [ ] Send on test success/failure
- [ ] Send on build success/failure
- [ ] Send on deployment success/failure
- [ ] Include build/deployment details (commit, author, duration)
- [ ] Include error messages and logs (if failed)
- [ ] Include performance metrics (optional)
- [ ] Use thread replies for deployment steps

### Email Notifications
- [ ] Send production deployment notifications
- [ ] Include changelog in email
- [ ] Include deployment status page link
- [ ] Send to stakeholders list
- [ ] Send incident notifications (critical failures)

---

## Security Scanning Details

### OWASP Top 10 Checks
- [ ] Scan for SQL Injection vulnerabilities
- [ ] Scan for Cross-Site Scripting (XSS)
- [ ] Scan for Cross-Site Request Forgery (CSRF)
- [ ] Scan for authentication bypass
- [ ] Scan for sensitive data exposure
- [ ] Scan for XML External Entities (XXE)
- [ ] Scan for broken access control
- [ ] Scan for security misconfiguration

### Dependency Security
- [ ] Check npm packages for known vulnerabilities
- [ ] Check for outdated packages
- [ ] Check for unmaintained packages
- [ ] Check for license compliance
- [ ] Check for supply chain attacks (typosquatting)
- [ ] Verify package integrity (checksums)

### Container Security
- [ ] Scan Docker image for vulnerability layers
- [ ] Check base image for vulnerabilities
- [ ] Verify image signed properly
- [ ] Check for hardcoded secrets in image
- [ ] Verify image built from Dockerfile
- [ ] Check image size for bloat

---

## Workflow Monitoring & Debugging

### Workflow Logs
- [ ] Access workflow logs from Actions tab
- [ ] Download artifacts for debugging
- [ ] Enable debug logging: `secrets.ACTIONS_STEP_DEBUG=true`
- [ ] Review step execution logs
- [ ] Check for warnings and deprecations

### Troubleshooting
- [ ] Diagnose permission issues
- [ ] Diagnose secret configuration
- [ ] Diagnose environment variable issues
- [ ] Test locally with act (GitHub Actions emulator)
- [ ] Review GitHub Actions documentation
- [ ] Check GitHub status page for outages

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
