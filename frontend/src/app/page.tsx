"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRightOutlined,
  AuditOutlined,
  FileSearchOutlined,
  NotificationOutlined,
  ReadOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import {
  Button,
  Card,
  Col,
  Divider,
  List,
  Row,
  Space,
  Statistic,
  Steps,
  Tabs,
  Tag,
  Typography,
} from "antd";
import type { TabsProps } from "antd";
import HeaderBar from "@/components/HeaderBar";
import { useAuth } from "@/contexts/AuthContext";

const { Paragraph, Text, Title } = Typography;

type EntryItem = {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
};

type NoticeItem = {
  type: string;
  text: string;
  href?: string;
  color: string;
};

type ServiceItem = {
  title: string;
  description: string;
  href: string;
  icon: ReactNode;
};

const statistics = [
  { title: "创刊时间", value: "1984", suffix: "年" },
  { title: "当前卷期", value: "38", suffix: "卷" },
  { title: "系统覆盖", value: "投稿、审稿、退修", suffix: "" },
];

const entryItems: EntryItem[] = [
  {
    title: "作者投稿",
    description: "在线填写稿件信息并上传稿件附件。",
    href: "/submit",
    icon: <SendOutlined />,
  },
  {
    title: "作者中心",
    description: "查看稿件状态、退修意见与处理节点。",
    href: "/author",
    icon: <TeamOutlined />,
  },
  {
    title: "编辑工作台",
    description: "处理初审、外审与流程推进。",
    href: "/editor",
    icon: <AuditOutlined />,
  },
];

const noticeItems: NoticeItem[] = [
  {
    type: "投稿",
    text: "本刊实行在线投稿，请通过投稿入口提交稿件。",
    href: "/submit",
    color: "volcano",
  },
  {
    type: "跟踪",
    text: "作者登录后可在作者中心查看稿件状态与退修意见。",
    href: "/author",
    color: "blue",
  },
  {
    type: "说明",
    text: "目录与全文以期刊官网为准，本站主要用于编审流程办理。",
    color: "gold",
  },
];

const workflowItems = [
  {
    title: "在线投稿",
    description: "填写标题、摘要、关键词并上传稿件。",
    icon: <SendOutlined />,
  },
  {
    title: "编辑初审",
    description: "根据栏目与稿件情况安排后续处理。",
    icon: <AuditOutlined />,
  },
  {
    title: "外审复审",
    description: "进入同行评议、退修与复审流程。",
    icon: <FileSearchOutlined />,
  },
  {
    title: "录用归档",
    description: "完成结果通知与后续材料回传。",
    icon: <SafetyCertificateOutlined />,
  },
];

const serviceGroups: TabsProps["items"] = [
  {
    key: "submit",
    label: "投稿服务",
    children: (
      <List
        grid={{ gutter: 16, xs: 1, md: 2 }}
        dataSource={[
          {
            title: "投稿入口",
            description: "在线填写稿件信息并上传 Word、PDF 等稿件文件。",
            href: "/submit",
            icon: <SendOutlined />,
          },
          {
            title: "投稿须知",
            description: "查看栏目方向、格式要求与版权协议说明。",
            href: "/guide",
            icon: <ReadOutlined />,
          },
        ] satisfies ServiceItem[]}
        renderItem={(item) => (
          <List.Item>
            <Link href={item.href} className="block">
              <Card hoverable={false}>
                <Space align="start" size={16}>
                  <Button shape="circle" icon={item.icon} />
                  <div>
                    <Text strong className="text-[16px] text-[#1f2937]">
                      {item.title}
                    </Text>
                    <Paragraph className="!mb-0 !mt-2 !text-[14px] !leading-7 !text-[#667085]">
                      {item.description}
                    </Paragraph>
                  </div>
                </Space>
              </Card>
            </Link>
          </List.Item>
        )}
      />
    ),
  },
  {
    key: "author",
    label: "作者服务",
    children: (
      <List
        grid={{ gutter: 16, xs: 1, md: 2 }}
        dataSource={[
          {
            title: "作者中心",
            description: "统一查看状态、历史记录与退修要求。",
            href: "/author",
            icon: <TeamOutlined />,
          },
          {
            title: "版权协议",
            description: "提交前确认版权转让协议与相关要求。",
            href: "/copyright",
            icon: <SafetyCertificateOutlined />,
          },
        ] satisfies ServiceItem[]}
        renderItem={(item) => (
          <List.Item>
            <Link href={item.href} className="block">
              <Card hoverable={false}>
                <Space align="start" size={16}>
                  <Button shape="circle" icon={item.icon} />
                  <div>
                    <Text strong className="text-[16px] text-[#1f2937]">
                      {item.title}
                    </Text>
                    <Paragraph className="!mb-0 !mt-2 !text-[14px] !leading-7 !text-[#667085]">
                      {item.description}
                    </Paragraph>
                  </div>
                </Space>
              </Card>
            </Link>
          </List.Item>
        )}
      />
    ),
  },
  {
    key: "editor",
    label: "编辑工具",
    children: (
      <List
        grid={{ gutter: 16, xs: 1, md: 2 }}
        dataSource={[
          {
            title: "编辑工作台",
            description: "处理稿件分流、外审安排与节点推进。",
            href: "/editor",
            icon: <AuditOutlined />,
          },
          {
            title: "AI 检测",
            description: "作为辅助工具查看机器生成风险提示。",
            href: "/ai-detect",
            icon: <FileSearchOutlined />,
          },
        ] satisfies ServiceItem[]}
        renderItem={(item) => (
          <List.Item>
            <Link href={item.href} className="block">
              <Card hoverable={false}>
                <Space align="start" size={16}>
                  <Button shape="circle" icon={item.icon} />
                  <div>
                    <Text strong className="text-[16px] text-[#1f2937]">
                      {item.title}
                    </Text>
                    <Paragraph className="!mb-0 !mt-2 !text-[14px] !leading-7 !text-[#667085]">
                      {item.description}
                    </Paragraph>
                  </div>
                </Space>
              </Card>
            </Link>
          </List.Item>
        )}
      />
    ),
  },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="bg-[#f4f6f8]">
      <HeaderBar />

      <main id="main-content" className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8" aria-label="主内容">
        <Row gutter={[24, 24]}>
          <Col xs={24} xl={16}>
            <Card styles={{ body: { padding: 32 } }}>
              <Space direction="vertical" size={20} className="w-full">
                <Space wrap>
                  <Tag color="volcano">CSSCI 来源期刊</Tag>
                  <Tag color="default">北京大学法学院主办</Tag>
                  <Tag color="default">在线编审系统</Tag>
                </Space>

                <div>
                  <Text className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8B1538]">
                    Peking University Law Journal
                  </Text>
                  <Title level={1} className="font-serif-sc !mb-3 !mt-3 !text-[#1f2937]">
                    《中外法学》
                  </Title>
                  <Paragraph className="!mb-0 !max-w-3xl !text-[16px] !leading-8 !text-[#667085]">
                    这是新的 Ant Design 基座首页。页面结构先回到标准组件体系，后续我们就在这套骨架上逐页迁移作者中心、编辑工作台和管理后台，不再继续手工堆样式。
                  </Paragraph>
                </div>

                <Space wrap>
                  <Link href={user ? "/author" : "/submit"}>
                    <Button type="primary" size="large">
                      {user ? "进入作者中心" : "立即投稿"}
                    </Button>
                  </Link>
                  <Link href="/guide">
                    <Button size="large">查看投稿须知</Button>
                  </Link>
                </Space>

                <Row gutter={[16, 16]}>
                  {statistics.map((item) => (
                    <Col key={item.title} xs={24} md={8}>
                      <Card size="small">
                        <Statistic title={item.title} value={item.value} suffix={item.suffix} />
                      </Card>
                    </Col>
                  ))}
                </Row>
              </Space>
            </Card>
          </Col>

          <Col xs={24} xl={8}>
            <Card title="系统入口" extra={<Link href="/submit">投稿入口</Link>} styles={{ body: { padding: 0 } }}>
              <List
                itemLayout="horizontal"
                dataSource={entryItems}
                renderItem={(item) => (
                  <List.Item className="!px-6 !py-5">
                    <List.Item.Meta
                      avatar={<Button shape="circle" icon={item.icon} />}
                      title={<Link href={item.href}>{item.title}</Link>}
                      description={item.description}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>

          <Col xs={24} xl={16}>
            <Card title="投稿与审稿流程">
              <Paragraph className="!mb-6 !text-[15px] !leading-8 !text-[#667085]">
                先用 Ant Design 的 `Steps` 把整个流转节奏讲清楚，避免用户进入系统后不知道下一步该做什么。
              </Paragraph>
              <Steps
                responsive
                items={workflowItems.map((item) => ({
                  title: item.title,
                  description: item.description,
                  icon: item.icon,
                }))}
              />
            </Card>
          </Col>

          <Col xs={24} xl={8}>
            <Card title="通知与说明" extra={<NotificationOutlined />}>
              <List
                itemLayout="horizontal"
                dataSource={noticeItems}
                renderItem={(item) => (
                  <List.Item>
                    <Space align="start" size={12}>
                      <Tag color={item.color} className="!mr-0">
                        {item.type}
                      </Tag>
                      <div>
                        {item.href ? (
                          <Link href={item.href} className="text-[#1f2937] hover:text-[#8B1538]">
                            {item.text}
                          </Link>
                        ) : (
                          <Text className="text-[#1f2937]">{item.text}</Text>
                        )}
                      </div>
                    </Space>
                  </List.Item>
                )}
              />

              <Divider />

              <Space direction="vertical" size={12} className="w-full">
                <Text strong>当前推荐操作</Text>
                <Text className="text-[#667085]">
                  {user
                    ? "继续在作者中心查看稿件进度，或前往投稿入口提交新稿。"
                    : "先注册或登录账号，再进入投稿入口完成稿件提交。"}
                </Text>
              </Space>
            </Card>
          </Col>

          <Col xs={24}>
            <Card title="服务与指南">
              <Tabs defaultActiveKey="submit" items={serviceGroups} />
            </Card>
          </Col>

          <Col xs={24}>
            <Card>
              <Row gutter={[24, 24]} align="middle">
                <Col xs={24} md={16}>
                  <Text className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8B1538]">
                    Journal Note
                  </Text>
                  <Title level={3} className="!mb-2 !mt-3 !text-[#1f2937]">
                    目录与全文请以官网内容为准
                  </Title>
                  <Paragraph className="!mb-0 !text-[15px] !leading-8 !text-[#667085]">
                    当前系统聚焦在线投稿、稿件状态跟踪、编辑流转与作者退修回传。后续迁移会继续沿用这一套 Ant Design 页面骨架，而不是重新发明一套视觉体系。
                  </Paragraph>
                </Col>
                <Col xs={24} md={8}>
                  <Space direction="vertical" size={12} className="w-full">
                    <Link href="https://www.law.pku.edu.cn/" target="_blank" rel="noopener noreferrer">
                      <Button block>访问期刊官网</Button>
                    </Link>
                    <Link href="/copyright">
                      <Button type="primary" block icon={<ArrowRightOutlined />}>
                        查看版权协议
                      </Button>
                    </Link>
                  </Space>
                </Col>
              </Row>
            </Card>
          </Col>
        </Row>
      </main>
    </div>
  );
}
