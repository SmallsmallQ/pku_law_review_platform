import fs from "node:fs";
import path from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { SYSTEM_INSTRUCTION } from "@/lib/citation/constants";
import { AIProvider, CitationStyle, TargetLanguage } from "@/lib/citation/types";

const FALLBACK_ENV_FILES = [
  path.join(process.cwd(), ".env.local"),
  path.join(process.cwd(), ".env"),
  path.join(process.cwd(), "../backend/.env"),
  path.join(process.cwd(), "../backend/.env.local"),
  path.join(process.cwd(), "../backend/env.local"),
];

const fallbackEnvCache = new Map<string, string>();
let fallbackEnvLoaded = false;

function loadFallbackEnv() {
  if (fallbackEnvLoaded) {
    return fallbackEnvCache;
  }

  fallbackEnvLoaded = true;

  for (const filePath of FALLBACK_ENV_FILES) {
    if (!fs.existsSync(filePath)) {
      continue;
    }

    const content = fs.readFileSync(filePath, "utf8");
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#")) {
        continue;
      }

      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
      if (!match) {
        continue;
      }

      const [, key, rawValue] = match;
      let value = rawValue.trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      } else {
        value = value.replace(/\s+#.*$/, "").trim();
      }

      if (value && !fallbackEnvCache.has(key)) {
        fallbackEnvCache.set(key, value);
      }
    }
  }

  return fallbackEnvCache;
}

function getEnvValue(key: string) {
  const runtimeValue = process.env[key]?.trim();
  if (runtimeValue) {
    return runtimeValue;
  }

  return loadFallbackEnv().get(key)?.trim();
}

// --- EasyScholar Service ---
const API_BASE = 'https://www.easyscholar.cc/open/getPublicationRank';

const RANK_MAP: Record<string, string> = {
  pku: "北大核心",
  cssci: "南大核心",
  zhongguokejihexin: "科技核心",
  sciwarn: "预警期刊",
  cscd: "CSCD",
  ssci: "SSCI",
  sci: "SCI",
  ei: "EI",
  jcr: "IF"
};

const MONITOR_UUIDS = {
  NEGATIVE: "1866000451577192448",     // 华政负面
  LAW_C_EXT: "1959186565267394560",    // 法C扩
  CSSCI_BOOK: "1653331106809507840",   // CSSCI集刊
  CLSCI: "1642199434173014016"         // CLSCI
};

export interface RankTag {
  label: string;
  value: string;
  type: 'official' | 'custom' | 'negative' | 'legal_core';
}

export interface EasyScholarRank {
  tags: RankTag[];
  isNegative: boolean;
}

interface CustomRankInfo {
  uuid: string;
  abbName?: string;
  oneRankText?: string;
  twoRankText?: string;
  threeRankText?: string;
  fourRankText?: string;
  fiveRankText?: string;
}

interface CitationAiResult {
  text: string;
  level?: string;
  pubName: string;
}

async function fetchPublicationRank(name: string): Promise<EasyScholarRank> {
  const secretKey = getEnvValue("EASY_SCHOLAR_SECRET");
  
  if (!name || !secretKey) return { tags: [], isNegative: false };
  try {
    const url = `${API_BASE}?secretKey=${secretKey}&publicationName=${encodeURIComponent(name)}`;
    const response = await fetch(url);
    const result = await response.json();
    
    const tags: RankTag[] = [];
    let isNegative = false;

    if (result.code === 200 && result.data) {
      const { officialRank, customRank } = result.data;
      
      const allRanks = officialRank?.all || {};
      Object.keys(allRanks).forEach(key => {
        if (RANK_MAP[key]) {
          tags.push({ label: RANK_MAP[key], value: allRanks[key], type: 'official' });
        }
        if (key === 'sciwarn') isNegative = true;
      });

      if (customRank && customRank.rank) {
        customRank.rank.forEach((rankStr: string) => {
          const [uuid, rankIdxStr] = rankStr.split('&&&');
          const rankIdx = parseInt(rankIdxStr);
          const info = (customRank.rankInfo as CustomRankInfo[] | undefined)?.find((item) => item.uuid === uuid);
          
          if (info) {
            let rankText = "";
            switch(rankIdx) {
              case 1: rankText = info.oneRankText ?? ""; break;
              case 2: rankText = info.twoRankText ?? ""; break;
              case 3: rankText = info.threeRankText ?? ""; break;
              case 4: rankText = info.fourRankText ?? ""; break;
              case 5: rankText = info.fiveRankText ?? ""; break;
            }

            const isNegativeDataset = uuid === MONITOR_UUIDS.NEGATIVE;
            if (isNegativeDataset) isNegative = true;

            let type: 'custom' | 'negative' | 'legal_core' = 'custom';
            if (isNegativeDataset) type = 'negative';
            else if ([MONITOR_UUIDS.CLSCI, MONITOR_UUIDS.LAW_C_EXT, MONITOR_UUIDS.CSSCI_BOOK].includes(uuid)) type = 'legal_core';

            tags.push({
              label: info.abbName || "数据集",
              value: rankText || "命中",
              type: type
            });
          }
        });
      }
    }
    return { tags, isNegative };
  } catch (e) {
    console.error("easyScholar API Error:", e);
    return { tags: [], isNegative: false };
  }
}

// --- AI Services ---

async function parseAiJson(response: Response, providerLabel: string) {
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(`${providerLabel} API 错误: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
  const jsonStr = content.replace(/```json|```/g, "").trim();

  try {
    const parsed = JSON.parse(jsonStr);
    return Array.isArray(parsed) ? parsed : (parsed.citations || parsed.data || parsed.results || []);
  } catch {
    console.error(`${providerLabel} Parse Error:`, content);
    throw new Error(`${providerLabel} 返回数据格式异常`);
  }
}

async function callQwen(prompt: string) {
  const apiKey = getEnvValue("DASHSCOPE_API_KEY");
  if (!apiKey) {
    throw new Error("Qwen API Key 未配置。已检查前端运行环境及 frontend/.env(.local)、backend/.env 等常见文件，请确认 DASHSCOPE_API_KEY 已设置并重启前端服务。");
  }

  const baseUrl = (getEnvValue("LLM_BASE_URL") || "https://dashscope.aliyuncs.com/compatible-mode/v1").replace(/\/$/, "");
  const model = getEnvValue("LLM_MODEL") || "qwen3.5-plus";
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_INSTRUCTION },
        { role: "user", content: prompt }
      ],
      temperature: 0.1
    })
  });

  return parseAiJson(response, "Qwen");
}

async function callGemini(prompt: string) {
  const apiKey = getEnvValue("GEMINI_API_KEY") || getEnvValue("API_KEY");
  if (!apiKey) {
    throw new Error("Gemini API Key 未配置。已检查前端运行环境及 frontend/.env(.local)、backend/.env 等常见文件，请确认 GEMINI_API_KEY 已设置并重启前端服务。");
  }

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-model:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: SYSTEM_INSTRUCTION }] },
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.1,
        responseMimeType: "application/json",
        responseSchema: {
          type: "ARRAY",
          items: {
            type: "OBJECT",
            properties: {
              text: { type: "STRING" },
              level: { type: "STRING" },
              pubName: { type: "STRING" }
            },
            required: ["text", "pubName"]
          }
        }
      }
    })
  });

  return parseAiJson(response, "Gemini");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      input?: string;
      lang?: TargetLanguage;
      style?: CitationStyle;
      provider?: AIProvider;
    };
    const { input, lang, style, provider } = body;

    if (!input) {
      return NextResponse.json({ error: "Input is required" }, { status: 400 });
    }

    const prompt = `转换要求：将以下文献转换为 ${style || CitationStyle.LEGAL} 样式。语言：${lang || TargetLanguage.ZH}。输入内容：\n${input}`;
    
    const normalizedProvider = provider === AIProvider.GEMINI ? AIProvider.GEMINI : AIProvider.QWEN;
    const aiResults: CitationAiResult[] = normalizedProvider === AIProvider.GEMINI
      ? await callGemini(prompt)
      : await callQwen(prompt);
    
    const finalResults = await Promise.all(aiResults.map(async (res) => {
      const official = await fetchPublicationRank(res.pubName);
      
      return {
        text: res.text,
        level: res.level, 
        rankDetail: {
          tags: official.tags,
          isNegative: official.isNegative || res.level?.includes('风险') || res.level?.includes('负面')
        }
      };
    }));

    return NextResponse.json({ results: finalResults });
  } catch (error: unknown) {
    console.error("Citation Process Error:", error);
    const message = error instanceof Error ? error.message : "An error occurred";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
