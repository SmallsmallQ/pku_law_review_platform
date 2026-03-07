"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Breadcrumb, Button, Card, Typography, Upload } from "antd";
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
    <div className="bg-[#f5f6f8]">
      <HeaderBar />
      <main className="w-full px-5 py-8 sm:px-8 lg:px-10 xl:px-12 2xl:px-16">
        <Card>
          <Breadcrumb items={breadcrumbItems} className="mb-4" />
          <Typography.Title level={5} className="!mb-4">
            上传修订稿
          </Typography.Title>
          <div className="space-y-4">
            <div>
              <Typography.Text strong className="block mb-2">选择 Word 或 PDF</Typography.Text>
              <Upload
                maxCount={1}
                beforeUpload={() => false}
                accept=".docx,.doc,.pdf"
                fileList={fileList}
                onChange={normFile}
              >
                <Button>选择文件（.docx / .doc / .pdf）</Button>
              </Upload>
            </div>
            {error && <Alert message={error} type="error" showIcon className="mb-2" />}
            <div className="flex gap-2">
              <Button type="primary" onClick={submit} loading={loading}>
                {loading ? "提交中…" : "提交修订稿"}
              </Button>
              <Link href={`/author/${id}`}>
                <Button>返回稿件详情</Button>
              </Link>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
