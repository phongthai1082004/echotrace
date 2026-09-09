# Deployment Checklist

> **📐 Architecture Reference:** View the complete framework architecture at [`framework-architecture.html`](framework-architecture.html). This diagram shows how all components (Frontend, API, Database, Redis, Jobs, Infrastructure) interact together.

## VPS Server Setup

### Initial Server Configuration
- [x] Update system packages: `apt update && apt upgrade -y`
- [-] Set timezone: `timedatectl set-timezone UTC`
- [-] Configure hostname: `hostnamectl set-hostname your-domain.com`
- [x] Setup SSH key-based authentication (disable password login)
- [x] Configure firewall (UFW): `ufw enable && ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp`
- [x] Create non-root user with sudo privileges
- [o] Disable root login via SSH
- [o] Configure fail2ban for brute force protection
- [o] Setup automatic security updates

### System Monitoring
- [o] Configure log rotation: `/etc/logrotate.d/`
- [o] Setup disk space monitoring
- [o] Setup memory usage monitoring
- [-] Configure alerts for high resource usage
- [-] Setup system audit logging

---

## Node.js / Backend Setup

### Runtime Installation
- [-] Install Node.js (LTS version) via NVM or package manager
- [-] Install PM2 for process management: `npm install -g pm2`
- [-] Create PM2 ecosystem file: `ecosystem.config.js`
- [-] Setup PM2 auto-startup: `pm2 startup`
- [-] Save PM2 config: `pm2 save`

### Environment Configuration
- [x] Create `/var/app/.env` with production secrets
- [o] Set proper file permissions: `chmod 600 /var/app/.env`
- [-] Configure log directory: `/var/log/app/`
- [x] Set log retention policy (e.g., 7 days)
- [-] Configure PM2 logs to separate files

### Database Setup
- [x] Install PostgreSQL or MySQL
- [x] Create database user (non-root)
- [o] Enable database backups
- [o] Configure backup retention (daily, weekly, monthly)
- [o] Test backup restore procedure
- [x] Setup database connection pooling
- [o] Enable SSL for database connections

### Health Checks
- [x] Create health check endpoint: `/health` or `/status`
- [o] Configure monitoring to poll health endpoint
- [-] Setup alerts for unhealthy status

---

## Frontend / Static Files Setup

### Build Output
- [x] Build frontend: `npm run build`
- [x] Verify build output in `dist/` or `build/`
- [x] Test build locally before deploying
- [x] Minify and optimize assets

### Nginx Configuration
- [x] Install Nginx: `apt install nginx`
- [x] Configure site config in `/etc/nginx/sites-available/`
- [x] Enable site: `ln -s /etc/nginx/sites-available/site.conf /etc/nginx/sites-enabled/`
- [x] Configure gzip compression for assets
- [x] Set cache headers for static files (1 year for hashed files)
- [x] Set no-cache headers for HTML files
- [-] Configure HTTP/2 and HTTP/3 (if supported)
- [x] Setup redirect from HTTP to HTTPS
- [x] Configure security headers (CSP, X-Frame-Options, etc.)
- [x] Test Nginx config: `nginx -t`
- [x] Restart Nginx: `systemctl restart nginx`

---

## SSL/TLS Certificate

### HTTPS Setup
- [x] Obtain SSL certificate (Let's Encrypt recommended)
- [x] Setup auto-renewal with certbot: `apt install certbot python3-certbot-nginx`
- [x] Verify auto-renewal cron job
- [-] Configure certificate renewal alerts
- [o] Test SSL configuration: `https://www.ssllabs.com/ssltest/`

---

## Deployment Process

### Pre-Deployment
- [x] Run full test suite
- [o] Verify all env vars are set
- [o] Create database backup
- [-] Notify stakeholders of deployment window
- [o] Prepare rollback plan

### Deployment Steps
- [x] Pull latest code from git repository
- [x] Install dependencies: `npm ci --production`
- [o] Run database migrations (if needed): `npm run migrate`
- [x] Build frontend (if bundled with backend)
- [x] Run health checks
- [-] Clear application cache (if applicable)
- [-] Restart PM2 process: `pm2 restart app`

### Post-Deployment
- [o] Monitor application logs for errors
- [x] Verify health check endpoint responds
- [o] Test critical user flows
- [-] Monitor error tracking service (Sentry, etc.)
- [-] Monitor performance metrics
- [o] Check uptime monitoring service
- [x] Verify SSL certificate is valid
- [-] Test from different geographic locations

### Rollback Plan
- [o] Document previous working commit hash
- [o] Have rollback script ready
- [-] Test rollback procedure in staging
- [o] Keep previous database backup accessible

---

## Ongoing Maintenance

### Daily
- [o] Monitor application logs
- [-] Check error tracking service
- [o] Verify uptime monitoring alerts

### Weekly
- [o] Review security logs
- [o] Check database backup integrity
- [o] Monitor disk usage

### Monthly
- [-] Review and analyze application performance
- [o] Update dependencies and security patches
- [o] Review and rotate secrets/API keys
- [o] Audit database and user access
- [-] Test disaster recovery procedures
- [-] Review and optimize resource usage

### Security Updates
- [o] Monitor security advisories for Node.js
- [o] Monitor security advisories for dependencies
- [o] Apply patches promptly (within 24 hours for critical)
- [-] Test updates in staging before production

---

## Advanced Deployment Strategies

### Zero-Downtime Deployment
- [o] Use graceful shutdown with timeout
- [o] Drain existing connections before shutdown
- [x] Implement health checks before marking ready
- [-] Use load balancer to route traffic away from updating instance
- [-] Stagger deployment across multiple instances
- [-] Test deployment with concurrent users
- [-] Monitor for connection drops during deployment

### Blue-Green Deployment
- [-] Setup two identical production environments (blue & green)
- [-] Deploy to inactive environment (green)
- [-] Run smoke tests on green environment
- [-] Switch load balancer to green environment
- [-] Keep blue environment as rollback target
- [-] Monitor green environment for errors
- [-] After stability period, clean up blue environment
- [-] Document deployment history

### Canary Deployment
- [-] Deploy to small percentage of servers first (5-10%)
- [-] Monitor error rates on canary servers
- [-] Monitor performance metrics on canary servers
- [-] Gradually increase traffic percentage
- [-] Setup automatic rollback if errors exceed threshold
- [-] Document canary deployment window
- [-] Setup canary monitoring dashboard

### Database Migration Strategy
- [o] Plan migration rollback strategy
- [o] Test migrations on copy of production database
- [o] Schedule migrations during low-traffic period
- [o] Create backup before migration
- [o] Run migrations in transaction (if supported)
- [o] Monitor migration progress and duration
- [o] Verify data integrity after migration
- [o] Have rollback procedure ready

---

## Health Checks & Monitoring

### Application Health Checks
- [x] Create `/health` endpoint
- [x] Check database connectivity
- [x] Check Redis connectivity
- [-] Check external service connectivity
- [x] Return 503 if any dependency unavailable
- [x] Set reasonable response timeout (e.g., 5s)
- [o] Monitor health check endpoint
- [-] Setup alerts for health check failures

### Performance Baseline
- [-] Establish baseline response times
- [-] Document baseline error rates
- [-] Record baseline resource usage
- [-] Setup performance monitoring dashboard
- [-] Alert if response time degrades > 20%
- [-] Alert if error rate exceeds threshold
- [-] Alert if resource usage exceeds threshold

### Uptime Monitoring
- [o] Setup external uptime monitoring (Pingdom, StatusCake, etc.)
- [-] Configure monitoring from multiple geographic locations
- [-] Setup SMS/Pagerduty alerts for outages
- [-] Monitor API response times
- [-] Monitor frontend page load times
- [-] Setup status page for users

---

## Disaster Recovery

### Backup Strategy
- [o] Backup database daily (automated)
- [-] Backup weekly to separate region
- [-] Backup monthly for long-term retention
- [o] Verify backup integrity weekly
- [o] Document backup recovery procedure
- [-] Test full recovery monthly
- [o] Store backups in secure, separate location
- [o] Encrypt backups at rest

### Recovery Procedures
- [o] Document step-by-step recovery process
- [-] Document Recovery Time Objective (RTO)
- [-] Document Recovery Point Objective (RPO)
- [-] Test recovery procedure quarterly
- [o] Maintain runbook for common failures
- [-] Setup incident response procedures
- [-] Maintain contact list for incident response team

### Data Retention & Cleanup
- [-] Define data retention policies
- [x] Setup automated cleanup jobs
- [-] Archive old data before deletion
- [-] Verify deletion doesn't break relationships
- [o] Monitor disk usage trends
- [-] Alert if disk usage exceeds threshold

