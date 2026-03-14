#!/usr/bin/env bash
# 生产环境一键启动：启动后端（uvicorn 多 worker）+ 后台 worker + 前端（next start）。
# 不包含 Nginx、systemd、HTTPS；部署到服务器后建议用 systemd 管理进程，见 docs/deploy.md。
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "项目根目录: $ROOT"

# 检查 backend/.env
if [ ! -f backend/.env ]; then
  echo "[ERROR] 请先复制 backend/.env.example 为 backend/.env 并填写生产配置（SECRET_KEY、CORS_ORIGINS 等）。"
  exit 1
fi

if ! grep -Eq '^DATABASE_URL=postgresql(\\+[^:]+)?://' backend/.env; then
  echo "[ERROR] 生产环境必须在 backend/.env 中配置 PostgreSQL DATABASE_URL。当前代码会拒绝 SQLite。"
  exit 1
fi

if grep -Eq '^DEBUG=true' backend/.env; then
  echo "[ERROR] 生产环境请将 backend/.env 中的 DEBUG 设为 false。"
  exit 1
fi

if grep -Eq '^USE_SQLITE=true' backend/.env; then
  echo "[ERROR] 生产环境请移除 USE_SQLITE=true，并改用 PostgreSQL DATABASE_URL。"
  exit 1
fi

if grep -Eq '^SECRET_KEY=change-me-in-production$|^SECRET_KEY=your-secret-key-change-in-production$|^SECRET_KEY=local-dev-secret-key-change-in-production$' backend/.env; then
  echo "[ERROR] 生产环境必须把 SECRET_KEY 改成随机长字符串。"
  exit 1
fi

# 检查前端是否已构建
if [ ! -d frontend/.next ]; then
  echo "[ERROR] 请先执行: cd frontend && npm ci && npm run build"
  exit 1
fi

cleanup_port() {
  local port="$1"
  local name="$2"
  local pids
  pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    echo "[OK] 清理占用 ${port} 端口的${name}进程: $pids"
    kill $pids 2>/dev/null || true
    sleep 1
    pids="$(lsof -ti tcp:"$port" 2>/dev/null || true)"
    if [ -n "$pids" ]; then
      kill -9 $pids 2>/dev/null || true
    fi
  fi
}

cleanup_port 8000 "后端"
cleanup_port 3000 "前端"

# 执行迁移并启动后端（多 worker，无 --reload）
cd "$ROOT/backend"
if [ -d venv ]; then
  source venv/bin/activate
fi
alembic upgrade head
uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4 &
BACKEND_PID=$!
python -m scripts.job_worker &
WORKER_PID=$!
cd "$ROOT"
echo "[OK] 后端已启动 (PID $BACKEND_PID)，http://0.0.0.0:8000"
echo "[OK] 后台任务 worker 已启动 (PID $WORKER_PID)"

cleanup_processes() {
  kill "$WORKER_PID" 2>/dev/null || true
  pkill -P "$WORKER_PID" 2>/dev/null || true
  kill "$BACKEND_PID" 2>/dev/null || true
  pkill -P "$BACKEND_PID" 2>/dev/null || true
  echo "已停止后端与 worker"
}

trap "cleanup_processes; exit" INT TERM
trap "cleanup_processes" EXIT

# 启动前端（生产模式）
export NODE_ENV=production
export PORT=3000
echo "[OK] 启动前端（生产模式），http://0.0.0.0:3000"
cd "$ROOT/frontend"
npm run start
