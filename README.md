# code-shit-audit

> **项目代号**：本仓库的内部代号是 `code-shit-audit`，因为它的目标就是挖出代码里的"屎山"。
> **对外名**：任何面向用户的产出（HTML 报告、浏览器标题、终端输出）一律使用 **「代码审计报告 · {项目名}」** 这个正式名称，不要带 "shit" 字样。

让任何 agent 工具用多 sub-agent 方式审查整个代码库，输出一份**专业、可读、可直接发给老板或团队成员**的代码审计 HTML 报告。

---

## 这是什么

你正在维护一个 5 年的老项目，没人知道里面有多少历史包袱？新需求来了怕动到不知道哪里的代码？想说服老板"该还技术债了"但又说不清到底烂在哪里？

**code-shit-audit** 是一份给 agent 工具的指令集，告诉它：
1. 怎么系统性地扫描项目（不只看主分支那点）
2. 怎么用 5 个 sub-agent 并行从不同维度找问题（架构 / 业务 / 安全 / 维护性 / 横切）
3. 怎么把发现写出来——不是扔个 json 给你，而是输出一份**可以直接发出去的 HTML 报告**

**输出长这样：**
- 顶部一句话定位（这个项目到底是干嘛的）
- 关键指标一眼看完（多少文件、多少 commit、哪些 P0 问题）
- AI 直言不讳的点评（不像传统工具只给"行:列"那种冷冰冰的提示）
- 完整的依赖图、问题清单、领域解读
- 浅色 / 深色主题 + 全中文（按你沟通语言切换）

---

## 怎么用

### 安装到 Claude Code / Cursor / Codex / Windsurf 等

```bash
cd ~/.claude/skills           # 或你 agent 工具对应的 skill 目录
git clone https://github.com/N0tsLabs/code-shit-audit.git

# 后续更新
cd code-shit-audit && git pull
```

### 让 agent 跑审计

进入你的项目根目录，agent 工具里说：

```
使用 code-shit-audit 审计当前项目
```

或者：

```
帮我用 code-shit-audit 跑一下当前项目的代码审计
```

agent 工具会自动：
1. 扫描项目结构（语言、框架、模块划分、业务领域）
2. 启动 5 个 sub-agent 并行审查
3. 输出 `代码审计报告 · {项目名}.html`

直接在浏览器打开即可。

---

## 报告长什么样

### 设计风格

**Linear / Vercel 白皮书风** —— 不像传统 dashboard 那种数据墙：
- 极简白底（深色模式可切换）
- 顶部悬浮 pill 菜单 + 内容居中
- 4 列横排 KPI（不用大色块）
- Inter 字体 + JetBrains Mono 数字
- 单列阅读体验（max-width 880px）

### 章节结构

1. **00 项目介绍** — 3 分钟了解一个陌生项目（业务模块 / 技术栈 / API 端 / 数据规模）
2. **01 审计总结** — AI 给的整体评估 + 直言不讳的根因分析
3. **02 代码构成** — tokei 统计 + 雷达图
4. **03 模块依赖关系** — D3 力导向图
5. **04 团队** — 贡献者排行
6. **05 问题清单** — P0/P1/P2/P3 严重级别分类
7. **06 业务领域解读** — 每个领域单独卡片 + AI 点评
8. **07 技术债务** — 各项指标

### 报告输出位置

```
{你的项目根}/.code-audit/
└── {timestamp}/
    ├── metadata.json
    ├── skeleton/             # 项目结构地图
    ├── business/             # 每个业务领域的解读 md
    ├── issues/               # 每个审查维度的 JSON 问题列表
    ├── summary.md
    └── report.html           # ← 浏览器直接打开这份
```

---

## 能给谁用

| 角色 | 怎么用这份报告 |
|------|---------------|
| **技术负责人** | 汇报给老板、推进技术债专项时引用 |
| **新接手项目的开发者** | 5 分钟读懂整个项目 + 知道哪些是雷区 |
| **架构师** | 找 God 类、循环依赖、命名混乱点，作为重构起点 |
| **代码评审 reviewer** | 在 PR 评审时引用，作为"标准"对照 |
| **学习者** | 看别人屎山怎么写的，反思自己代码 |

---

## 包含什么

- **5 个 sub-agent prompt 模板**（`prompts/`）
  - `architecture-audit.md` — 分层架构、循环依赖、God 类
  - `business-logic-audit.md` — 贫血模型、业务散落、事务脚本
  - `maintainability-audit.md` — 超长文件、命名、复杂度
  - `security-audit.md` — 硬编码密钥、吞异常、注入
  - `cross-cutting-audit.md` — 跨模块重复、模式不一致
- **完整 HTML 报告模板**（`templates/report-template.html`）
- **输出目录结构规范**（`templates/output-structure.json`）
- **SKILL.md** — 完整的 agent 行为指令

---

## 局限性

- 这是**抽样审计**，不是逐行 review。3,000 文件以上的项目可能只覆盖 controller / service / model 关键层
- AI 评审可能误判复杂业务逻辑，需要结合人工判断
- 严重度评分（A-F）仅供参考，应结合实际业务场景
- 大型项目（>5,000 文件）首次扫描可能耗时 10-30 分钟

---

## 贡献

欢迎提 Issue 改进：
- [ ] 支持输出 PDF
- [ ] 多项目对比
- [ ] 自定义审查规则
- [ ] 大项目断点续跑

## License

MIT

---

> 📌 仓库地址：[https://github.com/N0tsLabs/code-shit-audit](https://github.com/N0tsLabs/code-shit-audit)
> 🐛 反馈：[Issues](https://github.com/N0tsLabs/code-shit-audit/issues)
