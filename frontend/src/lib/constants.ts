/**
 * 全站常量：稿件状态文案、期刊主题色类名等
 */
export const STATUS_MAP: Record<string, string> = {
  draft: "草稿",
  submitted: "已投稿",
  parsing: "解析中",
  under_review: "初审中",
  revision_requested: "待退修",
  revised_submitted: "已提交修订稿",
  accepted: "录用",
  rejected: "退稿",
};

/** 期刊主色，用于 className */
export const JOURNAL = {
  primary: "text-[#8B1538]",
  primaryBg: "bg-[#8B1538]",
  primaryBorder: "border-[#8B1538]",
  primaryHover: "hover:bg-[#70122e] hover:text-white",
  link: "text-[#8B1538] hover:underline",
  inputFocus: "focus:border-[#8B1538] focus:ring-1 focus:ring-[#8B1538]",
  btnPrimary: "bg-[#8B1538] text-white hover:bg-[#70122e]",
  btnOutline: "border border-[#8B1538] text-[#8B1538] hover:bg-[#8B1538]/5",
} as const;
