# code-shit-audit

全项目代码审计技能 —— 用多 sub-agent 并行审查整个代码库，找出架构违规、可维护性问题、业务逻辑散乱等问题，输出结构化的 HTML 报告。

**重要输出规范：**
- 浏览器 title、HTML 主标题、终端输出等所有**用户可见**的地方，必须使用 **「代码审计报告 · {项目名}」** 这个正式名称
- 仓库内部代号 `code-shit-audit` 不可出现在面向用户的内容中

**适用场景：** 接手遗留系统、项目健康度评估、重构前摸底、代码质量考核。

**报告交付：** 完整的 `代码审计报告 · {项目名}` 单文件 HTML 报告，使用 Linear/Vercel 白皮书风格（白底悬浮菜单 + 居中布局 + Inter 字体），可在浏览器直接打开。

## 使用方式

在项目根目录下运行 agent 工具，并加载此 skill：

```
# agent 工具会自动读取当前目录下的 .code-audit/ 配置
# 或手动触发：
你的 agent 工具 > 使用 code-shit-audit 审计当前项目
```

agent 工具会输出一个完整 HTML 报告（`{session}/report.html`），用浏览器打开即可查看。

## 输出要求

**报告文件命名：**
- 文件名：`{session_timestamp}/report.html`（可同时复制为 `report-C.html` 方便直接访问）
- 浏览器标题：`代码审计报告 · {项目名}`
- 主标题：`<h1>代码审计报告<br><span>...{项目名}</span></h1>`

**绝对禁止在用户可见内容中出现：**
- "shit" 字样
- 英文指标（"commits"、"contributors"、"issues"、"files" 等）必须翻译成中文（次提交/位贡献者/条问题/个文件）

## 工作原理

skill 内部按以下阶段执行，**主 agent 只负责任务分发和结果汇总，不参与具体代码分析**，由多个 sub-agent 并行审查：

### Phase 0：项目骨架扫描

主 agent 执行，遍历项目目录结构，收集：
- 文件树（按语言/框架归类）
- 构建配置文件识别（pom.xml, build.gradle, package.json, Cargo.toml 等）
- 项目入口点、路由定义
- 包/模块组织结构
- **推断业务领域**（从包名、模块名、实体名）

**输出** 到 `{timestamp}/skeleton/`：
- `project-map.json` — 全文件树 + 识别到的语言/框架
- `domain-map.json` — 业务领域划分及对应模块

### Phase 1：并行 Sub-Agent 审查

主 agent 启动以下 sub-agent **同时运行**，每个 sub-agent 有独立的审查视角和明确的输出格式：

| Agent | 审查内容 | 关键问题示例 |
|-------|----------|-------------|
| **architecture** | 分层架构违规、循环依赖、God 类、不合理依赖方向 | Controller 写 SQL、Service 调用 Controller、模块间循环引用 |
| **maintainability** | 文件/函数超长、重复代码、命名规范、注释质量、复杂度 | 3000 行 Controller、5 层 if 嵌套、命名混乱 |
| **business-logic** | 按领域分析业务逻辑放置是否合理、贫血模型、事务脚本反模式 | 业务规则散落各处、Entity 只有 getter/setter |
| **cross-cutting** | 跨模块重复实现、不一致的模式选型、配置散乱 | 3 个 Service 写了同一套 SQL、一半用 Lombok 一半手写 |
| **security** | 硬编码密钥、空指针风险、吞异常、权限校验缺失、注入漏洞 | 代码里写死密码、catch 里啥也不做 |

每个 sub-agent 输出 **结构化 JSON** 问题列表到 `{timestamp}/issues/`。

### Phase 2：项目介绍 + 业务逻辑解读

**项目介绍 section**（在审计总结前）—— 用 3 分钟向一个完全不懂项目的人介绍清楚，包含：
- 一句话定位：项目是什么、解决什么业务问题
- 核心业务模块清单（订单/商品/客户等）
- 技术栈概览
- API 端划分（如 PC/APP/Vendor/manage）
- 关键数据规模

每个业务领域输出独立的 `{domain}-domain.md`，描述：
- 该领域的核心职责
- 涉及的主要文件/类
- 当前业务逻辑的实现方式
- 发现的问题和建议

### Phase 3：汇总合成

主 agent 收集所有 sub-agent 的结果，执行：
1. **去重** — 同一问题被多个 agent 发现时只记录一次
2. **排序** — 按 P0~P3 排优先级
3. **归组** — 按模块组织问题清单
4. **评分** — 对每个模块给出健康度评分（A~F）

**输出** 最终汇总报告（`{timestamp}/summary.md`），同时渲染为 `report.html`。

## 语言规则

**报告语言 = 用户提示语言**。用户在和 AI 沟通时用什么语言，生成的报告就是什么语言。

- 中文沟通 → 全中文报告（HTML lang="zh-CN"）
- 英文沟通 → 英文报告（HTML lang="en"，"commits/contributors/issues" 不翻译）

模板中所有 UI 文案、标签、AI 点评、问题描述都**根据 HTML lang 属性自动切换**。

### 常见翻译映射（中→英）

| 中文 | 英文 |
|------|------|
| 源文件 | files |
| 代码行 | code lines |
| 注释行 | comments |
| 提交数 | commits |
| 贡献者 | contributors |
| 检出问题 | issues |
| 模块 | modules |
| Maven 依赖 | Maven deps |
| TODO/FIXME | TODO/FIXME |
| 评分/等级 | grade |
| P0 阻塞 | P0 blocker |
| P1 严重 | P1 critical |
| P2 一般 | P2 medium |
| P3 轻微 | P3 minor |
| 审计完成 | audit complete |
| 必须立即修复 | must fix now |
| 严重 | critical |
| 一般 | medium |
| 轻微 | minor |

## 报告 HTML 模板

skill 自带一个**固定模板**（`templates/report-template.html`），agent 必须基于该模板生成报告，不允许自行设计全新布局。

模板设计系统：**Linear/Vercel 白皮书风格**
- 底色：纯白（深色模式 #0A0A0A）
- 字体：Inter（sans-serif）+ JetBrains Mono（数字/标签）
- 布局：max-width 880px 居中，左右留白
- 导航：顶部悬浮 pill 菜单（fixed + backdrop-filter blur）
- 卡片：白底 + 1px 细边框 + 极小圆角
- KPI：横排 4 列，不用大色块
- 无毛玻璃、无渐变背景（保持白皮书感）

模板章节结构（固定顺序）：
1. Hero — 标题、状态、评分
2. **项目介绍**（00 — 一句话定位 + 业务模块 + 技术栈 + API 端 + 数据规模）
3. KPI Strip（两排 4×2）
4. 审计总结
5. 代码构成（2×2 charts）
6. 模块依赖关系（force graph）
7. 贡献者（list with bar）
8. 问题清单（table + module tags）
9. P0/P1/P2/P3 issue cards
10. 业务领域
11. 技术债务
12. Footer

模板里所有的指标占位符（`{PROJECT_NAME}`、`{TOTAL_FILES}` 等）都使用 `{{VARIABLE}}` 格式，agent 负责填充数据。

### 模板的占位符规范

| 占位符 | 含义 | 示例 |
|--------|------|------|
| `{{PROJECT_NAME}}` | 项目名 | `WKEA-API` |
| `{{TOTAL_FILES}}` | 源文件数 | `3076` |
| `{{CODE_LINES}}` | 代码行数 | `162958` |
| `{{COMMITS}}` | 提交数 | `9675` |
| `{{CONTRIBUTORS}}` | 贡献者数 | `73` |
| `{{ISSUES_FOUND}}` | 检出问题数 | `15` |
| `{{GRADE}}` | 评分（A-F） | `D` |
| `{{SCORE}}` | 百分制分数 | `48` |
| ... | 每个 issue 一组数据 | — |

## 输出目录结构

每次运行产生一个带时间戳的快照，不会覆盖上次结果。

```
{timestamp}/
├── metadata.json          # 运行元信息（时间、耗时、git commit 等）
├── skeleton/
│   ├── project-map.json
│   └── domain-map.json
├── business/
│   ├── order-domain.md
│   └── ...
├── issues/
│   ├── architecture.json
│   ├── maintainability.json
│   ├── business-logic.json
│   ├── cross-cutting.json
│   ├── security.json
│   └── per-module/
├── summary.md
└── report.html              # ← 核心交付物，浏览器直接打开
```

## 子 Agent Prompt 模板

`prompts/` 目录下放置各子 agent 的 prompt 模板（见子文件）。

## 不依赖外部工具

本 skill 只使用 agent 工具内置的能力（glob、grep、read、write），不依赖任何第三方 CLI 工具。

如检测到 `codegraph`（agent 工具内置增强）可用，会额外用于加速调用关系分析和依赖图构建。
