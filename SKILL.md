# code-shit-audit

全项目代码审计技能 —— 用多 sub-agent 并行审查整个代码库，找出架构违规、可维护性问题、业务逻辑散乱等问题，输出结构化的 HTML 报告。

**重要输出规范：**
- 浏览器 title、HTML 主标题、终端输出等所有**用户可见**的地方，必须使用 **「代码审计报告 · {项目名}」** 这个正式名称
- 仓库内部代号 `code-shit-audit` 不可出现在面向用户的内容中

**适用场景：** 接手遗留系统、项目健康度评估、重构前摸底、代码质量考核。

**报告交付：** 完整的 `代码审计报告 · {项目名}` 单文件 HTML 报告，使用 Linear/Vercel 白皮书风格，可在浏览器直接打开。

## 使用方式

```
# agent 工具加载此 skill 后，在项目根目录触发：
使用 code-shit-audit 审计当前项目
```

## 输出要求

**报告文件命名：**
- 文件名：`{session_timestamp}/report.html`
- 浏览器标题：`代码审计报告 · {项目名}`
- 主标题：`<h1>代码审计报告<br><span>...{项目名}</span></h1>`

**绝对禁止在用户可见内容中出现：**
- "shit" 字样
- 英文指标（"commits"、"contributors"、"issues"、"files" 等）必须翻译成中文（次提交/位贡献者/条问题/个文件）

## 工作原理

skill 内部按以下 4 个阶段串行执行：

```
Phase 0 ─ 骨架扫描
  → 识别语言/框架 → 划分模块 → 输出模块清单

Phase 1 ─ 逐模块深度理解（核心）
  → 每个模块分配一个 agent，读完全部文件
  → 提取业务逻辑 → 输出模块业务文档
  → 这一步做完后，项目业务就完全清晰了

Phase 2 ─ 跨模块一致性检查
  → 拿着所有模块的业务文档核对：
    数据流是否一致？业务规则是否冲突？依赖方向是否合理？

Phase 3 ─ 横切维度审计
  → 架构/安全/可维护性/设计质量
  → 此时 agent 已经有全量上下文，不是采样

Phase 4 ─ 汇总合成 → HTML 报告
```

---

### Phase 0：骨架扫描（一次性，主 agent 执行）

遍历项目目录结构，收集：
- 文件树
- 构建配置文件（pom.xml, build.gradle, package.json 等）
- 按包名/模块名划分业务模块，判断每个模块的文件数
- 判断框架和语言（Spring Boot、MyBatis、Vue 等）

**输出** 到 `{timestamp}/module-list.json`：
```json
{
  "modules": [
    { "name": "order", "files": ["controller/pc/SalesOrderController.java", "service/order/impl/...", ...] },
    { "name": "product", "files": [...] }
  ],
  "static": {
    "total_files": 3076,
    "total_lines": 240670,
    "code_lines": 162958,
    "comment_lines": 37756,
    "language": "Java 11",
    "framework": "Spring Boot 2.5.9"
  }
}
```

---

### Phase 1：逐模块深度理解（核心变化）

这是本 skill 的**核心阶段**。主 agent 读 `module-list.json`，对**每个模块**启动一个 sub-agent，任务是：

1. **读该模块的全部文件**（每个文件都读至少一次）
2. **理解业务逻辑**：实体定义、状态机、核心流程、数据流向
3. **输出业务解读文档**（`business/{module-name}.md`）
4. **输出初始问题清单**（`issues/module/{module-name}.json`）

**sub-agent 的 prompt 在 `prompts/module-audit.md`**。

所有模块的 agent **并行**运行。大模块（几百个文件）可以进一步分片，但保证分配到的文件**全部读完，不是采样**。

**输出结构示例：**
```
business/
├── order.md
├── product.md
├── system.md
├── customer_vendors.md
├── warehouse.md
├── finance.md
└── ...

issues/
├── module/
│   ├── order.json
│   ├── product.json
│   ├── system.json
│   └── ...
```

---

### Phase 2：跨模块一致性检查

所有模块业务文档就绪后，启动 **2-3 个「横向」agent**：

| Agent | 检查内容 |
|-------|---------|
| **cross-module-dataflow** | 跨模块数据流是否一致（A 模块的"支付成功"是否真的触发了 B 模块的"扣库存"） |
| **cross-module-business-rule** | 相同业务规则在不同模块是否实现一致（运费计算、折扣策略、状态值定义） |
| **cross-module-dependency** | 模块间的依赖方向是否合理（领域层是否依赖了基础设施层） |

这些 agent 的输入是所有模块的 `business/*.md` 文件，不需要读源码。

---

### Phase 3：横切维度审计

在项目已被完全理解的基础上，启动维度 agent：

| Agent | 审查内容 |
|-------|---------|
| **architecture** | 分层违规、God 类、循环依赖。此时已有全模块业务文档，分析更准确 |
| **security** | 密钥、注入、权限、日志暴露 |
| **maintainability** | 超长文件、重复代码、命名、TODO/FIXME |
| **design** | 贫血模型、API 设计一致性、模式选型合理度 |

维度 agent 直接读源码 + 参考 Phase 1 的业务文档，**不是采样，而是目标阅读**。

---

### Phase 4：汇总合成

主 agent 收集所有问题清单，执行：
1. **去重**
2. **按 P0-P3 排序**
3. **归组到模块**
4. **按 `templates/report-template.html` 渲染报告**

---

## 输出目录结构

```
{timestamp}/
├── metadata.json
├── module-list.json           # Phase 0 模块清单
├── business/                  # Phase 1 业务文档
│   ├── order.md
│   ├── product.md
│   └── ...
├── issues/
│   ├── module/                 # Phase 1 模块级问题
│   │   ├── order.json
│   │   └── ...
│   ├── cross-module.json       # Phase 2 跨模块问题
│   ├── architecture.json       # Phase 3 维度问题
│   ├── security.json
│   ├── maintainability.json
│   ├── design.json
│   └── per-module/
├── summary.md
└── report.html
```

---

## 语言规则

**报告语言 = 用户提示语言**。

常见翻译映射（中→英）见 `templates/output-structure.json`。

---

## 报告 HTML 模板

固定模板（`templates/report-template.html`）：

**模板章节顺序：**
1. Hero — 标题、状态、评分
2. 项目介绍（一句话定位 + 业务模块 + 技术栈 + API 端 + 数据规模）
3. KPI Strip
4. 审计总结
5. 代码构成（2×2 charts）
6. 模块依赖关系（force graph）
7. 贡献者
8. 问题清单 + 模块标签
9. P0/P1/P2/P3 issue cards
10. 业务领域解读
11. 技术债务
12. Footer（含仓库地址）

---

## 子 Agent Prompt 模板

`prompts/` 目录下放置以下 sub-agent 的 prompt 模板：

- `prompts/module-audit.md` — Phase 1 模块深度理解 agent（核心，每个模块一个实例）
- `prompts/business-flow-audit.md` — Phase 2 业务流程状态机 agent
- `prompts/architecture-audit.md` — Phase 3 架构审计
- `prompts/security-audit.md` — Phase 3 安全审计
- `prompts/maintainability-audit.md` — Phase 3 可维护性审计
- `prompts/business-logic-audit.md` — Phase 3 业务逻辑结构审计
- `prompts/cross-cutting-audit.md` — Phase 3 横切重复审计
- `prompts/design-audit.md` — Phase 3 设计质量审计（在 prompts/ 中新增）

## 不依赖外部工具

本 skill 只使用 agent 工具内置的能力（glob、grep、read、write）。不依赖任何第三方 CLI 工具。
