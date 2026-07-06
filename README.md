# code-shit-audit

让任何 agent 工具用多 sub-agent 审查整个代码库，输出 Linear/Vercel 风格的代码审计报告 HTML。

---

## 安装

把你用的 agent 工具的 skill 目录路径告诉它，让它 git clone 进去。

```
https://github.com/N0tsLabs/code-shit-audit
```

## 使用

```
使用 code-shit-audit 审计当前项目
```

agent 会自动完成所有工作，输出 `代码审计报告 · {项目名}.html`。浏览器打开即可。

## 报告包含

| 章节 | 内容 |
|------|------|
| 项目介绍 | 一句话定位、核心业务模块、技术栈、API 端、数据规模 |
| 审计总结 | AI 整体评估 + 直言不讳的根因分析 |
| 代码构成 | tokei 统计（代码/注释/空白）、包分布、审计维度雷达图 |
| 模块依赖关系 | D3 力导向图，可拖拽缩放 |
| 团队贡献者 | 提交数排行 + 进度条 |
| 问题清单 | P0-P3 按严重级别分类，每条带代码证据 + 修复建议 |
| 业务领域解读 | 领域卡片 + AI 点评 |
| 技术债务 | 各层占比 + 关键指标 |

## 完整文件

| 文件 | 说明 |
|------|------|
| `SKILL.md` | 给 agent 看的完整行为指令 |
| `prompts/` | 5 个 sub-agent prompt 模板 |
| `templates/report-template.html` | 报告 HTML 模板 |

---

📌 仓库：[https://github.com/N0tsLabs/code-shit-audit](https://github.com/N0tsLabs/code-shit-audit) · [反馈问题](https://github.com/N0tsLabs/code-shit-audit/issues)
