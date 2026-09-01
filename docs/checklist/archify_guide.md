# Archify Quick Guide

Skill location: `~/.kiro/skills/archify`
Command: `node ~/.kiro/skills/archify/bin/archify.mjs`

---

## Workflow: 3 Steps

```
1. Write JSON spec  →  2. validate  →  3. deliver
```

Only run `deliver` **once** after validation passes. Do not edit files after delivery.

---

## Diagram Types

| Type | Use When |
|------|----------|
| `architecture` | Component map, cloud/infra topology |
| `workflow` | CI/CD, approval gates, runbook |
| `sequence` | API call chain, request lifecycle |
| `dataflow` | ETL, data pipeline, event stream |
| `lifecycle` | State machine, status transitions |

Unsure? Run:
```bash
node ~/.kiro/skills/archify/bin/archify.mjs guide "<description>" --json
```

---

## JSON Spec — Minimal Structure (type: architecture)

```json
{
  "schema_version": 1,
  "diagram_type": "architecture",
  "meta": {
    "title": "Diagram Name",
    "output": "filename.html",
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

> `animation` only accepts: `"trace"` or `"none"`.
> `quality_profile` always use `"showcase"`.
> `viewBox` controls diagram height to avoid viewport overflow — see **Viewport** section.

---

## Components

```json
{ "id": "api", "type": "backend", "label": "API Server", "sublabel": "Node.js :3000", "pos": [422, 224], "size": [126, 50] }
```

**`type`** accepts only: `frontend` `backend` `database` `cloud` `security` `messagebus` `external`

**`id`** must match pattern: `^[a-zA-Z][a-zA-Z0-9_-]*$`

**Layout tip:** Position nodes on a manual grid. Same row = same Y. Same column = same X. Minimum spacing between nodes ~196px (size + gap).

---

## Connections

```json
{ "id": "api-db", "from": "api", "to": "postgres", "label": "SQL", "variant": "emphasis" }
```

**`variant`:** `default` | `emphasis` | `security` | `dashed`

**`fromSide` / `toSide`:** `top` | `bottom` | `left` | `right`

**Fix label overlap:**
```json
"labelDx": 50        // horizontal offset
"labelDy": -18       // vertical offset
"labelAt": [x, y]    // exact coordinates
```

**Fix line crossing through node (via):**
```json
"via": [[x1, y1], [x2, y2]]   // waypoints to avoid nodes
```

> ⚠️ **Via rule:** First segment must run straight according to `fromSide`, last segment must arrive straight according to `toSide`. Example: `fromSide: "left"` → first via point must have X < node.

---

## Boundaries

```json
{
  "kind": "region",
  "label": "VPS — Ubuntu Server",
  "wraps": ["nginx", "api", "redis"]
}
```

**`kind`:** `region` (regular area) | `security-group` (security boundary)

---

## Guided Views

```json
"views": [
  { "id": "request-path", "label": "Request path", "focus": ["user", "nginx", "api"], "note": "Brief description" }
]
```

Maximum 5 views. `focus` is a list of component `id`s to highlight when view is selected.

---

## Cards

```json
{ "dot": "cyan", "title": "Frontend", "items": ["React SPA", "Vite build"] }
```

**`dot`:** `cyan` `emerald` `violet` `amber` `rose` `orange` `slate`

Cards appear below diagram. Keep ≤ 3 cards, max 3 items per card to avoid viewport overflow.

---

## Commands

```bash
# Health check
node ~/.kiro/skills/archify/bin/archify.mjs doctor

# Suggest appropriate type
node ~/.kiro/skills/archify/bin/archify.mjs guide "description" --json

# Validate (use while editing)
node ~/.kiro/skills/archify/bin/archify.mjs validate architecture spec.json --quality showcase --json

# Deliver (run only after validate passes, once only)
node ~/.kiro/skills/archify/bin/archify.mjs deliver architecture spec.json output.html --quality showcase --json

# Check viewport overflow
node ~/.kiro/skills/archify/bin/archify.mjs visual-check output.html --json
```

---

## Viewport — Avoid Overflow

After `deliver`, run `visual-check`. Result should show:
```
overflowY: false  ← all 4 viewports (1440x900, 1600x1000, 1920x1080, 2048x1320)
```

If still overflow → reduce `viewBox[1]` (height), reduce number of cards, or move nodes closer together.

---

## Common Errors and Fixes

### `edge-through-node` — Line crosses unrelated node
Node A → Node B but path cuts through Node C.

**Fix:** Use `via` to route around, or change `fromSide`/`toSide`:
```json
"fromSide": "left", "toSide": "left", "via": [[x_avoid_node, y]]
```

### `ambiguous-corridor` — 2 lines overlap
Two connections run parallel < 8px apart.

**Fix:** Change `fromSide`/`toSide` to separate directions:
```json
// Connection 1
"fromSide": "top"
// Connection 2
"fromSide": "top", "labelDx": 52   // or use via to separate
```

### `proper-crossing` — 2 lines cross at non-perpendicular angle
**Fix:** Add `via` to create perpendicular crossing:
```json
"via": [[x_shared, y1], [x_shared, y2]]
```

### `label-route-clearance` — Label overlaps another line
**Fix:** Offset label away:
```json
"labelDx": 40     // or
"labelAt": [x, y] // absolute coordinates
```

### `layout/constraint` — Label overlaps node
Validator suggests fix coordinates:
```
Suggested fix: labelAt [553, 384] or labelDy +24
```
→ Use it directly.

### `endpoint-side-direction` — Via direction mismatch
First/last via segment must run **straight perpendicular** to side.

**Fix:** Ensure:
- `fromSide: "bottom"` → first segment goes down (Y increases)
- `fromSide: "left"` → first segment goes left (X decreases)
- `toSide: "top"` → last segment arrives from above (Y increases)

---

## Real-world Example (from framework-architecture.json)

**Node layout 4 columns:**
```
col0(x=30)   col1(x=226)   col2(x=422)   col3(x=618)
row0(y=100)   CDN           Redis         Logging
row1(y=224)   Browser       Nginx         API         PostgreSQL
row2(y=348)   CI/CD         Monitor       Storage     Jobs
row3(y=448)   Docker
```

**Connection routing around node (api → jobs via right):**
```json
{ "from": "api", "to": "jobs", "fromSide": "right", "toSide": "top", "labelAt": [578, 306] }
```

**Nested boundaries:**
```json
{ "kind": "region",         "label": "VPS",             "wraps": ["nginx","api","redis","postgres","jobs","storage"] },
{ "kind": "security-group", "label": "Internal network", "wraps": ["api","redis","postgres","jobs"] }
```
