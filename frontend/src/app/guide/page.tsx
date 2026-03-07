"use client";

import Link from "next/link";
import { Button, Card, Typography } from "antd";
import HeaderBar from "@/components/HeaderBar";

const { Title, Paragraph } = Typography;

export default function GuidePage() {
  return (
    <div className="bg-[#f5f6f8]">
      <HeaderBar />
      <main className="w-full px-5 py-8 sm:px-8 lg:px-10 xl:px-12 2xl:px-16">
        <Card>
          <Title level={4} className="!mb-6 !border-l-4 !border-[#8B1538] !pl-4">
            投稿须知
          </Title>
          <Paragraph className="text-[#333]">
            《中外法学》由北京大学法学院主办，为 CSSCI 来源期刊。本刊实行在线投稿，请作者通过本系统「投稿入口」提交稿件，并遵守以下要求。
          </Paragraph>
          <Title level={5} className="!mt-6">一、稿件要求</Title>
          <Paragraph className="text-[#333]">
            来稿须为法学及相关领域的学术论文，未曾在其他正式出版物发表；请勿一稿多投。稿件请使用 Word（.docx/.doc）或 PDF 格式，包含标题、摘要、关键词、正文、脚注与参考文献。
          </Paragraph>
          <Title level={5} className="!mt-6">二、格式与规范</Title>
          <Paragraph className="text-[#333]">
            标题、摘要、关键词、作者信息、单位、基金项目及联系方式请在投稿时填写完整。引注格式请参照本刊要求，脚注与参考文献需规范、完整。
          </Paragraph>
          <Title level={5} className="!mt-6">三、审稿与周期</Title>
          <Paragraph className="text-[#333]">
            本刊实行双向匿名审稿，审稿周期约 2–3 个月。作者可登录「作者中心」查看稿件状态与退修意见；若需修改后重投，请按退修意见上传修订稿。
          </Paragraph>
          <Title level={5} className="!mt-6">四、版权与声明</Title>
          <Paragraph className="text-[#333]">
            投稿即视为同意本刊的版权转让与学术规范要求。具体条款见<Link href="/copyright" className="text-[#8B1538] hover:underline">《版权转让协议》</Link>。
          </Paragraph>
          <div className="mt-8">
            <Link href="/submit">
              <Button type="primary" size="large" className="!bg-[#8B1538] hover:!bg-[#70122e]">
                前往投稿入口
              </Button>
            </Link>
          </div>
        </Card>
      </main>
    </div>
  );
}
