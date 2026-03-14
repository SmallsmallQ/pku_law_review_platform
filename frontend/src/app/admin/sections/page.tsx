"use client";

import { useEffect, useState } from "react";
import { Button, Form, Input, Modal, Space, Table, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { adminApi, type SectionItem } from "@/services/api";

export default function AdminSectionsPage() {
  const [list, setList] = useState<SectionItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SectionItem | null>(null);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  const load = () => {
    setLoading(true);
    adminApi.sections().then((res) => { setList(res.items); }).catch(() => setList([])).finally(() => setLoading(false));
  };

  useEffect(() => load(), []);

  const handleFinish = (values: { name: string; code?: string; sort_order?: number }) => {
    setSubmitting(true);
    const run = editing
      ? adminApi.updateSection(editing.id, values)
      : adminApi.createSection(values);
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

  const handleDelete = (id: number) => {
    if (!confirm("确定删除该栏目？")) return;
    adminApi.deleteSection(id).then(() => { message.success("已删除"); load(); }).catch((e) => message.error(e?.message || "删除失败"));
  };

  const columns: ColumnsType<SectionItem> = [
    { title: "ID", dataIndex: "id", key: "id", width: 80 },
    { title: "名称", dataIndex: "name", key: "name" },
    { title: "编码", dataIndex: "code", key: "code" },
    { title: "排序", dataIndex: "sort_order", key: "sort_order", width: 80 },
    {
      title: "操作",
      key: "action",
      width: 140,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => { setEditing(record); form.setFieldsValue({ name: record.name, code: record.code ?? "", sort_order: record.sort_order }); setModalOpen(true); }}>
            编辑
          </Button>
          <Button type="link" size="small" danger onClick={() => handleDelete(record.id)}>删除</Button>
        </Space>
      ),
    },
  ];

  return (
    <div className="bg-white min-h-screen text-[#1d1d1f] p-4 sm:p-6 lg:p-8 w-full max-w-[1400px] mx-auto">
      <h1 className="text-2xl font-medium text-gray-900 mb-6">栏目管理</h1>
      
      <div className="bg-gray-50 border border-[#e5e7eb] rounded-sm p-4 mb-6 shadow-sm flex items-center">
        <Button type="primary" onClick={() => { setEditing(null); form.resetFields(); setModalOpen(true); }} className="bg-[#8B1538] hover:!bg-[#A51D45] border-none shadow-sm rounded-sm">
          新增栏目分类
        </Button>
      </div>
      
      <div className="border border-[#e5e7eb] rounded-sm overflow-hidden bg-white shadow-sm">
        <Table 
          rowKey="id" 
          columns={columns} 
          dataSource={list} 
          loading={loading} 
          size="middle"
          pagination={{ className: "!mt-4 !mb-4 !mr-4" }}
          rowClassName="hover:bg-gray-50 transition-colors" 
        />
      </div>

      <Modal title={editing ? "编辑栏目" : "新增栏目"} open={modalOpen} onCancel={() => { setModalOpen(false); setEditing(null); }} footer={null} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleFinish}>
          <Form.Item name="name" label="名称" rules={[{ required: true }]}>
            <Input />
          </Form.Item>
          <Form.Item name="code" label="编码">
            <Input />
          </Form.Item>
          <Form.Item name="sort_order" label="排序" initialValue={0}>
            <Input type="number" />
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
