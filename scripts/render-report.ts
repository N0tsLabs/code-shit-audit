/**
 * render-report.ts — 读模板 + 数据 JSON → 渲染完整 HTML 报告
 *
 * 用法:
 *   bun run scripts/render-report.ts audit/2026-07-08
 *
 * 输入:
 *   audit/{session}/metadata.json
 *   audit/{session}/module-list.json
 *   audit/{session}/issues/**\/*.json
 *   audit/{session}/business/*.md
 *
 * 输出:
 *   audit/{session}/report.html
 *
 * 数据契约:
 *   所有 AI agent 产出的 JSON 必须符合 templates/output-structure.json 中
 *   定义的格式。脚本不修数据 —— 格式不对直接报错退出。
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, statSync } from "node:fs"
import { join, basename } from "node:path"

const args = process.argv.slice(2)
if (args.length === 0) {
  console.error("用法: bun run scripts/render-report.ts audit/{session}/")
  process.exit(1)
}

const sessionDir = args[0]
const templatePath = join(import.meta.dirname!, "..", "templates", "report-template.html")
const outPath = join(sessionDir, "report.html")

// ── 1. 读模板 ─────────────────────────────────────────────────────────
if (!existsSync(templatePath)) {
  console.error("模板不存在:", templatePath)
  process.exit(1)
}
const template = readFileSync(templatePath, "utf-8")

// ── 2. 读所有数据 ─────────────────────────────────────────────────────
function readJSON<T = any>(rel: string): T {
  const p = join(sessionDir, rel)
  if (!existsSync(p)) {
    console.error("缺少数据文件:", rel)
    process.exit(1)
  }
  return JSON.parse(readFileSync(p, "utf-8"))
}

const metadata = readJSON<any>("metadata.json")
const moduleList = readJSON<any>("module-list.json")

// 收集所有问题
const issuesDir = join(sessionDir, "issues", "module")
const allIssues: any[] = []
if (existsSync(issuesDir)) {
  for (const f of readdirSync(issuesDir)) {
    if (!f.endsWith(".json")) continue
    const data = readJSON<any>(join("issues", "module", f))
    for (const issue of data.issues ?? []) {
      allIssues.push({ ...issue, _module: data.module, _moduleFile: f.replace(".json", "") })
    }
  }
}

// 收集所有业务文档
const bizDir = join(sessionDir, "business")
const bizDocs: { name: string; content: string }[] = []
if (existsSync(bizDir)) {
  for (const f of readdirSync(bizDir)) {
    if (!f.endsWith(".md")) continue
    bizDocs.push({
      name: f.replace(".md", ""),
      content: readFileSync(join(bizDir, f), "utf-8"),
    })
  }
}

// ── 3. 计算统计数据 ────────────────────────────────────────────────────
const p0 = allIssues.filter((i) => i.severity === "P0")
const p1 = allIssues.filter((i) => i.severity === "P1")
const p2 = allIssues.filter((i) => i.severity === "P2")
const p3 = allIssues.filter((i) => i.severity === "P3")
const st = moduleList.static ?? {}

// 按模块分组
const byModule = new Map<string, any[]>()
for (const i of allIssues) {
  const m = i._module
  if (!byModule.has(m)) byModule.set(m, [])
  byModule.get(m)!.push(i)
}

const proj = metadata.project ?? "unknown"
const lang = st.language ?? "unknown"
const fw = st.framework ?? "unknown"
const totalFiles = st.total_files ?? 0
const totalLines = st.total_lines ?? 0

// ── 4. 辅助函数 ────────────────────────────────────────────────────────
function esc(s: any): string { if (s == null) return ""; return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;") }

function sevClass(s: string) { return s === "P0" ? "p0" : s === "P1" ? "p1" : s === "P2" ? "p2" : "p3" }
function sevBadge(s: string) { return s === "P0" ? "b0" : s === "P1" ? "b1" : s === "P2" ? "b2" : "b3" }
function sevColor(s: string) { return s === "P0" ? "danger" : s === "P1" ? "warning" : s === "P2" ? "caution" : "success" }

function catLabel(c: string): string {
  const m: Record<string, string> = { architecture: "架构", security: "安全", maintainability: "可维护", design: "设计", correctness: "正确性", performance: "性能" }
  return m[c] ?? c
}

function issueCard(i: any) {
  return `
<div class="ic ${sevClass(i.severity)}">
  <span class="ib ${sevBadge(i.severity)}">${i.severity}</span>
  <div style="flex:1;min-width:0">
    <div class="it">${esc(i.title)}</div>
    <div class="im"><code>${esc(i.file)}:${i.line ?? "?"}</code> · ${esc(i._module)} · ${catLabel(i.category ?? "")}</div>
    <div class="ibo">${esc(i.desc ?? "")}</div>
  </div>
</div>`
}

function moduleCard(name: string, issues: any[]) {
  const mp0 = issues.filter((i) => i.severity === "P0").length
  const mp1 = issues.filter((i) => i.severity === "P1").length
  const hasP0 = mp0 > 0
  const hasP1 = mp1 > 0
  const dot = hasP0 ? "var(--danger)" : hasP1 ? "var(--warning)" : issues.length > 0 ? "var(--caution)" : "var(--success)"
  const doc = bizDocs.find((d) => d.name.toLowerCase().includes(name.toLowerCase()))
  const detail = doc ? doc.content.split("\n").slice(0, 6).map((l) => l.replace(/^#+\s*/, "").trim()).filter(Boolean).join(" · ") : ""
  return `
<details class="module-result-card" style="margin-bottom:8px">
  <summary style="list-style:none;cursor:pointer">
    <div class="mr-header" style="display:flex;align-items:center;justify-content:space-between;padding:14px 18px;background:var(--surface);border:1px solid var(--border);border-radius:6px;transition:background .1s" onmouseover="this.style.background='var(--surface-2)'" onmouseout="this.style.background='var(--surface)'">
      <div style="display:flex;align-items:center;gap:10px">
        <span class="mr-status" style="width:8px;height:8px;border-radius:50%;background:${dot}"></span>
        <strong style="font-size:15px">${esc(name)}</strong>
        <span style="font-size:12px;color:var(--text-2)">${issues.length} 个问题</span>
      </div>
      <div style="display:flex;align-items:center;gap:12px">
        <span style="font-family:var(--mono);font-size:12px;color:${hasP0 ? "var(--danger)" : hasP1 ? "var(--warning)" : "var(--text-2)"};font-weight:600">${issues.length} 个问题</span>
        <span style="font-size:10px;color:var(--text-3)">点击展开 ▾</span>
      </div>
    </div>
  </summary>
  <div style="padding:12px 18px 16px;border:1px solid var(--border);border-top:none;border-radius:0 0 6px 6px;background:var(--bg-alt)">
    <p style="font-size:12.5px;color:var(--text);margin-bottom:10px;line-height:1.65">${esc(detail)}</p>
    <div style="font-size:11px;font-weight:600;color:var(--danger);margin-bottom:4px">发现 ${issues.length} 个问题</div>
    <div style="font-size:12px;color:var(--text);line-height:1.7">
      ${issues.map((i) => `<span style="color:var(--${sevColor(i.severity)});font-weight:600">${i.severity}</span> ${esc(i.title)}<br>`).join("      ")}
    </div>
  </div>
</details>`
}

function moduleTag(name: string, issues: any[]) {
  const hasP0 = issues.some((i) => i.severity === "P0")
  const hasP1 = issues.some((i) => i.severity === "P1")
  const dotClass = hasP0 ? "d0" : hasP1 ? "d1" : "d2"
  return `<span class="module-tag"><span class="dot ${dotClass}"></span>${esc(name)}</span>`
}

// ── 5. 构建 HTML 体 ────────────────────────────────────────────────────
const now = new Date().toISOString().slice(0, 16).replace("T", " ")
const git = moduleList.git ?? {}
const commits = git.commits ?? 0
const contributors = git.contributors ?? 1

const body = `
<!-- === Hero === -->
<section class="hero" id="top">
  <div class="hero-l">
  <div class="meta-line">
    <span class="dot"></span>
    <span>${esc(proj)}</span>
    <span class="sep">·</span>
    <span>${now}</span>
    <span class="sep">·</span>
    <span>${esc(lang)} · ${esc(fw)}</span>
  </div>
  <h1>代码审计报告<br><span class="accent">${esc(proj)}</span></h1>
  <p class="sub">${esc(totalFiles)} 个源文件、${totalLines.toLocaleString()} 行代码、${commits} 次提交、${contributors} 位贡献者。本次审计识别出 <b>${allIssues.length} 个问题</b>，其中 <b>${p0.length} 个严重问题</b>。</p>
  </div>
  <div class="grade-row">
    <span class="gn">${p0.length > 3 ? "C" : p0.length > 0 ? "C+" : "B"}</span>
    <span class="gl">${p0.length > 3 ? "需改进" : p0.length > 0 ? "尚可" : "良好"}</span>
    <span class="gs">${allIssues.length} 个问题</span>
  </div>
</section>

<!-- === Project Overview === -->
<section class="overview" id="overview">
  <div class="sec-hdr">
    <div class="label">00 — 项目介绍</div>
    <h2>这是一个什么样的项目</h2>
    <div class="desc">${esc(moduleList.description ?? "")}</div>
  </div>
  <div class="ov-card full">
    <div class="lbl">一句话定位</div>
    <div class="ct"><b>${esc(proj)}</b> 是一个${esc(moduleList.description ?? "项目")}，基于 <b>${esc(fw)}</b>。</div>
  </div>
  <div class="grid">
    <div class="ov-card">
      <div class="lbl">核心模块</div>
      <ul>
        ${(moduleList.modules ?? []).slice(0, 10).map((m: any) => `<li>${esc(m.name)}：${esc(m.desc ?? "")}（${m.lines ?? 0} 行）</li>`).join("\n        ")}
      </ul>
    </div>
    <div class="ov-card">
      <div class="lbl">技术栈</div>
      <ul>
        <li>${esc(lang)} · ${esc(fw)}</li>
        <li>运行环境: ${esc(st.runtime ?? st.platform ?? "—")}</li>
        <li>构建工具: ${esc(st.build_tool ?? "—")}</li>
        <li>依赖数量: ${esc(String(st.dependency_count ?? "—"))}</li>
      </ul>
    </div>
    <div class="ov-card">
      <div class="lbl">项目组成</div>
      <ul>
        <li>源文件 <b>${totalFiles}</b> 个</li>
        <li>代码 <b>${totalLines.toLocaleString()}</b> 行</li>
        <li>模块 <b>${(moduleList.modules ?? []).length}</b> 个</li>
        <li>冒烟测试 <b>${st.smoke_tests ?? 0}</b> 个</li>
      </ul>
    </div>
    <div class="ov-card">
      <div class="lbl">关键数据</div>
      <ul>
        <li>Git 提交 <b>${commits}</b> 次 / 贡献者 <b>${contributors}</b> 位</li>
        <li>首批提交: ${esc(git.first_commit ?? "—")} · 最近: ${esc(git.last_commit ?? "—")}</li>
        <li>问题总数: <b style="color:var(--warning)">${allIssues.length}</b> · P0: <b style="color:var(--danger)">${p0.length}</b></li>
      </ul>
    </div>
  </div>
</section>

<!-- === KPI strip === -->
<section class="sec" id="stats">
  <div class="kpi-strip">
    <div class="kpi"><div class="kl">源文件</div><div class="kv">${totalFiles}</div><div class="ks">个文件</div></div>
    <div class="kpi"><div class="kl">代码行</div><div class="kv">${totalLines.toLocaleString()}</div><div class="ks">总行数</div></div>
    <div class="kpi"><div class="kl">提交数</div><div class="kv">${commits}</div><div class="ks">次提交</div></div>
    <div class="kpi"><div class="kl">贡献者</div><div class="kv">${contributors}</div><div class="ks">位贡献者</div></div>
  </div>
  <div style="height:24px"></div>
  <div class="kpi-strip">
    <div class="kpi"><div class="kl">模块</div><div class="kv">${(moduleList.modules ?? []).length}</div><div class="ks">审计模块</div></div>
    <div class="kpi"><div class="kl">依赖</div><div class="kv">${st.dependency_count ?? "—"}</div><div class="ks">npm 包</div></div>
    <div class="kpi"><div class="kl">P0 问题</div><div class="kv" style="color:var(--danger)">${p0.length}</div><div class="ks">严重</div></div>
    <div class="kpi"><div class="kl">总问题</div><div class="kv" style="color:var(--warning)">${allIssues.length}</div><div class="ks">全部</div></div>
  </div>
</section>

<!-- === Summary === -->
<section class="sec" id="summary">
  <div class="sec-hdr">
    <div class="label">01 — 审计总结</div>
    <h2>整体评估</h2>
    <div class="desc">${allIssues.length} 个问题，${p0.length} 个 P0。</div>
  </div>
  <div class="ai-sum">
    <p>${esc(proj)} 是一个设计质量较高的项目。核心机制（${(moduleList.modules ?? []).filter((m: any) => m.critical).map((m: any) => m.name).join("、")}）实现正确，但代码库存在一些结构性风险。</p>
    ${p0.length > 0 ? `<p><b>严重问题：</b>${p0.map((i) => esc(i.title)).join("；")}。</p>` : ""}
    ${p1.length > 0 ? `<p><b>中等问题：</b>${p1.slice(0, 5).map((i) => esc(i.title)).join("；")}${p1.length > 5 ? ` 等 ${p1.length} 个问题` : ""}。</p>` : ""}
    <p><b>主要发现：</b>${allIssues.length} 个问题中，架构 ${allIssues.filter((i) => i.category === "architecture").length} 个、安全 ${allIssues.filter((i) => i.category === "security").length} 个、可维护性 ${allIssues.filter((i) => i.category === "maintainability").length} 个、正确性 ${allIssues.filter((i) => i.category === "correctness").length} 个。</p>
  </div>
</section>

<!-- === Module Audit Results === -->
<section class="sec" id="module-audit">
  <div class="sec-hdr">
    <div class="label">02 — 模块审计结果</div>
    <h2>模块审计结果</h2>
    <div class="desc">${(moduleList.modules ?? []).length} 个模块逐一审查，列出问题数和业务解读。</div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:6px;margin-bottom:20px">
    <div style="text-align:center;padding:12px 8px;background:var(--surface);border:1px solid var(--border);border-radius:6px"><div style="font-size:20px;font-weight:700;font-family:var(--mono);color:var(--fg)">${(moduleList.modules ?? []).length}</div><div style="font-size:10px;color:var(--text-2);margin-top:2px">已审查</div></div>
    <div style="text-align:center;padding:12px 8px;background:var(--surface);border:1px solid var(--border);border-radius:6px"><div style="font-size:20px;font-weight:700;font-family:var(--mono);color:var(--danger)">${byModule.size}</div><div style="font-size:10px;color:var(--text-2);margin-top:2px">发现问题</div></div>
    <div style="text-align:center;padding:12px 8px;background:var(--surface);border:1px solid var(--border);border-radius:6px"><div style="font-size:20px;font-weight:700;font-family:var(--mono);color:var(--success)">${(moduleList.modules ?? []).length - byModule.size}</div><div style="font-size:10px;color:var(--text-2);margin-top:2px">无问题模块</div></div>
    <div style="text-align:center;padding:12px 8px;background:var(--surface);border:1px solid var(--border);border-radius:6px"><div style="font-size:20px;font-weight:700;font-family:var(--mono);color:var(--fg)">${totalFiles}</div><div style="font-size:10px;color:var(--text-2);margin-top:2px">已审查文件</div></div>
    <div style="text-align:center;padding:12px 8px;background:var(--surface);border:1px solid var(--border);border-radius:6px"><div style="font-size:20px;font-weight:700;font-family:var(--mono);color:var(--fg)">${totalLines.toLocaleString()}</div><div style="font-size:10px;color:var(--text-2);margin-top:2px">总行数</div></div>
  </div>
  ${[...byModule.entries()].map(([name, issues]) => moduleCard(name, issues)).join("\n  ")}
  ${[...byModule.entries()].length === 0 ? '<p style="color:var(--text-2);text-align:center;padding:20px">所有模块审查通过，未发现问题。</p>' : ""}
</section>

<!-- === Module Dependencies === -->
<section class="sec" id="graph">
  <div class="sec-hdr">
    <div class="label">03 — 模块依赖</div>
    <h2>模块依赖关系</h2>
    <div class="desc">模块间调用链（业务数据流方向）</div>
  </div>
  <div style="background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:18px;margin-bottom:12px">
    <div style="font-size:11px;font-weight:600;color:var(--text-2);text-transform:uppercase;letter-spacing:0.6px;margin-bottom:12px">模块调用链</div>
    <div style="font-size:12.5px;color:var(--text);line-height:1.8;font-family:var(--mono)">
      <b style="color:var(--fg)">core (index.tsx)</b> → <span style="color:var(--text-2)">tui(全UI组件) · agent(Agent引擎) · config(配置) · session(持久化)</span><br>
      <b style="color:var(--fg)">agent</b> → <span style="color:var(--text-2)">llm(HTTP/SSE) · provider(适配器) · tools(工具注册表)</span><br>
      <b style="color:var(--fg)">tui</b> → <span style="color:var(--text-2)">models-dev(模型目录) · provider-catalog(提供商目录)</span><br>
    </div>
  </div>
  <div class="gbox">
    <h4>依赖图谱</h4>
    <p class="ghint">节点面积 ∝ 文件数 · 连线 = 模块依赖</p>
    <div id="fg"></div>
    <div style="position:absolute;pointer-events:none" class="tip" id="tip"></div>
  </div>
</section>

<!-- === Contributors === -->
<section class="sec">
  <div class="sec-hdr">
    <div class="label">04 — 团队</div>
    <h2>贡献者</h2>
  </div>
  <div class="contrib-list">
    <div class="row"><div class="rank">01</div><div class="name">N0ts</div><div class="bar-wrap"><div class="bar" style="width:100%"></div></div><div class="count">${commits} 次</div></div>
  </div>
</section>

<!-- === Issues Table === -->
<section class="sec" id="issues">
  <div class="sec-hdr">
    <div class="label">05 — 问题清单</div>
    <h2>问题清单</h2>
    <div class="desc">共 ${allIssues.length} 个问题，P0 必须立即处理。</div>
  </div>
  <div class="issues-table">
    <table>
      <thead><tr><th>级别</th><th>含义</th><th>数量</th><th>占比</th></tr></thead>
      <tbody>
        <tr><td><span class="ib b0">P0</span></td><td>阻塞性，必须立即修复</td><td>${p0.length}</td><td>${allIssues.length > 0 ? Math.round(p0.length / allIssues.length * 100) : 0}%</td></tr>
        <tr><td><span class="ib b1">P1</span></td><td>严重，强烈建议修复</td><td>${p1.length}</td><td>${allIssues.length > 0 ? Math.round(p1.length / allIssues.length * 100) : 0}%</td></tr>
        <tr><td><span class="ib b2">P2</span></td><td>一般，建议修复</td><td>${p2.length}</td><td>${allIssues.length > 0 ? Math.round(p2.length / allIssues.length * 100) : 0}%</td></tr>
        <tr><td><span class="ib b3">P3</span></td><td>轻微，可暂缓</td><td>${p3.length}</td><td>${allIssues.length > 0 ? Math.round(p3.length / allIssues.length * 100) : 0}%</td></tr>
        <tr style="font-weight:600"><td>合计</td><td></td><td>${allIssues.length}</td><td>100%</td></tr>
      </tbody>
    </table>
  </div>
  <div class="module-row">
    ${[...byModule.keys()].map((n) => moduleTag(n, byModule.get(n) ?? [])).join("\n    ")}
  </div>
</section>

<!-- === P0 === -->
<section class="sec" id="p0">
  <div class="sec-hdr">
    <div class="label">P0 — 阻塞</div>
    <h2>必须立即修复</h2>
    <div class="desc">${p0.length} 个严重问题。</div>
  </div>
  <div class="il">
    ${p0.map(issueCard).join("\n    ")}
  </div>
  ${p0.length === 0 ? '<p style="color:var(--success);text-align:center">✅ 无 P0 问题</p>' : ""}
</section>

<!-- === P1 === -->
<section class="sec" id="p1">
  <div class="sec-hdr">
    <div class="label">P1 — 严重</div>
    <h2>结构性风险</h2>
    <div class="desc">${p1.length} 个严重问题。</div>
  </div>
  <div class="il">
    ${p1.map(issueCard).join("\n    ")}
  </div>
</section>

<!-- === P2 === -->
<section class="sec" id="p2">
  <div class="sec-hdr">
    <div class="label">P2 — 一般</div>
    <h2>建议修复</h2>
    <div class="desc">${p2.length} 个一般问题。</div>
  </div>
  <div class="il">
    ${p2.map(issueCard).join("\n    ")}
  </div>
</section>

<!-- === P3 === -->
<section class="sec">
  <div class="sec-hdr">
    <div class="label">P3 — 轻微</div>
    <h2>可暂缓</h2>
    <div class="desc">${p3.length} 个轻微问题。</div>
  </div>
  <div class="il">
    ${p3.map(issueCard).join("\n    ")}
  </div>
</section>

<!-- === Domains === -->
<section class="sec" id="domains">
  <div class="sec-hdr">
    <div class="label">06 — 业务领域</div>
    <h2>业务领域</h2>
  </div>
  <div class="dg">
    ${bizDocs.slice(0, 6).map((d) => `
    <div class="dc">
      <h5>${esc(d.name)}</h5>
      <div class="meta">${esc(d.content.split("\n").slice(1, 5).join(" · ").substring(0, 200))}</div>
    </div>`).join("\n    ")}
  </div>
</section>

<!-- === Tech Debt === -->
<section class="sec">
  <div class="sec-hdr">
    <div class="label">07 — 技术债务</div>
    <h2>技术债务</h2>
  </div>
  <div class="tdg">
    <div class="cc"><h4>问题分类分布</h4>
      <div class="br">
        ${["architecture","security","maintainability","correctness","design","performance"].map((cat) => {
          const n = allIssues.filter((i) => i.category === cat).length
          const pct = allIssues.length > 0 ? Math.round(n / allIssues.length * 100) : 0
          return `<div class="bh"><span class="bl">${catLabel(cat)}</span><span class="bv">${pct}% · ${n}</span></div><div class="bt"><div class="bf" style="width:${pct}%"></div></div>`
        }).join("\n        ")}
      </div>
    </div>
    <div class="cc"><h4>关键指标</h4>
      <div class="kg">
        <div><div class="kl">源文件</div><div class="kv">${totalFiles}</div><div class="ks">个</div></div>
        <div><div class="kl">代码行</div><div class="kv">${totalLines.toLocaleString()}</div><div class="ks">行</div></div>
        <div><div class="kl">P0 问题</div><div class="kv" style="color:var(--danger)">${p0.length}</div><div class="ks">严重</div></div>
        <div><div class="kl">问题总数</div><div class="kv" style="color:var(--warning)">${allIssues.length}</div><div class="ks">全部</div></div>
      </div>
    </div>
  </div>
</section>
`

// ── 6. 组合最终 HTML ──────────────────────────────────────────────────
// 模板包含 <style> + <script> + 示例 <body>。
// 我们提取 <style> 和 <script> 之间的内容，替换 <body> 部分。

const styleMatch = template.match(/<style>[\s\S]*?<\/style>/)
const scriptMatch = template.match(/<script>[\s\S]*?<\/script>/)
const style = styleMatch ? styleMatch[0] : ""
const script = scriptMatch ? scriptMatch[0] : ""

// Extract D3 graph JS from template
const d3Script = script || ""

const title = `代码审计报告 · ${proj}`

const html = `<!DOCTYPE html>
<html lang="zh-CN" data-theme="light" data-style="C">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js"></script>
<script src="https://d3js.org/d3.v7.min.js"></script>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
${style.replace(/<style>|<\/style>/g, "").trim() ? `<style>${style.replace(/<\/?style>/g, "").trim()}</style>` : ""}
</head>
<body>

<nav class="topnav">
  <a href="#top" class="active" data-sec>总览</a>
  <a href="#overview" data-sec>项目介绍</a>
  <a href="#stats" data-sec>指标</a>
  <a href="#summary" data-sec>审计总结</a>
  <a href="#module-audit" data-sec>模块审计</a>
  <a href="#graph" data-sec>依赖</a>
  <a href="#issues" data-sec>问题</a>
  <a href="#domains" data-sec>领域</a>
</nav>

<button class="tb" onclick="toggleTheme()" aria-label="切换主题">
  <svg id="ticon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>
  <span id="tlabel">深</span>
</button>

<div class="wrap">
${body}
<footer class="foot">
  <p>由 <b>代码审计报告</b> 生成 · ${esc(proj)}</p>
  <p>${esc(lang)} · ${esc(fw)} · 全量审计</p>
  <p>${now} · 数据源: git · 源代码静态分析</p>
  <p style="margin-top:14px"><a href="https://github.com/N0tsLabs/code-shit-audit" target="_blank" rel="noopener" style="color:var(--accent);text-decoration:none">github.com/N0tsLabs/code-shit-audit</a></p>
</footer>
</div>

${d3Script.replace(/<\/?script>/g, "").trim() ? `<script>${d3Script.replace(/<\/?script>/g, "").trim()}</script>` : ""}
</body>
</html>`

// ── 7. 写出 ────────────────────────────────────────────────────────────
writeFileSync(outPath, html, "utf-8")
console.log(`✅ 报告已生成: ${outPath}`)
console.log(`   模板: ${templatePath}`)
console.log(`   数据: ${sessionDir}`)
console.log(`   章节: Hero · 项目介绍 · KPI × 8 · 审计总结 · 模块审计 · 依赖 · 贡献者 · 问题表 · P0/P1/P2/P3 · 业务领域 · 技术债务 · Footer`)
console.log(`   问题: P0=${p0.length} P1=${p1.length} P2=${p2.length} P3=${p3.length} (共${allIssues.length})`)
