"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import {
  ArrowRightOutlined,
  AuditOutlined,
  FileSearchOutlined,
  LoginOutlined,
  NotificationOutlined,
  ReadOutlined,
  SafetyCertificateOutlined,
  SendOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import {
  Button,
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
  { title: "创刊时间", value: "1984", suffix: "年", span: 12 },
  { title: "当前卷期", value: "38", suffix: "卷", span: 12 },
  { title: "系统覆盖", value: "投稿、审稿、退修", suffix: "", span: 24 },
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
            <Link href={item.href} className="block w-full">
              <div className="flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors rounded-sm border border-transparent hover:border-gray-200">
                <Button shape="circle" icon={item.icon} className="shrink-0" />
                <div>
                  <Text strong className="text-[16px] text-[#1f2937]">
                    {item.title}
                  </Text>
                  <Paragraph className="!mb-0 !mt-2 !text-[14px] !leading-7 !text-[#667085]">
                    {item.description}
                  </Paragraph>
                </div>
              </div>
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
            <Link href={item.href} className="block w-full">
              <div className="flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors rounded-sm border border-transparent hover:border-gray-200">
                <Button shape="circle" icon={item.icon} className="shrink-0" />
                <div>
                  <Text strong className="text-[16px] text-[#1f2937]">
                    {item.title}
                  </Text>
                  <Paragraph className="!mb-0 !mt-2 !text-[14px] !leading-7 !text-[#667085]">
                    {item.description}
                  </Paragraph>
                </div>
              </div>
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
            <Link href={item.href} className="block w-full">
              <div className="flex items-start gap-4 p-4 hover:bg-gray-50 transition-colors rounded-sm border border-transparent hover:border-gray-200">
                <Button shape="circle" icon={item.icon} className="shrink-0" />
                <div>
                  <Text strong className="text-[16px] text-[#1f2937]">
                    {item.title}
                  </Text>
                  <Paragraph className="!mb-0 !mt-2 !text-[14px] !leading-7 !text-[#667085]">
                    {item.description}
                  </Paragraph>
                </div>
              </div>
            </Link>
          </List.Item>
        )}
      />
    ),
  },
];

export default function HomePage() {
  const { user } = useAuth();
  const quickEntryItems: EntryItem[] = [
    {
      title: user ? "进入账号" : "账号登录",
      description: user
        ? "已登录后可继续查看稿件状态、处理节点与工作台入口。"
        : "登录后可进入作者中心或编辑工作台继续办理流程。",
      href: user ? "/author" : "/login",
      icon: <LoginOutlined />,
    },
    ...entryItems,
  ];

  return (
    <div className="bg-[#f4f6f8]">
      <HeaderBar />

      <main id="main-content" className="w-full bg-white flex-1 flex flex-col" aria-label="主内容">
        {/* Hero Section with Banner Background */}
        <section 
          className="relative w-full bg-[#111827] text-white flex items-center justify-center min-h-[400px] sm:min-h-[480px] bg-cover bg-center"
          style={{ backgroundImage: `linear-gradient(to right, rgba(17, 24, 39, 0.95), rgba(17, 24, 39, 0.6)), url('/banner.jpg')` }}
        >
          <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 z-10 relative">
            <Row gutter={[24, 48]} align="middle">
              <Col xs={24} lg={14}>
                <Space direction="vertical" size={24} className="w-full">
                  <Space wrap className="opacity-80">
                    <Tag bordered={false} className="bg-white/20 text-white !border-0 text-sm py-1 px-3">CSSCI 来源期刊</Tag>
                    <Tag bordered={false} className="bg-white/20 text-white !border-0 text-sm py-1 px-3">北京大学法学院主办</Tag>
                  </Space>

                  <div>
                    <Text className="text-[13px] font-semibold uppercase tracking-[0.25em] text-[#E0B5B5] block mb-2">
                      Peking University Law Journal
                    </Text>
                    <Title level={1} className="font-serif-sc !mb-6 !mt-0 !text-white text-5xl tracking-wide">
                      《中外法学》
                    </Title>
                    <Paragraph className="!mb-0 !max-w-2xl !text-[17px] !leading-relaxed !text-gray-300">
                      欢迎来到中外法学在线编审系统。<br/>
                      本系统为您提供便捷的在线投稿、稿件追踪以及结构化的内审外审流转服务。
                    </Paragraph>
                  </div>

                  <Space wrap size="large" className="pt-4">
                    <Link href={user ? "/author" : "/submit"}>
                      <Button type="primary" size="large" className="bg-[#8B1538] hover:!bg-[#A51D45] border-none !h-12 !px-8 text-base shadow-lg hover:-translate-y-0.5 transition-transform">
                        {user ? "进入作者中心" : "立即投稿"}
                      </Button>
                    </Link>
                    <Link href="/guide">
                      <Button size="large" ghost className="!h-12 !px-8 text-base border-white/40 hover:!border-white hover:!text-white">查看投稿须知</Button>
                    </Link>
                  </Space>
                </Space>
              </Col>

              <Col xs={24} lg={10}>
                <div className="bg-white/10 backdrop-blur-md border border-white/20 p-8 rounded-sm">
                  <Title level={4} className="!text-white !mb-6 !mt-0 font-normal">期刊快览</Title>
                  <Row gutter={[24, 24]}>
                    {statistics.map((item) => (
                      <Col xs={item.span} key={item.title}>
                        <div className="border-l-2 border-[#8B1538] pl-4">
                          <div className="text-gray-400 text-sm mb-1">{item.title}</div>
                          <div className={`${item.span === 24 ? "text-4xl leading-tight" : "text-2xl"} font-semibold text-white`}>
                            {item.value} <span className="text-sm font-normal text-gray-400">{item.suffix}</span>
                          </div>
                        </div>
                      </Col>
                    ))}
                  </Row>
                </div>
              </Col>
            </Row>
          </div>
        </section>

        {/* Content Section */}
        <div className="bg-white pb-24">
          <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            
            {/* Split row for Workflows and System Access */}
            <div className="my-16 grid grid-cols-1 lg:grid-cols-12 gap-16">
              
              <div className="lg:col-span-8">
                <Title level={3} className="!font-normal !mb-8">投稿与审稿流程</Title>
                <div className="mb-12 text-[#667085] text-base">系统标准流转节点说明，各阶段进度可通过作者中心实时掌控。</div>
                <Steps
                  responsive
                  items={workflowItems.map((item) => ({
                    title: <span className="text-base font-semibold text-gray-900">{item.title}</span>,
                    description: <span className="text-[#667085] mt-2 block">{item.description}</span>,
                    icon: <div className="text-2xl text-[#8B1538]">{item.icon}</div>,
                  }))}
                  className="mt-8 custom-steps"
                />
              </div>

              <div className="lg:col-span-4">
                <div className="mb-8">
                  <Title level={3} className="!font-normal !mb-2">快速入口</Title>
                  <div className="text-[#667085] text-base">
                    常用操作与账号入口统一放在这里，直接进入对应流程。
                  </div>
                </div>
                
                <div className="flex flex-col gap-0 border-t border-[#e5e7eb]">
                  {quickEntryItems.map((item) => (
                    <Link key={item.title} href={item.href} className="group block border-b border-[#e5e7eb] py-6 transition-colors hover:bg-gray-50 px-4 -mx-4">
                       <div className="flex items-start gap-4">
                          <div className="text-[#8B1538] text-2xl bg-red-50 p-3 rounded-full group-hover:bg-[#8B1538] group-hover:text-white transition-colors">
                            {item.icon}
                          </div>
                          <div>
                            <div className="text-lg font-medium text-gray-900 mb-1 flex items-center gap-2">
                              {item.title} <ArrowRightOutlined className="text-xs opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                            </div>
                            <div className="text-[#667085] text-sm leading-relaxed">{item.description}</div>
                          </div>
                       </div>
                    </Link>
                  ))}
                </div>
              </div>

            </div>

            <Divider className="my-12 border-[#e5e7eb]" />

            {/* Services and Guide */}
            <div className="my-16">
               <div className="text-center mb-12">
                  <Title level={3} className="!font-normal !mb-4">服务办理资源</Title>
                  <Paragraph className="text-[#667085] max-w-2xl mx-auto text-base">
                    根据您的身份职责切换查看相关的指南与操作入口
                  </Paragraph>
               </div>
               
               <Tabs 
                  defaultActiveKey="submit" 
                  centered
                  size="large"
                  items={(serviceGroups || []).map(group => ({
                    ...group,
                    children: (
                      <div className="py-8 max-w-4xl mx-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-12">
                           {((group.children as any)?.props?.dataSource as ServiceItem[])?.map(item => (
                             <Link key={item.title} href={item.href} className="group block">
                               <div className="flex items-start gap-5 p-6 border border-[#e5e7eb] hover:border-[#8B1538] transition-colors h-full bg-white shadow-sm hover:shadow-md">
                                  <div className="text-[#8B1538] text-3xl group-hover:-translate-y-1 transition-transform">
                                    {item.icon}
                                  </div>
                                  <div>
                                     <div className="text-[17px] font-medium text-gray-900 mb-2">{item.title}</div>
                                     <div className="text-[#667085] text-[14px] leading-relaxed">{item.description}</div>
                                  </div>
                               </div>
                             </Link>
                           ))}
                        </div>
                      </div>
                    )
                  }))} 
                />
            </div>

            {/* Notice Footer Area */}
            <div className="mt-24 bg-gray-50 border border-[#e5e7eb] p-8 md:p-12">
              <Row gutter={[48, 32]}>
                <Col xs={24} md={14}>
                  <Text className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8B1538] block mb-2">
                    Journal Note
                  </Text>
                  <Title level={3} className="!mb-4 !mt-0 !text-gray-900 !font-normal">
                    关于本系统的使用说明
                  </Title>
                  <Paragraph className="!mb-0 !text-[15px] !leading-relaxed !text-[#667085]">
                    本系统专为在线全流程审稿设计。您当前的访问不仅限于了解期刊政策（详见学院官网），更多的作用是参与到稿件从提交、初审、外审评阅到退修核校的协作链路中去。<br/>
                    请妥善保管账号，注意审稿保密原则。
                  </Paragraph>
                </Col>
                <Col xs={24} md={10} className="flex flex-col justify-center gap-4 border-t md:border-t-0 md:border-l border-[#e5e7eb] pt-8 md:pt-0 md:pl-12">
                   <Link href="https://www.law.pku.edu.cn/" target="_blank" rel="noopener noreferrer">
                      <Button block size="large" className="text-gray-700 hover:text-black border-gray-300">
                        访问北大法学院主页
                      </Button>
                    </Link>
                    <Link href="/copyright">
                      <Button size="large" block className="text-[#8B1538] border-[#8B1538] hover:bg-red-50">
                        查阅期刊版权政策
                      </Button>
                    </Link>
                </Col>
              </Row>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
