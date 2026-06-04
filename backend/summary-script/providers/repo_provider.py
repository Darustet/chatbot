import re
import urllib.parse
from .summarizer import getSummarize
import subprocess
import os

CURRENT_DIR = os.path.dirname(os.path.dirname(__file__))
RUNNER_PATH = os.path.join(CURRENT_DIR, "runner.js")

HTTP_HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/91.0.4472.124 Safari/537.36"
    )
}

class RepoProvider:
    def __init__(self, base_url: str, repo_name: str):
        self.base_url = base_url.rstrip("/")
        self.repo_name = repo_name

    def _normalize_url(self, url: str) -> str:
        url = url.strip()
        if self.base_url.replace("https://", "") in url and not url.startswith("http"):
            url = self.base_url + url
        return urllib.parse.quote(url, safe=":/?=&")

    def _extract_handle_id(self, value: str) -> str | None:
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

    def _build_handle_page_url(self, thesis_key: str) -> str:
        thesis_key = thesis_key.strip()
        handle_id = self._extract_handle_id(thesis_key)

        if not handle_id:
            raise ValueError(f"Could not extract handle id from: {thesis_key}")

        return f"{self.base_url}/handle/{handle_id}"

    def summarize(self, thesis_key: str):
        try:
            print(f"\n====== {self.repo_name.upper()} PROVIDER ======")
            print(f"thesis_key: {thesis_key}")

            page_url = self._build_handle_page_url(thesis_key)
            print(f"HANDLE PAGE URL: {page_url}")

            result = subprocess.run(
                ["node", RUNNER_PATH, page_url],
                capture_output=True,
                text=True
            )

            if result.returncode != 0:
                raise RuntimeError(result.stderr)

            abstract_text = result.stdout.strip()

            if not abstract_text:
                return {
                    "error": "No abstract found",
                    "message": "Could not find abstract text from the thesis page.",
                }

            summary = getSummarize(abstract_text)

            return {
                "summary": summary,
                "Abstract": abstract_text,
                "page_url": page_url,
            }
        except Exception as e:
            print(f"Error in {self.repo_name.lower()}_provider.summarize: {e}")
            return {
                "error": str(e),
                "message": "An error occurred while reading the thesis page.",
            }