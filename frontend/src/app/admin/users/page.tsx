"use client";

import { useCallback, useEffect, useState } from "react";
import { Button, Card, Form, Input, Modal, Select, Space, Table, Tag, message } from "antd";
import type { ColumnsType } from "antd/es/table";
import { adminApi, type AdminUserItem } from "@/services/api";
import { ROLE_MAP } from "@/lib/constants";
const pageSize = 20;

export default function AdminUsersPage() {
  const [list, setList] = useState<AdminUserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [roleFilter, setRoleFilter] = useState<string>("");
  const [activeFilter, setActiveFilter] = useState<string>("");
  const [keyword, setKeyword] = useState<string>("");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUserItem | null>(null);
  const [form] = Form.useForm();
  const [editForm] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    adminApi
      .users({
        page,
        page_size: pageSize,
        ...(roleFilter ? { role: roleFilter } : {}),
        ...(activeFilter !== "" ? { is_active: activeFilter === "true" } : {}),
        ...(keyword.trim() ? { keyword: keyword.trim() } : {}),
      })
      .then((res) => {
        setList(res.items);
        setTotal(res.total);
      })
      .catch(() => setList([]))
      .finally(() => setLoading(false));
  }, [page, roleFilter, activeFilter, keyword]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = (values: { email: string; password: string; real_name?: string; role: string }) => {
    setSubmitting(true);
    adminApi
      .createUser(values)
      .then(() => {
        message.success("创建成功");
        setCreateModalOpen(false);
        form.resetFields();
        load();
      })
      .catch((e) => message.error(e?.message || "创建失败"))
      .finally(() => setSubmitting(false));
  };

  const handleUpdate = (values: { real_name?: string; role?: string; is_active?: boolean; password?: string }) => {
    if (!editingUser) return;
    setSubmitting(true);
    const payload = {
      ...values,
      password: values.password?.trim() ? values.password.trim() : undefined,
    };
    adminApi
      .updateUser(editingUser.id, payload)
      .then(() => {
        message.success("更新成功");
        setEditModalOpen(false);
        setEditingUser(null);
        editForm.resetFields();
        load();
      })
      .catch((e) => message.error(e?.message || "更新失败"))
      .finally(() => setSubmitting(false));
  };

  const handleDelete = (user: AdminUserItem) => {
    if (!window.confirm(`确定删除用户 ${user.email} 吗？该操作不可恢复。`)) return;
    setDeletingUserId(user.id);
    adminApi
      .deleteUser(user.id)
      .then(() => {
        message.success("删除成功");
        if (list.length === 1 && page > 1) {
          setPage(page - 1);
          return;
        }
        load();
      })
      .catch((e) => message.error(e?.message || "删除失败"))
      .finally(() => setDeletingUserId(null));
  };

  const columns: ColumnsType<AdminUserItem> = [
    { title: "ID", dataIndex: "id", key: "id", width: 80 },
    { title: "邮箱", dataIndex: "email", key: "email" },
    { title: "姓名", dataIndex: "real_name", key: "real_name" },
    {
      title: "角色",
      dataIndex: "role",
      key: "role",
      width: 90,
      render: (r: string) => <Tag color={r === "admin" ? "red" : r === "editor" ? "blue" : r.includes("reviewer") ? "purple" : "default"}>{ROLE_MAP[r] ?? r}</Tag>,
    },
    {
      title: "状态",
      dataIndex: "is_active",
      key: "is_active",
      width: 80,
      render: (v: boolean) => (v ? <Tag color="green">启用</Tag> : <Tag color="default">停用</Tag>),
    },
    { title: "创建时间", dataIndex: "created_at", key: "created_at", width: 180, render: (v: string) => v?.slice(0, 19) ?? "" },
    {
      title: "操作",
      key: "action",
      width: 140,
      render: (_, record) => (
        <Space size={0}>
          <Button type="link" size="small" onClick={() => { setEditingUser(record); editForm.setFieldsValue({ real_name: record.real_name, role: record.role, is_active: record.is_active }); setEditModalOpen(true); }}>
            编辑
          </Button>
          <Button type="link" size="small" danger loading={deletingUserId === record.id} onClick={() => handleDelete(record)}>
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-xl font-bold text-[#333] mb-4">用户管理</h1>
      <Card size="small" className="mb-4">
        <Space wrap>
          <Input
            placeholder="搜索邮箱/姓名"
            allowClear
            value={keyword}
            onChange={(e) => {
              setPage(1);
              setKeyword(e.target.value);
            }}
            style={{ width: 220 }}
          />
          <Select placeholder="角色" allowClear value={roleFilter || undefined} onChange={(v) => { setPage(1); setRoleFilter(v ?? ""); }} style={{ width: 100 }}>
            <Select.Option value="author">作者</Select.Option>
            <Select.Option value="internal_reviewer">内审</Select.Option>
            <Select.Option value="external_reviewer">外审</Select.Option>
            <Select.Option value="editor">编辑</Select.Option>
            <Select.Option value="admin">管理员</Select.Option>
          </Select>
          <Select placeholder="状态" allowClear value={activeFilter || undefined} onChange={(v) => { setPage(1); setActiveFilter(v ?? ""); }} style={{ width: 100 }}>
            <Select.Option value="true">启用</Select.Option>
            <Select.Option value="false">停用</Select.Option>
          </Select>
          <Button type="primary" onClick={() => setCreateModalOpen(true)} className="!bg-[#8B1538] hover:!bg-[#70122e]">
            新建用户
          </Button>
        </Space>
      </Card>
      <Table
        rowKey="id"
        columns={columns}
        dataSource={list}
        loading={loading}
        pagination={{ current: page, pageSize, total, onChange: setPage }}
        size="small"
      />

      <Modal title="新建用户" open={createModalOpen} onCancel={() => setCreateModalOpen(false)} footer={null} destroyOnClose>
        <Form form={form} layout="vertical" onFinish={handleCreate}>
          <Form.Item name="email" label="邮箱" rules={[{ required: true }, { type: "email" }]}>
            <Input />
          </Form.Item>
          <Form.Item
            name="password"
            label="密码"
            rules={[
              { required: true, min: 8, message: "至少 8 位" },
              { pattern: /^(?=.*[A-Za-z])(?=.*\d).+$/, message: "需包含字母和数字" },
            ]}
          >
            <Input.Password />
          </Form.Item>
          <Form.Item name="real_name" label="姓名">
            <Input />
          </Form.Item>
          <Form.Item name="role" label="角色" initialValue="author" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="author">作者</Select.Option>
              <Select.Option value="internal_reviewer">内审</Select.Option>
              <Select.Option value="external_reviewer">外审</Select.Option>
              <Select.Option value="editor">编辑</Select.Option>
              <Select.Option value="admin">管理员</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting} className="!bg-[#8B1538] hover:!bg-[#70122e]">创建</Button>
              <Button onClick={() => setCreateModalOpen(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal title="编辑用户" open={editModalOpen} onCancel={() => { setEditModalOpen(false); setEditingUser(null); editForm.resetFields(); }} footer={null} destroyOnClose>
        <Form form={editForm} layout="vertical" onFinish={handleUpdate}>
          <Form.Item name="real_name" label="姓名">
            <Input />
          </Form.Item>
          <Form.Item name="role" label="角色" rules={[{ required: true }]}>
            <Select>
              <Select.Option value="author">作者</Select.Option>
              <Select.Option value="internal_reviewer">内审</Select.Option>
              <Select.Option value="external_reviewer">外审</Select.Option>
              <Select.Option value="editor">编辑</Select.Option>
              <Select.Option value="admin">管理员</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item name="is_active" label="状态">
            <Select>
              <Select.Option value={true}>启用</Select.Option>
              <Select.Option value={false}>停用</Select.Option>
            </Select>
          </Form.Item>
          <Form.Item
            name="password"
            label="重置密码（可选）"
            rules={[{ min: 8, message: "至少 8 位" }]}
            extra="需包含字母和数字"
          >
            <Input.Password placeholder="留空则不修改" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={submitting} className="!bg-[#8B1538] hover:!bg-[#70122e]">保存</Button>
              <Button onClick={() => setEditModalOpen(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
