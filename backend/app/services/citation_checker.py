"""
引注自动检查：基于《法学引注手册（第二版）》规范，对脚注进行格式与完整性检查。
检查脚注格式、文献要素（出版社、页码等）、法条引用、案例引用。
链接、网页、公众号等非标准文献不强制要求页码；可选接入大模型辅助判断。
"""
import json
import re
from dataclasses import dataclass
from typing import Any

@dataclass
class CitationIssueItem:
    """单条引注问题"""
    location: str       # 如 "脚注3"
    issue_type: str     # missing_publisher, missing_page, invalid_format, etc.
    description: str    # 如 "缺少出版社"
    suggestion: str = ""
    severity: str = "warning"  # warning | error


# 出版社相关关键词（规范要求书籍需注明出版社）
PUBLISHER_INDICATORS = re.compile(
    r"出版社|出版公司|出版集团|书局|印书馆|书社|出版\s*社|北京大学出版社|法律出版社|中国人民大学出版社|中国政法大学出版社|清华大学出版社|高等教育出版社"
)

# 页码相关：中文“页”、英文 p. / pp.、数字+页
PAGE_INDICATORS = re.compile(
    r"第\s*\d+\s*页|第\s*\d+\s*[-—–]\s*\d+\s*页|\d+\s*页|p\.\s*\d+|pp\.\s*\d+|頁\s*\d+"
)

# 链接/URL：不强制要求页码
LINK_OR_URL_INDICATORS = re.compile(
    r"https?://[^\s]+|http://[^\s]+|www\.\S+|访问\s*[：:]\s*https?|网址\s*[：:]|链接\s*[：:]|访问于|最后访问|登录时间"
)

# 非标准文献（网页、公众号、博客等）：不强制要求页码和出版社
NON_STANDARD_SOURCE_INDICATORS = re.compile(
    r"微信公众号|公众号|微信\s*公\s*众\s*号|博客|微博|知乎|网页|网络\s*文章|网络\s*资源|在线\s*资源|"
    r"新闻报道|新闻\s*报道|报道\s*载|转载|电子\s*资源|网络\s*版|电子\s*版\s*载|"
    r"载\s*于\s*.*(?:网|\.com|\.cn)|访问\s*于|检索\s*于"
)

# 法条引用：《法律名称》第x条、第x款
LEGISLATION_PATTERN = re.compile(
    r"《[^》]+(?:法|条例|规定|办法|解释)》|第\s*\d+\s*条|第\s*\d+\s*款"
)

# 案例引用：法院、判决书、裁定书、案号、指导性案例
CASE_INDICATORS = re.compile(
    r"法院|判决书|裁定书|案号|指导性案例|最高人民法院|高级人民法院|中级人民法院|基层人民法院|载\s*于|载\s*《"
)

# 期刊/载于（文章类应有页码，但仅限“标准”学术期刊）
JOURNAL_INDICATORS = re.compile(
    r"载\s*《|载\s*于\s*《|《[^》]*》(?:\d{4}\s*年)?\s*第\s*\d+\s*期|学术\s*期刊|法学\s*期刊|杂志\s*文章"
)

# 同上注、同前注等简写（可跳过部分检查）
SHORTHAND_REF = re.compile(
    r"^同上注|^同前注|^同上|^同前|^id\.|^ibid\.|^op\.\s*cit\."
)


def _normalize_footnote_index(entry: Any, index: int) -> tuple[int, str]:
    """从 footnotes_raw 单项解析出显示用脚注序号与正文。"""
    text = (entry if isinstance(entry, str) else str(entry or "")).strip()
    # 格式可能是 "1: 内容" 或 "2: 内容"
    match = re.match(r"^(\d+)\s*[：:]\s*(.*)$", text, re.DOTALL)
    if match:
        num = int(match.group(1))
        body = (match.group(2) or "").strip()
        return num, body
    return index + 1, text


def _is_link_or_non_standard(text: str) -> bool:
    """是否为链接、网页、公众号等非标准文献（不强制要求页码/出版社）。"""
    return bool(LINK_OR_URL_INDICATORS.search(text) or NON_STANDARD_SOURCE_INDICATORS.search(text))


def _check_single_footnote(footnote_num: int, text: str) -> list[CitationIssueItem]:
    """对单条脚注文本执行各项检查，返回问题列表。"""
    issues: list[CitationIssueItem] = []
    if not text or len(text) < 3:
        return issues

    location = f"脚注{footnote_num}"

    # 简写引用不检查出版社/页码
    if SHORTHAND_REF.search(text):
        return issues

    # 链接或非标准文献：不强制页码，也不强求出版社
    is_link_or_non_standard = _is_link_or_non_standard(text)

    # 判断类型并检查
    is_legislation = bool(LEGISLATION_PATTERN.search(text))
    is_case = bool(CASE_INDICATORS.search(text))
    is_journal = bool(JOURNAL_INDICATORS.search(text))
    # 书籍：有《》书名，且非明显法条/案例/期刊
    has_book_title = bool(re.search(r"《[^》]+》", text))
    is_likely_book = has_book_title and not is_legislation and not is_case and not is_journal

    # 书籍类：应有出版社（仅对正式出版的图书要求；链接/网页类不要求）
    if is_likely_book and not is_link_or_non_standard:
        if not PUBLISHER_INDICATORS.search(text):
            issues.append(CitationIssueItem(
                location=location,
                issue_type="missing_publisher",
                description="缺少出版社",
                suggestion="专著、教材等应注明出版社，如：北京大学出版社。",
                severity="warning",
            ))

    # 仅对标准论文/图书要求页码；链接、网页、公众号等不强制
    require_page = (is_journal or is_likely_book) and not is_link_or_non_standard
    if require_page and not PAGE_INDICATORS.search(text):
        issues.append(CitationIssueItem(
            location=location,
            issue_type="missing_page",
            description="页码缺失",
            suggestion="文献引用建议注明页码，如：第x页、第x-y页。",
            severity="warning",
        ))

    # 法条引用：基本格式《法律名称》第x条
    if is_legislation:
        if not re.search(r"第\s*\d+\s*条|第\s*\d+\s*款", text):
            issues.append(CitationIssueItem(
                location=location,
                issue_type="invalid_legislation_format",
                description="法条引用宜标明条文序号",
                suggestion="如：《民法典》第x条、第x款。",
                severity="warning",
            ))

    # 案例引用：宜有法院或出处
    if is_case:
        if not re.search(r"载\s*于|载\s*《|最高人民法院|人民法院|裁判", text):
            issues.append(CitationIssueItem(
                location=location,
                issue_type="incomplete_case_citation",
                description="案例引用宜标明出处或法院",
                suggestion="如：载《最高人民法院公报》xxxx年第x期；或标明法院与裁判时间。",
                severity="warning",
            ))

    # 通用：过长或过短、明显不完整
    if has_book_title or is_journal:
        if len(text) < 15:
            issues.append(CitationIssueItem(
                location=location,
                issue_type="incomplete_citation",
                description="脚注过短，可能信息不完整",
                suggestion="请核对作者、题名、出版/发表信息是否完整。",
                severity="warning",
            ))

    # 格式不符合期刊规范（综合兜底）；链接/非标准文献不按正式出版严格要求
    if not is_legislation and not is_case and not is_link_or_non_standard:
        # 中文文献常见结构：作者、题名、出版社/刊名、年份、页码
        has_author_like = bool(re.search(r"[\u4e00-\u9fa5]{2,4}\s*[，,、]|[\u4e00-\u9fa5]{2,4}\s*[：:]", text))
        has_year = bool(re.search(r"20\d{2}\s*年|\d{4}\s*年", text))
        if has_author_like and not has_year and len(text) > 20:
            issues.append(CitationIssueItem(
                location=location,
                issue_type="invalid_format",
                description="格式不符合期刊规范",
                suggestion="请参照《法学引注手册》补全出版/发表年份等要素。",
                severity="warning",
            ))

    return issues


def check_citations(footnotes_raw: list[Any] | None) -> list[CitationIssueItem]:
    """
    对解析得到的脚注列表执行引注检查（仅规则）。
    footnotes_raw: 来自 ManuscriptParsed.footnotes_raw，每项为 "id: 内容" 或纯文本。
    返回所有问题的列表。
    """
    if not footnotes_raw:
        return []

    all_issues: list[CitationIssueItem] = []
    for i, entry in enumerate(footnotes_raw):
        footnote_num, text = _normalize_footnote_index(entry, i)
        issues = _check_single_footnote(footnote_num, text)
        all_issues.extend(issues)

    return all_issues


# ---------- 大模型辅助判断 ----------
def _parse_llm_citation_issues(raw: str, footnote_locations: list[str]) -> list[CitationIssueItem]:
    """从大模型返回的文本中解析出引注问题列表。支持 JSON 数组或简单段落。"""
    issues: list[CitationIssueItem] = []
    raw = (raw or "").strip()
    if not raw:
        return issues

    # 尝试解析 JSON： [{ "location": "脚注1", "description": "...", "suggestion": "..." }]
    try:
        # 常见：模型返回 ```json ... ``` 或直接 [...]
        for prefix in ("```json", "```JSON", "```"):
            if prefix in raw:
                raw = raw.split(prefix, 1)[-1].split("```", 1)[0].strip()
        data = json.loads(raw)
        if not isinstance(data, list):
            return issues
        for item in data:
            if not isinstance(item, dict):
                continue
            loc = (item.get("location") or item.get("脚注") or "").strip()
            desc = (item.get("description") or item.get("问题") or item.get("description_zh") or "").strip()
            if not desc and loc:
                continue
            if loc and loc not in footnote_locations:
                # 归一化：脚注1 / 脚注 1
                for known in footnote_locations:
                    if known.replace(" ", "") == loc.replace(" ", ""):
                        loc = known
                        break
            if not loc and footnote_locations:
                loc = footnote_locations[0]
            issues.append(CitationIssueItem(
                location=loc or "脚注",
                issue_type=item.get("issue_type") or "llm_format",
                description=desc,
                suggestion=(item.get("suggestion") or "").strip(),
                severity="warning",
            ))
    except (json.JSONDecodeError, TypeError):
        pass
    return issues


def check_citations_with_llm(
    footnotes_raw: list[Any] | None,
    use_llm: bool = False,
) -> list[CitationIssueItem]:
    """
    引注检查：先执行规则检查，若 use_llm=True 且已配置大模型，再调用大模型辅助判断并合并结果。
    """
    rule_issues = check_citations(footnotes_raw)
    if not footnotes_raw:
        return rule_issues
    if not use_llm:
        return rule_issues

    try:
        from app.services.llm import chat_completion, is_llm_configured
    except ImportError:
        return rule_issues
    if not is_llm_configured():
        return rule_issues

    # 构建带序号的脚注列表供 LLM 判断
    numbered: list[tuple[int, str]] = []
    locations: list[str] = []
    for i, entry in enumerate(footnotes_raw):
        num, text = _normalize_footnote_index(entry, i)
        loc = f"脚注{num}"
        locations.append(loc)
        numbered.append((num, text))

    # 控制长度，避免超长
    max_footnotes = 40
    max_chars_per_note = 400
    lines = []
    for num, text in numbered[:max_footnotes]:
        snippet = (text or "")[:max_chars_per_note]
        if len((text or "")) > max_chars_per_note:
            snippet += "…"
        lines.append(f"[脚注{num}]\n{snippet}")
    block = "\n\n".join(lines)

    system_prompt = """你是一位法学期刊编辑，熟悉《法学引注手册（第二版）》。
请对下列脚注做引注规范检查。注意：
1. 若是链接、网址、网页、微信公众号、博客、微博、新闻报道等非正式出版文献，不必强求页码和出版社。
2. 仅对正式出版的图书、学术期刊论文等要求：出版社、出版/发表年份、页码等要素。
3. 法条引用需有法律名称与条文序号；案例引用需有出处或法院。
4. 只输出确实存在问题的项。若无问题可返回空数组 []。
请以 JSON 数组形式输出，每项格式：{"location": "脚注N", "description": "问题简述", "suggestion": "修改建议（可选）"}。不要输出其他解释。"""

    user_prompt = f"请检查以下脚注是否符合引注规范：\n\n{block}"

    try:
        reply = chat_completion(
            [{"role": "system", "content": system_prompt}, {"role": "user", "content": user_prompt}],
            max_tokens=1500,
        )
        llm_issues = _parse_llm_citation_issues(reply or "", locations)
    except Exception:
        return rule_issues

    # 合并：规则结果 + LLM 结果（按 location+description 去重）
    result: list[CitationIssueItem] = []
    seen_key: set[tuple[str, str]] = set()
    for i in rule_issues:
        k = (i.location, (i.description or "")[:50])
        if k not in seen_key:
            seen_key.add(k)
            result.append(i)
    for i in llm_issues:
        k = (i.location, (i.description or "")[:50])
        if k not in seen_key:
            seen_key.add(k)
            result.append(i)
    return result
