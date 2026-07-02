import os
import re
from google import genai
from dotenv import load_dotenv

load_dotenv()

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))


def capitalize_first(text):
  text = str(text or "").strip()
  return text[:1].upper() + text[1:] if text else text


def clean_generated_summary(text):
  text = str(text or "").strip()

  lines = []

  for line in text.splitlines():
    line = line.strip()
    line = re.sub(r"^[-*•\d.)\s]+", "", line).strip()

    if line:
      lines.append(line)

  return "\n".join(lines)


def manual_summarize(text, num_points=3):
  sentences = [
    sentence.strip()
    for sentence in re.split(r"(?<=[.!?])\s+", str(text or ""))
    if sentence.strip()
  ]

  valid_sentences = [
    sentence
    for sentence in sentences
    if len(sentence) > 30
       and not re.match(
      r"^(author|title|degree|supervisor|instructor|pages|date)",
      sentence.lower(),
    )
  ]

  if not valid_sentences:
    return "No meaningful abstract content found to summarize."

  if len(valid_sentences) >= num_points:
    points = [
      valid_sentences[0],
      valid_sentences[len(valid_sentences) // 2],
      valid_sentences[-1],
    ]
  else:
    points = valid_sentences[:num_points]

  return "\n".join([capitalize_first(point) for point in points])


def generate_thesis_points(abstract_text):
  try:
    abstract_text = str(abstract_text or "").strip()

    if len(abstract_text) < 60:
      return (
        "No meaningful abstract content found to summarize.\n"
        "The PDF might not contain an abstract section.\n"
        "Try a different thesis."
      )

    if not os.getenv("GEMINI_API_KEY"):
      print("GEMINI_API_KEY missing, using manual summary")
      return manual_summarize(abstract_text)

    prompt = f"""
      Summarize the following thesis abstract.

      Rules:
      - Use the same language as the abstract.
      - Generate the summary using only information in the abstract.
      - Return 2–4 concise sentences.
      - Each sentence must be on a separate line.
      - Return only the sentences and nothing else.
      - Do not add or infer information that is not present in the abstract.
      - Do not add any introduction, conclusion, explanation, headings, labels, Markdown, bullet points, numbering, or other formatting.

      Abstract:
      {abstract_text}
      """.strip()

    response = client.models.generate_content(
      model="gemini-2.5-flash",
      contents=prompt,
    )

    summary = clean_generated_summary(response.text)

    if not summary:
      return manual_summarize(abstract_text)

    return summary

  except Exception as e:
    print(f"Error in Gemini summarization: {e}")
    return manual_summarize(abstract_text)