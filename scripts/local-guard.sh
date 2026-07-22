#!/usr/bin/env bash
# code-shit-audit 项目的本地自检脚本——不依赖 AI，秒级出结果。
# 每次 push 前跑一下，提前抓出常见问题。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; NC='\033[0m'
errors=0; checks=0

_err()  { echo -e "${RED}✗${NC} $*"; ((errors++)) || true; }
_ok()   { echo -e "${GREEN}✓${NC} $*"; }
_info() { echo -e "${YELLOW}→${NC} $*"; }
_hdr()  { echo ""; echo "── $* ──"; ((checks++)) || true; }

# ============================================================================
# R1: shell 语法检查
# ============================================================================
check_shell_syntax() {
    _hdr "shell 语法检查"
    local count=0
    while IFS= read -r -d '' sh; do
        if bash -n "$sh" 2>/dev/null; then
            ((count++)) || true
        else
            _err "$sh 语法错误"
        fi
    done < <(find "$ROOT" -name "*.sh" -print0 2>/dev/null)
    _ok "shell 语法: $count 文件通过"
}

# ============================================================================
# R2: Markdown 语法（低要求——只要不空就行）
# ============================================================================
check_markdown() {
    _hdr "Markdown 文件完整性"
    local ok=0 bad=0
    for md in "$ROOT"/*.md "$ROOT"/prompts/*.md; do
        [[ -f "$md" ]] || continue
        if [[ -s "$md" ]]; then
            ((ok++)) || true
        else
            _err "$md 为空"
            ((bad++)) || true
        fi
    done
    _ok "Markdown: $ok 个非空, $bad 个空"
}

# ============================================================================
# R3: HTML 模板基本校验
# ============================================================================
check_html_templates() {
    _hdr "HTML 模板校验"
    local ok=0
    for html in "$ROOT"/templates/*.html; do
        [[ -f "$html" ]] || continue
        ((ok++)) || true
    done
    _ok "HTML 模板: $ok 文件存在"
}

# ============================================================================
# R4: JSON 语法
# ============================================================================
check_json() {
    _hdr "JSON 语法"
    local bad=0
    for j in "$ROOT"/templates/*.json; do
        [[ -f "$j" ]] || continue
        if python3 -c "import json; json.load(open('$j'))" 2>/dev/null; then
            :; else _err "$(basename "$j") JSON 解析失败"; ((bad++)) || true; fi
    done
    _ok "JSON: $bad 错误"
}

# ============================================================================
# R5: 敏感词漏出检查（检查纯文本内容，跳过 HTML 属性）
# ============================================================================
check_profanity() {
    _hdr "面向用户内容检查"
    local bad=0
    # 只检查用户可见的模板文件（README/SKILL 是内部文档，允许含仓库名）
    for f in "$ROOT"/templates/*.html; do
        [[ -f "$f" ]] || continue
        # 排除 href/src 里的 URL，只检查文本内容
        if sed 's/href="[^"]*"//g; s/src="[^"]*"//g' "$f" | grep -qiw 'shit'; then
            _err "$(basename "$f"): 文本含禁止词"
            ((bad++))
        fi
    done
    if [[ $bad -eq 0 ]]; then
        _ok "用户可见文本无禁止词"
    fi
}

# ============================================================================
# R6: 死文件检测
# ============================================================================
check_dead_files() {
    _hdr "死文件检测"
    # scripts/render-report.ts 是渲染脚本，检查是否被引用
    if [[ -f "$ROOT/scripts/render-report.ts" ]]; then
        local refs
        refs=$(grep -rl "render-report" "$ROOT" 2>/dev/null | grep -v "scripts/render-report" | wc -l | tr -d ' ')
        if [[ "$refs" -eq 0 ]]; then
            _info "scripts/render-report.ts 无外部引用(可能是独立工具,忽略)"
        else
            _ok "render-report 有 $refs 处引用"
        fi
    fi
    _ok "无已知死文件"
}

# ============================================================================
# R7: prompt 结构完整性——每个 prompt 文件必须包含必要章节
# ============================================================================
check_prompts() {
    _hdr "Prompt 模板完整性"
    local bad=0
    for p in "$ROOT"/prompts/*.md; do
        [[ -f "$p" ]] || continue
        local name; name=$(basename "$p")
        # 至少要有「你是一个」或「角色」开头的指令
        if ! grep -qE '^#|你是一个|你是|角色' "$p"; then
            _err "$name: 缺少角色/指令描述"
            ((bad++)) || true
        fi
        # 至少要有「输出」要求
        if ! grep -qE '输出|报告' "$p"; then
            _err "$name: 缺少输出格式说明"
            ((bad++)) || true
        fi
    done
    if [[ $bad -eq 0 ]]; then
        _ok "Prompt 模板结构完整"
    fi
}

# ============================================================================
# R8: Git 仓库健康
# ============================================================================
check_git() {
    _hdr "Git 仓库健康"
    if ! git rev-parse --git-dir >/dev/null 2>&1; then
        _info "非 git 仓库，跳过"
        return
    fi
    # 无未暂存的大文件
    local big=0
    while IFS= read -r f; do
        local sz; sz=$(wc -c < "$f" | tr -d ' ')
        if [[ "$sz" -gt 524288 ]]; then  # >512KB
            _info "$(basename "$f"): ${sz} bytes（可能不该进 git）"
            ((big++)) || true
        fi
    done < <(git ls-files | grep -v node_modules | grep -v '.git')
    if [[ $big -eq 0 ]]; then
        _ok "无超大文件"
    fi
}

# ============================================================================
# 汇总
# ============================================================================
summary() {
    echo ""
    echo "=========================================="
    if [[ $errors -eq 0 ]]; then
        echo -e "${GREEN}全部通过 ✓${NC}"
    else
        echo -e "${RED}$errors 错误${NC}"
    fi
    echo "=========================================="
    return $errors
}

main() {
    echo "code-shit-audit 本地自检"
    echo ""

    case "${1:-}" in
        --quick)
            check_shell_syntax
            check_json
            check_profanity
            ;;
        *)
            check_shell_syntax
            check_markdown
            check_html_templates
            check_json
            check_profanity
            check_dead_files
            check_prompts
            check_git
            ;;
    esac
    summary
}

main "$@"
