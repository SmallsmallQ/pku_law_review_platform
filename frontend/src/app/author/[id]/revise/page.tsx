"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import HeaderBar from "@/components/HeaderBar";
import { manuscriptsApi } from "@/services/api";

export default function AuthorRevisePage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const submit = async () => {
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

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      const ext = f.name?.toLowerCase().split(".").pop();
      if (ext && ["docx", "doc", "pdf"].includes(ext)) setFile(f);
      else setError("仅支持 .docx / .doc / .pdf");
    } else setFile(null);
  };

  if (!user) {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-[#f9f8f5]">
      <HeaderBar />
      <main className="mx-auto max-w-lg px-6 py-8">
        <div className="rounded-sm border border-[#ddd] bg-white p-6 shadow-sm">
          <h1 className="mb-6 text-lg font-semibold text-[#333]">上传修订稿</h1>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-[#555]">选择 Word 或 PDF</label>
              <input type="file" accept=".docx,.doc,.pdf" onChange={onFileChange} className="block w-full text-sm text-[#666] file:mr-2 file:rounded file:border-0 file:bg-[#faf8f8] file:px-3 file:py-1.5 file:text-[#8B1538]" />
              {file && <p className="mt-1 text-xs text-[#666]">{file.name}</p>}
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="button"
              onClick={submit}
              disabled={loading}
              className="rounded bg-[#8B1538] px-4 py-2 text-white hover:bg-[#70122e] disabled:opacity-50"
            >
              {loading ? "提交中…" : "提交修订稿"}
            </button>
          </div>
          <p className="mt-6">
            <Link href={`/author/${id}`} className="text-[#8B1538] hover:underline">返回稿件详情</Link>
          </p>
        </div>
      </main>
    </div>
  );
}
