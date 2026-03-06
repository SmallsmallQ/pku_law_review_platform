# 中外法学智能编审系统 v0.1 — API 清单

## 一、约定

- **Base URL**：`/api/v1`（示例）
- **认证**：除登录/注册及公开页面外，均需携带 token（如 `Authorization: Bearer <token>` 或 Cookie）。
- **通用响应**：成功统一用 `200`，业务错误用 `4xx` 与 body 中的 `code`/`message`；列表接口建议统一分页参数 `page`、`page_size`，响应含 `items`、`total`。
- **文件上传**：使用 `multipart/form-data`；大文件与解析/报告生成建议异步：上传后返回 `task_id`，前端轮询或 WebSocket 查询任务状态。

---

## 二、认证与用户

| 方法 | 路径 | 说明 | 请求/响应要点 |
|------|------|------|----------------|
| POST | /auth/register | 作者注册 | body: email, password, real_name, institution 等 |
| POST | /auth/login | 登录 | body: email, password → token + user 信息 |
| POST | /auth/logout | 登出 | 使当前 token 失效 |
| GET | /auth/me | 当前用户信息 | 返回当前用户 profile（含 role） |
| PUT | /auth/me | 更新当前用户信息 | 仅允许改 real_name、institution 等，不可改 role |

---

## 三、作者端 — 投稿与我的稿件

| 方法 | 路径 | 说明 | 请求/响应要点 |
|------|------|------|----------------|
| POST | /manuscripts | 创建稿件（草稿或直接投稿） | body: title, abstract, keywords, author_info, institution, fund, contact, section_id?；同时 multipart 上传主稿文件（必填）、补充材料（可选）；可带 `submit=true` 表示直接提交。返回 manuscript 及当前 version。 |
| GET | /manuscripts/my | 我的稿件列表 | query: page, page_size, status?。仅当前作者。返回列表含 manuscript_no, title, status, current_version_id, created_at 等。 |
| GET | /manuscripts/{id} | 稿件详情（作者视角） | 仅本人稿件。返回稿件主信息 + 当前版本 + 解析摘要（若有）+ 最新报告摘要（若有）。 |
| GET | /manuscripts/{id}/versions | 稿件版本列表 | 仅本人稿件。返回 version_number, created_at, file_name_original, word_count, parsed_at。 |
| GET | /manuscripts/{id}/versions/{version_id} | 某版本详情 | 含该版本解析结果摘要、该版本对应的报告是否存在。 |
| GET | /manuscripts/{id}/revision-requests | 退修意见列表 | 仅本人稿件。返回 editor_actions 中 action_type=revision_request 的 comment 与 created_at。 |
| POST | /manuscripts/{id}/versions | 上传修订稿 | 仅本人稿件且状态为 revision_requested。multipart 上传新文件；创建新 version，可选：自动将状态改为 revised_submitted。 |
| GET | /manuscripts/{id}/files/{version_id}/download | 下载某版本文件 | 仅本人稿件，返回文件流或重定向到临时 URL。 |

---

## 四、编辑端 — 工作台与稿件处理

| 方法 | 路径 | 说明 | 请求/响应要点 |
|------|------|------|----------------|
| GET | /editor/manuscripts | 编辑稿件列表 | query: page, page_size, status?, section_id?, risk_level?（若前端有高风险筛选）。仅编辑/管理员可见。返回列表含 manuscript_no, title, status, submitted_by, created_at, has_report? 等。 |
| GET | /editor/manuscripts/{id} | 稿件详情（编辑驾驶舱） | 完整信息：稿件主表、当前版本、解析结果（含 body_structure, footnotes_raw 等）、最新初审报告（含 content JSON）、引注问题列表、相似结果列表、编辑操作历史。 |
| GET | /editor/manuscripts/{id}/reports | 该稿件报告历史 | 按 version 或 generated_at 排序，返回 report 列表（id, version_id, report_type, generated_at）。 |
| GET | /editor/manuscripts/{id}/reports/{report_id} | 某份报告详情 | 完整 content（六块结构）+ citation_issues + similarity_results。 |
| POST | /editor/manuscripts/{id}/actions | 编辑操作 | body: action_type（status_change / revision_request / reject / accept）, to_status?, comment?。写入 editor_actions 并更新 manuscripts.status。 |
| GET | /editor/manuscripts/{id}/versions/compare | 版本对比 | query: version_id_a, version_id_b。返回两版本解析结果差异或段落级 diff（实现时可先返回两版摘要与关键字段差异）。 |

---

## 五、系统能力 — 解析、报告、知识库（多数由后台任务触发）

以下接口部分仅内部/后台调用，部分需对编辑或管理员暴露（如「重新生成报告」）。

| 方法 | 路径 | 说明 | 请求/响应要点 |
|------|------|------|----------------|
| POST | /internal/jobs/parse | 触发解析任务 | body: version_id。后台解析该版本，写 manuscript_parsed；完成后可触发入库与报告任务。返回 task_id。 |
| GET | /internal/jobs/{task_id} | 任务状态 | 返回 status: pending / running / success / failed, result?, error?。 |
| POST | /internal/jobs/index | 触发知识库入库 | body: version_id。切块、向量化、写入 knowledge_chunks。返回 task_id。 |
| POST | /internal/jobs/report | 触发初审报告生成 | body: manuscript_id, version_id。执行规则检查、相似检索、AI 风险与建议，写入 review_reports、citation_issues、similarity_results。返回 task_id。 |
| POST | /editor/manuscripts/{id}/regenerate-report | 重新生成报告（编辑用） | body: version_id?（默认当前版本）。内部调用 /internal/jobs/report，返回 task_id 供轮询。 |

---

## 六、公开/门户（读者侧，初版轻量）

| 方法 | 路径 | 说明 | 请求/响应要点 |
|------|------|------|----------------|
| GET | /public/journal | 期刊介绍 | 返回配置化文案（可从 system_config 或静态配置读）。 |
| GET | /public/guide | 投稿须知 | 同上。 |
| GET | /public/issues | 往期目录 | query: year?, page, page_size。返回期号、目录列表（标题、作者、摘要等，不涉及未公开全文）。 |
| GET | /public/contact | 编辑部联系方式 | 静态或配置。 |

---

## 七、管理员端（初版可精简实现）

| 方法 | 路径 | 说明 | 请求/响应要点 |
|------|------|------|----------------|
| GET | /admin/users | 用户列表 | query: role?, is_active?, page, page_size。仅 admin。 |
| POST | /admin/users | 创建用户（如编辑账号） | body: email, password, real_name, role。 |
| PUT | /admin/users/{id} | 更新用户 | 可改 real_name, role, is_active 等。 |
| GET | /admin/sections | 栏目列表 | 增删改可用 REST：GET/POST/PUT/DELETE /admin/sections[/{id}]。 |
| GET | /admin/templates/revision | 退修意见模板列表 | |
| POST | /admin/templates/revision | 新增退修模板 | body: name, content。 |
| PUT | /admin/templates/revision/{id} | 更新模板 | |
| GET | /admin/config | 基础配置项 | 键值或分组配置。 |
| PUT | /admin/config | 更新配置 | body: key, value 或批量。 |
| GET | /admin/stats | 全局状态/统计 | 如稿件总数、各状态数量、待处理数等，供仪表盘。 |

---

## 八、文件与下载

| 方法 | 路径 | 说明 | 请求/响应要点 |
|------|------|------|----------------|
| GET | /manuscripts/{id}/files/{version_id}/download | 作者下载本人稿件某版本 | 见「三」 |
| GET | /editor/manuscripts/{id}/files/{version_id}/download | 编辑下载稿件某版本 | 同上下载逻辑，权限为编辑/管理员。 |
| GET | /manuscripts/{id}/files/{version_id}/preview | 原文预览 | 可选：返回 HTML 或 URL 供前端预览（如转 PDF 预览或纯文本分页）。 |

---

## 九、初版实现优先级建议

1. **必做**：认证（注册/登录/me）、作者投稿与我的稿件列表/详情、版本与退修意见、修订稿上传；编辑稿件列表与详情、报告查看、状态与退修操作；解析任务与报告生成任务（含一条龙：上传→解析→入库→报告）；报告结构六块 + 引注问题/相似结果写入。
2. **次之**：版本对比、管理员用户与栏目、退修模板、公开页接口。
3. **可延后**：管理员配置与统计、预览接口、任务 WebSocket 推送。

---

## 十、与 PRD/库表对应关系

- 作者闭环：`POST /manuscripts` → 后台解析/入库/报告 → `GET /editor/manuscripts`、`GET /editor/manuscripts/{id}`、`POST /editor/manuscripts/{id}/actions`。
- 报告结构：与 PRD 第六章「AI 初审报告结构」一致，存于 `review_reports.content`。
- 留痕：所有编辑操作经 `POST /editor/manuscripts/{id}/actions` 写入 `editor_actions`，并更新 `manuscripts.status`。

本文档为 v0.1 API 清单，后续外审、专家、出版等接口可在此基础上追加。
