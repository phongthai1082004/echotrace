# Deployment Checklist

> **📐 Architecture Reference:** View the complete framework architecture at [`framework-architecture.html`](framework-architecture.html). This diagram shows how all components (Frontend, API, Database, Redis, Jobs, Infrastructure) interact together.

## VPS Server Setup

### Initial Server Configuration
- [ ] Update system packages: `apt update && apt upgrade -y`
- [ ] Set timezone: `timedatectl set-timezone UTC`
- [ ] Configure hostname: `hostnamectl set-hostname your-domain.com`
- [ ] Setup SSH key-based authentication (disable password login)
- [ ] Configure firewall (UFW): `ufw enable && ufw allow 22/tcp && ufw allow 80/tcp && ufw allow 443/tcp`
- [ ] Create non-root user with sudo privileges
- [ ] Disable root login via SSH
- [ ] Configure fail2ban for brute force protection
- [ ] Setup automatic security updates

### System Monitoring
- [ ] Configure log rotation: `/etc/logrotate.d/`
- [ ] Setup disk space monitoring
- [ ] Setup memory usage monitoring
- [ ] Configure alerts for high resource usage
- [ ] Setup system audit logging

---

## Node.js / Backend Setup

### Runtime Installation
- [ ] Install Node.js (LTS version) via NVM or package manager
- [ ] Install PM2 for process management: `npm install -g pm2`
- [ ] Create PM2 ecosystem file: `ecosystem.config.js`
- [ ] Setup PM2 auto-startup: `pm2 startup`
- [ ] Save PM2 config: `pm2 save`

### Environment Configuration
- [ ] Create `/var/app/.env` with production secrets
- [ ] Set proper file permissions: `chmod 600 /var/app/.env`
- [ ] Configure log directory: `/var/log/app/`
- [ ] Set log retention policy (e.g., 7 days)
- [ ] Configure PM2 logs to separate files

### Database Setup
- [ ] Install PostgreSQL or MySQL
- [ ] Create database user (non-root)
- [ ] Enable database backups
- [ ] Configure backup retention (daily, weekly, monthly)
- [ ] Test backup restore procedure
- [ ] Setup database connection pooling
- [ ] Enable SSL for database connections

### Health Checks
- [ ] Create health check endpoint: `/health` or `/status`
- [ ] Configure monitoring to poll health endpoint
- [ ] Setup alerts for unhealthy status

---

## Frontend / Static Files Setup

### Build Output
- [ ] Build frontend: `npm run build`
- [ ] Verify build output in `dist/` or `build/`
- [ ] Test build locally before deploying
- [ ] Minify and optimize assets

### Nginx Configuration
- [ ] Install Nginx: `apt install nginx`
- [ ] Configure site config in `/etc/nginx/sites-available/`
- [ ] Enable site: `ln -s /etc/nginx/sites-available/site.conf /etc/nginx/sites-enabled/`
- [ ] Configure gzip compression for assets
- [ ] Set cache headers for static files (1 year for hashed files)
- [ ] Set no-cache headers for HTML files
- [ ] Configure HTTP/2 and HTTP/3 (if supported)
- [ ] Setup redirect from HTTP to HTTPS
- [ ] Configure security headers (CSP, X-Frame-Options, etc.)
- [ ] Test Nginx config: `nginx -t`
- [ ] Restart Nginx: `systemctl restart nginx`

---

## SSL/TLS Certificate

### HTTPS Setup
- [ ] Obtain SSL certificate (Let's Encrypt recommended)
- [ ] Setup auto-renewal with certbot: `apt install certbot python3-certbot-nginx`
- [ ] Verify auto-renewal cron job
- [ ] Configure certificate renewal alerts
- [ ] Test SSL configuration: `https://www.ssllabs.com/ssltest/`

---

## Deployment Process

### Pre-Deployment
- [ ] Run full test suite
- [ ] Verify all env vars are set
- [ ] Create database backup
- [ ] Notify stakeholders of deployment window
- [ ] Prepare rollback plan

### Deployment Steps
- [ ] Pull latest code from git repository
- [ ] Install dependencies: `npm ci --production`
- [ ] Run database migrations (if needed): `npm run migrate`
- [ ] Build frontend (if bundled with backend)
- [ ] Run health checks
- [ ] Clear application cache (if applicable)
- [ ] Restart PM2 process: `pm2 restart app`

### Post-Deployment
- [ ] Monitor application logs for errors
- [ ] Verify health check endpoint responds
- [ ] Test critical user flows
- [ ] Monitor error tracking service (Sentry, etc.)
- [ ] Monitor performance metrics
- [ ] Check uptime monitoring service
- [ ] Verify SSL certificate is valid
- [ ] Test from different geographic locations

### Rollback Plan
- [ ] Document previous working commit hash
- [ ] Have rollback script ready
- [ ] Test rollback procedure in staging
- [ ] Keep previous database backup accessible

---

## Ongoing Maintenance

### Daily
- [ ] Monitor application logs
- [ ] Check error tracking service
- [ ] Verify uptime monitoring alerts

### Weekly
- [ ] Review security logs
- [ ] Check database backup integrity
- [ ] Monitor disk usage

### Monthly
- [ ] Review and analyze application performance
- [ ] Update dependencies and security patches
- [ ] Review and rotate secrets/API keys
- [ ] Audit database and user access
- [ ] Test disaster recovery procedures
- [ ] Review and optimize resource usage

### Security Updates
- [ ] Monitor security advisories for Node.js
- [ ] Monitor security advisories for dependencies
- [ ] Apply patches promptly (within 24 hours for critical)
- [ ] Test updates in staging before production

---

## Advanced Deployment Strategies

### Zero-Downtime Deployment
- [ ] Use graceful shutdown with timeout
- [ ] Drain existing connections before shutdown
- [ ] Implement health checks before marking ready
- [ ] Use load balancer to route traffic away from updating instance
- [ ] Stagger deployment across multiple instances
- [ ] Test deployment with concurrent users
- [ ] Monitor for connection drops during deployment

### Blue-Green Deployment
- [ ] Setup two identical production environments (blue & green)
- [ ] Deploy to inactive environment (green)
- [ ] Run smoke tests on green environment
- [ ] Switch load balancer to green environment
- [ ] Keep blue environment as rollback target
- [ ] Monitor green environment for errors
- [ ] After stability period, clean up blue environment
- [ ] Document deployment history

### Canary Deployment
- [ ] Deploy to small percentage of servers first (5-10%)
- [ ] Monitor error rates on canary servers
- [ ] Monitor performance metrics on canary servers
- [ ] Gradually increase traffic percentage
- [ ] Setup automatic rollback if errors exceed threshold
- [ ] Document canary deployment window
- [ ] Setup canary monitoring dashboard

### Database Migration Strategy
- [ ] Plan migration rollback strategy
- [ ] Test migrations on copy of production database
- [ ] Schedule migrations during low-traffic period
- [ ] Create backup before migration
- [ ] Run migrations in transaction (if supported)
- [ ] Monitor migration progress and duration
- [ ] Verify data integrity after migration
- [ ] Have rollback procedure ready

---

## Health Checks & Monitoring

### Application Health Checks
- [ ] Create `/health` endpoint
- [ ] Check database connectivity
- [ ] Check Redis connectivity
- [ ] Check external service connectivity
- [ ] Return 503 if any dependency unavailable
- [ ] Set reasonable response timeout (e.g., 5s)
- [ ] Monitor health check endpoint
- [ ] Setup alerts for health check failures

### Performance Baseline
- [ ] Establish baseline response times
- [ ] Document baseline error rates
- [ ] Record baseline resource usage
- [ ] Setup performance monitoring dashboard
- [ ] Alert if response time degrades > 20%
- [ ] Alert if error rate exceeds threshold
- [ ] Alert if resource usage exceeds threshold

### Uptime Monitoring
- [ ] Setup external uptime monitoring (Pingdom, StatusCake, etc.)
- [ ] Configure monitoring from multiple geographic locations
- [ ] Setup SMS/Pagerduty alerts for outages
- [ ] Monitor API response times
- [ ] Monitor frontend page load times
- [ ] Setup status page for users

---

## Disaster Recovery

### Backup Strategy
- [ ] Backup database daily (automated)
- [ ] Backup weekly to separate region
- [ ] Backup monthly for long-term retention
- [ ] Verify backup integrity weekly
- [ ] Document backup recovery procedure
- [ ] Test full recovery monthly
- [ ] Store backups in secure, separate location
- [ ] Encrypt backups at rest

### Recovery Procedures
- [ ] Document step-by-step recovery process
- [ ] Document Recovery Time Objective (RTO)
- [ ] Document Recovery Point Objective (RPO)
- [ ] Test recovery procedure quarterly
- [ ] Maintain runbook for common failures
- [ ] Setup incident response procedures
- [ ] Maintain contact list for incident response team

### Data Retention & Cleanup
- [ ] Define data retention policies
- [ ] Setup automated cleanup jobs
- [ ] Archive old data before deletion
- [ ] Verify deletion doesn't break relationships
- [ ] Monitor disk usage trends
- [ ] Alert if disk usage exceeds threshold

