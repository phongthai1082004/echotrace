yt# Nginx Checklist

> **📐 Architecture Reference:** View the complete framework architecture at [`framework-architecture.html`](framework-architecture.html). Nginx acts as the reverse proxy, load balancer, and SSL terminator between clients and backend services.

## Installation & Setup

### Basic Installation
- [x] Install Nginx: `apt install nginx`
- [x] Enable Nginx service: `systemctl enable nginx`
- [x] Start Nginx: `systemctl start nginx`
- [x] Verify installation: `nginx -v`
- [x] Test configuration: `nginx -t`

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
- [o] Set worker processes: `worker_processes auto;`
- [o] Set worker connections: `worker_connections 1024;`
- [o] Enable keepalive: `keepalive_timeout 65;`
- [o] Set client max body size: `client_max_body_size 50M;`
- [x] Include site-specific configs: `include /etc/nginx/sites-enabled/*;`

### Site Configuration (sites-available/your-domain.conf)
- [x] Configure upstream backend: `upstream backend { server localhost:3000; }`
- [x] Setup server block for HTTP
- [x] Setup server block for HTTPS
- [x] Redirect HTTP to HTTPS
- [o] Configure default server

---

## Security Configuration

### HTTP Headers Security
- [o] Add X-Content-Type-Options: `add_header X-Content-Type-Options "nosniff" always;`
- [o] Add X-Frame-Options: `add_header X-Frame-Options "SAMEORIGIN" always;`
- [o] Add X-XSS-Protection: `add_header X-XSS-Protection "1; mode=block" always;`
- [o] Add Referrer-Policy: `add_header Referrer-Policy "strict-origin-when-cross-origin" always;`
- [o] Add Permissions-Policy: `add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;`
- [o] Add Content-Security-Policy: `add_header Content-Security-Policy "default-src 'self';" always;`

### SSL/TLS Configuration
- [x] Enable HTTPS only (redirect HTTP to HTTPS)
- [x] Set SSL certificate path: `ssl_certificate /etc/letsencrypt/live/your-domain/fullchain.pem;`
- [x] Set SSL key path: `ssl_certificate_key /etc/letsencrypt/live/your-domain/privkey.pem;`
- [o] Set SSL protocols: `ssl_protocols TLSv1.2 TLSv1.3;`
- [o] Set strong SSL ciphers (prefer AEAD ciphers)
- [o] Enable SSL session caching: `ssl_session_cache shared:SSL:10m;`
- [o] Set SSL session timeout: `ssl_session_timeout 10m;`
- [o] Enable HSTS header: `add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;`
- [-] Enable OCSP stapling (optional)

### Rate Limiting
- [o] Define rate limiting zone: `limit_req_zone $binary_remote_addr zone=general:10m rate=10r/s;`
- [o] Apply rate limiting: `limit_req zone=general burst=20 nodelay;`
- [o] Different zones for different endpoints (API, public, etc.)

---

## Performance Configuration

### Gzip Compression
- [o] Enable gzip: `gzip on;`
- [o] Set compression level: `gzip_comp_level 6;`
- [o] Set minimum compression size: `gzip_min_length 1000;`
- [o] Configure types to compress: `gzip_types text/plain text/css text/javascript application/json;`
- [-] Disable for older browsers: `gzip_disable "msie6";`
- [o] Add Vary header: `gzip_vary on;`

### Caching Configuration
- [-] Create cache zones for static files
- [-] Set cache levels: `proxy_cache_levels 1:2;`
- [-] Set cache sizes: `proxy_cache_max_size 10g;` 
- [o] Set cache validity for static assets (1 year for versioned files)
- [o] Set cache validity for HTML (no-cache)
- [-] Add cache status header: `add_header X-Cache-Status $upstream_cache_status;`
- [-] Setup cache bypass for certain requests

### Buffer Configuration
- [o] Set proxy buffer size: `proxy_buffer_size 128k;`
- [o] Set proxy buffers: `proxy_buffers 4 256k;`
- [o] Set proxy busy buffers: `proxy_busy_buffers_size 256k;`

### Timeouts
- [o] Set client body timeout: `client_body_timeout 10s;`
- [o] Set client header timeout: `client_header_timeout 10s;`
- [o] Set proxy connect timeout: `proxy_connect_timeout 30s;`
- [o] Set proxy send timeout: `proxy_send_timeout 30s;`
- [o] Set proxy read timeout: `proxy_read_timeout 30s;`

---

## Reverse Proxy Configuration

### Backend Proxy Setup
- [x] Configure upstream servers
- [o] Enable keepalive connections: `keepalive 32;`
- [-] Setup load balancing (round-robin, least-conn, etc.)
- [x] Configure proxy headers: `proxy_set_header Host $host;`
- [x] Configure forwarded IP: `proxy_set_header X-Real-IP $remote_addr;`
- [x] Configure proxy protocol: `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;`
- [x] Configure X-Forwarded-Proto: `proxy_set_header X-Forwarded-Proto $scheme;`
- [x] Pass request body: `proxy_pass_request_body on;`
- [x] Pass request headers: `proxy_pass_request_headers on;`

### Error Handling
- [o] Configure error pages (404, 500, etc.)
- [o] Setup fallback error page
- [o] Log error details to separate file
- [-] Configure try_files for SPA routing: `try_files $uri $uri/ /index.html;`

---

## Logging Configuration

### Access Logging
- [x] Setup access log format with custom variables
- [x] Configure access log path: `/var/log/nginx/access.log`
- [-] Disable logging for health checks (optional)
- [o] Setup log rotation in logrotate

### Error Logging
- [x] Configure error log path: `/var/log/nginx/error.log`
- [x] Set error log level: `error_log /var/log/nginx/error.log warn;`
- [o] Setup separate error logs for each site

### Log Rotation
- [o] Create `/etc/logrotate.d/nginx` configuration
- [o] Set rotation frequency: `daily`
- [o] Set retention: `rotate 14`
- [o] Enable compression: `compress`
- [o] Enable delaycompress
- [o] Reload Nginx after rotation: `postrotate ... systemctl reload nginx ... endscript`

---

## Static File Serving

### Frontend Assets
- [-] Define root directory: `root /var/www/your-domain/public;`
- [-] Setup expires for versioned files (hash in filename): `expires 1y;`
- [-] Setup no-cache for HTML: `expires -1; add_header Cache-Control "no-cache, no-store, must-revalidate";`
- [-] Setup no-cache for service worker
- [x] Enable sendfile: `sendfile on;`
- [o] Enable tcp_nopush: `tcp_nopush on;`
- [x] Configure MIME types correctly

### Compression Exclusions
- [o] Don't compress already compressed files (jpg, png, zip, etc.)
- [o] Don't compress small files (less than 1KB)

---

## Monitoring & Maintenance

### Health Monitoring
- [-] Setup upstream health checks (if using Nginx Plus)
- [o] Monitor Nginx process: `ps aux | grep nginx`
- [o] Monitor port 80 and 443: `netstat -tlnp | grep nginx`
- [o] Check Nginx status: `systemctl status nginx`

### Regular Maintenance
- [o] Test configuration regularly: `nginx -t`
- [o] Reload config without downtime: `systemctl reload nginx`
- [o] Monitor log files for errors
- [o] Check disk space for logs
- [o] Monitor SSL certificate expiration

### Troubleshooting
- [o] Check error log for issues: `tail -f /var/log/nginx/error.log`
- [o] Check access log: `tail -f /var/log/nginx/access.log`
- [o] Verify port binding: `lsof -i :80,443`
- [o] Check file permissions for static files
- [x] Verify backend upstream connectivity

---

## Advanced Configuration

### Load Balancing
- [-] Configure multiple upstream servers
- [-] Setup round-robin load balancing (default)
- [-] Use least-conn for connection-based distribution
- [-] Setup IP-hash for sticky sessions
- [-] Configure server weights for uneven distribution
- [-] Setup health check intervals
- [-] Configure unhealthy server behavior
- [-] Test load balancing across servers
- [-] Monitor upstream server status

### Multi-Service Reverse Proxy
- [x] Route different paths to different services
- [x] Configure `/api/` to Node.js backend
- [-] Configure `/admin/` to admin service
- [-] Configure `/static/` to CDN or separate server
- [-] Setup service discovery (if using microservices)
- [-] Configure service-to-service communication
- [o] Test service routing and failover

### WebSocket Support
- [-] Configure WebSocket upgrade headers
- [-] Add `Connection: Upgrade` header
- [-] Add `Upgrade: websocket` header
- [-] Configure `proxy_read_timeout` for long connections
- [-] Configure `proxy_set_header` for WebSocket headers
- [-] Setup WebSocket load balancing
- [-] Test WebSocket connections and reconnection

### Docker Container
- [-] Create Dockerfile for Nginx
- [-] Build Nginx image: `docker build -t nginx:custom .`
- [-] Configure volume mounts for config files
- [-] Configure volume mounts for logs
- [-] Setup container health checks
- [-] Configure container restart policy
- [-] Test container deployment

### CDN Integration
- [o] Configure CDN provider (CloudFlare, Akamai, etc.)
- [o] Setup origin server configuration
- [o] Configure cache rules for CDN
- [-] Setup purge/invalidation endpoint
- [o] Configure DDoS protection
- [o] Setup WAF rules
- [-] Monitor CDN performance

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
