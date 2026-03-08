import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { AuthProvider } from "@/contexts/AuthContext";
import DocumentTitle from "@/components/DocumentTitle";
import Footer from "@/components/Footer";
import theme from "@/theme/themeConfig";
import "./globals.css";

export const metadata: Metadata = {
  title: "中外法学智能编审系统",
  description: "投稿管理 + AI 辅助初审",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="flex min-h-screen flex-col">
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded focus:bg-[#8B1538] focus:px-4 focus:py-2 focus:text-white focus:outline-none focus:ring-2 focus:ring-[#8B1538]"
        >
          跳过导航
        </a>
        <AntdRegistry>
          <ConfigProvider theme={theme} locale={zhCN}>
            <AuthProvider>
              <DocumentTitle />
              <div className="relative flex min-h-screen flex-1 flex-col bg-[#f5f6f8]">
                <div
                  className="pointer-events-none absolute inset-0 z-0 bg-cover bg-center bg-no-repeat opacity-[0.06]"
                  style={{ backgroundImage: "url(/banner.jpg)", backgroundPosition: "center", backgroundSize: "cover" }}
                  aria-hidden
                />
                <div className="relative z-10 flex flex-1 flex-col">
                  {children}
                  <Footer />
                </div>
              </div>
            </AuthProvider>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
