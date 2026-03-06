"use client";

import Link from "next/link";
import { Button, Result } from "antd";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <Result
        status="error"
        title="出错了"
        subTitle={error.message || "页面加载或执行时发生错误，请重试或返回首页。"}
        extra={
          <div className="flex justify-center gap-2">
            <Button type="primary" onClick={reset}>
              重试
            </Button>
            <Link href="/">
              <Button>返回首页</Button>
            </Link>
          </div>
        }
      />
    </div>
  );
}
