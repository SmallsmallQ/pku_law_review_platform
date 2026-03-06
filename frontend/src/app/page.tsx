"use client";

import Link from "next/link";
import { Button, Card, Col, List, Row, Space, Typography } from "antd";
import HeaderBar from "@/components/HeaderBar";
import HomeSidebar from "@/components/HomeSidebar";
import JournalCoverCard from "@/components/JournalCoverCard";

const { Title, Text, Paragraph } = Typography;

const noticeItems = [
  { href: "/submit", text: "本刊实行在线投稿，请通过「投稿入口」提交" },
  { href: "/author", text: "作者可登录作者中心查看审稿状态与退修意见" },
  { text: "审稿周期约 2–3 个月" },
];

const serviceLinks = [
  { label: "投稿须知", href: "/guide" },
  { label: "审稿流程", href: "/author" },
  { label: "作者中心", href: "/author" },
  { label: "投稿入口", href: "/submit" },
  { label: "编辑工作台", href: "/editor" },
  { label: "联系我们", href: "/" },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#f9f8f5]">
      <HeaderBar />

      {/* 主视觉区 */}
      <section className="relative min-h-[320px] w-full overflow-hidden bg-[#8B1538] md:min-h-[380px]" aria-label="期刊标题与简介">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              "url(/banner.jpg), linear-gradient(135deg, #8B1538 0%, #5c0e26 50%, #70122e 100%)",
          }}
          aria-hidden
        />
        <div className="absolute inset-0 bg-[#8B1538]/75" aria-hidden />
        <div className="relative mx-auto flex min-h-[320px] max-w-6xl flex-col items-center justify-center px-6 py-16 text-center text-white md:min-h-[380px]">
          <Title level={1} className="!mb-3 !text-white !tracking-tight drop-shadow md:!text-4xl lg:!text-5xl">
            《中外法学》
          </Title>
          <Text className="text-lg text-white/95 md:text-xl">
            北京大学法学院主办 · 法学类核心期刊
          </Text>
          <Text className="mt-2 block text-sm text-white/80">
            智能编审系统 — 投稿管理 · AI 辅助初审
          </Text>
        </div>
      </section>

      <main id="main-content" className="relative z-10 mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8" aria-label="主内容">
        <Row gutter={[32, 24]}>
          {/* 左栏：期刊封面 + 投稿与简介 */}
          <Col xs={24} lg={8}>
            <Space direction="vertical" size="middle" className="w-full">
              <JournalCoverCard />
              <Card size="small" className="!border-[#e0ddd8]">
                <div className="space-y-2">
                  <Link href="/guide" className="block text-[#333] hover:text-[#8B1538] text-sm font-medium">
                    投稿须知
                  </Link>
                  <Link href="/submit" className="block text-[#333] hover:text-[#8B1538] text-sm font-medium">
                    投稿入口
                  </Link>
                </div>
                <Paragraph className="!mb-0 !mt-3 text-[#666] text-xs border-t border-[#eee] pt-3">
                  《中外法学》由北京大学法学院主办，CSSCI 来源期刊。本系统提供在线投稿与 AI 辅助初审。
                </Paragraph>
              </Card>
            </Space>
          </Col>

          {/* 中栏：目录 + 服务链接 + 通知与投稿（合并为三块） */}
          <Col xs={24} lg={10}>
            <Card size="small" className="mb-4 !border-[#e0ddd8]">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[#333] font-medium text-sm">目录第 38 卷（2026）第 1 期</span>
                <a href="https://www.law.pku.edu.cn/" target="_blank" rel="noopener noreferrer" className="text-[#8B1538] text-sm hover:underline">
                  MORE+
                </a>
              </div>
              <Paragraph className="!mb-0 mt-1 text-[#666] text-xs">
                目录与全文见本刊官网；本系统负责投稿与审稿。
              </Paragraph>
            </Card>

            <Card title="服务与指南" size="small" className="mb-4 !border-[#e0ddd8]">
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                {serviceLinks.map((item) => (
                  <Link key={item.label} href={item.href} className="text-[#8B1538] hover:underline">
                    {item.label}
                  </Link>
                ))}
              </div>
            </Card>

            <Card size="small" className="!border-[#e0ddd8]">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="text-[#333] font-medium text-sm mb-2">通知</div>
                  <List
                    size="small"
                    dataSource={noticeItems}
                    renderItem={(item) => (
                      <List.Item className="!border-0 !py-0.5 !px-0">
                        {item.href ? (
                          <Link href={item.href} className="text-[#555] hover:text-[#8B1538] text-sm">
                            {item.text}
                          </Link>
                        ) : (
                          <span className="text-[#555] text-sm">{item.text}</span>
                        )}
                      </List.Item>
                    )}
                  />
                </div>
                <div className="shrink-0">
                  <div className="text-[#333] font-medium text-sm mb-2">投稿</div>
                  <Space direction="vertical" size="small">
                    <Link href="/submit">
                      <Button type="primary" size="small" className="!bg-[#8B1538] hover:!bg-[#70122e]">
                        投稿入口
                      </Button>
                    </Link>
                    <Link href="/author">
                      <Button size="small">作者中心</Button>
                    </Link>
                  </Space>
                </div>
              </div>
            </Card>
          </Col>

          {/* 右栏：仅系统入口（三个主操作） */}
          <Col xs={24} lg={6}>
            <HomeSidebar />
          </Col>
        </Row>
      </main>
    </div>
  );
}
