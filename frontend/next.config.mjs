import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  turbopack: {
    root: __dirname,
  },
  // 避免 next dev 与 next build 共享同一产物目录导致 chunk 冲突
  distDir: process.env.NODE_ENV === 'production' ? '.next' : '.next-dev',
  // 后端 API 代理（开发时可改用 next rewrites 或直接请求绝对 URL）
  async rewrites() {
    return [
      { source: '/api/v1/:path*', destination: 'http://localhost:8000/api/v1/:path*' },
    ];
  },
};

export default nextConfig;
