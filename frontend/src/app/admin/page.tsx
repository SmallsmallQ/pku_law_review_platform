"use client";

import { useEffect, useState } from "react";
import { Card, Row, Col, Statistic, Spin } from "antd";
import { adminApi, type AdminStats } from "@/services/api";
import { STATUS_MAP } from "@/lib/constants";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi
      .stats()
      .then(setStats)
      .catch(() => setStats(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Spin size="large" />
      </div>
    );
  }

  if (!stats) {
    return <p className="text-red-600">加载统计失败</p>;
  }

  const statusEntries = Object.entries(stats.manuscripts_by_status).filter(([, c]) => c > 0);

  return (
    <div>
      <h1 className="text-xl font-bold text-[#333] mb-6">仪表盘</h1>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} md={8}>
          <Card size="small" className="shadow-sm">
            <Statistic title="稿件总数" value={stats.manuscripts_total} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card size="small" className="shadow-sm">
            <Statistic title="待处理稿件" value={stats.manuscripts_pending} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card size="small" className="shadow-sm">
            <Statistic title="栏目数" value={stats.sections_count} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card size="small" className="shadow-sm">
            <Statistic title="退修模板数" value={stats.templates_count} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card size="small" className="shadow-sm">
            <Statistic title="作者" value={stats.users_by_role?.author ?? 0} />
          </Card>
        </Col>
        <Col xs={24} sm={12} md={8}>
          <Card size="small" className="shadow-sm">
            <Statistic title="编辑" value={stats.users_by_role?.editor ?? 0} />
          </Card>
        </Col>
      </Row>
      {statusEntries.length > 0 && (
        <Card size="small" title="稿件状态分布" className="mt-6 shadow-sm">
          <div className="flex flex-wrap gap-4">
            {statusEntries.map(([status, count]) => (
              <span key={status} className="rounded bg-[#f0f0f0] px-3 py-1 text-sm text-[#555]">
                {STATUS_MAP[status] ?? status}: {count}
              </span>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
