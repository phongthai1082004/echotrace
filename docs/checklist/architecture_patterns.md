# Architecture Patterns — When to Use What

The current framework architecture is suitable for **96% of web/mobile backend projects**. Below is a guide to choosing architecture based on your problem.

---

## ✅ Use Framework Architecture when:

### Product Web/Mobile + Backend
- [ ] Have frontend (React, Vue, Next.js) + backend (Node.js, Express)
- [ ] Need user authentication (JWT, OAuth)
- [ ] Have relational database (PostgreSQL, MySQL)
- [ ] Need caching layer (Redis)
- [ ] Have background jobs (email, reports, processing)
- [ ] Deploy on VPS / AWS EC2 / DigitalOcean

**Examples:** SaaS, marketplace, e-commerce, admin dashboard, social app, project management

### Business Model
- Subscription / pay-as-you-go
- Multi-user with roles & permissions
- GDPR / compliance requiring audit logs
- Medium traffic (1k–100k requests/day)

---

## ❌ Don't Use when:

### Static Sites / Blogs
**Use instead:** Netlify + Next.js / Hugo / Jekyll (no backend needed)

### Serverless / Microservices
**Use instead:** AWS Lambda + API Gateway, or Kubernetes orchestration

**Signals:**
- This app is part of a larger system
- Need to scale 1 function independently
- Traffic = hundreds of millions requests/day
- Team > 50 engineers

### Real-time Streaming / WebSocket-Heavy
**Add:** Socket.io, Kafka, RabbitMQ

**Signals:**
- Live chat, notifications, collaborative editing
- Financial trading, IoT data ingestion
- Video streaming

### Data Warehouse / Analytics
**Use:** Snowflake, BigQuery, Redshift + dbt

### AI / ML
**Use:** FastAPI + MLflow + Airflow, or containerized models

---

## Variants of This Framework (Depends on Your Problem)

### Variant 1: Monolith (Current)
```
1 API server + 1 Database + Redis + Jobs
```
**When:** Startup, small team, features not yet stable, < 50k requests/day

**Pros:** Simple, fast deploy, easy debugging
**Cons:** Hard to scale if 1 feature hits bottleneck

### Variant 2: Micro-backend (Split API into Modules)
```
API 1 (Auth) + API 2 (Orders) + API 3 (Reports)
↓
Shared: PostgreSQL + Redis
```
**When:** Team ≥ 5, independent features, deploy separately

**How to expand:** Split `src/features/*` into separate Node.js projects, deploy each to own port, Nginx reverse proxy to each

### Variant 3: Queue-Heavy (Data as Events)
```
API → Message Broker (RabbitMQ / Kafka) → Workers × N
```
**When:** Data changes continuously, need event sourcing, detailed audit trail

**Changes:** Replace Redis job queue → Kafka topics, add Event Store

### Variant 4: Polyglot (Backend ≠ Node.js)
```
Node.js API + Python ML Service + Go Worker
↓
Message queue for communication
```
**When:** Have specialized service (ML inference, video transcoding)

**Changes:** Keep architecture topology, swap Node.js → Python/Go/Rust

### Variant 5: Edge / CDN-First
```
Frontend on CDN Edge
↓
API on single region or geo-replicated
```
**When:** Global users, need latency < 100ms worldwide

**Changes:** Add geolocation routing, database replication, caching strategy

---

## Decision Tree — Choose Your Architecture

```
START
  ↓
Have frontend + backend? NO → Static site (Netlify, Vercel)
  ↓ YES
Independent from larger infra? NO → Microservice (Kubernetes)
  ↓ YES
Traffic < 100k/day? YES → Framework Monolith (current) ✓
  ↓ NO
↓
Data mainly = events? YES → Queue-heavy (Kafka, Event Store)
  ↓ NO
Have ML inference? YES → Polyglot (Python + Node.js)
  ↓ NO
Global users, need edge? YES → Edge / CDN-first
  ↓ NO
Team > 5 people? YES → Micro-backend (split features)
  ↓ NO
Back to Monolith ✓
```

---

## Scaling Path from Monolith

```
Step 1: Monolith (current)
        ↓ (Team grows, features pile up)
Step 2: Extract background jobs to separate worker container
        ↓ (Database bottleneck)
Step 3: Read replica database, upgrade caching strategy
        ↓ (API hits ceiling)
Step 4: Micro-backend (split features into services)
        ↓ (Distributed complexity)
Step 5: Message queue (Kafka) replace Redis, Event sourcing
        ↓ (Still hitting limits?)
Step 6: Kubernetes, Istio, observability stack (Prometheus, Grafana)
```

No need to jump to step 6 immediately. Monolith scales to **5–10M requests/day** with proper optimization.

---

## Pre-Project Checklist

- [ ] How many people on team?
- [ ] Expected year 1 traffic: how many requests/day?
- [ ] User data: how many GB?
- [ ] Need real-time? (chat, notifications)
- [ ] Need ML inference?
- [ ] Need geo-replicated?
- [ ] Infrastructure budget/month?
- [ ] Timeline to MVP?

**Answer these** → Pick your architecture above.

---

## How to Use the Checklist

### If Problem Fits (Monolith):
```bash
git clone <repo> my-new-project
cp docs/checklist/* my-new-project/docs/
# Follow backend_checklist.md + frontend_checklist.md
```

### If Problem Different:
1. **Read decision tree** → identify variant
2. **Adjust checklist:**
   - Variant 2 (Micro): Remove `src/features/*`, add API boundaries
   - Variant 3 (Queue): Remove Redis, add Kafka setup
   - Variant 4 (Polyglot): Add separate section for Python/Go service
3. **Redraw architecture.json** with archify (change components, connections)
4. **Save to git** (`docs/checklist/variant-*.md`)

---

## When to Redesign Architecture

🚨 **Red Flags:**
- Database query time > 500ms (missing index? N+1 problem? needs denormalization?)
- API response time > 1s (need caching? need CDN?)
- Redis memory > 90% allocated
- Background jobs queuing faster than processing (need horizontal scale)
- Nginx CPU > 80% (need load balancer scale-out?)
- 404 / 500 errors spike → (need graceful degradation?)

✅ **Action:**
1. Profile bottleneck (APM: Datadog, New Relic)
2. Optimize at current architecture (cache strategy, query optimization, indexing)
3. Only redesign if optimization hits ceiling
4. A/B test new architecture in staging

---

## Recommendation

**For New Project:**
1. Start with **Monolith** (current framework)
2. Save checklist to git → base for next project
3. When scaling issues appear → check decision tree, pick variant
4. Update checklist, push to git

**Don't need** complex infrastructure from day one. 80% of projects never outgrow monolith.
