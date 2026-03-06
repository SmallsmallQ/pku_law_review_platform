"use client";

import Link from "next/link";
import { Button, Card, Col, Divider, List, Row, Space, Typography } from "antd";
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
  { label: "投稿须知", href: "/submit" },
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
      <section className="relative min-h-[320px] w-full overflow-hidden bg-[#8B1538] md:min-h-[380px]">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              "url(/banner.jpg), linear-gradient(135deg, #8B1538 0%, #5c0e26 50%, #70122e 100%)",
          }}
        />
        <div className="absolute inset-0 bg-[#8B1538]/75" />
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

      <div className="relative z-10 mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <Row gutter={[24, 24]}>
          {/* 左栏：期刊封面 + 投稿指南 + 期刊介绍（参考官网布局） */}
          <Col xs={24} md={8} lg={6}>
            <Space direction="vertical" size="middle" className="w-full">
              <JournalCoverCard />
              <Card size="small" className="!border-[#e0ddd8]">
                <div className="space-y-3">
                  <Link href="/submit" className="flex items-center gap-2 text-[#333] hover:text-[#8B1538]">
                    <span className="text-[#8B1538]">✎</span>
                    <span className="font-medium">投稿指南</span>
                  </Link>
                  <Link href="/submit" className="flex items-center gap-2 text-[#333] hover:text-[#8B1538]">
                    <span className="text-[#8B1538]">▷</span>
                    <span className="font-medium">投稿要求</span>
                  </Link>
                </div>
              </Card>
              <Card title="期刊介绍" size="small" className="!border-[#e0ddd8]">
                <Paragraph className="!mb-0 text-[#555] text-sm">
                  《中外法学》由北京大学法学院主办，CSSCI 来源期刊。本系统提供在线投稿、稿件管理与 AI 辅助初审。
                </Paragraph>
              </Card>
            </Space>
          </Col>

          {/* 中栏：目录 + 服务与指南 + 通知公告 + 新闻等 */}
          <Col xs={24} md={16} lg={11}>
            <Card
              title={
                <span className="text-base font-semibold text-[#333]">
                  目录第 38 卷（2026）第 1 期（总第 223 期）
                </span>
              }
              extra={<Link href="https://www.law.pku.edu.cn/" target="_blank" rel="noopener noreferrer" className="text-[#8B1538] hover:underline">MORE+</Link>}
              className="mb-4 !border-[#e0ddd8]"
            >
              <Paragraph className="!mb-0 text-[#555] text-sm">
                目录与全文请见本刊官网；本系统提供投稿与审稿服务。
              </Paragraph>
            </Card>

            <Divider orientation="center" className="!text-base font-semibold !text-[#333]">
              服务与指南
            </Divider>
            <Row gutter={[16, 16]}>
              <Col xs={24} sm={12}>
                <Card
                  title="作者服务"
                  size="small"
                  className="h-full !border-[#8B1538]"
                  styles={{ header: { background: "#8B1538", color: "#fff", borderRadius: "6px 6px 0 0" } }}
                >
                  <List
                    size="small"
                    dataSource={serviceLinks[0]}
                    renderItem={(item) => (
                      <List.Item className="!border-0 !py-1">
                        <Link href={item.href} className="text-[#8B1538] hover:underline">
                          — {item.label}
                        </Link>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12}>
                <Card
                  title="编审系统"
                  size="small"
                  className="h-full !border-[#8B1538]"
                  styles={{ header: { background: "#8B1538", color: "#fff", borderRadius: "6px 6px 0 0" } }}
                >
                  <List
                    size="small"
                    dataSource={serviceLinks[1]}
                    renderItem={(item) => (
                      <List.Item className="!border-0 !py-1">
                        <Link href={item.href} className="text-[#8B1538] hover:underline">
                          — {item.label}
                        </Link>
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
            </Row>

            <Row gutter={[16, 16]} className="mt-4">
              <Col xs={24} sm={12}>
                <Card title="通知公告" size="small" extra={<Link href="/submit">更多</Link>} className="!border-[#e0ddd8]">
                  <List
                    size="small"
                    dataSource={noticeData}
                    renderItem={(item) => (
                      <List.Item className="!border-0 !py-1.5">
                        {item.href ? (
                          <Link href={item.href} className="text-[#333] hover:text-[#8B1538] text-sm">
                            {item.text}
                          </Link>
                        ) : (
                          <Text className="text-[#333] text-sm">{item.text}</Text>
                        )}
                      </List.Item>
                    )}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={12}>
                <Card title="在线投稿" size="small" className="!border-2 !border-[#8B1538]">
                  <Paragraph className="!mb-3 text-[#555] text-sm">
                    请先注册/登录后提交稿件
                  </Paragraph>
                  <div className="flex flex-wrap gap-2">
                    <Link href="/submit">
                      <Button type="primary" size="small">
                        投稿入口
                      </Button>
                    </Link>
                    <Link href="/author">
                      <Button size="small">作者中心</Button>
                    </Link>
                  </div>
                </Card>
              </Col>
            </Row>

            <Card
              title="新闻动态"
              size="small"
              extra={<Link href="/submit" className="text-[#8B1538]">MORE+</Link>}
              className="mt-4 !border-[#e0ddd8]"
            >
              <List
                size="small"
                dataSource={newsData}
                renderItem={(item) => (
                  <List.Item className="!border-0 !py-1.5 !pl-0">
                    <span className="mr-2 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-[#8B1538] align-middle" />
                    {item.href ? (
                      <Link href={item.href} className="text-[#333] hover:text-[#8B1538] text-sm">
                        {item.text}
                      </Link>
                    ) : (
                      <Text className="text-sm">{item.text}</Text>
                    )}
                  </List.Item>
                )}
              />
            </Card>

            <Card title="联系我们" size="small" className="mt-4 !border-[#e0ddd8]">
              <Paragraph className="!mb-0 text-[#555] text-sm">
                编辑部地址：北京市海淀区颐和园路 5 号北京大学法学院
                <br />
                投稿与咨询请通过本系统「作者中心」或「投稿入口」操作。
              </Paragraph>
            </Card>
          </Col>

          {/* 右栏：搜索 + 系统入口 + 新闻动态 */}
          <Col xs={24} md={24} lg={7}>
            <HomeSidebar />
          </Col>
        </Row>
      </div>

      <footer className="mt-16 border-t border-[#ebeae6] bg-white py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Row gutter={24} justify="space-between">
            <Col>
              <Text type="secondary">电话：(8610) 62751691</Text>
              <br />
              <Text type="secondary">邮箱：journal@law.pku.edu.cn</Text>
            </Col>
            <Col>
              <Space size="middle">
                <Link href="/" className="text-[#8B1538] hover:underline">首页</Link>
                <Link href="/submit" className="text-[#8B1538] hover:underline">投稿入口</Link>
                <Link href="/author" className="text-[#8B1538] hover:underline">作者中心</Link>
                <Link href="/login" className="text-[#8B1538] hover:underline">登录</Link>
              </Space>
            </Col>
          </Row>
          <Divider className="!my-4" />
          <div className="text-center">
            <Text type="secondary" className="text-sm">
              版权所有 © 中外法学 · 智能编审系统
            </Text>
          </div>
        </div>
      </footer>
    </div>
  );
}
