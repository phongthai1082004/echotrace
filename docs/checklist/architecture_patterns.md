# Architecture Patterns — Khi nào dùng cái nào

Framework architecture hiện tại phù hợp với **96% dự án web/mobile backend**. Dưới đây là guide chọn architecture theo bài toán.

---

## ✅ Dùng Framework Architecture này khi:

### Product Web/Mobile + Backend
- [ ] Có frontend (React, Vue, Next.js) + backend (Node.js, Express)
- [ ] Cần user authentication (JWT, OAuth)
- [ ] Có database relational (PostgreSQL, MySQL)
- [ ] Cần caching layer (Redis)
- [ ] Có background jobs (email, reports, processing)
- [ ] Deploy trên VPS / AWS EC2 / DigitalOcean

**Ví dụ:** SaaS, marketplace, e-commerce, admin dashboard, social app, project management

### Mô hình kinh doanh
- Subscription / pay-as-you-go
- Multi-user với roles & permissions
- GDPR / compliance cần audit logs
- Medium traffic (1k–100k requests/day)

---

## ❌ Không dùng khi:

### Static Sites / Blogs
**Dùng:** Netlify + Next.js / Hugo / Jekyll (không cần backend)

### Serverless / Microservices
**Dùng:** AWS Lambda + API Gateway, hoặc Kubernetes orchestration

**Tín hiệu:**
- App này là 1 phần của hệ thống lớn hơn
- Cần scale 1 function riêng lẻ
- Traffic = trăm triệu requests/day
- Team > 50 engineers

### Real-time streaming / WebSocket-heavy
**Dùng thêm:** Socket.io, Kafka, RabbitMQ

**Tín hiệu:**
- Live chat, notifications, collaborative editing
- Financial trading, IoT data ingestion
- Video streaming

### Data warehouse / Analytics
**Dùng:** Snowflake, BigQuery, Redshift + dbt

### AI / ML
**Dùng:** FastAPI + MLflow + Airflow, hoặc containerized models

---

## Các biến thể của framework này (tuỳ theo bài toán)

### Variant 1: Monolith (hiện tại)
```
1 API server + 1 Database + Redis + Jobs
```
**Khi:** Startup, team nhỏ, feature chưa stable, < 50k requests/day

**Ưu điểm:** Đơn giản, deploy nhanh, debugging dễ
**Nhược điểm:** Khó scale nếu 1 feature gặp bottleneck

### Variant 2: Micro-backend (tách API thành modules)
```
API 1 (Auth) + API 2 (Orders) + API 3 (Reports)
↓
Shared: PostgreSQL + Redis
```
**Khi:** Team ≥ 5, các feature độc lập, deploy riêng rẽ

**Cách mở rộng:** Tách `src/features/*` thành separate Node.js projects, deploy mỗi cái lên port riêng, Nginx reverse proxy đến từng port

### Variant 3: Queue-heavy (dữ liệu ~ events)
```
API → Message Broker (RabbitMQ / Kafka) → Workers × N
```
**Khi:** Dữ liệu thay đổi liên tục, cần event sourcing, audit trail chi tiết

**Thay đổi:** Replace Redis job queue → Kafka topics, thêm Event Store

### Variant 4: Polyglot (backend ≠ Node.js)
```
Node.js API + Python ML Service + Go Worker
↓
Message queue để communicate
```
**Khi:** Có specialized service (ML inference, video transcoding)

**Thay đổi:** Keep architecture topology, swap Node.js → Python/Go/Rust

### Variant 5: Edge / CDN-first
```
Frontend ở CDN Edge
↓
API ở 1 region duy nhất hoặc geo-replicated
```
**Khi:** Global users, cần latency < 100ms worldwide

**Thay đổi:** Thêm geolocation routing, database replication, caching strategy

---

## Decision tree — Chọn architecture

```
START
  ↓
Có frontend + backend? NO → Static site (Netlify, Vercel)
  ↓ YES
Độc lập được từ infra lớn? NO → Microservice (Kubernetes)
  ↓ YES
Traffic < 100k/day? YES → Framework Monolith (hiện tại) ✓
  ↓ NO
↓
Dữ liệu chủ yếu = events? YES → Queue-heavy (Kafka, Event Store)
  ↓ NO
Có ML inference? YES → Polyglot (Python + Node.js)
  ↓ NO
Global users, cần edge? YES → Edge / CDN-first
  ↓ NO
Team > 5 người? YES → Micro-backend (tách features)
  ↓ NO
Quay lại Monolith ✓
```

---

## Scaling path từ Monolith

```
Bước 1: Monolith (hiện tại)
        ↓ (Team grows, features pile up)
Bước 2: Tách background jobs thành separate worker container
        ↓ (Database bottleneck)
Bước 3: Read replica database, caching strategy upgrade
        ↓ (API đạt ceiling)
Bước 4: Micro-backend (tách features thành services)
        ↓ (Distributed complexity)
Bước 5: Message queue (Kafka) thay Redis, Event sourcing
        ↓ (Still hitting limits?)
Bước 6: Kubernetes, Istio, observability stack (Prometheus, Grafana)
```

Không cần jump đến bước 6 ngay. Monolith scale đến **5–10M requests/day** nếu optimize tốt.

---

## Checklist trước khi bắt đầu dự án mới

- [ ] Team bao nhiêu người?
- [ ] Traffic dự kiến năm 1: bao nhiêu requests/day?
- [ ] User data: bao nhiêu GB?
- [ ] Cần real-time? (chat, notifications)
- [ ] Cần ML inference?
- [ ] Cần geo-replicated?
- [ ] Budget infra/tháng?
- [ ] Timeline đến MVP?

**Trả lời** → Dùng architecture nào ở trên.

---

## Dùng checklist như thế nào

### Nếu bài toán phù hợp (monolith):
```bash
git clone <repo> my-new-project
cp docs/checklist/* my-new-project/docs/
# Follow backend_checklist.md + frontend_checklist.md
```

### Nếu bài toán khác:
1. **Đọc decision tree** → xác định variant
2. **Điều chỉnh checklist:** 
   - Variant 2 (Micro): Bỏ `src/features/*`, thêm API boundaries
   - Variant 3 (Queue): Bỏ Redis, thêm Kafka setup
   - Variant 4 (Polyglot): Thêm section riêng cho Python/Go service
3. **Vẽ lại architecture.json** với archify (đổi components, connections)
4. **Lưu vào git** (`docs/checklist/variant-*.md`)

---

## Khi nào cần redesign architecture

🚨 **Red flags:**
- Database query time > 500ms (index? N+1? needs denormalization?)
- API response time > 1s (need caching? need CDN?)
- Redis memory > 90% allocated
- Background jobs queing faster than processing (need horizontal scale)
- Nginx CPU > 80% (need load balancer scale-out?)
- 404 / 500 errors spike → (need graceful degradation?)

✅ **Hành động:**
1. Profile bottleneck (APM: Datadog, New Relic)
2. Optimize at current architecture (cache strategy, query optimization, indexing)
3. Only redesign if optimization hits ceiling
4. A/B test new architecture in staging

---

## Recommendation

**Với project mới:**
1. Bắt đầu từ **Monolith** (framework hiện tại)
2. Lưu checklist vào git → base cho dự án sau
3. Khi scale issue xuất hiện → xem decision tree, chọn variant
4. Cập nhật checklist, update git

**Không cần** complex infrastructure ngay từ đầu. 80% dự án không bao giờ vượt quá monolith.
