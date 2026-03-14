"use client";

import type { ReactNode } from "react";
import { Divider, Space, Typography } from "antd";
import HeaderBar from "@/components/HeaderBar";

const { Paragraph, Text, Title } = Typography;

type HighlightItem = {
  icon: ReactNode;
  title: string;
  description: string;
};

type AuthShellProps = {
  eyebrow: string;
  title: string;
  subtitle: string;
  highlights: HighlightItem[];
  children: ReactNode;
  footer?: ReactNode;
};

export default function AuthShell({
  eyebrow,
  title,
  subtitle,
  highlights,
  children,
  footer,
}: AuthShellProps) {
  return (
    <div className="bg-white min-h-screen flex flex-col">
      <HeaderBar />
      <main
        id="main-content"
        className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 lg:px-8 flex-1 flex flex-col justify-center"
        aria-label={title}
      >
        <div className="grid gap-16 lg:grid-cols-[minmax(0,1fr)_480px]">
          {/* Left Column Text & Highlights */}
          <div className="py-8">
            <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B1538]">{eyebrow}</Text>
            <Title level={1} className="font-serif-sc !mb-6 !mt-6 !text-[#1f2937]">
              {title}
            </Title>
            <Paragraph className="!mb-0 !max-w-2xl !text-[16px] !leading-relaxed !text-[#667085]">
              {subtitle}
            </Paragraph>

            <Divider className="!my-12 !border-[#e5e7eb]" />

            <Space direction="vertical" size={0} className="w-full">
              {highlights.map((item, index) => (
                <div
                  key={item.title}
                  className={`grid gap-5 border-[#e5e7eb] py-6 sm:grid-cols-[48px_1fr] ${index === 0 ? "border-t" : ""} border-b`}
                >
                  <span className="inline-flex h-12 w-12 items-center justify-center bg-red-50 text-[20px] rounded-full text-[#8B1538]">
                    {item.icon}
                  </span>
                  <div>
                    <Text className="block text-[16px] font-medium text-[#1f2937]">{item.title}</Text>
                    <Text className="mt-2 block text-[14px] leading-relaxed text-[#667085]">{item.description}</Text>
                  </div>
                </div>
              ))}
            </Space>
          </div>

          {/* Right Column Auth Form */}
          <div className="bg-white p-8 sm:p-10 border border-[#e5e7eb] shadow-sm rounded-sm self-start">
            {children}
            {footer ? <div className="mt-8 border-t border-[#e5e7eb] pt-6">{footer}</div> : null}
          </div>
        </div>
      </main>
    </div>
  );
}
