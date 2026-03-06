import { Spin } from "antd";

export default function Loading() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <Spin size="large" tip="加载中…" />
    </div>
  );
}
