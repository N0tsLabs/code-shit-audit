# code-shit-audit

> 项目代号说明：本仓库内部叫 `code-shit-audit`，因为它要挖出代码里的"屎山"。但**对外**永远是「代码审计报告」。

让任何 agent 用多 sub-agent 审查整个代码库，输出 Linear/Vercel 风格的代码审计报告 HTML（多维度评估 + AI 直言不讳的点评 + 依赖图 + 业务领域解读 + 问题清单）。

---

## 一句话安装

```bash
git clone https://github.com/N0tsLabs/code-shit-audit.git ~/.claude/skills/code-shit-audit
```

> 装到 `~/.claude/skills/` 即可自动被 Claude Code / Cursor / Codex / Windsurf 等工具识别。

## 一句话使用

进入你的项目根目录，agent 对话框里说：

```
使用 code-shit-audit 审计当前项目
```

agent 会自动扫描项目结构、启动 5 个 sub-agent 并行审查、生成 `代码审计报告 · {项目名}.html`。浏览器直接打开即可。

## 报告长什么样

- **设计风格**：Linear / Vercel 白皮书风，极简白底 + 顶部悬浮菜单 + 内容居中 + 浅/深色主题切换
- **章节结构**：项目介绍 / 审计总结 / 代码构成 / 依赖关系 / 团队 / 问题清单 / 业务领域 / 技术债务
- **关键能力**：
  - 顶部 AI 审计总结（先给结论再讲细节）
  - "项目介绍" section：3 分钟了解陌生项目（业务模块 / 技术栈 / API 端）
  - 严重度 P0-P3 分类的问题卡片，每条带代码证据 + 修复建议
  - D3 力导向模块依赖图，可拖拽缩放
  - 业务领域卡片 + AI 点评

## 完整文档

- `SKILL.md` — 给 agent 看的完整行为指令（如何扫描、如何分派 sub-agent、如何输出）
- `prompts/` — 5 个 sub-agent 的 prompt 模板（架构 / 业务 / 安全 / 维护性 / 横切）
- `templates/report-template.html` — 报告 HTML 模板
- `templates/output-structure.json` — 输出目录结构规范

## License

MIT

---

📌 仓库：[https://github.com/N0tsLabs/code-shit-audit](https://github.com/N0tsLabs/code-shit-audit) · [反馈问题](https://github.com/N0tsLabs/code-shit-audit/issues)
