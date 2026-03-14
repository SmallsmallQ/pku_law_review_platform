# 服务器部署指南

本文说明如何将「中外法学智能编审系统」部署到一台 Linux 服务器上，供编辑部正式使用。

---

## 生产实例信息

| 项目 | 值 |
|------|-----|
| 服务器 IP | |
| 域名 | aliyun |
| GitHub 仓库 | https://github.com/SmallsmallQ/pku_law_review_platform |
| DNS 托管 | Cloudflare |

---

## 本站部署：aliyun

以下配置均按 **aliyun** 编写，可直接复制使用。

| 项目 | 值 |
|------|-----|
| 访问地址 | https://aliyun |
| 后端 CORS | `["https://aliyun"]` |
| Nginx `server_name` | `aliyun` |
| certbot 域名 | `aliyun` |

---

## 一、服务器与环境要求

| 项目 | 要求 |
|------|------|
| 系统 | Linux（推荐 Ubuntu 22.04 LTS / Debian 12） |
| Node.js | 18+，推荐 20 或 22 LTS |
| Python | 3.10+ |
| 数据库 | 内置 SQLite 即可；正式生产建议 PostgreSQL |
| 内存 | 建议 ≥ 2GB；若启用 AI 报告且并发多，建议 4GB+ |

---

## 二、部署架构示意

```
                    Internet
                        │
                        ▼
                  [ Nginx :80/443 ]
                        │
         ┌──────────────┼──────────────┐
         │              │              │
         ▼              ▼              ▼
    /api/v1/*        /*           (静态/健康)
    → 后端 :8000    → 前端 :3000
```

- **前端**：Next.js 生产模式，监听 3000。
- **后端**：FastAPI（uvicorn），监听 8000。
- **Nginx**：反向代理 +（可选）HTTPS，将 `/api/v1` 转给后端，其余转给前端。

若不使用 Nginx，也可直接暴露 3000/8000，并在前端配置 `NEXT_PUBLIC_API_URL` 指向后端地址。

---

## 三、步骤 1：在服务器上准备代码与依赖

### 3.1 克隆项目

```bash
cd /opt   # 或你希望放置的目录
git clone https://github.com/SmallsmallQ/pku_law_review_platform.git
cd pku_law_review_platform
```

### 3.2 安装后端依赖

```bash
cd /opt/pku_law_review_platform/backend
python3 -m venv venv
source venv/bin/activate   # Linux/macOS
pip install -r requirements.txt
```

### 3.3 安装前端依赖并构建

```bash
cd /opt/pku_law_review_platform/frontend
npm ci
npm run build
```

---

## 四、步骤 2：配置后端（.env）

```bash
cd /opt/pku_law_review_platform/backend
cp .env.example .env
# 编辑 .env，至少修改以下项：
nano .env
```

**生产环境必须修改的项：**

| 变量 | 说明 | 本站示例（aliyun） |
|------|------|-----------------------------------|
| `SECRET_KEY` | JWT 密钥，务必改为随机长字符串 | `openssl rand -hex 32` 生成后填入 |
| `CORS_ORIGINS` | 允许的前端来源（含协议与域名） | `["https://aliyun"]` |
| `DEBUG` | 生产设为 `false` | `false` |

本站可直接在 `.env` 中写：

```env
CORS_ORIGINS=["https://aliyun"]
```

**可选：**

- 使用 **PostgreSQL**：设置 `DATABASE_URL=postgresql://用户:密码@主机:5432/库名`，并安装 `psycopg2-binary`（已在 requirements 中）。不设则使用项目内 SQLite。
- **文件存储**：`STORAGE_TYPE=local`、`STORAGE_LOCAL_PATH` 指向服务器上持久化目录（如 `/var/data/law_review/storage`），需保证进程有写权限。
- **AI 初审**：填写 `DASHSCOPE_API_KEY`、按需调整 `LLM_BASE_URL` 与 `LLM_MODEL`。

初始化数据库：

```bash
cd /opt/pku_law_review_platform/backend
source venv/bin/activate
python -m scripts.init_db
# 若需要种子编辑账号：
# SEED_EDITOR_EMAIL=editor@your-domain.com SEED_EDITOR_PASSWORD=xxx python -m scripts.init_db
```

---

## 五、步骤 3：配置前端（生产 API 地址）

若 **前端与后端同机、且由 Nginx 统一入口**（推荐），则浏览器请求 `/api/v1` 会由 Nginx 转发到后端，**无需**再设 `NEXT_PUBLIC_API_URL`。

若 **前端直连后端**（例如后端在 `https://api.aliyun`），则需在构建前设置。本站采用同机 Nginx 统一入口，一般**无需**设置。

---

## 六、步骤 4：以生产方式启动进程

### 6.1 后端（uvicorn 多 worker）

```bash
cd /opt/pku_law_review_platform/backend
source venv/bin/activate
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

`--workers` 可按 CPU 核数调整（如 2～4）。

### 6.2 前端（Next.js 生产模式）

```bash
cd /opt/pku_law_review_platform/frontend
npm run start
```

默认监听 3000。如需改端口：`PORT=3000 npm run start`（或设环境变量 `PORT`）。

建议用 **systemd** 或 **supervisor** 把这两个进程做成服务，开机自启、崩溃重启。下面以 systemd 为例。

---

## 七、步骤 5：systemd 服务（推荐）

### 7.1 后端服务

创建 `/etc/systemd/system/law-review-api.service`：

```ini
[Unit]
Description=Law Review Backend API
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/pku_law_review_platform/backend
Environment="PATH=/opt/pku_law_review_platform/backend/venv/bin"
ExecStart=/opt/pku_law_review_platform/backend/venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

将 `User/Group` 和 `WorkingDirectory` 按你实际路径和运行用户修改。

### 7.2 前端服务

创建 `/etc/systemd/system/law-review-web.service`：

```ini
[Unit]
Description=Law Review Frontend (Next.js)
After=network.target

[Service]
Type=simple
User=www-data
Group=www-data
WorkingDirectory=/opt/pku_law_review_platform/frontend
Environment="PORT=3000"
Environment="NODE_ENV=production"
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

若 Node 不在 `/usr/bin/npm`，可改为 `ExecStart=/opt/pku_law_review_platform/frontend/node_modules/.bin/next start` 或使用 `nvm` 下 `node` 的绝对路径。

启用并启动：

```bash
sudo systemctl daemon-reload
sudo systemctl enable law-review-api law-review-web
sudo systemctl start law-review-api law-review-web
sudo systemctl status law-review-api law-review-web
```

---

## 八、步骤 6：Nginx 反向代理（推荐）

安装 Nginx 后，为站点添加配置（如 `/etc/nginx/sites-available/law-review`）：

```nginx
server {
    listen 80;
    server_name aliyun;

    # 后端 API
    location /api/v1/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 50M;
    }

    # 前端
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用站点并重载 Nginx：

```bash
sudo ln -s /etc/nginx/sites-available/law-review /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**后端 .env 中的 `CORS_ORIGINS`** 本站应设为：`["https://aliyun"]`（上 HTTPS 后）；未上 HTTPS 前可先用 `["http://aliyun"]`。

---

## 九、步骤 7：HTTPS（可选）

使用 Let’s Encrypt（certbot）：

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d aliyun
```

按提示选择为上述 Nginx server 申请证书并自动配置 HTTPS。完成后确认后端 `.env` 中 `CORS_ORIGINS=["https://aliyun"]`，并执行 `sudo systemctl restart law-review-api`。

---

## 十、部署检查清单

- [ ] 后端 `SECRET_KEY` 已改为随机字符串
- [ ] 后端 `CORS_ORIGINS` 为 `["https://aliyun"]`（或未上 HTTPS 时 `["http://aliyun"]`）
- [ ] 后端 `DEBUG=false`
- [ ] 数据库已执行 `python -m scripts.init_db`
- [ ] 存储目录存在且进程有写权限（使用 `STORAGE_LOCAL_PATH` 时）
- [ ] 前端已 `npm run build`，生产环境若直连后端则已设 `NEXT_PUBLIC_API_URL`
- [ ] 后端、前端进程由 systemd（或 supervisor）管理并设为开机自启
- [ ] Nginx 反向代理 `/api/v1` → 8000、`/` → 3000
- [ ] 如需 AI 初审：已配置 `DASHSCOPE_API_KEY`
- [ ] 管理员账号：将某用户 `role` 改为 `admin` 或按需创建

---

## 十一、更新与回滚

### 11.1 已部署旧版本时的标准更新流程（systemd）

```bash
# 1) 登录服务器
ssh aliyun

# 2) 进入项目目录（按实际路径二选一）
cd /opt/pku_law_review_platform || cd /srv/pku_law_review_platform

# 3) 备份（建议）
mkdir -p /opt/backup
if [ -f backend/law_review.db ]; then
    cp backend/law_review.db /opt/backup/law_review_$(date +%F_%H%M%S).db
fi
if [ -d backend/storage ]; then
    tar -czf /opt/backup/storage_$(date +%F_%H%M%S).tar.gz backend/storage
fi

# 4) 拉取最新代码
git fetch --all
git checkout main
git pull --rebase origin main

# 5) 后端依赖与迁移
cd backend
source venv/bin/activate
pip install -r requirements.txt
alembic upgrade head

# 6) 前端依赖与构建
cd ../frontend
npm ci
npm run build

# 7) 重启服务
sudo systemctl restart law-review-api
sudo systemctl restart law-review-web
sudo systemctl restart nginx

# 8) 检查服务与健康状态
sudo systemctl status law-review-api law-review-web nginx --no-pager
curl -I http://127.0.0.1:8000/health
curl -I https://aliyun
```

### 11.2 Docker Compose 更新流程

若后端使用 `docker-compose.prod.yml` 部署，可用：

```bash
cd /opt/pku_law_review_platform
git fetch --all
git checkout main
git pull --rebase origin main
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml ps
docker compose -f docker-compose.prod.yml logs -f --tail=200 backend
```

### 11.3 回滚

```bash
cd /opt/pku_law_review_platform
git checkout <旧版本tag或commit>

# 与更新流程相同：重装依赖、迁移到对应版本、重建前端、重启服务
```

如涉及不可逆数据库变更，优先使用第 3 步中的备份恢复数据库。

### 11.4 Cloudflare 检查项

- DNS A 记录 `aliyun` 指向 aliyun
- SSL/TLS 模式建议 `Full (strict)`
- 更新前端后如静态资源缓存异常，可执行一次 `Purge Cache`

---

## 十二、一键脚本（可选）

项目在 `scripts/start-production.sh` 中提供了「仅启动进程」的一键脚本（不包含 Nginx、systemd 配置），可在同一台机器上快速以生产方式起后端+前端，便于先验证再接入 Nginx/systemd。用法见脚本内注释。
