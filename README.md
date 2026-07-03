# code-shit-audit

> **⚠ 重要：** 这是 skill 的项目代号。**对外报告、HTML 标题、文件名等所有用户可见的地方一律使用「代码审计报告」这个正式名称，禁止出现 "shit" 字样。**

全项目代码审计 skill —— 让任何 agent 工具能用多 sub-agent 方式审查整个代码库，输出 Linear/Vercel 风格的代码审计报告 HTML。

## 快速开始

### 安装（支持所有 agent 工具）

```bash
# Claude Code / Codex / Cursor / Windsurf 等
cd ~/.claude/skills           # 或你 agent 工具对应的 skill 目录
git clone https://github.com/你的用户名/code-shit-audit.git

# 后续更新
cd code-shit-audit && git pull
```

### 使用

在你的项目根目录下，告诉 agent：

```
使用 code-shit-audit 审查当前项目
```

agent 工具会：
1. 扫描项目结构（Phase 0）
2. 启动多个 sub-agent 并行审查
3. 输出 `代码审计报告 · {项目名}.html`

直接在浏览器打开即可。

## 报告特性

- ✅ 专业的「代码审计报告」标题（不是 "shit"）
- ✅ **项目介绍** section —— 3 分钟了解一个陌生项目（业务模块 / 技术栈 / API 端 / 数据规模）
- ✅ **审计总结** section —— 整体评估 + AI 直言不讳的点评
- ✅ 完整的指标可视化（KPI / charts / 贡献者排行 / 模块依赖图）
- ✅ 按 P0/P1/P2/P3 分类的 15 个问题卡片
- ✅ AI 业务领域解读 + 业务领域卡片
- ✅ 悬浮 pill 菜单 + 居中布局（max-width 880px）
- ✅ 深色 / 浅色主题切换
- ✅ 100% 中文化（或跟随用户语言）

## 设计系统

skill 内置统一的 **Linear/Vercel 白皮书风格**：

| 元素 | 规格 |
|------|------|
| 字体 | Inter（无衬线）+ JetBrains Mono（数字/标签） |
| 主色 | #000000（深色模式 #FFFFFF） |
| 强调色 | #0066FF |
| 背景 | #FFFFFF（深色模式 #0A0A0A） |
| 边角 | 8px |
| 间距 | 8px 栅格 |
| 布局 | max-width 880px 居中，左右留空 |
| 导航 | 顶部悬浮 pill（fixed + backdrop-filter blur） |

不要偏离这套设计系统。

## 输出结构

每次运行产生一个带时间戳的快照：

```
{项目}/.code-audit/
└── {timestamp}/
    ├── metadata.json
    ├── skeleton/
    │   ├── project-map.json
    │   └── domain-map.json
    ├── business/        # 每个业务领域一个 md
    │   ├── order-domain.md
    │   └── ...
    ├── issues/           # 每个审查维度一个 json
    │   ├── architecture.json
    │   ├── maintainability.json
    │   ├── business-logic.json
    │   ├── cross-cutting.json
    │   ├── security.json
    │   └── per-module/
    ├── summary.md
    └── report.html       # ← 浏览器直接打开这份
```

## 语言规则

**报告语言 = 用户提示语言**。agent 必须根据用户和 AI 沟通时使用的语言，生成对应语言的报告。

详见 `SKILL.md` 的"语言规则"章节。

## 贡献

当前 skill 还很早期，欢迎提 Issue 改进：
- [ ] 支持 HTML 报告导出 PDF
- [ ] 支持多项目对比
- [ ] 修复大型项目中断恢复（断点续跑）
- [ ] 增加 Helm/Docker 部署诊断维度

## License

MIT
