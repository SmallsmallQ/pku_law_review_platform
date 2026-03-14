/**
 * 后端 API 调用封装。Base URL 由 Next.js rewrites 代理到 /api/v1，或可配 NEXT_PUBLIC_API_URL。
 */
const API_BASE = typeof window !== "undefined" ? "/api/v1" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("token");
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem("token", token);
  else localStorage.removeItem("token");
}

export interface User {
  id: number;
  email: string;
  real_name: string | null;
  role: string;
  institution: string | null;
  name_en_first?: string | null;
  name_en_middle?: string | null;
  name_en_last?: string | null;
  salutation?: string | null;
  ethnicity?: string | null;
  phone?: string | null;
  postal_address?: string | null;
  postal_code?: string | null;
  research_field?: string | null;
  title_zh?: string | null;
  title_en?: string | null;
}

export interface LoginRes {
  access_token: string;
  token_type: string;
}

async function request<T>(
  path: string,
  options: RequestInit & { params?: Record<string, string> } = {}
): Promise<T> {
  const { params, ...init } = options;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = params ? `${API_BASE}${normalizedPath}?${new URLSearchParams(params)}` : `${API_BASE}${normalizedPath}`;
  const token = getToken();
  const headers: HeadersInit = {
    ...(init.headers as Record<string, string>),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { ...init, headers });
  if (res.status === 401) {
    setToken(null);
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("auth:401"));
    throw new Error("未登录或登录已过期");
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText })) as { detail?: string | Array<{ msg?: string; message?: string }>; message?: string };
    const detail = err.detail;
    const msg =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail) && detail[0]
          ? (detail[0].msg ?? detail[0].message ?? String(detail[0]))
          : err.message ?? res.statusText;
    throw new Error(msg || String(res.status));
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

/** 带超时的请求，用于 LLM 等可能较久的接口；超时或非 2xx 时抛出，错误信息优先使用后端 detail。 */
async function requestWithTimeout<T>(
  path: string,
  options: RequestInit & { params?: Record<string, string>; timeoutMs?: number } = {}
): Promise<T> {
  const { timeoutMs = 120000, params, ...init } = options;
  const controller = new AbortController();
  const timer = timeoutMs > 0 ? setTimeout(() => controller.abort(), timeoutMs) : null;
  try {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = params ? `${API_BASE}${normalizedPath}?${new URLSearchParams(params)}` : `${API_BASE}${normalizedPath}`;
    const token = getToken();
    const headers: HeadersInit = { ...(init.headers as Record<string, string>) };
    if (token) headers["Authorization"] = `Bearer ${token}`;
    const res = await fetch(url, { ...init, headers, signal: controller.signal });
    clearTimeout(timer as ReturnType<typeof setTimeout>);
    if (res.status === 401) {
      setToken(null);
      if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("auth:401"));
      throw new Error("未登录或登录已过期");
    }
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText })) as { detail?: string | Array<{ msg?: string; message?: string }>; message?: string };
      const detail = err.detail;
      const msg =
        typeof detail === "string"
          ? detail
          : Array.isArray(detail) && detail[0]
            ? (detail[0].msg ?? detail[0].message ?? String(detail[0]))
            : err.message ?? res.statusText;
      throw new Error(msg || String(res.status));
    }
    if (res.status === 204) return undefined as T;
    return res.json();
  } catch (e) {
    clearTimeout(timer as ReturnType<typeof setTimeout>);
    if (e instanceof Error) {
      if (e.name === "AbortError") throw new Error("请求超时，请稍后重试");
      throw e;
    }
    throw e;
  }
}

export const authApi = {
  register: (body: { email: string; password: string; real_name?: string; institution?: string }) =>
    request<User>("auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request<LoginRes>("auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  me: () => request<User>("auth/me"),
  updateMe: (body: {
    real_name?: string | null;
    institution?: string | null;
    name_en_first?: string | null;
    name_en_middle?: string | null;
    name_en_last?: string | null;
    salutation?: string | null;
    ethnicity?: string | null;
    phone?: string | null;
    postal_address?: string | null;
    postal_code?: string | null;
    research_field?: string | null;
    title_zh?: string | null;
    title_en?: string | null;
  }) =>
    request<User>("auth/me", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
};

export interface ManuscriptListItem {
  id: number;
  manuscript_no: string;
  title: string;
  status: string;
  current_version_id: number | null;
  created_at: string;
}

export interface AccessibleManuscriptListItem extends ManuscriptListItem {
  access_mode: "submitted" | "reviewing" | "submitted_and_reviewing" | "admin";
}

export const manuscriptsApi = {
  my: (params?: { page?: number; page_size?: number; status?: string; keyword?: string }) =>
    request<{ items: ManuscriptListItem[]; total: number }>("manuscripts/my", {
      params: params ? Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) : undefined,
    }),
  accessibleForAiDetect: (params?: { page?: number; page_size?: number; keyword?: string }) =>
    request<{ items: AccessibleManuscriptListItem[]; total: number }>("manuscripts/accessible-for-ai-detect", {
      params: params ? Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) : undefined,
    }),
  get: (id: number) => request<Record<string, unknown>>(`manuscripts/${id}`),
  create: (formData: FormData) =>
    request<{ manuscript: Record<string, unknown>; version: Record<string, unknown> }>("manuscripts", {
      method: "POST",
      body: formData,
      headers: {}, // 不设 Content-Type，让浏览器带 multipart boundary
    }),
  versions: (id: number) => request<{ items: unknown[] }>(`manuscripts/${id}/versions`),
  revisionRequests: (id: number) => request<{ items: unknown[] }>(`manuscripts/${id}/revision-requests`),
  uploadRevision: (id: number, file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<Record<string, unknown>>(`manuscripts/${id}/versions`, { method: "POST", body: fd });
  },
  downloadUrl: (id: number, versionId: number) =>
    `${API_BASE}/manuscripts/${id}/files/${versionId}/download${getToken() ? `?token=${getToken()}` : ""}`,
  /** 获取稿件正文文本，用于 AI 检测页导入 */
  getTextForAiDetect: (id: number) =>
    request<{ text: string }>(`manuscripts/${id}/text-for-ai-detect`),
  /** 上传 Word/PDF 提取正文，用于 AI 检测（不落库） */
  extractTextFromFile: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<{ text: string }>("manuscripts/extract-text", { method: "POST", body: fd });
  },
  /** 上传 Word/PDF 提取引注候选，用于引注转换工具（不落库） */
  extractCitationsFromFile: (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    return request<{ citations: string[]; source: string; total: number }>("manuscripts/extract-citations", {
      method: "POST",
      body: fd,
    });
  },
};

export interface EditorManuscriptItem {
  id: number;
  manuscript_no: string;
  title: string;
  status: string;
  current_review_stage?: string | null;
  submitted_by: number;
  created_at: string;
  current_version_id: number | null;
  has_report: boolean;
  assignments?: ManuscriptAssignmentItem[];
  available_actions?: string[];
}

export interface ManuscriptAssignmentItem {
  id: number;
  review_stage: string;
  reviewer_id: number;
  reviewer_name: string;
  reviewer_email?: string | null;
  reviewer_role?: string | null;
  note?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface ReviewSubmissionItem {
  id: number;
  review_stage: string;
  reviewer_id: number;
  reviewer_name: string;
  reviewer_email?: string | null;
  reviewer_role?: string | null;
  recommendation: string;
  overall_score?: number | null;
  originality_score?: number | null;
  rigor_score?: number | null;
  writing_score?: number | null;
  summary?: string | null;
  major_issues?: string | null;
  revision_requirements?: string | null;
  confidential_notes?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface EditorManuscriptDetail {
  manuscript?: Record<string, unknown>;
  current_version?: Record<string, unknown>;
  parsed?: Record<string, unknown>;
  editor_actions?: Record<string, unknown>[];
  assignments?: ManuscriptAssignmentItem[];
  available_actions?: string[];
  review_submissions?: ReviewSubmissionItem[];
  citation_issues?: Array<{
    location: string;
    issue_type?: string;
    description: string;
    suggestion?: string;
    severity?: string;
  }>;
  report?: {
    content?: string;
    model?: string;
  } | null;
}

export const editorApi = {
  manuscripts: (params?: { page?: number; page_size?: number; status?: string; keyword?: string }) =>
    request<{ items: EditorManuscriptItem[]; total: number }>("editor/manuscripts", {
      params: params ? Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) : undefined,
    }),
  manuscriptDetail: (id: number) => request<EditorManuscriptDetail>(`editor/manuscripts/${id}`),
  /** 获取稿件正文文本，用于编辑端跳转 AI 检测时自动导入 */
  getTextForAiDetect: (id: number) =>
    request<{ text: string }>(`editor/manuscripts/${id}/text-for-ai-detect`),
  action: (id: number, body: { action_type: string; to_status?: string; comment?: string }) =>
    request<{ message: string; new_status: string; current_review_stage?: string | null }>(`editor/manuscripts/${id}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  submitStructuredReview: (id: number, body: {
    review_stage: string;
    recommendation: string;
    overall_score?: number | null;
    originality_score?: number | null;
    rigor_score?: number | null;
    writing_score?: number | null;
    summary?: string;
    major_issues?: string;
    revision_requirements?: string;
    confidential_notes?: string;
  }) =>
    request<{ message: string; review_submissions: ReviewSubmissionItem[] }>(`editor/manuscripts/${id}/structured-review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  downloadUrl: (id: number, versionId: number) =>
    `${API_BASE}/editor/manuscripts/${id}/files/${versionId}/download${getToken() ? `?token=${getToken()}` : ""}`,
  /** Word 转 PDF 预览：返回 PDF 文件流，仅对 .docx/.doc 有效；PDF 原稿请用 download */
  previewPdfUrl: (id: number, versionId: number) =>
    `${API_BASE}/editor/manuscripts/${id}/files/${versionId}/preview-pdf${getToken() ? `?token=${getToken()}` : ""}`,
  /** 生成 AI 初审报告 */
  generateAiReview: (id: number) =>
    request<{ content: string; model: string }>(`editor/manuscripts/${id}/ai-review`, { method: "POST" }),
  /** 基于当前稿件的 AI 对话（后端注入上下文） */
  aiChat: (id: number, message: string) =>
    request<{ content: string; model: string }>(`editor/manuscripts/${id}/ai-chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message }),
    }),
  /** 生成退修意见草稿（基于初审报告与退修模板），约 60s 内返回，前端等待最多 120s */
  revisionDraft: (id: number) =>
    requestWithTimeout<{ draft: string }>(`editor/manuscripts/${id}/revision-draft`, { method: "POST", timeoutMs: 120000 }),
  /** 引注自动检查（当前版本脚注），返回问题列表并写入报告；use_llm 为 true 时接入大模型辅助判断 */
  runCitationCheck: (id: number, options?: { use_llm?: boolean }) =>
    request<{ total: number; issues: { location: string; issue_type: string; description: string; suggestion?: string; severity?: string }[] }>(
      `editor/manuscripts/${id}/citation-check`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ use_llm: options?.use_llm ?? false }) }
    ),
};

/** 阿里云百炼大模型：仅编辑可用 */
export const aiApi = {
  status: () => request<{ configured: boolean }>("ai/status"),
  chat: (body: { messages: { role: string; content: string }[]; model?: string; max_tokens?: number }) =>
    request<{ content: string; model: string }>("ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
};

// ---------- 管理后台（仅 admin） ----------
export interface AdminUserItem {
  id: number;
  email: string;
  real_name: string | null;
  role: string;
  institution: string | null;
  is_active: boolean;
  created_at: string;
}

export interface SectionItem {
  id: number;
  name: string;
  code: string | null;
  sort_order: number;
  created_at: string | null;
}

export interface RevisionTemplateItem {
  id: number;
  name: string | null;
  content: string | null;
  is_active: boolean;
  created_at: string | null;
}

export interface ConfigItem {
  key: string;
  value: string | null;
  updated_at: string | null;
}

export interface AdminManuscriptItem {
  id: number;
  manuscript_no: string;
  title: string;
  status: string;
  current_review_stage: string | null;
  submitted_by: number;
  submitted_by_email: string | null;
  section_id: number | null;
  section_name: string | null;
  current_version_id: number | null;
  created_at: string;
  updated_at: string | null;
  assignments: ManuscriptAssignmentItem[];
}

export interface AdminStats {
  manuscripts_total: number;
  manuscripts_by_status: Record<string, number>;
  manuscripts_pending: number;
  users_by_role: Record<string, number>;
  sections_count: number;
  templates_count: number;
}

export interface AdminRecentActionItem {
  id: number;
  manuscript_id: number;
  manuscript_no: string | null;
  manuscript_title: string | null;
  action_type: string;
  from_status: string | null;
  to_status: string | null;
  comment: string | null;
  editor_id: number;
  editor_email: string | null;
  editor_name: string | null;
  created_at: string;
}

export const adminApi = {
  manuscripts: (params?: { status?: string; section_id?: number; keyword?: string; page?: number; page_size?: number }) =>
    request<{ items: AdminManuscriptItem[]; total: number }>("admin/manuscripts", {
      params: params ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])) : undefined,
    }),
  manuscriptAction: (id: number, body: { action_type: string; to_status?: string; comment?: string }) =>
    request<{ message: string; new_status: string; current_review_stage?: string | null }>(`admin/manuscripts/${id}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  assignManuscript: (id: number, body: { review_stage: string; reviewer_id: number; note?: string; activate_stage?: boolean }) =>
    request<{ message: string; status: string; current_review_stage?: string | null; assignments: ManuscriptAssignmentItem[] }>(`admin/manuscripts/${id}/assignments`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  users: (params?: { role?: string; is_active?: boolean; keyword?: string; page?: number; page_size?: number }) =>
    request<{ items: AdminUserItem[]; total: number }>("admin/users", {
      params: params ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])) : undefined,
    }),
  recentUsers: (params?: { limit?: number }) =>
    request<{ items: AdminUserItem[]; total: number }>("admin/users/recent", {
      params: params ? Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) : undefined,
    }),
  createUser: (body: { email: string; password: string; real_name?: string; role?: string }) =>
    request<AdminUserItem>("admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  updateUser: (id: number, body: { real_name?: string; role?: string; is_active?: boolean; password?: string }) =>
    request<AdminUserItem>(`admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  deleteUser: (id: number) =>
    request<void>(`admin/users/${id}`, { method: "DELETE" }),

  sections: () => request<{ items: SectionItem[]; total: number }>("admin/sections"),
  createSection: (body: { name: string; code?: string; sort_order?: number }) =>
    request<SectionItem>("admin/sections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  updateSection: (id: number, body: { name: string; code?: string; sort_order?: number }) =>
    request<SectionItem>(`admin/sections/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  deleteSection: (id: number) =>
    request<void>(`admin/sections/${id}`, { method: "DELETE" }),

  revisionTemplates: () => request<{ items: RevisionTemplateItem[]; total: number }>("admin/templates/revision"),
  createRevisionTemplate: (body: { name?: string; content?: string; is_active?: boolean }) =>
    request<RevisionTemplateItem>("admin/templates/revision", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  updateRevisionTemplate: (id: number, body: { name?: string; content?: string; is_active?: boolean }) =>
    request<RevisionTemplateItem>(`admin/templates/revision/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  deleteRevisionTemplate: (id: number) =>
    request<void>(`admin/templates/revision/${id}`, { method: "DELETE" }),

  config: () => request<{ items: ConfigItem[]; total: number }>("admin/config"),
  updateConfig: (body: { key?: string; value?: string; items?: { key: string; value: string }[] }) =>
    request<{ message: string }>("admin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  stats: () => request<AdminStats>("admin/stats"),
  recentActions: (params?: { limit?: number }) =>
    request<{ items: AdminRecentActionItem[]; total: number }>("admin/actions/recent", {
      params: params ? Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) : undefined,
    }),
};
