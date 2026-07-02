import os
import re
import psycopg2
from psycopg2.extras import RealDictCursor

from .summarizer import generate_thesis_points


class RepoProvider:
  def __init__(self, base_url: str, repo_name: str):
    self.base_url = base_url.rstrip("/")
    self.repo_name = repo_name

  def _get_db_connection(self):
    database_url = os.getenv("DATABASE_URL")

    if not database_url:
      raise RuntimeError("DATABASE_URL is missing")

    return psycopg2.connect(database_url, cursor_factory=RealDictCursor)

  def _extract_handle_id(self, value: str) -> str | None:
    value = str(value or "").strip()

    if re.fullmatch(r"\d+/\d+", value):
      return value

    match = re.search(r"/handle/(\d+/\d+)", value)
    if match:
      return match.group(1)

    match = re.search(r"/bitstream/handle/(\d+/\d+)/", value)
    if match:
      return match.group(1)

    return None

  def _build_handle_page_url(self, thesis_key: str) -> str:
    thesis_key = str(thesis_key or "").strip()

    if thesis_key.startswith("http://") or thesis_key.startswith("https://"):
      return thesis_key

    handle_id = self._extract_handle_id(thesis_key)

    if not handle_id:
      raise ValueError(f"Could not extract handle id from: {thesis_key}")

    return f"{self.base_url}/handle/{handle_id}"

  def clean_summary(self, summary):
    if isinstance(summary, list):
      summary = "\n".join(summary)

    summary = str(summary or "").strip()

    summary = summary.replace('["', "")
    summary = summary.replace('"]', "")
    summary = summary.replace('","', "\n")
    summary = summary.replace('", "', "\n")
    summary = summary.replace('"', "")

    lines = []

    for line in summary.splitlines():
      line = line.strip()
      line = re.sub(r"^[-*•\d.)\s]+", "", line).strip()

      if line:
        lines.append(line)

    return "\n".join(lines)

  def get_existing_summary(self, link: str):
    with self._get_db_connection() as conn:
      with conn.cursor() as cur:
        cur.execute(
          """
          SELECT summary
          FROM summaries
          WHERE link = %s
          LIMIT 1
          """,
          (link,),
        )
        row = cur.fetchone()

    if row and row.get("summary"):
      return self.clean_summary(row["summary"])

    return None

  def get_abstract_text(self, link: str):
    with self._get_db_connection() as conn:
      with conn.cursor() as cur:
        cur.execute(
          """
          SELECT abstract_text
          FROM theses
          WHERE link = %s
          LIMIT 1
          """,
          (link,),
        )
        row = cur.fetchone()

    if row and row.get("abstract_text"):
      return str(row["abstract_text"]).strip()

    return None

  def save_summary(self, link: str, summary_text: str):
    with self._get_db_connection() as conn:
      with conn.cursor() as cur:
        cur.execute(
          """
          INSERT INTO summaries (link, summary)
          VALUES (%s, %s)
          ON CONFLICT (link)
          DO UPDATE SET summary = EXCLUDED.summary
          """,
          (link, summary_text),
        )
      conn.commit()

  def summarize(self, thesis_key: str):
    try:
      page_url = self._build_handle_page_url(thesis_key)

      existing_summary = self.get_existing_summary(page_url)

      if existing_summary:
        return {
          "summary": existing_summary,
          "Abstract": None,
          "page_url": page_url,
          "source": "database_summary",
        }

      abstract_text = self.get_abstract_text(page_url)

      if not abstract_text:
        return {
          "error": "No abstract found",
          "message": "Could not find abstract_text from database.",
          "page_url": page_url,
        }

      summary = generate_thesis_points(abstract_text)
      summary_text = self.clean_summary(summary)

      if not summary_text:
        return {
          "error": "Summary generation failed",
          "message": "Generated summary was empty.",
          "page_url": page_url,
        }

      self.save_summary(page_url, summary_text)

      return {
        "summary": summary_text,
        "Abstract": abstract_text,
        "page_url": page_url,
        "source": "generated_from_database_abstract",
      }

    except Exception as e:
      return {
        "error": str(e),
        "message": "An error occurred while reading thesis data from database.",
      }