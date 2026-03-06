"use client";

import { useEffect, useMemo, useState } from "react";
import MarkdownRenderer from "./MarkdownRenderer";

interface TypewriterMarkdownProps {
  content?: string | null;
  className?: string;
  enabled?: boolean;
  intervalMs?: number;
}

export default function TypewriterMarkdown({
  content,
  className,
  enabled = true,
  intervalMs = 12,
}: TypewriterMarkdownProps) {
  const fullText = content ?? "";
  const [visibleLength, setVisibleLength] = useState(enabled ? 0 : fullText.length);

  useEffect(() => {
    if (!enabled) {
      setVisibleLength(fullText.length);
      return;
    }
    setVisibleLength(0);
    if (!fullText) return;

    const timer = window.setInterval(() => {
      setVisibleLength((prev) => {
        if (prev >= fullText.length) {
          window.clearInterval(timer);
          return prev;
        }
        return prev + 1;
      });
    }, intervalMs);

    return () => window.clearInterval(timer);
  }, [enabled, fullText, intervalMs]);

  const visibleText = useMemo(
    () => (enabled ? fullText.slice(0, visibleLength) : fullText),
    [enabled, fullText, visibleLength],
  );
  const isTyping = enabled && visibleLength < fullText.length;

  return (
    <div>
      <MarkdownRenderer content={visibleText} className={className} />
      {isTyping ? <span className="inline-block h-4 w-[1px] animate-pulse bg-[#8B1538] align-middle" /> : null}
    </div>
  );
}
