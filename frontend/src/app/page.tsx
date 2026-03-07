"use client";

import Link from "next/link";
import { Button, Typography } from "antd";
import { ArrowRightOutlined } from "@ant-design/icons";
import HeaderBar from "@/components/HeaderBar";
import { useAuth } from "@/contexts/AuthContext";

const { Title, Text, Paragraph } = Typography;

const noticeItems = [
  { type: "投稿", href: "/submit", text: "本刊实行在线投稿，请通过「投稿入口」提交" },
  { type: "跟踪", href: "/author", text: "作者可登录作者中心查看审稿状态与退修意见" },
  { type: "周期", text: "审稿周期约 2-3 个月，退修后优先复审" },
];

const serviceLinks = [
  { label: "投稿须知", href: "/guide" },
  { label: "审稿流程", href: "/author" },
  { label: "作者中心", href: "/author" },
  { label: "投稿入口", href: "/submit" },
  { label: "编辑工作台", href: "/editor" },
  { label: "版权转让协议", href: "/copyright" },
];

const actionLinks = [
  { label: "作者投稿", desc: "提交新稿并上传附件", href: "/submit" },
  { label: "编辑审稿", desc: "处理初审与编务流转", href: "/editor" },
  { label: "作者中心", desc: "查看状态与退修意见", href: "/author" },
];

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="bg-[#f5f6f8]">
      <HeaderBar />

      <section className="relative min-h-[320px] w-full overflow-hidden bg-[#8B1538] md:min-h-[360px]" aria-label="期刊标题与简介">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center bg-no-repeat"
          style={{
            backgroundImage:
              "url(/banner.jpg), linear-gradient(135deg, #8B1538 0%, #5c0e26 50%, #70122e 100%)",
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 z-10"
          style={{
            background:
              "linear-gradient(90deg, rgba(139,21,56,0.70) 0%, rgba(139,21,56,0.55) 52%, rgba(95,16,41,0.74) 100%)",
          }}
          aria-hidden
        />
        <div className="absolute inset-0 z-10 bg-[rgba(101,18,44,0.22)]" aria-hidden />
        <div className="relative z-20 flex min-h-[320px] w-full flex-col items-center justify-center px-6 py-16 text-center text-white md:min-h-[360px] sm:px-8 lg:px-10 xl:px-12 2xl:px-16">
          <Title level={1} className="font-serif-sc !mb-3 !text-white !tracking-tight drop-shadow md:!text-4xl lg:!text-5xl">
            《中外法学》
          </Title>
          <Text className="text-lg text-white/95 md:text-xl">北京大学法学院主办 · 法学类核心期刊</Text>
          <Text className="mt-2 block text-sm text-white/80">智能编审系统 — 投稿管理 · AI 辅助初审</Text>
        </div>
      </section>

      <main id="main-content" className="relative pb-0" aria-label="主内容">
        <div
          className="pointer-events-none absolute inset-0 z-0 opacity-[0.06]"
          style={{ backgroundImage: "url(/banner.jpg)", backgroundPosition: "center", backgroundSize: "cover" }}
          aria-hidden
        />
        <section className="relative z-10">
          <div className="w-full px-4 sm:px-6 lg:px-8 2xl:px-10">
            <div className="border-b border-[#d7dce5] py-5 text-base text-[#4f5563]">
              目录与全文以官网为准，本系统用于投稿、审稿流转与作者回传。
            </div>

            <div className="relative grid lg:grid-cols-[280px_minmax(0,1fr)_320px]">
              <aside className="border-b border-[#dfe4ec] py-8 lg:border-b-0 lg:border-r lg:pr-8">
              <Text className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#8B1538]">Peking University Law Journal</Text>
              <Title level={2} className="font-serif-sc !mb-0 !mt-4 !text-[40px] !font-semibold !tracking-tight !text-[#2d313d] whitespace-nowrap">
                《中外法学》
              </Title>
              <div className="mt-5 space-y-1 text-[18px] leading-8 text-[#5f6573]">
                <p className="m-0">创刊时间：1984 年</p>
                <p className="m-0">2026 年刊期：第 38 卷</p>
              </div>
              <Link href="/submit" className="mt-6 inline-flex items-center gap-1 text-[18px] font-semibold text-[#8B1538] hover:underline">
                投稿入口 <ArrowRightOutlined />
              </Link>

              <Paragraph className="!mb-0 !mt-10 border-t border-[#e6eaf0] pt-6 !text-[16px] !leading-9 !text-[#59606f]">
                《中外法学》由北京大学法学院主办，CSSCI 来源期刊。系统支持在线投稿、审稿跟踪与退修上传。
              </Paragraph>
              </aside>

              <div className="border-b border-[#dfe4ec] py-8 lg:border-b-0 lg:border-r lg:px-8">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#e6eaf0] pb-5">
                <div>
                  <Text className="text-sm font-semibold uppercase tracking-[0.14em] text-[#8B1538]">当期目录</Text>
                  <Title level={3} className="font-serif-sc !mb-0 !mt-2 !text-[38px] !font-semibold !text-[#2e3340] whitespace-nowrap">第 38 卷（2026）第 1 期</Title>
                </div>
                <a href="https://www.law.pku.edu.cn/" target="_blank" rel="noopener noreferrer" className="text-[18px] font-semibold text-[#8B1538] hover:underline">
                  MORE+
                </a>
                </div>

                <Paragraph className="!mb-0 !mt-5 !text-[18px] !leading-9 !text-[#5a6170]">
                  目录与全文见本刊官网；本系统负责投稿、审稿流转与作者回传。
                </Paragraph>

                <div className="mt-8 border-t border-[#e6eaf0] pt-6">
                  <Text className="text-[24px] font-semibold text-[#2e3340]">服务与指南</Text>
                  <div className="mt-4 flex flex-wrap gap-x-6 gap-y-3 text-[18px]">
                    {serviceLinks.map((item) => (
                      <Link key={item.label} href={item.href} className="text-[#8B1538] hover:underline">
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>

                <div className="mt-8 border-t border-[#e6eaf0] pt-6">
                  <Text className="text-[24px] font-semibold text-[#2e3340]">通知</Text>
                  <div className="mt-4 space-y-4">
                    {noticeItems.map((item) => (
                      <div key={item.text} className="flex items-start gap-3">
                        <span className="mt-0.5 rounded-sm bg-[#8B1538] px-2 py-0.5 text-xs font-semibold text-white">{item.type}</span>
                        {item.href ? (
                          <Link href={item.href} className="text-[16px] text-[#4f5563] hover:text-[#8B1538]">
                            {item.text}
                          </Link>
                        ) : (
                          <span className="text-[16px] text-[#4f5563]">{item.text}</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <aside className="py-8 lg:pl-8">
                <Text className="text-[24px] font-semibold text-[#2e3340]">系统入口</Text>
                <Paragraph className="!mb-0 !mt-3 !text-[16px] !leading-8 !text-[#626978]">
                  投稿、审稿、查看进度一站完成。{user ? "当前账号已登录。" : "请先登录后使用完整功能。"}
                </Paragraph>

                <div className="mt-6 space-y-4">
                  {actionLinks.map((item) => (
                    <div key={item.label} className="flex items-center justify-between border-b border-[#eceff4] pb-4">
                      <div>
                        <p className="m-0 text-[20px] font-semibold text-[#2d313d]">{item.label}</p>
                        <p className="m-0 mt-1 text-[15px] text-[#6a7180]">{item.desc}</p>
                      </div>
                      <Link href={item.href}>
                        <Button type="primary" size="middle" className="!h-11 !rounded !border-0 !bg-[#8B1538] !px-6 text-base hover:!bg-[#70122e]">
                          进入
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              </aside>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
