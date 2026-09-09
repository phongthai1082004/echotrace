# Backend Checklist

> **📐 Architecture Reference:** View the complete framework architecture at [`framework-architecture.html`](framework-architecture.html). The API Server layer connects to PostgreSQL, Redis, Job Workers, and File Storage.

## File Structure

```
backend/
├── src/
│   ├── index.ts
│   ├── server.ts
│   │
│   ├── config/
│   │   ├── env.ts
│   │   ├── database.ts
│   │   └── constants.ts
│   │
│   ├── middleware/
│   │   ├── errorHandler.ts
│   │   ├── auth.ts
│   │   ├── cors.ts
│   │   ├── requestLogger.ts
│   │   ├── rateLimiter.ts
│   │   └── validation.ts
│   │
│   ├── routes/
│   │   ├── index.ts
│   │   ├── auth.routes.ts
│   │   ├── users.routes.ts
│   │   └── [feature].routes.ts
│   │
│   ├── features/
│   │   ├── [feature-name]/
│   │   │   ├── controller.ts
│   │   │   ├── service.ts
│   │   │   ├── repository.ts
│   │   │   ├── routes.ts
│   │   │   ├── types.ts
│   │   │   └── validation.ts
│   │   │
│   │   └── auth/
│   │       ├── controller.ts
│   │       ├── service.ts
│   │       ├── repository.ts
│   │       ├── routes.ts
│   │       ├── types.ts
│   │       └── validation.ts
│   │
│   ├── database/
│   │   ├── prisma.ts (or db connection)
│   │   └── migrations/
│   │
│   ├── lib/
│   │   ├── logger.ts
│   │   ├── mailer.ts
│   │   ├── cache.ts
│   │   ├── redis.ts
│   │   └── jwt.ts
│   │
│   ├── types/
│   │   ├── api.types.ts
│   │   ├── error.types.ts
│   │   ├── express.types.ts
│   │   └── common.types.ts
│   │
│   ├── utils/
│   │   ├── helpers.ts
│   │   ├── validators.ts
│   │   ├── formatters.ts
│   │   └── errors.ts
│   │
│   └── dto/
│       ├── auth.dto.ts
│       ├── user.dto.ts
│       └── [feature].dto.ts
│
├── prisma/ (if using Prisma)
│   ├── schema.prisma
│   ├── seed.ts
│   └── migrations/
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│
├── .env
├── .env.example
├── .env.test
├── .gitignore
├── tsconfig.json
├── package.json
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── jest.config.js (if using Jest)
└── README.md
```

---

## Security & Settings Checklist

### Environment Variables
- [x] Create `.env.example` with all required vars (no values)
- [x] Add `.env` and `.env.test` to `.gitignore`
- [o] Use `NODE_ENV=production` in production
- [x] Never commit secrets, API keys, or database passwords
- [o] Validate all env vars are present at startup
- [x] Use different secrets for dev/staging/production

### Database Security
- [o] Use parameterized queries (Prisma handles this automatically)
- [o] Set strong database passwords (min 32 chars, alphanumeric + symbols)
- [o] Restrict database access to specific IPs/VPCs
- [o] Enable database encryption at rest
- [o] Use SSL/TLS for database connections
- [o] Implement connection pooling (set `CONNECTION_LIMIT=20`)
- [o] Regular backups enabled and tested
- [o] Implement database query timeouts (prevent long-running queries)

### Authentication & Authorization
- [x] Implement JWT tokens with short expiration (15-60 min)
- [x] Store refresh tokens securely (httpOnly cookies or secure storage)
- [x] Implement token refresh mechanism
- [x] Hash passwords with bcrypt (min 10 rounds: `bcrypt.hash(password, 10)`)
- [x] Validate JWT on every protected route
- [x] Implement role-based access control (RBAC) for sensitive operations
- [-] Add audit logging for auth events (login, logout, permission changes)
- [x] Implement account lockout after N failed login attempts (3-5)

### API Security
- [x] Validate all request inputs (type, length, format)
- [x] Sanitize inputs to prevent injection attacks
- [x] Implement rate limiting (e.g., 100 requests/15 min per IP)
- [x] Add request validation middleware (Zod, Joi, or class-validator)
- [x] Set appropriate HTTP headers (X-Content-Type-Options, X-Frame-Options)
- [x] Implement CORS correctly (specify allowed origins, never use `*`)
- [o] Add timeout for all external API calls (30s recommended)
- [x] Validate file uploads (size: max 10MB, whitelist mime types)

### Caching & Redis
- [x] Install Redis client: `npm install redis`
- [x] Configure Redis connection URL from environment
- [-] Setup connection pooling for Redis (max pool size: 10)
- [x] Implement connection retry logic with exponential backoff
- [o] Setup Redis authentication (strong password, min 32 chars)
- [-] Enable Redis SSL/TLS in production
- [x] Configure Redis expiration for cache keys (TTL)
- [x] Implement cache invalidation strategy
- [-] Use Redis for session storage (if needed)
- [-] Use Redis for distributed locks (prevent race conditions)
- [x] Setup Redis key naming convention (e.g., `app:feature:key`)
- [x] Monitor Redis memory usage (set `maxmemory` and eviction policy)
- [x] Implement fallback if Redis unavailable (graceful degradation)
- [x] Setup Redis persistence (AOF or RDB)
- [-] Configure Redis backup strategy
- [x] Test Redis connection at application startup
- [x] Log Redis errors without exposing internal details

### Logging & Monitoring
- [o] Enable request logging (method, path, status, duration)
- [o] Never log sensitive data (passwords, tokens, API keys)
- [o] Set appropriate log levels (info, warn, error)
- [o] Implement log rotation (e.g., keep last 7 days)
- [o] Set max log size to prevent disk overflow (e.g., max 100MB)
- [o] Configure log retention policy
- [-] Use external logging service (Datadog, CloudWatch, etc.) for production
- [-] Monitor error rates and alert on anomalies
- [-] Monitor Redis performance (latency, memory, connections)
- [-] Setup alerts for Redis memory threshold
- [-] Monitor database query performance
- [-] Setup performance metrics collection

### Error Handling
- [x] Create centralized error handler middleware
- [x] Return generic error messages to clients (never expose stack traces)
- [x] Log detailed errors internally for debugging
- [x] Implement specific HTTP status codes (400, 401, 403, 404, 500, etc.)
- [x] Handle timeout errors gracefully
- [-] Implement circuit breaker for external service calls

### Response Security
- [x] Implement consistent response format `{ success, statusCode, data, message }`
- [x] Never expose internal error details to clients
- [x] Sanitize response data (remove internal fields, passwords, etc.)
- [x] Set appropriate cache headers (e.g., `Cache-Control: no-store` for sensitive data)
- [x] Remove sensitive headers from responses

### Code Quality & Dependencies
- [o] Use TypeScript strict mode
- [o] Configure ESLint with security-focused rules
- [o] Enable Prettier for consistent formatting
- [o] Audit dependencies regularly (`npm audit`)
- [o] Keep dependencies up-to-date (use Dependabot or Renovate)
- [o] Remove unused dependencies
- [o] Pin exact versions for production dependencies
- [-] Review changelogs before updating major versions

### Testing & Validation
- [x] Write unit tests for business logic
- [o] Write integration tests for API endpoints
- [x] Test error handling and edge cases
- [o] Achieve min 70% code coverage
- [x] Test authentication/authorization flows
- [o] Test rate limiting behavior
- [-] Test database query performance

### Build & Deployment
- [x] Set `NODE_ENV=production` during build
- [o] Remove dev dependencies from production image
- [x] Configure different configs for dev/staging/production
- [o] Validate config at startup (crash if missing required vars)
- [x] Use health check endpoint for monitoring

---

## Docker & Containerization

### Dockerfile Setup
- [x] Create `Dockerfile` for Node.js application
- [x] Use multi-stage build to reduce image size
- [x] Use specific Node.js version (not `latest`)
- [x] Set working directory: `WORKDIR /app`
- [x] Copy package files: `COPY package*.json ./`
- [o] Install production dependencies only: `npm ci --production`
- [x] Copy application code: `COPY . .`
- [x] Expose port: `EXPOSE 3000`
- [x] Set health check
- [o] Set non-root user for security
- [x] Add `.dockerignore` file

### Docker Compose
- [x] Create `docker-compose.yml` for local development
- [-] Setup services: backend, database, redis
- [-] Configure volumes for development
- [x] Configure environment variables
- [x] Setup network configuration
- [x] Configure port mappings
- [x] Add health checks for services

### Image Optimization
- [o] Use Alpine Linux base image (smaller size)
- [-] Minimize layer count
- [-] Remove build cache after install
- [o] Don't run as root user
- [o] Use .dockerignore to exclude unnecessary files

---

## Data Management

### Seeding & Fixtures
- [x] Create `prisma/seed.ts` for initial data
- [x] Setup seed script: `npx prisma db seed`
- [-] Create fixture files for testing
- [o] Create different seeds for dev/staging/production
- [o] Document seed data structure
- [x] Include admin user creation
- [x] Include sample data for testing

### Database Migrations
- [o] Use migration tools (Prisma Migrate, TypeORM, etc.)
- [o] Create descriptive migration names
- [o] Test migrations on staging before production
- [o] Keep rollback migrations available
- [o] Document migration changes
- [o] Add safety checks in migrations
- [o] Test zero-downtime deployment migrations

### Soft Delete & Archival
- [x] Implement soft delete pattern (deleted_at column)
- [x] Create helper functions for soft deletes
- [x] Update queries to exclude soft-deleted records
- [o] Provide restore functionality
- [-] Configure data retention policies
- [-] Setup archival for old records

---

## Background Jobs & Events

### Job Queue Setup
- [-] Install job queue library (Bull, Bee-Queue, or BullMQ)
- [x] Configure Redis for job storage
- [x] Create job processors
- [x] Setup job retry logic (exponential backoff)
- [x] Configure job concurrency limits
- [o] Setup job timeout handling
- [-] Create job monitoring dashboard (optional)
- [o] Test job failure scenarios

### Job Types
- [o] Email sending jobs
- [x] File processing jobs
- [-] Report generation jobs
- [-] Data synchronization jobs
- [x] Cleanup/maintenance jobs
- [-] Notification jobs

### Event System
- [-] Setup event emitter/publisher
- [-] Create event handlers
- [-] Implement event logging
- [-] Setup event retry mechanism
- [-] Document event flow
- [-] Test event delivery

---

## File Upload & Storage

### File Upload Handler
- [x] Setup file upload middleware
- [x] Validate file size (max 10MB)
- [x] Validate file type/mime type
- [x] Sanitize filename
- [x] Create upload directory structure
- [x] Generate unique filenames
- [-] Implement file virus scanning (optional)

### Storage Options
- [-] Configure local file storage (development)
- [x] Setup S3/Cloud storage (production)
- [x] Implement file CDN integration
- [-] Configure file expiration/cleanup
- [x] Setup file access control (permissions)
- [-] Implement file versioning

### File Management
- [x] Create file deletion endpoints
- [-] Implement file listing/browsing
- [x] Setup file download with proper headers
- [-] Configure file compression
- [-] Setup file backup strategy

---

## API Design & Patterns

### API Versioning
- [-] Define versioning strategy (URL vs header)
- [-] Create `/api/v1/`, `/api/v2/` routes
- [-] Document API version deprecation timeline
- [-] Provide migration guide for new versions
- [-] Support multiple versions during transition

### Pagination & Filtering
- [x] Implement pagination (limit, offset, cursor-based)
- [x] Add sorting capability (sort, order fields)
- [x] Implement filtering (query parameters)
- [x] Add full-text search (if needed)
- [x] Set default page size (e.g., 20)
- [o] Set max page size (e.g., 100)
- [o] Return pagination metadata (total, hasNext, etc.)

### Response Formatting
- [x] Implement consistent response envelope
- [-] Include metadata (timestamp, version, etc.)
- [x] Format error responses consistently
- [-] Include request ID for tracing
- [-] Add deprecation warnings for old endpoints

---

## Webhooks & External Integration

### Webhook Implementation
- [-] Create webhook registration endpoints
- [x] Implement webhook signature verification (HMAC)
- [o] Setup webhook retry mechanism
- [-] Create webhook event queue
- [o] Implement webhook logging
- [x] Setup webhook testing/debugging tools
- [x] Document webhook payload format
- [-] Provide webhook delivery status dashboard

### External Service Integration
- [x] Create service adapters for external APIs
- [-] Implement circuit breaker pattern
- [x] Setup request timeout
- [-] Implement rate limiting for external services
- [x] Add error handling and fallbacks
- [x] Log external API errors
- [x] Test service failures

---

## Quick Start Commands

```bash
# Create folder structure
mkdir -p src/{config,middleware,routes,features,database,lib,types,utils,dto}
mkdir -p tests/{unit,integration,fixtures}

# Create env file
cp .env.example .env

# Install dependencies
npm install

# Install Redis client
npm install redis

# Install job queue
npm install bullmq

# Install file upload handler
npm install multer

# Install Docker image scanning tool (Trivy)
npm install -D trivy

# Setup Prisma (if using)
npx prisma init

# Generate Prisma client
npx prisma generate

# Run migrations (if using Prisma)
npx prisma migrate dev --name init

# Seed database
npx prisma db seed

# Start Redis locally (if using Docker)
docker run -d -p 6379:6379 redis:latest

# Build Docker image
docker build -t myapp:latest .

# Run Docker container
docker run -d -p 3000:3000 myapp:latest

# Start with Docker Compose
docker-compose up

# Start development
npm run dev

# Build for production
npm run build

# Run tests
npm run test

# Run unit tests only
npm run test:unit

# Run integration tests
npm run test:integration

# Audit dependencies
npm audit

# Scan Docker image for vulnerabilities
trivy image myapp:latest
```
