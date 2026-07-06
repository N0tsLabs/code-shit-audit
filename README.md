# code-shit-audit

让任何 AI 编程工具用多 agent 方式审查整个代码库，输出一份可以直接发给老板和团队成员的代码审计 HTML 报告。

## 安装（告诉你的 AI 以下内容）

```
请把 https://github.com/N0tsLabs/code-shit-audit.git 克隆到你的 skills 目录
```

## 更新（告诉你的 AI 以下内容）

```
去 code-shit-audit 目录执行 git pull
```

每次运行前自动 pull 一下，确保使用的总是最新版本。

## 使用（告诉你的 AI 以下内容）

```
使用 code-shit-audit 审计当前项目
```

AI 会自动完成项目扫描、多维度审查、生成 `代码审计报告 · {项目名}.html`。浏览器打开即可。

## 报告章节

| 章节 | 内容 |
|------|------|
| 项目介绍 | 一句话定位、业务模块、技术栈、API 端、项目数据 |
| 审计总结 | AI 整体评估，先给结论再讲细节 |
| 代码构成 | tokei 统计、包分布、审计维度雷达图 |
| 模块依赖关系 | D3 力导向图，可拖拽缩放 |
| 团队 | 贡献者排行 |
| 问题清单 | P0-P3 分类，每条带代码证据和修复建议 |
| 业务领域解读 | 领域卡片 + AI 点评 |
| 技术债务 | 各层占比和关键指标 |

## 完整文件

| 文件 | 说明 |
|------|------|
| `SKILL.md` | AI 工具执行的完整行为指令 |
| `prompts/` | 5 个审查 agent 的 prompt 模板 |
| `templates/report-template.html` | 报告 HTML 模板 |

---

📌 [https://github.com/N0tsLabs/code-shit-audit](https://github.com/N0tsLabs/code-shit-audit) · [Issues](https://github.com/N0tsLabs/code-shit-audit/issues)
