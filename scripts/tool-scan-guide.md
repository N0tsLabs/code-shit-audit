# 工具扫描指南——AI 执行 Phase 0.5 时读此文件

AI agent: **在 audit 项目时，按此文件操作。** 你在 Phase 0 已识别了项目语言/框架，
现在安装并运行对应的扫描工具。结果存入 `{timestamp}/tools/` 供 Phase 4 汇总。

## Python 项目（有 `*.py` 文件）

```bash
# 先确保工具可用
pip install ruff vulture 2>/dev/null || pip3 install ruff vulture
# 或者 uv 环境
uv pip install ruff vulture 2>/dev/null

# 运行
ruff check . > {timestamp}/tools/ruff.txt 2>&1 || true
vulture . --min-confidence 60 > {timestamp}/tools/vulture.txt 2>&1 || true

# 如果项目有 mypy 配置
pip install mypy 2>/dev/null && mypy . > {timestamp}/tools/mypy.txt 2>&1 || true
```

**收集什么：**
- ruff: 未使用 import (F401)、未使用变量 (F841)、风格问题 (E/W)
- vulture: 死代码（函数/方法/变量无外部引用）
- mypy: 类型不匹配

## TypeScript/JavaScript 项目（有 `package.json`）

```bash
# 安装依赖
npm install 2>/dev/null || true

# ESLint
npx eslint . --ext .ts,.tsx,.js,.jsx --format json > {timestamp}/tools/eslint.json 2>&1 || true

# Prettier
npx prettier --check "**/*.{ts,tsx,js,jsx}" > {timestamp}/tools/prettier.txt 2>&1 || true

# TypeScript
npx tsc --noEmit > {timestamp}/tools/tsc.txt 2>&1 || true
```

## Go 项目（有 `go.mod`）

```bash
go install github.com/golangci/golangci-lint/cmd/golangci-lint@latest 2>/dev/null
golangci-lint run ./... > {timestamp}/tools/golangci.txt 2>&1 || true
go vet ./... > {timestamp}/tools/govet.txt 2>&1 || true
```

## Rust 项目（有 `Cargo.toml`）

```bash
cargo clippy --message-format=json > {timestamp}/tools/clippy.json 2>&1 || true
cargo check > {timestamp}/tools/cargo-check.txt 2>&1 || true
```

## 跨语言通用（所有项目）

```bash
# Shell 语法
find . -name "*.sh" -exec bash -n {} \; > {timestamp}/tools/shell-syntax.txt 2>&1 || true

# 死文件（git grep 无引用）
for f in $(git ls-files | grep -v node_modules | grep -v '.git'); do
  refs=$(git grep -l "$(basename $f | sed 's/\..*//')" 2>/dev/null | wc -l)
  [ "$refs" -le 1 ] && echo "DEAD: $f (0 external refs)" >> {timestamp}/tools/dead-files.txt
done 2>/dev/null || true

# 静默吞异常
grep -rn 'except.*:.*pass\|catch.*{\s*}\|rescue\s*=>\s*nil' . --include="*.py" --include="*.ts" --include="*.js" --include="*.rb" > {timestamp}/tools/silent-exception.txt 2>&1 || true

# Secret 泄露（.env.example / 配置模板中的真实 key）
grep -rn 'sk-[a-zA-Z0-9]\{20,\}' . --include="*.example" --include="*.sample" > {timestamp}/tools/secrets.txt 2>&1 || true

# 如果在 git 仓库里
[ -d .git ] && git log --format="%an" | sort | uniq -c | sort -rn > {timestamp}/tools/contributors.txt 2>&1 || true
```

## 工具安装通用模式

```bash
# macOS
brew install shellcheck golangci-lint 2>/dev/null || true

# Linux
apt-get install -y shellcheck 2>/dev/null || true

# Python 工具（跨平台）
pip install ruff vulture 2>/dev/null || pip3 install ruff vulture || true

# Node 工具（跨平台）
npm install -g eslint prettier 2>/dev/null || true
```

## 输出格式

所有工具结果存入 `{timestamp}/tools/`。主 agent 在 Phase 4 汇总时：
1. 读每个工具的 txt/json 输出
2. 提取关键发现（错误数、警告数、具体问题）
3. 在报告的"代码构成"章节追加工具扫描统计
4. 工具发现的高优先级问题（如 secret 泄露）与 AI 发现的问题一同列入 P0/P1
