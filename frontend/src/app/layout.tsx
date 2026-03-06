import type { Metadata } from "next";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import { ConfigProvider } from "antd";
import zhCN from "antd/locale/zh_CN";
import { AuthProvider } from "@/contexts/AuthContext";
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
      <body className="flex min-h-screen flex-col">
        <AntdRegistry>
          <ConfigProvider theme={theme} locale={zhCN}>
            <AuthProvider>
              <div className="flex min-h-screen flex-col">
                {children}
                <Footer />
              </div>
            </AuthProvider>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
