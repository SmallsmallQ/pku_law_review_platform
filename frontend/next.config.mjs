/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // 后端 API 代理（开发时可改用 next rewrites 或直接请求绝对 URL）
  async rewrites() {
    return [
      { source: '/api/v1/:path*', destination: 'http://localhost:8000/api/v1/:path*' },
    ];
  },
};

export default nextConfig;
