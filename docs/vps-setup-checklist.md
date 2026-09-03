# VPS Setup Checklist — Ubuntu 22.04 LTS
> One-time setup. VPS stays independent — no git repo. CI/CD pushes containers directly via SSH.

---

## Checklist

- [ ] Step 1: SSH into VPS
- [ ] Step 2: Install Docker & Docker Compose
- [ ] Step 3: Create deploy folder
- [ ] Step 4: Copy `.env` files to VPS (1 time, or when rotating secrets)
- [ ] Step 5: Login to ghcr.io
- [ ] Step 6: Setup DNS records
- [ ] Step 7: Generate SSL certificate
- [ ] Step 8: Create SSH deploy key
- [ ] Step 9: Add GitHub Secrets
- [ ] Step 10: Push to `main` — CI/CD auto-deploys

---

## Step 1 — SSH into VPS

```bash
ssh root@<VPS_IP>
```

> If your VPS only has `root` user, use `root`. Otherwise use your SSH user.

---

## Step 2 — Install Docker & Docker Compose

> Use the official Docker repo, not `docker.io` (outdated on Ubuntu 22.04).

```bash
sudo apt remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true

sudo apt update
sudo apt install -y ca-certificates curl gnupg lsb-release

sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

sudo systemctl enable --now docker

# Verify
docker --version
docker compose version
```

---

## Step 3 — Create Deploy Folder

> Empty folder. CI/CD will push `docker-compose.yml` here on every deploy.

```bash
mkdir -p /opt/echotrace
cd /opt/echotrace
```

---

## Step 4 — Copy `.env` Files to VPS

> Secrets never go to git. Copy manually; repeat only when rotating secrets.
> CI/CD pushes `docker-compose.yml` on every deploy, you just copy `.env` once.

Run from **local machine (PowerShell)**:

```powershell
scp .env.production root@<VPS_IP>:/opt/echotrace/.env
scp backend/.env.production root@<VPS_IP>:/opt/echotrace/backend/.env.production
scp frontend/.env.production root@<VPS_IP>:/opt/echotrace/frontend/.env.production
```

Verify on VPS:

```bash
ls -la /opt/echotrace/.env
ls -la /opt/echotrace/backend/.env.production
ls -la /opt/echotrace/frontend/.env.production
```

---

## Step 5 — Login to ghcr.io

> Credentials saved to `~/.docker/config.json` — persists across reboots.

Create a GitHub PAT first:
- GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)**
- Scope: `read:packages`

```bash
echo "<GITHUB_PAT>" | docker login ghcr.io -u <GITHUB_USERNAME> --password-stdin

# Verify
cat ~/.docker/config.json   # Should contain "ghcr.io"
```

---

## Step 6 — Setup DNS Records

> Wait 5–15 minutes for propagation before generating SSL.

Add these A records on your domain registrar:

| Type | Name  | Value      | TTL |
|------|-------|------------|-----|
| A    | `@`   | `<VPS_IP>` | 300 |
| A    | `www` | `<VPS_IP>` | 300 |
| A    | `api` | `<VPS_IP>` | 300 |

Verify propagation from VPS:

```bash
ping bettermemoire.com   # Should return <VPS_IP>
```

---

## Step 7 — Generate SSL Certificate

> Run **after** DNS propagates, **before** starting containers (needs port 80 free).
> Certbot auto-renews every 90 days via systemd timer — never regenerate manually.

```bash
sudo apt install -y certbot

sudo certbot certonly --standalone \
  -d bettermemoire.com \
  -d www.bettermemoire.com \
  -d api.bettermemoire.com \
  --agree-tos \
  --email admin@bettermemoire.com \
  --non-interactive

# Verify certs exist
sudo ls /etc/letsencrypt/live/bettermemoire.com/
# cert.pem  chain.pem  fullchain.pem  privkey.pem

# Verify auto-renew timer is active
sudo systemctl status certbot.timer
```

---

## Step 8 — Create SSH Deploy Key

> CI/CD uses this to SSH into VPS and push containers on every deploy.

```bash
mkdir -p ~/.ssh
ssh-keygen -t ed25519 -f ~/.ssh/deploy_key -N ""

# Allow CI/CD to authenticate
cat ~/.ssh/deploy_key.pub >> ~/.ssh/authorized_keys

# Print private key — copy this into GitHub Secret VPS_SSH_KEY
cat ~/.ssh/deploy_key
```

---

## Step 9 — Add GitHub Secrets

Go to: **GitHub repo → Settings → Secrets and variables → Actions → New repository secret**

| Secret | Value |
|--------|-------|
| `VPS_SSH_KEY` | Full content of `~/.ssh/deploy_key` (include `-----BEGIN` and `-----END` lines) |
| `VPS_HOST` | `<VPS_IP>` |
| `VPS_USER` | `root` |
| `APP_DIR` | `/opt/echotrace` |
| `NEXT_PUBLIC_BACKEND_URL` | `https://api.bettermemoire.com` |
| `JWT_ACCESS_SECRET` | Long random string |
| `JWT_REFRESH_SECRET` | Long random string |

Generate a secure random string:

```bash
openssl rand -base64 64
```

---

## Step 10 — Push to `main`

> CI/CD pipeline triggers automatically.

```powershell
# From local machine
git add .
git commit -m "chore: production deployment setup"
git push origin main
```

Monitor the run at: `https://github.com/<USERNAME>/<REPO>/actions`

---

## What CI/CD Does on Every Push

```
push main
  ├── Stage 1: Lint & type check
  ├── Stage 2: Detect changed services
  ├── Stage 3: Run tests (changed services only)
  ├── Stage 4: Build Docker images on GitHub runners
  │   docker build backend/ → ghcr.io/user/repo/backend-service:latest
  │   docker build frontend/ → ghcr.io/user/repo/frontend-service:latest
  │
  ├── Stage 5: Deploy to VPS
  │   ├─ SCP docker-compose.yml to /opt/echotrace/
  │   ├─ SSH into VPS
  │   ├─ docker login ghcr.io
  │   ├─ docker compose pull (from ghcr.io)
  │   └─ docker compose up -d --force-recreate
  │
  └── Stage 6: Health check → auto-rollback if failed
```

**VPS stays independent:**
- ✅ Has `docker-compose.yml` (pushed on every deploy), `.env`, SSL certs
- ✅ Pulls containers from ghcr.io when CI/CD pushes
- ❌ No git repo, no source code
