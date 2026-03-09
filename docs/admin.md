# 管理后台说明

## 技术选型

管理后台采用 **Tabler 风格**：在现有 Next.js + Tailwind + Ant Design 技术栈内实现，保持单一代码库、与主站一致的 UI 与鉴权。侧边栏 + 内容区布局简洁清晰，便于扩展。

（未单独引入 Vue-Element-Admin、NocoDB、Appsmith 等，以避免多技术栈与部署拆分。）

## 功能范围

- **仪表盘** `/admin`：稿件总数、待处理数、栏目数、退修模板数、用户角色分布、稿件状态分布。
- **稿件总览** `/admin/manuscripts`：按状态/栏目/关键词筛选全站稿件，支持查看详情、退修、录用、退稿。
- **用户管理** `/admin/users`：列表（按角色/启用状态筛选、分页）、新建用户（邮箱、密码、姓名、角色）、编辑（姓名、角色、启用状态）、删除用户（带安全校验）。
- **栏目管理** `/admin/sections`：列表、新增/编辑/删除栏目（名称、编码、排序）。
- **退修模板** `/admin/templates`：列表、新增/编辑模板（名称、内容、是否启用）。
- **系统配置** `/admin/config`：键值对配置的列表与批量保存（可用于期刊介绍、投稿须知、联系方式等）。

## 权限

- 仅 **admin** 角色可访问管理后台；未登录或非 admin 访问 `/admin/*` 会被重定向到首页。
- 顶栏与首页「系统入口」在用户为 admin 时显示「管理后台」入口。

## 后端接口

- 见 `docs/api-spec.md` 第七章「管理员端」。
- 路由：`/api/v1/admin/manuscripts`、`/admin/users`、`/admin/sections`、`/admin/templates/revision`、`/admin/config`、`/admin/stats`。
- 新建表：`revision_templates`、`system_config`。部署后需执行 `python -m scripts.init_db`（或对应迁移）以创建新表。

## 首次使用

1. 在数据库中至少保留一个 `role='admin'` 的用户（可通过种子脚本或直接改现有用户 role）。
2. 使用该账号登录后，顶栏会出现「管理后台」，或直接访问 `/admin`。
