# Archify Quick Guide

Skill location: `~/.kiro/skills/archify`
Command: `node ~/.kiro/skills/archify/bin/archify.mjs`

---

## Workflow: 3 bước

```
1. Viết JSON spec  →  2. validate  →  3. deliver
```

Chỉ chạy `deliver` **một lần duy nhất** sau khi validate pass. Không sửa file sau deliver.

---

## Diagram types

| Type | Dùng khi |
|------|----------|
| `architecture` | Component map, cloud/infra topology |
| `workflow` | CI/CD, approval gates, runbook |
| `sequence` | API call chain, request lifecycle |
| `dataflow` | ETL, data pipeline, event stream |
| `lifecycle` | State machine, status transitions |

Không chắc → chạy:
```bash
node ~/.kiro/skills/archify/bin/archify.mjs guide "<mô tả>" --json
```

---

## JSON spec — cấu trúc tối thiểu (type: architecture)

```json
{
  "schema_version": 1,
  "diagram_type": "architecture",
  "meta": {
    "title": "Tên diagram",
    "output": "ten-file.html",
    "quality_profile": "showcase",
    "animation": "trace",
    "viewBox": [920, 520]
  },
  "components": [...],
  "boundaries": [...],
  "connections": [...],
  "cards": [...]
}
```

> `animation` chỉ có 2 giá trị: `"trace"` hoặc `"none"`.
> `quality_profile` luôn dùng `"showcase"`.
> `viewBox` dùng để kiểm soát chiều cao diagram, tránh overflow — xem phần **Viewport**.

---

## Components

```json
{ "id": "api", "type": "backend", "label": "API Server", "sublabel": "Node.js :3000", "pos": [422, 224], "size": [126, 50] }
```

**`type`** chỉ nhận: `frontend` `backend` `database` `cloud` `security` `messagebus` `external`

**`id`** phải match pattern: `^[a-zA-Z][a-zA-Z0-9_-]*$`

**Layout tip:** đặt `pos` theo grid thủ công. Các node cùng hàng → cùng Y. Cùng cột → cùng X. Khoảng cách tối thiểu giữa các node ~196px (size + gap).

---

## Connections

```json
{ "id": "api-db", "from": "api", "to": "postgres", "label": "SQL", "variant": "emphasis" }
```

**`variant`:** `default` | `emphasis` | `security` | `dashed`

**`fromSide` / `toSide`:** `top` | `bottom` | `left` | `right`

**Fix label overlap:**
```json
"labelDx": 50        // dịch ngang
"labelDy": -18       // dịch dọc
"labelAt": [x, y]    // đặt chính xác tọa độ
```

**Fix đường đi qua node khác (via):**
```json
"via": [[x1, y1], [x2, y2]]   // waypoints tránh node
```

> ⚠️ **Quy tắc via:** đoạn đầu phải đi thẳng theo `fromSide`, đoạn cuối phải đến thẳng theo `toSide`. Ví dụ `fromSide: "left"` → via point đầu tiên phải có X < node.

---

## Boundaries

```json
{
  "kind": "region",
  "label": "VPS — Ubuntu Server",
  "wraps": ["nginx", "api", "redis"]
}
```

**`kind`:** `region` (vùng thông thường) | `security-group` (vùng bảo mật)

---

## Guided Views

```json
"views": [
  { "id": "request-path", "label": "Request path", "focus": ["user", "nginx", "api"], "note": "Mô tả ngắn" }
]
```

Tối đa 5 views. `focus` là danh sách `id` component sẽ được highlight khi chọn view đó.

---

## Cards

```json
{ "dot": "cyan", "title": "Frontend", "items": ["React SPA", "Vite build"] }
```

**`dot`:** `cyan` `emerald` `violet` `amber` `rose` `orange` `slate`

Cards xuất hiện bên dưới diagram. Giữ ≤ 3 cards, mỗi card ≤ 3 items để tránh overflow viewport.

---

## Commands

```bash
# Kiểm tra health
node ~/.kiro/skills/archify/bin/archify.mjs doctor

# Gợi ý type phù hợp
node ~/.kiro/skills/archify/bin/archify.mjs guide "mô tả" --json

# Validate (dùng trong lúc sửa)
node ~/.kiro/skills/archify/bin/archify.mjs validate architecture spec.json --quality showcase --json

# Deliver (chỉ chạy khi validate pass, 1 lần duy nhất)
node ~/.kiro/skills/archify/bin/archify.mjs deliver architecture spec.json output.html --quality showcase --json

# Kiểm tra viewport overflow
node ~/.kiro/skills/archify/bin/archify.mjs visual-check output.html --json
```

---

## Viewport — tránh overflow

Sau `deliver`, chạy `visual-check`. Kết quả cần:
```
overflowY: false  ← tất cả 4 viewport (1440x900, 1600x1000, 1920x1080, 2048x1320)
```

Nếu vẫn overflow → giảm `viewBox[1]` (chiều cao), giảm số cards, hoặc kéo các node lại gần nhau hơn.

---

## Lỗi thường gặp và cách fix

### `edge-through-node` — đường đi xuyên qua node khác
Node A → Node B nhưng đường đi cắt qua Node C.

**Fix:** dùng `via` để vòng qua, hoặc đổi `fromSide`/`toSide`:
```json
"fromSide": "left", "toSide": "left", "via": [[x_tránh_node, y]]
```

### `ambiguous-corridor` — 2 đường đi trùng nhau
Hai connection đi song song cách nhau < 8px.

**Fix:** đổi `fromSide`/`toSide` để tách hướng ra:
```json
// Connection 1
"fromSide": "top"
// Connection 2
"fromSide": "top", "labelDx": 52   // hoặc dùng via để tách
```

### `proper-crossing` — 2 đường cắt nhau không vuông góc
**Fix:** thêm `via` để tạo góc vuông:
```json
"via": [[x_chung, y1], [x_chung, y2]]
```

### `label-route-clearance` — label chồng lên đường khác
**Fix:** dịch label ra xa:
```json
"labelDx": 40     // hoặc
"labelAt": [x, y] // tọa độ tuyệt đối
```

### `layout/constraint` — label chồng lên node
Validator gợi ý sẵn tọa độ fix:
```
Suggested fix: labelAt [553, 384] or labelDy +24
```
→ dùng luôn giá trị đó.

### `endpoint-side-direction` — via không đúng hướng
Đoạn đầu/cuối của via phải đi **thẳng vuông góc** với side.

**Fix:** đảm bảo:
- `fromSide: "bottom"` → segment đầu phải đi xuống (Y tăng)
- `fromSide: "left"` → segment đầu phải đi sang trái (X giảm)
- `toSide: "top"` → segment cuối phải đến từ trên xuống (Y tăng)

---

## Ví dụ thực tế (từ framework-architecture.json)

**Node layout 4 cột:**
```
col0(x=30)   col1(x=226)   col2(x=422)   col3(x=618)
row0(y=100)   CDN           Redis         Logging
row1(y=224)   Browser       Nginx         API         PostgreSQL
row2(y=348)   CI/CD         Monitor       Storage     Jobs
row3(y=448)   Docker
```

**Connection tránh node (api → jobs đi vòng phải):**
```json
{ "from": "api", "to": "jobs", "fromSide": "right", "toSide": "top", "labelAt": [578, 306] }
```

**Boundary lồng nhau:**
```json
{ "kind": "region",         "label": "VPS",             "wraps": ["nginx","api","redis","postgres","jobs","storage"] },
{ "kind": "security-group", "label": "Internal network", "wraps": ["api","redis","postgres","jobs"] }
```
