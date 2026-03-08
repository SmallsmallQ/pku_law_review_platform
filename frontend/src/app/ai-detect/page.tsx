"use client";

import { useEffect, useState } from "react";
import { Button, Card, Input, message, Select, Spin, Typography, Upload } from "antd";
import { CopyOutlined, FileWordOutlined, LinkOutlined } from "@ant-design/icons";
import HeaderBar from "@/components/HeaderBar";
import { useAuth } from "@/contexts/AuthContext";
import { manuscriptsApi, type ManuscriptListItem } from "@/services/api";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

const ZHUQUE_URL = "https://matrix.tencent.com/ai-detect/";

export default function AIDetectPage() {
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [manuscriptList, setManuscriptList] = useState<ManuscriptListItem[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [loadingImport, setLoadingImport] = useState(false);
  const [loadingExtract, setLoadingExtract] = useState(false);
  const [selectedManuscriptId, setSelectedManuscriptId] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    setLoadingList(true);
    manuscriptsApi
      .my({ page_size: 100 })
      .then((res) => setManuscriptList(res.items || []))
      .catch(() => message.error("加载稿件列表失败"))
      .finally(() => setLoadingList(false));
  }, [user]);

  const handleImportFromManuscript = async () => {
    const manuscriptId = selectedManuscriptId;
    if (!manuscriptId) {
      message.warning("请先选择稿件");
      return;
    }
    setLoadingImport(true);
    try {
      const { text } = await manuscriptsApi.getTextForAiDetect(manuscriptId);
      setContent(text || "");
      message.success(text ? "已导入正文" : "该稿件暂无解析正文");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "导入失败";
      message.error(msg);
    } finally {
      setLoadingImport(false);
    }
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
    <div className="bg-[#f5f6f8]">
      <HeaderBar />
      <main className="w-full px-5 py-8 sm:px-8 lg:px-10 xl:px-12 2xl:px-16">
        <Card>
          <Title level={4} className="!mb-2 !border-l-4 !border-[#8B1538] !pl-4">
            AI 生成内容检测
          </Title>
          <Paragraph className="!mb-6 !text-[#666]">
            本刊建议作者在投稿前使用腾讯朱雀 AI 检测助手对稿件进行自检。您可从已投稿稿件导入、上传 Word/PDF，或直接粘贴待检测文本，然后一键复制并跳转至官方页面获取检测结果。
          </Paragraph>

          {user && (
            <>
              <div className="mb-6 rounded border border-[#e8e8e8] bg-[#fafafa] p-4">
                <Text strong className="text-[#333]">
                  从已投稿稿件导入
                </Text>
                <p className="mt-1 text-sm text-[#666]">
                  选择您在系统中已提交的稿件，导入其正文用于检测。
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-3">
                  <Select
                    placeholder="选择稿件"
                    optionFilterProp="label"
                    allowClear
                    loading={loadingList}
                    className="min-w-[260px]"
                    value={selectedManuscriptId}
                    onChange={(v) => setSelectedManuscriptId(v ?? null)}
                    options={manuscriptList.map((m) => ({
                      value: m.id,
                      label: `${m.manuscript_no} · ${(m.title || "").slice(0, 40)}${(m.title || "").length > 40 ? "…" : ""}`,
                    }))}
                  />
                  <Button
                    type="default"
                    onClick={handleImportFromManuscript}
                    loading={loadingImport}
                    disabled={!selectedManuscriptId}
                  >
                    导入正文
                  </Button>
                </div>
              </div>

              <div className="mb-6 rounded border border-[#e8e8e8] bg-[#fafafa] p-4">
                <Text strong className="text-[#333]">
                  上传 Word / PDF
                </Text>
                <p className="mt-1 text-sm text-[#666]">
                  上传稿件文件（.docx 或 .pdf），系统将提取正文填入下方文本框，仅用于检测，不存储。
                </p>
                <div className="mt-3">
                  <Upload.Dragger
                    name="file"
                    multiple={false}
                    accept=".docx,.pdf"
                    fileList={[]}
                    beforeUpload={(file) => handleUploadFile(file)}
                    showUploadList={false}
                  >
                    <p className="ant-upload-drag-icon">
                      <FileWordOutlined className="text-3xl text-[#8B1538]" />
                    </p>
                    <p className="ant-upload-text">点击或拖拽 .docx / .pdf 到此处</p>
                    <p className="ant-upload-hint">仅解析正文用于 AI 检测，不会保存文件</p>
                    {loadingExtract && <Spin className="mt-2" />}
                  </Upload.Dragger>
                </div>
              </div>
            </>
          )}

          {!user && (
            <p className="mb-4 text-sm text-[#999]">
              登录后可从「已投稿稿件」导入或上传 Word/PDF；未登录也可在下方直接粘贴文本进行检测。
            </p>
          )}

          <div className="space-y-4">
            <Text strong className="text-[#333]">
              待检测文章（粘贴、导入或上传后显示于此）
            </Text>
            <TextArea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="请在此粘贴待检测的文章内容，或通过上方「从已投稿导入」「上传 Word/PDF」填入"
              autoSize={{ minRows: 10, maxRows: 24 }}
              className="!rounded"
            />
            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="primary"
                size="large"
                icon={<CopyOutlined />}
                onClick={handleCopyAndOpen}
                className="!bg-[#8B1538] hover:!bg-[#70122e]"
              >
                复制内容并打开朱雀检测
              </Button>
              <a
                href={ZHUQUE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#8B1538] hover:underline"
              >
                <LinkOutlined /> 朱雀 AI 检测助手（腾讯官方）
              </a>
            </div>
          </div>

          <div className="mt-8 border-t border-[#e8e8e8] pt-6">
            <Text strong className="text-[#333]">
              检测页面内操作说明
            </Text>
            <Paragraph className="!mb-0 !mt-2 !text-[#666]">
              打开朱雀检测页面后，在页面中选择「AIGC text」文本检测，将已复制的内容粘贴到输入框并提交，即可查看该文本的 AI 生成概率等结果。登录腾讯账号后每日有免费检测额度。
            </Paragraph>
          </div>

          <div className="mt-6">
            <Text className="text-[#999] text-sm">
              检测服务由腾讯朱雀实验室提供，本系统仅提供入口与使用说明，检测结果与额度以官方页面为准。
            </Text>
          </div>
        </Card>
      </main>
    </div>
  );
}
