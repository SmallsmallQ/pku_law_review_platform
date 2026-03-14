"use client";

import { useState, type ReactNode } from "react";
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
  Badge,
  Button,
  Card,
  Col,
  Divider,
  Row,
  Segmented,
  Space,
  Statistic,
  Steps,
  Tag,
  Typography,
} from "antd";
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

type StatisticItem = {
  title: string;
  value: string;
  suffix: string;
  span: 12 | 24;
  detail: string;
};

type ServiceGroup = {
  key: string;
  label: string;
  description: string;
  items: ServiceItem[];
};

const statistics: StatisticItem[] = [
  { title: "创刊时间", value: "1984", suffix: "年", span: 12, detail: "北京大学法学院主办的法学学术期刊。" },
  { title: "当前卷期", value: "38", suffix: "卷", span: 12, detail: "持续更新当期目录与编审节点信息。" },
  { title: "系统覆盖", value: "投稿、审稿、退修", suffix: "", span: 24, detail: "作者提交、编辑处理、外审流转与退修反馈均可在线协同办理。" },
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
    subTitle: "作者发起",
  },
  {
    title: "编辑初审",
    description: "根据栏目与稿件情况安排后续处理。",
    icon: <AuditOutlined />,
    subTitle: "编辑判断",
  },
  {
    title: "外审复审",
    description: "进入同行评议、退修与复审流程。",
    icon: <FileSearchOutlined />,
    subTitle: "专家评议",
  },
  {
    title: "录用归档",
    description: "完成结果通知与后续材料回传。",
    icon: <SafetyCertificateOutlined />,
    subTitle: "结果归档",
  },
];

const serviceGroups: ServiceGroup[] = [
  {
    key: "submit",
    label: "投稿服务",
    description: "作者提交前后最常用的入口，包括投稿说明、稿件提交与版权确认。",
    items: [
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
    ],
  },
  {
    key: "author",
    label: "作者服务",
    description: "围绕已提交稿件的状态跟踪、退修响应和协议确认，帮助作者持续推进流程。",
    items: [
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
    ],
  },
  {
    key: "editor",
    label: "编辑工具",
    description: "适合编辑部处理分流、外审、退修与 AI 辅助核验等内部协同工作。",
    items: [
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
    ],
  },
];

export default function HomePage() {
  const { user } = useAuth();
  const [activeServiceKey, setActiveServiceKey] = useState(serviceGroups[0]?.key ?? "submit");
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
  const activeServiceGroup = serviceGroups.find((group) => group.key === activeServiceKey) ?? serviceGroups[0];

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
                      北京大学法学院主办
                    </Text>
                    <Title level={1} className="font-serif-sc !mb-6 !mt-0 !text-white text-5xl tracking-wide">
                      《中外法学》
                    </Title>
                    <Paragraph className="!mb-0 !max-w-2xl !text-[17px] !leading-relaxed !text-gray-300">
                      欢迎来到中外法学在线编审系统。<br/>
                      本系统提供在线投稿、稿件跟踪、审稿流转与退修协作等全流程服务。
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
                <Card
                  bordered
                  className="border-white/20 bg-white/10 backdrop-blur-md"
                  styles={{ body: { padding: 32 } }}
                >
                  <Title level={4} className="!text-white !mb-6 !mt-0 font-normal">期刊快览</Title>
                  <Row gutter={[24, 24]}>
                    {statistics.map((item) => (
                      <Col xs={item.span} key={item.title}>
                        <Card
                          bordered={false}
                          className="h-full border border-white/10 bg-white/5"
                          styles={{ body: { padding: 20 } }}
                        >
                          <Statistic
                            title={<span className="text-gray-300 text-sm">{item.title}</span>}
                            value={item.value}
                            suffix={<span className="text-base font-normal text-gray-400">{item.suffix}</span>}
                            valueStyle={{
                              color: "#ffffff",
                              fontSize: item.span === 24 ? 38 : 30,
                              lineHeight: 1.2,
                              fontWeight: 700,
                            }}
                          />
                          <Text className="mt-3 block text-[13px] leading-6 text-gray-400">
                            {item.detail}
                          </Text>
                        </Card>
                      </Col>
                    ))}
                  </Row>
                </Card>
              </Col>
            </Row>
          </div>
        </section>

        {/* Content Section */}
        <div className="bg-white pb-24">
          <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            
            {/* Split row for Workflows and System Access */}
            <div className="my-16 grid grid-cols-1 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.95fr)] gap-10 xl:gap-12 items-start">
              <div className="rounded-[28px] border border-[#e5e7eb] bg-[linear-gradient(180deg,#ffffff_0%,#fbfbfc_100%)] p-8 md:p-10 shadow-[0_18px_50px_rgba(15,23,42,0.04)]">
                <div className="max-w-2xl">
                  <Text className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#8B1538] block mb-3">
                    流程概览
                  </Text>
                  <Title level={3} className="!font-normal !mb-4">投稿与审稿流程</Title>
                  <div className="text-[#667085] text-base leading-8">
                    稿件从投稿入库到审稿、退修、终审与归档的主要节点，都可在对应工作台持续查看与处理。
                  </div>
                </div>

                <Card
                  bordered={false}
                  className="mt-10 rounded-[24px] border border-[#ead7dd] bg-[#fffafb] shadow-[0_10px_30px_rgba(139,21,56,0.06)]"
                  styles={{ body: { padding: 24 } }}
                >
                  <Steps
                    current={1}
                    responsive
                    items={workflowItems.map((item, index) => ({
                      title: <span className="text-base font-semibold text-gray-900">{item.title}</span>,
                      subTitle: item.subTitle,
                      description: <span className="text-[#667085] mt-2 block leading-7">{item.description}</span>,
                      status: index === 0 ? "finish" : index === 1 ? "process" : "wait",
                      icon: <div className="text-2xl text-[#8B1538]">{item.icon}</div>,
                    }))}
                  />
                </Card>
              </div>

              <div className="rounded-[28px] border border-[#e5e7eb] bg-white p-8 shadow-[0_18px_50px_rgba(15,23,42,0.05)]">
                <div className="mb-8">
                  <Text className="text-[12px] font-semibold uppercase tracking-[0.24em] text-[#8B1538] block mb-3">
                    常用入口
                  </Text>
                  <Title level={3} className="!font-normal !mb-3">快速入口</Title>
                  <div className="text-[#667085] text-base leading-8">
                    常用账号入口与流程办理集中展示，可按当前身份直接进入对应页面。
                  </div>
                </div>
                
                <div className="flex flex-col gap-0 border-t border-[#e5e7eb]">
                  {quickEntryItems.map((item) => (
                    <Link key={item.title} href={item.href} className="group block border-b border-[#e5e7eb] py-6 transition-colors hover:bg-[#fbfbfc] px-2">
                       <div className="flex items-start gap-4">
                          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-[#fdf1f3] text-2xl text-[#8B1538] transition-colors group-hover:bg-[#8B1538] group-hover:text-white">
                            {item.icon}
                          </div>
                          <div className="pt-1">
                            <div className="text-[17px] font-medium text-gray-900 mb-1 flex items-center gap-2">
                              {item.title} <ArrowRightOutlined className="text-xs opacity-0 -translate-x-2 transition-all group-hover:opacity-100 group-hover:translate-x-0" />
                            </div>
                            <div className="text-[#667085] text-[15px] leading-8">{item.description}</div>
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
                    按身份查看对应的办理说明、系统入口与常用功能。
                  </Paragraph>
               </div>
               
               <div className="mx-auto max-w-5xl">
                 <Segmented
                   block
                   size="large"
                   value={activeServiceKey}
                   onChange={(value) => setActiveServiceKey(String(value))}
                   options={serviceGroups.map((group) => ({ label: group.label, value: group.key }))}
                   className="mb-8"
                 />

                 <Card bordered={false} className="border border-[#e5e7eb] bg-[#fcfcfd]" styles={{ body: { padding: 28 } }}>
                   <div className="mb-8">
                     <Text className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#8B1538] block mb-2">
                       {activeServiceGroup.label}
                     </Text>
                     <Paragraph className="!mb-0 !text-[15px] !leading-7 !text-[#667085]">
                       {activeServiceGroup.description}
                     </Paragraph>
                   </div>

                   <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                     {activeServiceGroup.items.map((item) => (
                       <Link key={item.title} href={item.href} className="group block">
                         <Card
                           hoverable
                           bordered={false}
                           className="h-full border border-[#e5e7eb] shadow-sm transition-all group-hover:border-[#8B1538] group-hover:shadow-md"
                           styles={{ body: { padding: 24 } }}
                         >
                           <div className="flex items-start gap-5">
                             <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-2xl text-[#8B1538] transition-transform group-hover:-translate-y-1">
                               {item.icon}
                             </div>
                             <div>
                               <div className="mb-2 text-[17px] font-medium text-gray-900">{item.title}</div>
                               <div className="text-[14px] leading-7 text-[#667085]">{item.description}</div>
                             </div>
                           </div>
                         </Card>
                       </Link>
                     ))}
                   </div>
                 </Card>
               </div>
            </div>

            {/* Notice Footer Area */}
            <div className="mt-24 rounded-[28px] border border-[#e5e7eb] bg-[linear-gradient(180deg,#fbfbfc_0%,#f7f7f8_100%)] p-8 shadow-[0_18px_50px_rgba(15,23,42,0.04)] md:p-12">
              <Row gutter={[48, 32]}>
                <Col xs={24} md={14}>
                  <Space size={10} align="center" className="mb-2">
                    <NotificationOutlined className="text-[#8B1538]" />
                    <Text className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8B1538]">
                      使用说明
                    </Text>
                  </Space>
                  <Title level={3} className="!mb-4 !mt-0 !text-gray-900 !font-normal">
                    关于本系统的使用说明
                  </Title>
                  <Paragraph className="!mb-0 !text-[15px] !leading-relaxed !text-[#667085]">
                    本系统主要用于稿件在线投稿、审稿流转、退修沟通与结果反馈。期刊目录、政策与正式发布内容请以学院官网和期刊公开信息为准。<br/>
                    请妥善保管账号，注意审稿保密原则。
                  </Paragraph>
                  <div className="mt-8 space-y-3">
                    {noticeItems.map((item) => (
                      <div key={item.type} className="flex items-start gap-3 rounded-sm border border-white bg-white px-4 py-3">
                        <Badge color={item.color} />
                        <div className="text-sm leading-6 text-[#667085]">
                          <Text strong className="mr-2 text-gray-900">{item.type}</Text>
                          {item.href ? (
                            <Link href={item.href} className="text-[#667085] hover:text-[#8B1538]">
                              {item.text}
                            </Link>
                          ) : (
                            <span>{item.text}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
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
