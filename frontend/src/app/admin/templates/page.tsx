"use client";

import { useEffect, useState } from "react";
import { Button, Card, Form, Input, Modal, Space, Switch, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { adminApi, type RevisionTemplateItem } from "@/services/api";

const { TextArea } = Input;

export default function AdminTemplatesPage() {
  const [list, setList] = useState<RevisionTemplateItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RevisionTemplateItem | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi.revisionTemplates().then((res) => { setList(res.items); }).catch(() => setList([])).finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const handleFinish = (values: { name?: string; content?: string; is_active?: boolean }) => {
    setSubmitting(true);
    const run = editing
      ? adminApi.updateRevisionTemplate(editing.id, values)
      : adminApi.createRevisionTemplate(values);
    run
      .then(() => {
        message.success(editing ? "更新成功" : "创建成功");
        setModalOpen(false);
        setEditing(null);
        form.resetFields();
        load();
      })
      .catch((e) => message.error(e?.message || "操作失败"))
      .finally(() => setSubmitting(false));
  };

  const columns: ColumnsType<RevisionTemplateItem> = [
    { title: "ID", dataIndex: "id", key: "id", width: 80 },
    { title: "名称", dataIndex: "name", key: "name" },
    { title: "内容", dataIndex: "content", key: "content", ellipsis: true, render: (t: string) => (t ? (t.length > 60 ? t.slice(0, 60) + "…" : t) : "—") },
    {
      title: "启用",
      dataIndex: "is_active",
      key: "is_active",
      width: 80,
      render: (v: boolean) => (v ? "是" : "否"),
    },
    {
      title: "操作",
      key: "action",
      width: 120,
      render: (_, record) => (
        <Button
          type="link"
          size="small"
          onClick={() => {
            setEditing(record);
            form.setFieldsValue({ name: record.name ?? "", content: record.content ?? "", is_active: record.is_active });
            setModalOpen(true);
          }}
        >
          编辑
        </Button>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-[#333] mb-4">退修意见模板</h1>
      <Card size="small" className="mb-4">
        <Button type="primary" onClick={() => { setEditing(null); form.resetFields(); form.setFieldsValue({ is_active: true }); setModalOpen(true); }} className="!bg-[#8B1538] hover:!bg-[#70122e]">
          新增模板
        </Button>
      </Card>
      <Table rowKey="id" columns={columns} dataSource={list} loading={loading} size="small" />

      <Modal title={editing ? "编辑模板" : "新增模板"} open={modalOpen} onCancel={() => { setModalOpen(false); setEditing(null); }} footer={null} destroyOnClose width={560}>
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item name="name" label="模板名称">
            <Input />
          </Form.Item>
          <Form.Item name="content" label="模板内容">
            <TextArea rows={6} />
          </Form.Item>
          <Form.Item name="is_active" label="启用" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting} className="!bg-[#8B1538] hover:!bg-[#70122e]">{editing ? "保存" : "创建"}</Button>
              <Button onClick={() => setModalOpen(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
