"use client";

import Link from "next/link";
import { Button, Divider, Typography } from "antd";
import HeaderBar from "@/components/HeaderBar";

const { Title, Paragraph } = Typography;

export default function GuidePage() {
  return (
    <div className="bg-white min-h-screen text-[#1d1d1f]">
      <HeaderBar />
      <main className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <Title level={1} className="!mb-8 !font-medium !text-[#1f2937]">
          投稿须知
        </Title>
        <Divider className="!mb-10 !mt-0 !border-[#e5e7eb]" />

        <div className="grid gap-12 text-[16px] leading-8 text-[#4b5563]">
          <div>
            <Paragraph className="mb-0 text-lg text-gray-700 leading-relaxed">
              《中外法学》由北京大学法学院主办，为 CSSCI 来源期刊。本刊实行在线投稿，请作者通过本系统「投稿入口」提交稿件，并遵守以下要求：
            </Paragraph>
          </div>

          <section>
            <Title level={4} className="!mb-4 !font-medium !text-gray-900 flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-sm font-bold text-[#8B1538]">1</span>
              稿件要求
            </Title>
            <Paragraph className="!mb-0 pl-11 text-gray-600">
              来稿须为法学及相关领域的学术论文，未曾在其他正式出版物发表；请勿一稿多投。稿件请使用 Word（.docx/.doc）或 PDF 格式，包含标题、摘要、关键词、正文、脚注与参考文献。
            </Paragraph>
          </section>

          <section>
            <Title level={4} className="!mb-4 !font-medium !text-gray-900 flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-sm font-bold text-[#8B1538]">2</span>
              格式与规范
            </Title>
            <Paragraph className="!mb-0 pl-11 text-gray-600">
              标题、摘要、关键词、作者信息、单位、基金项目及联系方式请在投稿时填写完整。引注格式请参照本刊要求，脚注与参考文献需规范、完整。
            </Paragraph>
          </section>

          <section>
            <Title level={4} className="!mb-4 !font-medium !text-gray-900 flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-sm font-bold text-[#8B1538]">3</span>
              审稿与周期
            </Title>
            <Paragraph className="!mb-0 pl-11 text-gray-600">
              本刊实行双向匿名审稿，审稿周期约 2–3 个月。作者可登录「作者中心」查看稿件状态与退修意见；若需修改后重投，请按退修意见上传修订稿。
            </Paragraph>
          </section>

          <section>
            <Title level={4} className="!mb-4 !font-medium !text-gray-900 flex items-center gap-3">
              <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-red-50 text-sm font-bold text-[#8B1538]">4</span>
              版权与声明
            </Title>
            <Paragraph className="!mb-0 pl-11 text-gray-600">
              投稿即视为同意本刊的版权转让与学术规范要求。具体条款见
              <Link href="/copyright" className="text-[#8B1538] hover:underline font-medium mx-1">
                《版权转让协议》
              </Link>
              。
            </Paragraph>
          </section>
        </div>

        <div className="mt-16 border-t border-[#e5e7eb] pt-8 flex justify-center">
          <Link href="/submit">
            <Button type="primary" size="large" className="bg-[#8B1538] hover:!bg-[#A51D45] rounded-sm px-16 h-12 shadow-md border-none text-[16px]">
              已阅知，前往投稿
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
