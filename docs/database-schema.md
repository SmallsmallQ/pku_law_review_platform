# 中外法学智能编审系统 v0.1 — 数据库表设计

## 一、设计原则

- **稿件有版本**：每次作者提交对应一个版本记录，保留文件与解析结果。
- **报告有历史**：初审报告按版本或按「报告生成时间」可追溯。
- **编辑有操作记录**：状态变更、退修意见、操作人、操作时间均落表。
- **知识库可追溯**：切块与向量带稿件/版本/段落等元数据，便于检索与过滤。

以下字段除注明「可选」外，均为建议必填；具体是否 NOT NULL 以实现时迁移为准。

---

## 二、用户与权限

### 2.1 用户表 `users`

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGSERIAL PRIMARY KEY | 主键 |
| email | VARCHAR(255) UNIQUE NOT NULL | 登录邮箱 |
| password_hash | VARCHAR(255) NOT NULL | 密码哈希 |
| real_name | VARCHAR(100) | 真实姓名 |
| role | VARCHAR(20) NOT NULL | 角色：author / editor / admin |
| institution | VARCHAR(200) | 单位（作者常用） |
| is_active | BOOLEAN DEFAULT true | 是否启用 |
| created_at | TIMESTAMPTZ DEFAULT now() | 创建时间 |
| updated_at | TIMESTAMPTZ DEFAULT now() | 更新时间 |

- 索引：`email`（唯一）、`role`、`is_active`。

---

### 2.2 栏目表 `sections`（可选，初版可简化为枚举）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | SERIAL PRIMARY KEY | 主键 |
| name | VARCHAR(100) NOT NULL | 栏目名称 |
| code | VARCHAR(50) UNIQUE | 编码 |
| sort_order | INT DEFAULT 0 | 排序 |
| created_at | TIMESTAMPTZ DEFAULT now() | |

---

## 三、稿件与版本

### 3.1 稿件主表 `manuscripts`

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGSERIAL PRIMARY KEY | 主键 |
| manuscript_no | VARCHAR(50) UNIQUE NOT NULL | 稿件编号（展示用，如 M2025-001） |
| title | VARCHAR(500) NOT NULL | 标题 |
| submitted_by | BIGINT NOT NULL REFERENCES users(id) | 投稿人（作者） |
| section_id | INT REFERENCES sections(id) | 所属栏目（可选） |
| status | VARCHAR(30) NOT NULL | 状态：draft / submitted / parsing / under_review / revision_requested / revised_submitted / accepted / rejected |
| current_version_id | BIGINT | 当前最新版本（关联 manuscript_versions.id） |
| created_at | TIMESTAMPTZ DEFAULT now() | 创建时间 |
| updated_at | TIMESTAMPTZ DEFAULT now() | 更新时间 |

- 索引：`manuscript_no`、`submitted_by`、`status`、`created_at`。

---

### 3.2 稿件版本表 `manuscript_versions`

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGSERIAL PRIMARY KEY | 主键 |
| manuscript_id | BIGINT NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE | 所属稿件 |
| version_number | INT NOT NULL | 版本号，从 1 递增 |
| file_path | VARCHAR(500) NOT NULL | 主稿文件存储路径 |
| file_name_original | VARCHAR(255) | 原始文件名 |
| supplement_path | VARCHAR(500) | 补充材料路径（可选） |
| parsed_at | TIMESTAMPTZ | 解析完成时间（空表示未解析或解析失败） |
| word_count | INT | 字数（解析后填充） |
| created_at | TIMESTAMPTZ DEFAULT now() | 提交时间 |

- 唯一约束：`(manuscript_id, version_number)`。
- 索引：`manuscript_id`、`created_at`。

---

### 3.3 稿件解析结果表 `manuscript_parsed`（一版本一条）

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGSERIAL PRIMARY KEY | 主键 |
| version_id | BIGINT NOT NULL UNIQUE REFERENCES manuscript_versions(id) ON DELETE CASCADE | 版本 ID |
| title | VARCHAR(500) | 解析出的标题 |
| abstract | TEXT | 摘要 |
| keywords | VARCHAR(500) | 关键词（可存 JSON 数组或逗号分隔） |
| body_text | TEXT | 正文纯文本 |
| body_structure | JSONB | 章节结构（标题层级、起止位置等） |
| footnotes_raw | JSONB | 脚注原文列表 |
| references_raw | JSONB | 参考文献块原文 |
| author_info | JSONB | 解析出的作者/单位/基金等（与表单可合并展示） |
| created_at | TIMESTAMPTZ DEFAULT now() | |

- 索引：`version_id`。

---

## 四、审稿报告与编辑操作

### 4.1 审稿报告表 `review_reports`

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGSERIAL PRIMARY KEY | 主键 |
| manuscript_id | BIGINT NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE | 稿件 |
| version_id | BIGINT NOT NULL REFERENCES manuscript_versions(id) ON DELETE CASCADE | 对应版本 |
| report_type | VARCHAR(20) DEFAULT 'preliminary' | 报告类型：preliminary（初审）等 |
| content | JSONB NOT NULL | 结构化报告（概览、结构评估、引注问题、相似风险、AI 风险、修改建议） |
| generated_at | TIMESTAMPTZ DEFAULT now() | 生成时间 |
| created_at | TIMESTAMPTZ DEFAULT now() | |

- 索引：`manuscript_id`、`version_id`、`generated_at`。

---

### 4.2 引注问题表 `citation_issues`

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGSERIAL PRIMARY KEY | 主键 |
| report_id | BIGINT NOT NULL REFERENCES review_reports(id) ON DELETE CASCADE | 所属报告 |
| location | VARCHAR(200) | 位置描述（如「第 3 页脚注 2」） |
| issue_type | VARCHAR(50) | 问题类型（格式不统一、法条书写、缺页码等） |
| description | TEXT | 问题描述 |
| suggestion | TEXT | 修改建议 |
| severity | VARCHAR(20) | 严重程度：high / medium / low（可选） |
| created_at | TIMESTAMPTZ DEFAULT now() | |

- 索引：`report_id`。

---

### 4.3 相似结果表 `similarity_results`

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGSERIAL PRIMARY KEY | 主键 |
| report_id | BIGINT NOT NULL REFERENCES review_reports(id) ON DELETE CASCADE | 所属报告 |
| source_version_id | BIGINT NOT NULL REFERENCES manuscript_versions(id) | 当前稿版本 |
| target_type | VARCHAR(30) | 相似来源类型：manuscript / published / rule 等 |
| target_id | VARCHAR(100) | 来源 ID（稿件 ID 或文献 ID 等） |
| source_excerpt | TEXT | 本稿相似片段 |
| target_excerpt | TEXT | 对比稿片段 |
| score | DECIMAL(5,4) | 相似度分数 0–1（可选） |
| created_at | TIMESTAMPTZ DEFAULT now() | |

- 索引：`report_id`、`source_version_id`。

---

### 4.4 编辑操作表 `editor_actions`

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGSERIAL PRIMARY KEY | 主键 |
| manuscript_id | BIGINT NOT NULL REFERENCES manuscripts(id) ON DELETE CASCADE | 稿件 |
| editor_id | BIGINT NOT NULL REFERENCES users(id) | 操作编辑 |
| action_type | VARCHAR(30) NOT NULL | 操作类型：status_change / revision_request / reject / accept 等 |
| from_status | VARCHAR(30) | 变更前状态 |
| to_status | VARCHAR(30) | 变更后状态 |
| comment | TEXT | 退修意见或备注（富文本或纯文本） |
| created_at | TIMESTAMPTZ DEFAULT now() | 操作时间 |

- 索引：`manuscript_id`、`editor_id`、`created_at`。

---

## 五、知识库

### 5.1 知识库切块表 `knowledge_chunks`

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | BIGSERIAL PRIMARY KEY | 主键 |
| source_type | VARCHAR(30) NOT NULL | 来源类型：manuscript / published / rule / reference |
| source_id | VARCHAR(100) NOT NULL | 来源业务 ID（如 manuscript_version_id） |
| manuscript_id | BIGINT REFERENCES manuscripts(id) | 若来源为投稿，则填稿件 ID |
| version_id | BIGINT REFERENCES manuscript_versions(id) | 若来源为投稿，则填版本 ID |
| chunk_index | INT NOT NULL | 段落序号 |
| content | TEXT NOT NULL | 切块文本 |
| meta | JSONB | 元数据：标题层级、作者、投稿时间、学科方向等 |
| embedding_id | BIGINT | 若向量单独存 pgvector 表，可存其 ID；或本表即带 vector 列 |
| created_at | TIMESTAMPTZ DEFAULT now() | |

- 索引：`source_type`、`source_id`、`manuscript_id`、`version_id`、`chunk_index`。
- 若使用 pgvector：可增加 `embedding vector(维度)` 列，并建 HNSW/IVFFlat 索引做相似检索。

---

### 5.2 向量存储（二选一）

**方案 A：在 `knowledge_chunks` 增加列**

- `embedding vector(1536)`（维度按选用模型定）
- 对 `embedding` 建 pgvector 索引。

**方案 B：独立向量表**

| 表名 | 说明 |
|------|------|
| chunk_embeddings | id, chunk_id REFERENCES knowledge_chunks(id), embedding vector(N), created_at |

初版建议方案 A，减少联表与同步复杂度。

---

## 六、配置与模板（初版可简）

### 6.1 退修意见模板 `revision_templates`

| 字段名 | 类型 | 说明 |
|--------|------|------|
| id | SERIAL PRIMARY KEY | 主键 |
| name | VARCHAR(100) | 模板名称 |
| content | TEXT | 模板内容（可含占位符） |
| is_active | BOOLEAN DEFAULT true | |
| created_at | TIMESTAMPTZ DEFAULT now() | |

### 6.2 引注规则模板 / 系统配置（可选）

- 可用键值表 `system_config`（key, value, updated_at）存储规则模板名称、AI 提示词 key 等，初版不强制。

---

## 七、ER 关系简图（文字描述）

- `users`：被 `manuscripts.submitted_by`、`editor_actions.editor_id` 引用。
- `manuscripts`：一对多 `manuscript_versions`；一对多 `review_reports`、`editor_actions`。
- `manuscript_versions`：一对一 `manuscript_parsed`；一对多 `review_reports`（按版本生成报告）；被 `knowledge_chunks`、`similarity_results` 引用。
- `review_reports`：一对多 `citation_issues`、`similarity_results`。
- `sections`：被 `manuscripts.section_id` 引用。

---

## 八、迁移与版本

- 建议使用迁移工具（如 Alembic）管理表结构变更。
- 本文档为 v0.1 设计，后续外审、专家、出版等表可在此基础上扩展。
