"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Breadcrumb, Button, Typography, Upload, Divider } from "antd";
import type { BreadcrumbItemType } from "antd/es/breadcrumb/Breadcrumb";
import type { UploadFile } from "antd";
import { useAuth } from "@/contexts/AuthContext";
import HeaderBar from "@/components/HeaderBar";
import { manuscriptsApi } from "@/services/api";

export default function AuthorRevisePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const submit = async () => {
    const file = fileList[0]?.originFileObj;
    if (!file || !id) {
      setError("请选择修订稿文件");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await manuscriptsApi.uploadRevision(Number(id), file);
      router.push(`/author/${id}?revised=1`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "提交失败");
    } finally {
      setLoading(false);
    }
  };

  const normFile = (e: { fileList: UploadFile[] }) => {
    const list = e?.fileList ?? [];
    const valid = list.filter((f) => {
      const name = (f.name || "").toLowerCase();
      return name.endsWith(".docx") || name.endsWith(".doc") || name.endsWith(".pdf");
    });
    setFileList(valid);
    if (valid.length > 0) setError("");
    return valid;
  };

  if (!user) {
    router.push("/login");
    return null;
  }

  const breadcrumbItems: BreadcrumbItemType[] = [
    { title: <Link href="/">首页</Link> },
    { title: <Link href="/author">作者中心</Link> },
    { title: <Link href={`/author/${id}`}>稿件详情</Link> },
    { title: "上传修订稿" },
  ];

  return (
    <div className="bg-white min-h-screen text-[#1d1d1f]">
      <HeaderBar />
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <Breadcrumb items={breadcrumbItems} className="mb-6" />
        
        <Typography.Title level={2} className="!mb-0 !font-medium !text-gray-900">
          上传修订稿
        </Typography.Title>
        <Typography.Paragraph className="!text-gray-500 !mt-2">
          请上传您修改后的最新稿件版本（支持 Word 或 PDF 格式）。
        </Typography.Paragraph>

        <Divider className="!border-[#e5e7eb] !mb-8 !mt-6" />

        <div className="bg-gray-50 border border-[#e5e7eb] rounded-sm p-8 max-w-2xl">
          <div className="mb-6">
            <Typography.Text strong className="block mb-3 text-gray-800">选择修订稿文件</Typography.Text>
            <Upload
              maxCount={1}
              beforeUpload={() => false}
              accept=".docx,.doc,.pdf"
              fileList={fileList}
              onChange={normFile}
              className="w-full"
            >
              <Button size="large" className="w-full">选择文件（.docx / .doc / .pdf）</Button>
            </Upload>
          </div>
          
          {error && <Alert message={error} type="error" showIcon className="mb-6 rounded-sm" />}
          
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-[#e5e7eb]">
            <Button type="primary" size="large" onClick={submit} loading={loading} className="bg-[#8B1538] hover:!bg-[#A51D45] border-none shadow-sm rounded-sm px-8">
              {loading ? "提交中…" : "确认提交修订稿"}
            </Button>
            <Link href={`/author/${id}`}>
              <Button size="large" className="rounded-sm">放弃修改并返回</Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
