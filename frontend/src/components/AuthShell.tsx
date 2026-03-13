"use client";

import type { ReactNode } from "react";
import { Card, Divider, Space, Typography } from "antd";
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
    <div className="bg-[#f5f6f8]">
      <HeaderBar />
      <main
        id="main-content"
        className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8"
        aria-label={title}
      >
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
          <Card className="!rounded-none !border-[#d9dde4] !shadow-none" styles={{ body: { padding: 28 } }}>
            <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-[#8B1538]">{eyebrow}</Text>
            <Title level={2} className="font-serif-sc !mb-3 !mt-4 !text-[#2d313d]">
              {title}
            </Title>
            <Paragraph className="!mb-0 !max-w-2xl !text-[16px] !leading-8 !text-[#5f6573]">
              {subtitle}
            </Paragraph>

            <Divider className="!my-8 !border-[#e6eaf0]" />

            <Space direction="vertical" size={0} className="w-full">
              {highlights.map((item, index) => (
                <div
                  key={item.title}
                  className={`grid gap-4 border-[#e6eaf0] py-4 sm:grid-cols-[44px_1fr] ${index === 0 ? "border-t" : ""} border-b`}
                >
                  <span className="inline-flex h-11 w-11 items-center justify-center border border-[#d9dde4] bg-[#fafafa] text-[18px] text-[#8B1538]">
                    {item.icon}
                  </span>
                  <div>
                    <Text className="block text-[16px] font-semibold text-[#2d313d]">{item.title}</Text>
                    <Text className="mt-1 block text-[14px] leading-7 text-[#6c7280]">{item.description}</Text>
                  </div>
                </div>
              ))}
            </Space>
          </Card>

          <Card className="!rounded-none !border-[#d9dde4] !shadow-none" styles={{ body: { padding: 28 } }}>
            {children}
            {footer ? <div className="mt-8 border-t border-[#e6eaf0] pt-6">{footer}</div> : null}
          </Card>
        </div>
      </main>
    </div>
  );
}
