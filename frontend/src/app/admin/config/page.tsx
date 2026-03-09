"use client";

import { useEffect, useState } from "react";
import { Button, Card, Form, Input, message } from "antd";
import { adminApi } from "@/services/api";

export default function AdminConfigPage() {
  const [loading, setLoading] = useState(true);
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    adminApi
      .config()
      .then((res) => {
        const keys = res.items.length ? res.items.map((i) => ({ key: i.key, value: i.value ?? "" })) : [{ key: "", value: "" }];
        form.setFieldsValue({ keys });
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, [form]);

  const handleFinish = (values: { keys?: { key: string; value: string }[] }) => {
    const list = values.keys ?? [];
    const toSave = list.filter((k) => k?.key?.trim());
    if (toSave.length === 0) {
      message.info("没有可保存的配置项");
      return;
    }
    setSubmitting(true);
    adminApi
      .updateConfig({ items: toSave.map((k) => ({ key: k.key.trim(), value: k.value ?? "" })) })
      .then(() => {
        message.success("保存成功");
        adminApi.config().then((res) => {
          form.setFieldsValue({ keys: res.items.map((i) => ({ key: i.key, value: i.value ?? "" })) });
        });
      })
      .catch((e) => message.error(e?.message || "保存失败"))
      .finally(() => setSubmitting(false));
  };

  if (loading) return <p className="text-[#666]">加载中…</p>;

  return (
    <div>
      <h1 className="text-xl font-bold text-[#333] mb-4">系统配置</h1>
      <Card size="small">
        <p className="text-[#666] text-sm mb-4">键值对配置，可用于期刊介绍、投稿须知、联系方式等文案或系统参数。</p>
        <Form form={form} onFinish={handleFinish} initialValues={{ keys: [{ key: "", value: "" }] }}>
          <Form.List name="keys">
            {(fields, { add, remove }) => (
              <>
                {fields.map(({ key, name, ...rest }) => (
                  <div key={key} className="flex gap-2 items-start mb-2">
                    <Form.Item name={[name, "key"]} {...rest} className="!mb-0 flex-1">
                      <Input placeholder="key" />
                    </Form.Item>
                    <Form.Item name={[name, "value"]} {...rest} className="!mb-0 flex-1">
                      <Input placeholder="value" />
                    </Form.Item>
                    <Button type="text" danger onClick={() => remove(name)}>删除</Button>
                  </div>
                ))}
                <Button type="dashed" onClick={() => add()} className="mb-4">+ 添加一项</Button>
              </>
            )}
          </Form.List>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={submitting} className="!bg-[#8B1538] hover:!bg-[#70122e]">保存配置</Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
