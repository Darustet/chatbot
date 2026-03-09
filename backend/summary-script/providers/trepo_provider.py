import re
import urllib.parse

import requests
from utils.summarizer import generate_thesis_points

try:
    from bs4 import BeautifulSoup
except ImportError as e:
    raise ImportError("BeautifulSoup4 puuttuu. Asenna: pip install beautifulsoup4") from e

TREPO_BASE = "https://trepo.tuni.fi"

HTTP_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/91.0.4472.124 Safari/537.36"
    )
}

def _normalize_url(url: str) -> str:
    url = url.strip()
    if "trepo.tuni.fi" in url and not url.startswith("http"):
        url = TREPO_BASE + url
    return urllib.parse.quote(url, safe=":/?=&")

def _extract_handle_id(value: str) -> str | None:
    value = value.strip()

    if re.fullmatch(r"\d+/\d+", value):
        return value
    m = re.search(r"/handle/(\d+/\d+)", value)
    if m:
        return m.group(1)

    m = re.search(r"/bitstream/handle/(\d+/\d+)/", value)
    if m:
        return m.group(1)
    return None

def _build_handle_page_url(thesis_key: str) -> str:
    thesis_key = thesis_key.strip()
    handle_id = _extract_handle_id(thesis_key)

    if not handle_id:
        raise ValueError(f"Could not extract TREPO handle id from: {thesis_key}")
    return f"{TREPO_BASE}/handle/{handle_id}"

def _fetch_page_html(thesis_key: str) -> str:
    page_url = _normalize_url(_build_handle_page_url(thesis_key))
    print(f"READING PAGE: {page_url}")

    response = requests.get(
        page_url,
        headers=HTTP_HEADERS,
        timeout=20,
        allow_redirects=True,
    )
    response.raise_for_status()

    content_type = response.headers.get("content-type", "").lower()
    print(f"Response content-type: {content_type}")
    print(f"Final URL: {response.url}")

    if "html" not in content_type:
        raise Exception(f"Expected HTML page, got content-type: {content_type}")
    return response.text

def _clean_text(text: str) -> str:
    text = text.replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()

def _extract_abstract_from_meta(soup: BeautifulSoup) -> str | None:
    candidates = []

    for tag in soup.find_all("meta"):
        name = (tag.get("name") or tag.get("property") or "").strip().lower()
        content = (tag.get("content") or "").strip()

        if not content:
            continue
        if any(key in name for key in (
            "dc.description.abstract",
            "dcterms.abstract",
            "citation_abstract",
        )):
            cleaned = _clean_text(content)
            if len(cleaned) > 40:
                candidates.append(cleaned)
    if candidates:
        best = max(candidates, key=len)
        print(f"Found abstract from meta ({len(best)} chars)")
        return best
    return None

def _extract_abstract_from_visible_html(soup: BeautifulSoup) -> str | None:
    for tag in soup(["script", "style", "noscript"]):
        tag.decompose()

    text = soup.get_text("\n")
    lines = [_clean_text(line) for line in text.splitlines()]
    lines = [line for line in lines if line]

    start_index = None

    for i, line in enumerate(lines):
        if re.fullmatch(r"(abstract|tiivistelmä)", line, re.IGNORECASE):
            start_index = i + 1
            break

        inline_match = re.match(
            r"^(abstract|tiivistelmä)\s*[:\-]\s*(.+)$",
            line,
            re.IGNORECASE,
        )
        if inline_match:
            candidate = _clean_text(inline_match.group(2))
            if len(candidate) > 40:
                return candidate

    if start_index is None:
        return None

    collected = []
    for line in lines[start_index:start_index + 60]:
        lower_line = line.lower()

        if re.fullmatch(r"(keywords|avainsanat)", lower_line):
            break
        if re.fullmatch(r"(introduction|johdanto)", lower_line):
            break
        if re.match(r"^1(\.|\s)", line):
            break
        collected.append(line)

    candidate = _clean_text(" ".join(collected))
    return candidate if len(candidate) > 80 else None

def extract_abstract_from_page(thesis_key: str) -> str:
    html = _fetch_page_html(thesis_key)
    soup = BeautifulSoup(html, "html.parser")

    abstract = _extract_abstract_from_meta(soup)
    if abstract:
        return abstract

    abstract = _extract_abstract_from_visible_html(soup)
    if abstract:
        return abstract
    raise Exception("Could not find abstract text on the page")

def summarize(thesis_key: str):
    try:
        print("\n====== TREPO PROVIDER ======")
        print(f"thesis_key: {thesis_key}")

        page_url = _build_handle_page_url(thesis_key)
        print(f"HANDLE PAGE URL: {page_url}")

        abstract_text = extract_abstract_from_page(thesis_key)

        if not abstract_text:
            return {
                "error": "No abstract found",
                "message": "Could not find abstract text from the thesis page.",
            }

        print(f"EXTRACTED ABSTRACT ({len(abstract_text)} chars)")
        print(abstract_text[:500] + "..." if len(abstract_text) > 500 else abstract_text)

        summary = generate_thesis_points(abstract_text)

        return {
            "summary": summary,
            "text": abstract_text,
            "page_url": page_url,
        }

    except Exception as e:
        print(f"Error in trepo_provider.summarize: {e}")
        return {
            "error": str(e),
            "message": "An error occurred while reading the thesis page.",
        }
