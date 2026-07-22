#!/usr/bin/env bash
# 项目画像识别器——输出语言/框架/工具链。
# 无法确定时输出 "未识别/<领域>"，留给 AI 补充。
# 用法: bash detect.sh [项目根目录]  # 默认当前目录
set -euo pipefail

ROOT="${1:-.}"
cd "$ROOT" || exit 1

# 辅助函数：文件存在则输出
_has() { local f="$1"; local v="$2"; [[ -f "$f" ]] && echo "\"$v\""; }
_dir() { local d="$1"; local v="$2"; [[ -d "$d" ]] && echo "\"$v\""; }

LANG="未识别/语言"
PKG="未识别/包管理"
FRAMEWORK="未识别/框架"
TEST_TOOL="未识别/测试"
ORM=""
LINT_TOOL="未识别/lint"
FORMAT_TOOL="未识别/格式化"
DEAD_CODE_TOOL=""

# ---- 语言 + 包管理 ----
if [[ -f "package.json" ]]; then
    LANG="TypeScript"  # 默认; 下面按 tsconfig 区分
    PKG="npm"
    [[ -f "pnpm-lock.yaml" ]] && PKG="pnpm"
    [[ -f "yarn.lock" ]] && PKG="yarn"
    [[ -f "bun.lockb" ]] && PKG="bun"
    if [[ ! -f "tsconfig.json" ]]; then
        LANG="JavaScript"
    fi
elif [[ -f "pyproject.toml" ]]; then
    LANG="Python"
    PKG="uv/pip"
elif [[ -f "go.mod" ]]; then
    LANG="Go"
    PKG="go mod"
elif [[ -f "Cargo.toml" ]]; then
    LANG="Rust"
    PKG="cargo"
elif [[ -f "pom.xml" ]]; then
    LANG="Java"
    PKG="maven"
elif [[ -f "build.gradle" || -f "build.gradle.kts" ]]; then
    LANG="Java/Kotlin"
    PKG="gradle"
elif [[ -f "Gemfile" ]]; then
    LANG="Ruby"
    PKG="bundler"
fi

# ---- 框架 ----
[[ -f "nuxt.config.ts" || -f "nuxt.config.js" ]] && FRAMEWORK="Nuxt.js (Vue)"
[[ -f "next.config.ts" || -f "next.config.js" || -f "next.config.mjs" ]] && FRAMEWORK="Next.js (React)"
[[ -f "svelte.config.js" ]] && FRAMEWORK="Svelte"
[[ -f "astro.config.mjs" ]] && FRAMEWORK="Astro"
[[ -f "vite.config.ts" || -f "vite.config.js" ]] && [[ "$FRAMEWORK" == "未识别/框架" ]] && FRAMEWORK="Vite (前端项目)"
if [[ "$LANG" == "Python" ]]; then
    if find . -name "settings.py" -path "*/settings.py" -maxdepth 3 | grep -q . 2>/dev/null; then FRAMEWORK="Django (Python)"; fi
fi
if [[ -d "src/main/java" ]]; then
    if [[ -f "application.properties" || -f "application.yml" ]]; then FRAMEWORK="Spring Boot (Java)"; fi
fi

# ---- 测试工具 ----
[[ -f "vitest.config.ts" || -f "vitest.config.js" ]] && TEST_TOOL="vitest"
if [[ "$TEST_TOOL" == "未识别/测试" ]]; then
    if [[ -f "package.json" ]] && grep -q '"jest"' package.json 2>/dev/null; then TEST_TOOL="jest"; fi
    if [[ -f "jest.config.ts" || -f "jest.config.js" ]]; then TEST_TOOL="jest"; fi
    if [[ -f "pyproject.toml" ]] && grep -q 'pytest' pyproject.toml 2>/dev/null; then TEST_TOOL="pytest"; fi
    if find . -name "*_test.go" -maxdepth 3 | grep -q . 2>/dev/null; then TEST_TOOL="go test"; fi
fi

# ---- ORM ----
if [[ -d "prisma" ]]; then ORM="Prisma"; fi
if [[ "$LANG" == "Python" ]]; then
    if grep -ql 'sqlalchemy\|django.db' requirements.txt 2>/dev/null; then ORM="SQLAlchemy/Django ORM"; fi
fi

# ---- Lint 工具 ----
if [[ -f "package.json" ]]; then
    if grep -q '"eslint"' package.json 2>/dev/null; then LINT_TOOL="ESLint"; fi
    if [[ -f "eslint.config.js" || -f "eslint.config.mjs" || -f ".eslintrc.js" || -f ".eslintrc.json" ]]; then LINT_TOOL="ESLint"; fi
fi
if [[ -f "pyproject.toml" ]] && grep -q 'ruff' pyproject.toml 2>/dev/null; then LINT_TOOL="ruff"; fi
if [[ -f ".golangci.yml" || -f "golangci.yml" ]]; then LINT_TOOL="golangci-lint"; fi

# ---- 死代码检测 ----
if [[ -f "tsconfig.json" ]]; then DEAD_CODE_TOOL="ts-prune/depcheck"; fi
if [[ "$LANG" == "Python" ]]; then DEAD_CODE_TOOL="vulture"; fi
if [[ "$LANG" == "Go" ]]; then DEAD_CODE_TOOL="golangci-lint"; fi

# ---- 格式化工具 ----
if [[ -f "package.json" ]]; then
    if grep -q '"prettier"' package.json 2>/dev/null; then FORMAT_TOOL="Prettier"; fi
    if [[ -f ".prettierrc" || -f ".prettierrc.json" || -f "prettier.config.js" ]]; then FORMAT_TOOL="Prettier"; fi
fi
if [[ "$LANG" == "Python" ]]; then FORMAT_TOOL="ruff format"; fi
if [[ "$LANG" == "Go" ]]; then FORMAT_TOOL="gofmt"; fi
if [[ "$LANG" == "Rust" ]]; then FORMAT_TOOL="rustfmt"; fi

# ---- 输出 JSON ----
cat <<JSON
{
  "语言": $LANG,
  "包管理": $PKG,
  "框架": $FRAMEWORK,
  "测试": $TEST_TOOL,
  "ORM": "${ORM:-无}",
  "lint": $LINT_TOOL,
  "格式化": $FORMAT_TOOL,
  "死代码检测": "${DEAD_CODE_TOOL:-无}"
}
JSON
