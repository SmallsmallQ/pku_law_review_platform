"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button, Divider, Input, message, Select, Spin, Typography, Upload } from "antd";
import { CopyOutlined, FileWordOutlined, LinkOutlined } from "@ant-design/icons";
import HeaderBar from "@/components/HeaderBar";
import { useAuth } from "@/contexts/AuthContext";
import { manuscriptsApi, type AccessibleManuscriptListItem } from "@/services/api";

const { Title, Paragraph } = Typography;
const { TextArea } = Input;

const ZHUQUE_URL = "https://matrix.tencent.com/ai-detect/";
const ACCESS_MODE_LABEL: Record<AccessibleManuscriptListItem["access_mode"], string> = {
  submitted: "我投稿的",
  reviewing: "我审阅的",
  submitted_and_reviewing: "投稿/审阅",
  admin: "管理权限",
};

export default function AIDetectPage() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [content, setContent] = useState("");
  const [manuscriptList, setManuscriptList] = useState<AccessibleManuscriptListItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [loadingExtract, setLoadingExtract] = useState(false);
  const [selectedManuscriptId, setSelectedManuscriptId] = useState<number | null>(null);
  const [autoImportedKey, setAutoImportedKey] = useState<string | null>(null);

  const source = searchParams.get("source");
  const sourceManuscriptId = Number(searchParams.get("manuscriptId") || "");
  const hasSourceManuscriptId = Number.isInteger(sourceManuscriptId) && sourceManuscriptId > 0;

  useEffect(() => {
    if (!user) return;
    setLoadingList(true);
    manuscriptsApi
      .accessibleForAiDetect({ page_size: 100 })
      .then((res) => setManuscriptList(res.items || []))
      .catch(() => message.error("加载稿件列表失败"))
      .finally(() => setLoadingList(false));
  }, [user]);

  const importManuscriptText = useCallback(async (manuscriptId: number, sourceType: "author" | "editor") => {
    setLoadingImport(true);
    try {
      const { text } = await manuscriptsApi.getTextForAiDetect(manuscriptId);
      setSelectedManuscriptId(manuscriptId);
      setContent(text || "");
      message.success(text ? (sourceType === "editor" ? "已导入当前稿件正文，可直接检测" : "已导入正文") : "该稿件暂无解析正文");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "导入失败";
      message.error(msg);
    } finally {
      setLoadingImport(false);
    }
  }, []);

  useEffect(() => {
    if (!user || !hasSourceManuscriptId) return;

    const sourceType = source === "editor" ? "editor" : "author";
    const importKey = `${sourceType}:${sourceManuscriptId}`;
    if (autoImportedKey === importKey) return;

    setAutoImportedKey(importKey);
    void importManuscriptText(sourceManuscriptId, sourceType);
  }, [autoImportedKey, hasSourceManuscriptId, importManuscriptText, source, sourceManuscriptId, user]);

  const handleImportFromManuscript = async () => {
    const manuscriptId = selectedManuscriptId;
    if (!manuscriptId) {
      message.warning("请先选择稿件");
      return;
    }
    await importManuscriptText(manuscriptId, "author");
  };

  const handleUploadFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith(".docx") && !file.name.toLowerCase().endsWith(".pdf")) {
      message.error("仅支持 .docx（Word）或 .pdf 格式");
      return false;
    }
    setLoadingExtract(true);
    try {
      const { text } = await manuscriptsApi.extractTextFromFile(file);
      setContent(text || "");
      message.success(text ? "已从文件中提取正文" : "未能从文件中提取到文本");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "提取失败";
      message.error(msg);
    } finally {
      setLoadingExtract(false);
    }
    return false; // 阻止 Upload 自动上传到 URL
  };

  const handleCopyAndOpen = async () => {
    if (!content.trim()) {
      message.warning("请先粘贴或导入待检测的文章内容");
      return;
    }
    try {
      await navigator.clipboard.writeText(content);
      message.success("已复制到剪贴板，正在打开朱雀检测页面");
      window.open(ZHUQUE_URL, "_blank", "noopener,noreferrer");
    } catch {
      message.error("复制失败，请手动复制后点击下方链接打开检测页面");
      window.open(ZHUQUE_URL, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="bg-white min-h-screen text-[#1d1d1f]">
      <HeaderBar />
      <main className="mx-auto w-full max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <Title level={2} className="!mb-4 !font-medium !text-[#1f2937]">
          AI 生成内容检测
        </Title>
        <Paragraph className="!mb-8 !text-[16px] !leading-relaxed !text-[#6b7280]">
          本刊建议在投稿或审阅过程中使用腾讯朱雀 AI 检测助手对稿件进行自检。您可从系统内您有权限访问的稿件导入、上传 Word/PDF，或直接粘贴待检测文本，然后一键复制并跳转至官方页面获取检测结果。
        </Paragraph>

        <Divider className="!border-[#e5e7eb] !mb-10" />

        {user && (
          <div className="mb-10 grid items-start gap-6 md:grid-cols-2">
            {/* 左侧导入 */}
            <div className="rounded-sm border border-[#e5e7eb] bg-gray-50 p-6">
              <Title level={5} className="!font-medium !text-gray-900 !mt-0 !mb-2 flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-red-100/50 text-xs text-[#8B1538]">1</span>
                从系统内稿件导入
              </Title>
              <p className="mb-4 text-sm text-gray-500 leading-relaxed min-h-[40px]">
                选择您在系统中有权限访问的稿件导入正文，既包括我投稿的，也包括我审阅的稿件。
              </p>
              <div className="flex flex-col gap-3">
                <Select
                  placeholder="搜索或选择稿件"
                  optionFilterProp="label"
                  allowClear
                  loading={loadingList}
                  className="w-full"
                  size="large"
                  value={selectedManuscriptId}
                  onChange={(v) => setSelectedManuscriptId(v ?? null)}
                  options={manuscriptList.map((m) => ({
                    value: m.id,
                    label: `[${ACCESS_MODE_LABEL[m.access_mode]}] ${m.manuscript_no} · ${(m.title || "").slice(0, 30)}${(m.title || "").length > 30 ? "…" : ""}`,
                  }))}
                />
                <Button
                  type="default"
                  size="large"
                  className="w-full font-medium"
                  onClick={handleImportFromManuscript}
                  loading={loadingImport}
                  disabled={!selectedManuscriptId}
                >
                  确认导入该稿件正文
                </Button>
              </div>
            </div>

            {/* 右侧上传 */}
            <div className="rounded-sm border border-[#e5e7eb] bg-gray-50 p-6">
              <Title level={5} className="!font-medium !text-gray-900 !mt-0 !mb-2 flex items-center gap-2">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-blue-100/50 text-xs text-blue-700">2</span>
                或上传 Word / PDF 解析
              </Title>
              <p className="mb-4 text-sm text-gray-500 leading-relaxed min-h-[40px]">
                系统将提取文档正文填入下方文本框，仅做提取不保存文件。
              </p>
              <Upload.Dragger
                name="file"
                multiple={false}
                accept=".docx,.pdf"
                fileList={[]}
                beforeUpload={(file) => handleUploadFile(file)}
                showUploadList={false}
                rootClassName="ai-detect-upload"
              >
                <div className="ai-detect-upload-panel">
                  <p className="ant-upload-drag-icon mb-2">
                    <FileWordOutlined className="text-2xl text-gray-400" />
                  </p>
                  <p className="ant-upload-text mb-1 text-sm font-medium text-gray-600">点击或拖拽文件到此处</p>
                  <p className="ant-upload-hint text-xs text-gray-400">支持 .docx / .pdf</p>
                  {loadingExtract && <Spin className="mt-3" size="small" />}
                </div>
              </Upload.Dragger>
            </div>
          </div>
        )}

        {!user && (
          <div className="mb-8 rounded-sm bg-blue-50 p-4 border border-blue-100">
            <p className="mb-0 text-sm text-blue-700">
              提示：登录后可从您投稿或有审阅权限的稿件中快速导入正文，或上传包含图表的 Word/PDF 进行智能解析提取。未登录状态请在下方文本框手动粘贴文本进行检测。
            </p>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Title level={5} className="!font-medium !text-gray-900 !m-0">
              待检测文本预览
            </Title>
            <span className="text-xs text-gray-400">{content.length} 字符</span>
          </div>
          <TextArea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="请在此粘贴待检测的文章内容，或通过上方「导入」「上传」自动填充..."
            autoSize={{ minRows: 12, maxRows: 24 }}
            className="!rounded-sm !p-4 !text-[15px] !leading-relaxed !bg-gray-50 focus:!bg-white font-sans text-gray-700"
          />
          
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 p-6 bg-red-50/50 rounded-sm border border-red-100">
             <div>
                <p className="text-sm text-gray-600 mb-1 font-medium">下一步准备就绪</p>
                <p className="text-xs text-gray-500 mb-0">点击右侧按钮复制全文并跳转，如果浏览器拦截跳转，请点击下方链接。</p>
             </div>
             <Button
                type="primary"
                size="large"
                icon={<CopyOutlined />}
                onClick={handleCopyAndOpen}
                className="bg-[#8B1538] hover:!bg-[#A51D45] border-none shadow-sm rounded-sm px-8"
              >
                一键复制并前往朱雀检测
              </Button>
          </div>
          
          <div className="text-right pt-2">
            <a
              href={ZHUQUE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#8B1538] hover:underline text-sm inline-flex items-center gap-1"
            >
              <LinkOutlined /> 直接访问：朱雀 AI 检测助手（腾讯官方）
            </a>
          </div>
        </div>

        <Divider className="!border-[#e5e7eb] !my-10" />

        <div className="grid md:grid-cols-2 gap-12">
           <div>
              <Title level={5} className="!font-medium !text-gray-900 !mb-3">
                1. 外部页面检测说明
              </Title>
              <Paragraph className="!mb-0 !text-[14px] !leading-relaxed !text-gray-600">
                打开朱雀检测页面后，在顶部导航选择「AIGC text」文本检测功能，将刚才复制的全文粘贴到输入框并点击提交，系统会评估该段文本由 AI 生成的概率。登录您的微信或 QQ 账号后，每日享有一定的免费检测评估额度。
              </Paragraph>
           </div>
           
           <div>
              <Title level={5} className="!font-medium !text-gray-900 !mb-3">
                2. 免责与隐私声明
              </Title>
              <Paragraph className="!mb-0 !text-[14px] !leading-relaxed !text-gray-600">
                检测算法服务由「腾讯朱雀实验室（Zhuque Lab）」独立提供。本刊平台仅提供便捷的文本提取跳转入口及使用指引。本平台不为该外部工具的检测精确度背书，检测结果和计费额度以腾讯官方页面显示为准。
              </Paragraph>
           </div>
        </div>
      </main>
    </div>
  );
}
