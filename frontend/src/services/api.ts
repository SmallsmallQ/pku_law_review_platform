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

export const authApi = {
  register: (body: { email: string; password: string; real_name?: string; institution?: string }) =>
    request<User>("auth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  login: (body: { email: string; password: string }) =>
    request<LoginRes>("auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }),
  me: () => request<User>("auth/me"),
  updateMe: (body: { real_name?: string; institution?: string }) =>
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

export const manuscriptsApi = {
  my: (params?: { page?: number; page_size?: number; status?: string }) =>
    request<{ items: ManuscriptListItem[]; total: number }>("manuscripts/my", {
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
};

export interface EditorManuscriptItem {
  id: number;
  manuscript_no: string;
  title: string;
  status: string;
  submitted_by: number;
  created_at: string;
  current_version_id: number | null;
  has_report: boolean;
}

export const editorApi = {
  manuscripts: (params?: { page?: number; page_size?: number; status?: string }) =>
    request<{ items: EditorManuscriptItem[]; total: number }>("editor/manuscripts", {
      params: params ? Object.fromEntries(Object.entries(params).map(([k, v]) => [k, String(v)])) : undefined,
    }),
  manuscriptDetail: (id: number) => request<Record<string, unknown>>(`editor/manuscripts/${id}`),
  action: (id: number, body: { action_type: string; to_status?: string; comment?: string }) =>
    request<{ message: string; new_status: string }>(`editor/manuscripts/${id}/actions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  downloadUrl: (id: number, versionId: number) =>
    `${API_BASE}/editor/manuscripts/${id}/files/${versionId}/download${getToken() ? `?token=${getToken()}` : ""}`,
  /** 生成 AI 初审报告 */
  generateAiReview: (id: number) =>
    request<{ content: string; model: string }>(`editor/manuscripts/${id}/ai-review`, { method: "POST" }),
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

export interface AdminStats {
  manuscripts_total: number;
  manuscripts_by_status: Record<string, number>;
  manuscripts_pending: number;
  users_by_role: Record<string, number>;
  sections_count: number;
  templates_count: number;
}

export const adminApi = {
  users: (params?: { role?: string; is_active?: boolean; page?: number; page_size?: number }) =>
    request<{ items: AdminUserItem[]; total: number }>("admin/users", {
      params: params ? Object.fromEntries(Object.entries(params).filter(([, v]) => v !== undefined).map(([k, v]) => [k, String(v)])) : undefined,
    }),
  createUser: (body: { email: string; password: string; real_name?: string; role?: string }) =>
    request<AdminUserItem>("admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  updateUser: (id: number, body: { real_name?: string; role?: string; is_active?: boolean }) =>
    request<AdminUserItem>(`admin/users/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

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

  config: () => request<{ items: ConfigItem[]; total: number }>("admin/config"),
  updateConfig: (body: { key?: string; value?: string; items?: { key: string; value: string }[] }) =>
    request<{ message: string }>("admin/config", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),

  stats: () => request<AdminStats>("admin/stats"),
};
