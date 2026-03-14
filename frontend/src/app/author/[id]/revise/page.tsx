"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, Breadcrumb, Button, Typography, Upload, Divider, Descriptions } from "antd";
import type { BreadcrumbItemType } from "antd/es/breadcrumb/Breadcrumb";
import type { UploadFile } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import { useAuth } from "@/contexts/AuthContext";
import HeaderBar from "@/components/HeaderBar";
import { manuscriptsApi } from "@/services/api";

function formatBytes(size?: number) {
  if (!size) return "-";
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(2)} MB`;
}

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
      const res = await manuscriptsApi.uploadRevision(Number(id), file);
      const parseJobId = Number(res.parse_job?.id);
      const query = new URLSearchParams({ revised: "1" });
      if (Number.isFinite(parseJobId) && parseJobId > 0) {
        query.set("parseJobId", String(parseJobId));
      }
      router.push(`/author/${id}?${query.toString()}`);
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
  const selectedFile = fileList[0];

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
            <Upload.Dragger
              maxCount={1}
              beforeUpload={() => false}
              accept=".docx,.doc,.pdf"
              fileList={fileList}
              onChange={normFile}
              showUploadList={false}
              rootClassName="submit-upload"
              className="w-full"
            >
              <p className="ant-upload-drag-icon !mb-3">
                <InboxOutlined className="text-[34px] text-[#8B1538]" />
              </p>
              <p className="ant-upload-text text-[16px] font-medium text-[#1f2937]">
                点击或拖拽修订稿到此处上传
              </p>
              <p className="ant-upload-hint text-[13px] leading-6 text-[#667085]">
                支持单个修订稿文件上传，仅接受 `.doc`、`.docx`、`.pdf` 格式。
              </p>
            </Upload.Dragger>
          </div>

          <div className="mb-6 bg-white p-5 rounded-sm border border-[#e5e7eb]">
            <Descriptions size="small" column={{ xs: 1, md: 2 }} className="mb-0">
              <Descriptions.Item label={<span className="text-gray-500">文件名</span>}>{selectedFile?.name || "未选择"}</Descriptions.Item>
              <Descriptions.Item label={<span className="text-gray-500">文件大小</span>}>{formatBytes(selectedFile?.size)}</Descriptions.Item>
              <Descriptions.Item label={<span className="text-gray-500">文件类型</span>}>
                {selectedFile ? selectedFile.name.split(".").pop()?.toUpperCase() : "-"}
              </Descriptions.Item>
            </Descriptions>
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
