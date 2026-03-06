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
  const url = params ? `${API_BASE}${path}?${new URLSearchParams(params)}` : `${API_BASE}${path}`;
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
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || err.message || String(res.status));
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
