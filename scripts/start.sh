#!/usr/bin/env bash
# 一键启动：自动安装依赖、建表、启动后端+前端。Ctrl+C 会同时停掉后端。
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "项目根目录: $ROOT"

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

# 启动前先清理历史进程，避免复用旧代码/旧缓存
cleanup_port 8000 "后端"
cleanup_port 3000 "前端"

# 1. 准备 backend/.env（优先用 env.local，没有则用 .env.example）
if [ ! -f backend/.env ]; then
  if [ -f backend/env.local ]; then
    cp backend/env.local backend/.env
    echo "[OK] 已生成 backend/.env（来自 env.local）"
  else
    cp backend/.env.example backend/.env
    echo "[OK] 已生成 backend/.env（来自 .env.example）"
  fi
fi

# 2. 后端依赖（首次或依赖缺失时安装）
echo "[OK] 检查后端依赖..."
(cd backend && pip install -q -r requirements.txt)

# 3. 初始化数据库
echo "[OK] 初始化数据库..."
(cd backend && python -m scripts.init_db)

# 4. 前端依赖（首次安装）
cd "$ROOT/frontend"
if [ ! -d node_modules ]; then
  echo "[OK] 安装前端依赖..."
  npm install
fi
cd "$ROOT"

# 5. 启动后端（后台）
cd "$ROOT/backend"
uvicorn app.main:app --reload --port 8000 &
BACKEND_PID=$!
cd "$ROOT"
echo "[OK] 后端已启动 (PID $BACKEND_PID)，http://localhost:8000"

cleanup_backend() {
  kill "$BACKEND_PID" 2>/dev/null || true
  pkill -P "$BACKEND_PID" 2>/dev/null || true
  echo "已停止后端"
}

# 退出时杀掉后端（含重载子进程）
trap "cleanup_backend; exit" INT TERM
trap "cleanup_backend" EXIT

# 6. 启动前端（前台，阻塞）
echo "[OK] 启动前端，http://localhost:3000"
cd "$ROOT/frontend"
rm -rf .next
npm run dev
