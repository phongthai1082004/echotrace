yt# Nginx Checklist

> **📐 Architecture Reference:** View the complete framework architecture at [`framework-architecture.html`](framework-architecture.html). Nginx acts as the reverse proxy, load balancer, and SSL terminator between clients and backend services.

## Installation & Setup

### Basic Installation
- [ ] Install Nginx: `apt install nginx`
- [ ] Enable Nginx service: `systemctl enable nginx`
- [ ] Start Nginx: `systemctl start nginx`
- [ ] Verify installation: `nginx -v`
- [ ] Test configuration: `nginx -t`

### Directory Structure
```
/etc/nginx/
├── nginx.conf                 # Main configuration file
├── sites-available/           # Available site configs
│   └── default
│   └── your-domain.conf
├── sites-enabled/             # Enabled site configs (symlinks)
│   └── your-domain.conf -> ../sites-available/your-domain.conf
├── conf.d/                    # Additional configurations
│   ├── gzip.conf
│   ├── security.conf
│   └── cache.conf
└── ssl/                       # SSL certificates
    ├── your-domain.crt
    └── your-domain.key
```

---

## Core Nginx Configuration

### Main Configuration (nginx.conf)
- [ ] Set worker processes: `worker_processes auto;`
- [ ] Set worker connections: `worker_connections 1024;`
- [ ] Enable keepalive: `keepalive_timeout 65;`
- [ ] Set client max body size: `client_max_body_size 50M;`
- [ ] Include site-specific configs: `include /etc/nginx/sites-enabled/*;`

### Site Configuration (sites-available/your-domain.conf)
- [ ] Configure upstream backend: `upstream backend { server localhost:3000; }`
- [ ] Setup server block for HTTP
- [ ] Setup server block for HTTPS
- [ ] Redirect HTTP to HTTPS
- [ ] Configure default server

---

## Security Configuration

### HTTP Headers Security
- [ ] Add X-Content-Type-Options: `add_header X-Content-Type-Options "nosniff" always;`
- [ ] Add X-Frame-Options: `add_header X-Frame-Options "SAMEORIGIN" always;`
- [ ] Add X-XSS-Protection: `add_header X-XSS-Protection "1; mode=block" always;`
- [ ] Add Referrer-Policy: `add_header Referrer-Policy "strict-origin-when-cross-origin" always;`
- [ ] Add Permissions-Policy: `add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;`
- [ ] Add Content-Security-Policy: `add_header Content-Security-Policy "default-src 'self';" always;`

### SSL/TLS Configuration
- [ ] Enable HTTPS only (redirect HTTP to HTTPS)
- [ ] Set SSL certificate path: `ssl_certificate /etc/letsencrypt/live/your-domain/fullchain.pem;`
- [ ] Set SSL key path: `ssl_certificate_key /etc/letsencrypt/live/your-domain/privkey.pem;`
- [ ] Set SSL protocols: `ssl_protocols TLSv1.2 TLSv1.3;`
- [ ] Set strong SSL ciphers (prefer AEAD ciphers)
- [ ] Enable SSL session caching: `ssl_session_cache shared:SSL:10m;`
- [ ] Set SSL session timeout: `ssl_session_timeout 10m;`
- [ ] Enable HSTS header: `add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;`
- [ ] Enable OCSP stapling (optional)

### Rate Limiting
- [ ] Define rate limiting zone: `limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;`
- [ ] Apply rate limiting: `limit_req zone=general burst=20 nodelay;`
- [ ] Different zones for different endpoints (API, public, etc.)

---

## Performance Configuration

### Gzip Compression
- [ ] Enable gzip: `gzip on;`
- [ ] Set compression level: `gzip_comp_level 6;`
- [ ] Set minimum compression size: `gzip_min_length 1000;`
- [ ] Configure types to compress: `gzip_types text/plain text/css text/javascript application/json;`
- [ ] Disable for older browsers: `gzip_disable "msie6";`
- [ ] Add Vary header: `gzip_vary on;`

### Caching Configuration
- [ ] Create cache zones for static files
- [ ] Set cache levels: `proxy_cache_levels 1:2;`
- [ ] Set cache sizes: `proxy_cache_max_size 10g;` 
- [ ] Set cache validity for static assets (1 year for versioned files)
- [ ] Set cache validity for HTML (no-cache)
- [ ] Add cache status header: `add_header X-Cache-Status $upstream_cache_status;`
- [ ] Setup cache bypass for certain requests

### Buffer Configuration
- [ ] Set proxy buffer size: `proxy_buffer_size 128k;`
- [ ] Set proxy buffers: `proxy_buffers 4 256k;`
- [ ] Set proxy busy buffers: `proxy_busy_buffers_size 256k;`

### Timeouts
- [ ] Set client body timeout: `client_body_timeout 10s;`
- [ ] Set client header timeout: `client_header_timeout 10s;`
- [ ] Set proxy connect timeout: `proxy_connect_timeout 30s;`
- [ ] Set proxy send timeout: `proxy_send_timeout 30s;`
- [ ] Set proxy read timeout: `proxy_read_timeout 30s;`

---

## Reverse Proxy Configuration

### Backend Proxy Setup
- [ ] Configure upstream servers
- [ ] Enable keepalive connections: `keepalive 32;`
- [ ] Setup load balancing (round-robin, least-conn, etc.)
- [ ] Configure proxy headers: `proxy_set_header Host $host;`
- [ ] Configure forwarded IP: `proxy_set_header X-Real-IP $remote_addr;`
- [ ] Configure proxy protocol: `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`
- [ ] Configure X-Forwarded-Proto: `proxy_set_header X-Forwarded-Proto $scheme;`
- [ ] Pass request body: `proxy_pass_request_body on;`
- [ ] Pass request headers: `proxy_pass_request_headers on;`

### Error Handling
- [ ] Configure error pages (404, 500, etc.)
- [ ] Setup fallback error page
- [ ] Log error details to separate file
- [ ] Configure try_files for SPA routing: `try_files $uri $uri/ /index.html;`

---

## Logging Configuration

### Access Logging
- [ ] Setup access log format with custom variables
- [ ] Configure access log path: `/var/log/nginx/access.log`
- [ ] Disable logging for health checks (optional)
- [ ] Setup log rotation in logrotate

### Error Logging
- [ ] Configure error log path: `/var/log/nginx/error.log`
- [ ] Set error log level: `error_log /var/log/nginx/error.log warn;`
- [ ] Setup separate error logs for each site

### Log Rotation
- [ ] Create `/etc/logrotate.d/nginx` configuration
- [ ] Set rotation frequency: `daily`
- [ ] Set retention: `rotate 14`
- [ ] Enable compression: `compress`
- [ ] Enable delaycompress
- [ ] Reload Nginx after rotation: `postrotate ... systemctl reload nginx ... endscript`

---

## Static File Serving

### Frontend Assets
- [ ] Define root directory: `root /var/www/your-domain/public;`
- [ ] Setup expires for versioned files (hash in filename): `expires 1y;`
- [ ] Setup no-cache for HTML: `expires -1; add_header Cache-Control "no-cache, no-store, must-revalidate";`
- [ ] Setup no-cache for service worker
- [ ] Enable sendfile: `sendfile on;`
- [ ] Enable tcp_nopush: `tcp_nopush on;`
- [ ] Configure MIME types correctly

### Compression Exclusions
- [ ] Don't compress already compressed files (jpg, png, zip, etc.)
- [ ] Don't compress small files (less than 1KB)

---

## Monitoring & Maintenance

### Health Monitoring
- [ ] Setup upstream health checks (if using Nginx Plus)
- [ ] Monitor Nginx process: `ps aux | grep nginx`
- [ ] Monitor port 80 and 443: `netstat -tlnp | grep nginx`
- [ ] Check Nginx status: `systemctl status nginx`

### Regular Maintenance
- [ ] Test configuration regularly: `nginx -t`
- [ ] Reload config without downtime: `systemctl reload nginx`
- [ ] Monitor log files for errors
- [ ] Check disk space for logs
- [ ] Monitor SSL certificate expiration

### Troubleshooting
- [ ] Check error log for issues: `tail -f /var/log/nginx/error.log`
- [ ] Check access log: `tail -f /var/log/nginx/access.log`
- [ ] Verify port binding: `lsof -i :80,443`
- [ ] Check file permissions for static files
- [ ] Verify backend upstream connectivity

---

## Advanced Configuration

### Load Balancing
- [ ] Configure multiple upstream servers
- [ ] Setup round-robin load balancing (default)
- [ ] Use least-conn for connection-based distribution
- [ ] Setup IP-hash for sticky sessions
- [ ] Configure server weights for uneven distribution
- [ ] Setup health check intervals
- [ ] Configure unhealthy server behavior
- [ ] Test load balancing across servers
- [ ] Monitor upstream server status

### Multi-Service Reverse Proxy
- [ ] Route different paths to different services
- [ ] Configure `/api/` to Node.js backend
- [ ] Configure `/admin/` to admin service
- [ ] Configure `/static/` to CDN or separate server
- [ ] Setup service discovery (if using microservices)
- [ ] Configure service-to-service communication
- [ ] Test service routing and failover

### WebSocket Support
- [ ] Configure WebSocket upgrade headers
- [ ] Add `Connection: Upgrade` header
- [ ] Add `Upgrade: websocket` header
- [ ] Configure `proxy_read_timeout` for long connections
- [ ] Configure `proxy_set_header` for WebSocket headers
- [ ] Setup WebSocket load balancing
- [ ] Test WebSocket connections and reconnection

### Docker Container
- [ ] Create Dockerfile for Nginx
- [ ] Build Nginx image: `docker build -t nginx:custom .`
- [ ] Configure volume mounts for config files
- [ ] Configure volume mounts for logs
- [ ] Setup container health checks
- [ ] Configure container restart policy
- [ ] Test container deployment

### CDN Integration
- [ ] Configure CDN provider (CloudFlare, Akamai, etc.)
- [ ] Setup origin server configuration
- [ ] Configure cache rules for CDN
- [ ] Setup purge/invalidation endpoint
- [ ] Configure DDoS protection
- [ ] Setup WAF rules
- [ ] Monitor CDN performance

---

## Example Site Configuration

```nginx
# Redirect HTTP to HTTPS
server {
    listen 80;
    listen [::]:80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS Configuration
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/your-domain/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Logging
    access_log /var/log/nginx/your-domain.access.log;
    error_log /var/log/nginx/your-domain.error.log warn;

    # Frontend static files
    location / {
        root /var/www/your-domain/public;
        try_files $uri $uri/ /index.html;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # API proxy
    location /api/ {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
        proxy_read_timeout 30s;
    }
}

# Upstream backend configuration
upstream backend {
    keepalive 32;
    server localhost:3000;
}
```
