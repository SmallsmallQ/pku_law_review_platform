"use client";

import React, { useState, useEffect } from 'react';
import { UploadOutlined } from '@ant-design/icons';
import { Button, Input, Select, Space, Tag, Typography, message, Divider, Flex, Upload } from 'antd';
import { TargetLanguage, Citation, CitationStyle, AIProvider } from '@/lib/citation/types';
import { manuscriptsApi } from '@/services/api';

const { Text, Title } = Typography;

const DEFAULT_EXAMPLE = `Charles A. Reich, The New Property, 73 Yale Law Journal 733 (1964).
申卫星、刘云：《法学研究新范式：计算法学的内涵、范畴与方法》，载《法学研究》2020年第5期，第3-23页。
生成式人工智能的知识产权法律因应与制度创新》，载《法制博览》2025年第32期，第130-132页。
Shumailov I, Shumaylov Z, Zhao Y, et al. AI models collapse when trained on recursively generated data[J]. Nature, 2024, 631(8022): 755-759.`;

type CitationResultItem = {
  text: string;
  level?: string;
  rankDetail?: Citation["rankDetail"];
};

type ExtractSource = "footnotes" | "references" | "body";

const SOURCE_LABEL: Record<ExtractSource, string> = {
  footnotes: "脚注",
  references: "参考文献",
  body: "正文候选",
};

export default function CitationChecker() {
  const [input, setInput] = useState('');
  const [citationStyle, setCitationStyle] = useState<CitationStyle>(CitationStyle.LEGAL);
  const [provider, setProvider] = useState<AIProvider>(AIProvider.QWEN);
  const [isLoading, setIsLoading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [history, setHistory] = useState<Citation[]>([]);
  const [extractInfo, setExtractInfo] = useState<{ count: number; source: ExtractSource } | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('law_citation_v11');
    if (saved) {
      try { 
        setHistory(JSON.parse(saved)); 
      } catch {
        // ignore parsing error
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('law_citation_v11', JSON.stringify(history.slice(0, 50)));
  }, [history]);

  const handleConvert = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    try {
      const response = await fetch('/api/citation', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input,
          lang: TargetLanguage.ZH, // hardcoded for now, can be expanded later
          style: citationStyle,
          provider: provider,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || '请求 API 失败');
      }
      
      const data = await response.json();
      const results = (data.results || []) as CitationResultItem[];
      
      const newCitations: Citation[] = results.map((res, index: number) => ({
        id: (Date.now() + index).toString(),
        original: input.split('\n')[index] || input,
        formatted: res.text,
        level: res.level,
        rankDetail: res.rankDetail,
        style: citationStyle,
        provider: provider,
        timestamp: Date.now(),
      }));
      setHistory(prev => [...newCitations, ...prev]);
      setInput('');
      message.success('引注转换成功');
    } catch (err: unknown) { 
      const errorMessage = err instanceof Error ? err.message : '转换错误，请检查网络或 API 配置';
      message.error(errorMessage); 
    } finally { 
      setIsLoading(false); 
    }
  };

  const handleExtractFromFile = async (file: File) => {
    const lowerName = file.name.toLowerCase();
    if (!lowerName.endsWith('.docx') && !lowerName.endsWith('.pdf')) {
      message.error('当前仅支持 .docx（Word）或 .pdf 文件');
      return false;
    }

    setIsExtracting(true);
    try {
      const result = await manuscriptsApi.extractCitationsFromFile(file);
      const citations = (result.citations || []).filter(Boolean);
      if (citations.length === 0) {
        setExtractInfo(null);
        message.warning('文档里暂未识别到明确的引注条目，可先手动补充或检查是否为扫描件');
        return false;
      }

      setInput(citations.join('\n'));
      setExtractInfo({
        count: citations.length,
        source: (result.source as ExtractSource) || 'body',
      });
      message.success(`已从${SOURCE_LABEL[(result.source as ExtractSource) || 'body']}提取 ${citations.length} 条引注候选`);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : '提取失败，请稍后重试';
      message.error(errorMessage);
    } finally {
      setIsExtracting(false);
    }

    return false;
  };

  const copyToClipboard = (text: string) => {
    if (!text) return;
    const cleanText = text.replace(/\*/g, '');
    navigator.clipboard.writeText(cleanText).then(() => {
      message.success('已复制到剪贴板');
    });
  };

  const getCleanTextAll = () => {
    return history.map(h => h.formatted.replace(/\*/g, '')).join('\n');
  };

  const handleCopyAll = () => {
    const text = getCleanTextAll();
    if (!text) return;
    navigator.clipboard.writeText(text).then(() => {
      message.success('已复制全部结果');
    });
  };

  const handleExportTxt = () => {
    const text = getCleanTextAll();
    if (!text) return;
    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `法学引注导出_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    message.success('文件生成中，请保存');
  };

  const renderFormattedText = (text: string) => {
    if (!text) return null;
    const parts = text.split(/(\*[^*]+\*)/g);
    return (
      <span className="text-base text-[#1f2937]">
        {parts.map((part, index) => {
          if (part.startsWith('*') && part.endsWith('*') && part.length > 2) {
            return <i key={index} className="italic font-serif">{part.slice(1, -1)}</i>;
          }
          return <span key={index}>{part}</span>;
        })}
      </span>
    );
  };

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex-none pb-4">
        <Title level={4} className="!mb-1">引注格式转换与评级</Title>
        <Text type="secondary" className="text-sm block mb-4">
          智能识别文献类型并排版，同时校验属于 CLSCI、南大核心、科技核心及华政负面清单等库。
        </Text>
        
        <Flex gap={16} className="mb-4">
          <div className="flex-1">
            <Text strong className="text-xs mb-1 block">AI 引擎</Text>
            <Select 
              value={provider} 
              onChange={setProvider} 
              style={{ width: '100%' }}
              options={[
                { value: AIProvider.QWEN, label: 'Qwen' },
                { value: AIProvider.GEMINI, label: 'Gemini' }
              ]}
            />
          </div>
          <div className="flex-1">
            <Text strong className="text-xs mb-1 block">目标引注格式</Text>
            <Select 
              value={citationStyle} 
              onChange={setCitationStyle} 
              style={{ width: '100%' }}
              options={[
                { value: CitationStyle.LEGAL, label: '《法学引注手册》' },
                { value: CitationStyle.SOCIAL_SCIENCE, label: '《中国社会科学》' },
                { value: CitationStyle.GB7714, label: 'GB/T 7714-2015' }
              ]}
            />
          </div>
        </Flex>

        <Input.TextArea
          rows={6}
          placeholder="请粘贴一条或多条原始文献条目（每行一条），或直接上传 Word 提取..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="mb-4 text-sm"
        />

        <Flex justify="space-between" align="center">
          <Space size="middle" wrap>
            <Button type="link" size="small" onClick={() => setInput(DEFAULT_EXAMPLE)} className="px-0">
              载入测试用例
            </Button>
            <Upload
              accept=".docx,.pdf"
              beforeUpload={(file) => handleExtractFromFile(file as File)}
              showUploadList={false}
              maxCount={1}
            >
              <Button size="small" icon={<UploadOutlined />} loading={isExtracting}>
                {isExtracting ? '提取中...' : '上传 Word/PDF 直接提取'}
              </Button>
            </Upload>
            <Text type="secondary" className="text-xs">
              支持 `.docx` 优先提取脚注；`.pdf` 会从正文中抓候选
            </Text>
          </Space>
          <Button type="primary" onClick={handleConvert} loading={isLoading} disabled={!input.trim() || isExtracting}>
            {isLoading ? '转换中...' : '立即提取与转换'}
          </Button>
        </Flex>

        {extractInfo && (
          <Text type="secondary" className="text-xs block mt-2">
            当前输入来自{SOURCE_LABEL[extractInfo.source]}，共识别 {extractInfo.count} 条候选。
          </Text>
        )}
      </div>

      <Divider className="my-2" />

      <div className="flex-1 overflow-y-auto">
        <Flex justify="space-between" align="center" className="mb-4 pt-2">
          <Text strong>转换结果记录 ({history.length})</Text>
          {history.length > 0 && (
            <Space size="small">
              <Button size="small" onClick={handleCopyAll}>复制全部</Button>
              <Button size="small" onClick={handleExportTxt}>导出 TXT</Button>
              <Button size="small" danger type="text" onClick={() => setHistory([])}>清空</Button>
            </Space>
          )}
        </Flex>
        
        {history.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            暂无记录，输入文本后点击转换
          </div>
        ) : (
          <Space direction="vertical" size={16} className="w-full pb-6">
            {history.map((item) => {
              const isNegative = item.rankDetail?.isNegative;
              return (
                <div 
                  key={item.id} 
                  className={`p-4 hover:bg-gray-50 transition-colors ${isNegative ? 'bg-[#fff1f0]' : ''}`}
                  style={{ borderBottom: '1px solid #f0f0f0' }}
                >
                  <Flex wrap gap="small" className="mb-2">
                    {isNegative ? (
                      <Tag color="error">风险预警</Tag>
                    ) : (
                      <Tag color="default">引用正常</Tag>
                    )}
                    
                    {item.rankDetail?.tags?.map((tag, idx) => {
                      let tagColor = 'blue';
                      if (tag.type === 'negative') tagColor = 'error';
                      else if (tag.type === 'legal_core') tagColor = 'purple';
                      else if (tag.type === 'official') tagColor = 'cyan';
                      
                      return (
                        <Tag key={idx} color={tagColor}>
                          {tag.label}{tag.value ? ` · ${tag.value}` : ''}
                        </Tag>
                      );
                    })}
                  </Flex>

                  <div 
                    className={`leading-relaxed cursor-pointer mt-2 ${isNegative ? 'text-red-700 font-medium' : 'text-gray-800'}`}
                    onClick={() => copyToClipboard(item.formatted)}
                    title="点击复制该条引注"
                  >
                    {renderFormattedText(item.formatted)}
                  </div>
                </div>
              );
            })}
          </Space>
        )}
      </div>
    </div>
  );
}
