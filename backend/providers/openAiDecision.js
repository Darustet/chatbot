import dotenv from "dotenv";
import OpenAI from "openai";
import { PDFParse } from "pdf-parse";

dotenv.config();

if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    "OPENAI_API_KEY is missing. Make sure the .env file is loaded correctly."
  );
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const HELDA_BASE_URL = "https://helda.helsinki.fi";
const MIN_PDF_TEXT_CHARS = 12000;
const MAX_PDFS_TO_READ = 3;

async function fetchJson(url) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/json",
    },
  });

  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return res.json();
}

async function fetchText(url) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "text/html,application/xhtml+xml,application/json,*/*",
    },
  });

  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return JSON.stringify(await res.json());

  return res.text();
}

async function fetchPdfText(url) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/pdf,*/*",
    },
  });

  if (!res.ok) throw new Error(`Failed to fetch PDF ${url}: ${res.status}`);

  const contentType = res.headers.get("content-type") || "";
  const buffer = Buffer.from(await res.arrayBuffer());

  if (!buffer.length) {
    throw new Error(`PDF response was empty: ${url}`);
  }

  if (!contentType.toLowerCase().includes("pdf")) {
    const signature = buffer.subarray(0, 5).toString("utf8");
    if (signature !== "%PDF-") {
      throw new Error(
        `Response did not look like a PDF. Content-Type: ${contentType || "unknown"}`
      );
    }
  }

  const parser = new PDFParse({ data: buffer });

  try {
    const result = await parser.getText();
    return result?.text || "";
  } finally {
    await parser.destroy();
  }
}

function stripHtml(html) {
  return String(html || "")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<\/(p|div|section|article|h1|h2|h3|h4|h5|h6|li|br)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function normalizeText(text) {
  return String(text || "")
    .replace(/\r/g, "")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function extractSectionByHeading(html, headingRegex) {
  const plain = stripHtml(html);
  const match = plain.match(headingRegex);
  if (!match || match.index == null) return "";

  const rest = plain.slice(match.index + match[0].length);

  const endMatch = rest.match(
    /\n\s*(keywords?|avainsanat|introduction|1\.?\s+[A-ZÅÄÖa-zåäö]|contents|table of contents|references|bibliography|author|title)\b/i
  );

  return normalizeText(endMatch ? rest.slice(0, endMatch.index) : rest.slice(0, 2500)).slice(0, 3000);
}

function extractAbstractText(html) {
  const metaPatterns = [
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"]+)["'][^>]*>/i,
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"]+)["'][^>]*>/i,
    /<meta[^>]+name=["']citation_abstract["'][^>]+content=["']([^"]+)["'][^>]*>/i,
  ];

  for (const regex of metaPatterns) {
    const match = html.match(regex);
    if (match?.[1]?.trim()) return normalizeText(match[1]);
  }

  for (const pattern of [/\babstract\b[\s:]*\n?/i, /\btiivistelmä\b[\s:]*\n?/i, /\bsummary\b[\s:]*\n?/i]) {
    const extracted = extractSectionByHeading(html, pattern);
    if (extracted && extracted.length > 120) return extracted;
  }

  return "";
}

function extractPageText(html) {
  return stripHtml(html).slice(0, 12000);
}

function extractPdfLinks(html, baseUrl) {
  const pdfLinks = new Set();
  const anchorRegex = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let match;

  while ((match = anchorRegex.exec(String(html || ""))) !== null) {
    const fullTag = match[0];
    const rawHref = match[1];

    try {
      const absoluteUrl = new URL(rawHref, baseUrl).href;

      const looksPdf =
        /\.pdf(\?|#|$)/i.test(rawHref) ||
        /application\/pdf/i.test(fullTag) ||
        /download/i.test(fullTag) ||
        /bitstreams\//i.test(rawHref) ||
        /\/content$/i.test(rawHref);

      if (looksPdf) pdfLinks.add(absoluteUrl);
    } catch {}
  }

  return [...pdfLinks];
}

function isHeldaUrl(url) {
  try {
    return new URL(url).hostname.toLowerCase().includes("helda.helsinki.fi");
  } catch {
    return false;
  }
}

function extractHeldaHandleId(urlOrHandle) {
  const raw = String(urlOrHandle || "").trim();
  if (!raw) throw new Error("Missing Helda handle.");

  if (/^\d+\/\d+$/.test(raw)) return raw;

  const url = new URL(raw);
  const match = url.pathname.match(/^\/handle\/(.+)$/i);

  if (!match?.[1]) {
    throw new Error(`Could not extract Helda handle from: ${urlOrHandle}`);
  }

  return match[1];
}

async function getHeldaAbstractByUrl(thesisUrl) {
  const handleId = extractHeldaHandleId(thesisUrl);
  const pidUrl = `${HELDA_BASE_URL}/server/api/pid/find?id=${encodeURIComponent(handleId)}`;
  const pidData = await fetchJson(pidUrl);

  const uuid =
    pidData?.uuid ||
    pidData?._links?.item?.href?.replace(/\/$/, "").split("/").pop() ||
    pidData?._links?.self?.href?.replace(/\/$/, "").split("/").pop();

  if (!uuid) throw new Error(`Could not resolve UUID from Helda handle: ${handleId}`);

  const itemData = await fetchJson(`${HELDA_BASE_URL}/server/api/core/items/${uuid}`);
  const abstracts = itemData?.metadata?.["dc.description.abstract"] ?? [];

  return (
    abstracts.find((x) => x.language === "en")?.value?.trim() ||
    abstracts.find((x) => x.language === "fi")?.value?.trim() ||
    abstracts.find((x) => x.language === "sv")?.value?.trim() ||
    abstracts.find((x) => x.value?.trim())?.value?.trim() ||
    ""
  );
}

function cleanEvidence(text) {
  return String(text || "Could not classify reliably.")
    .replace(/^yes[:,]?\s*/i, "")
    .replace(/^no[:,]?\s*/i, "")
    .replace(/^unknown[:,]?\s*/i, "")
    .replace(/^this thesis\s+/i, "")
    .trim();
}

function parseClassification(raw, allowUnknown = false) {
  try {
    const parsed = JSON.parse(raw);
    const normalized = String(parsed?.decision || "").trim().toLowerCase();

    return {
      decision:
        normalized === "yes"
          ? "yes"
          : normalized === "no"
          ? "no"
          : allowUnknown
          ? "unknown"
          : "no",
      evidence: cleanEvidence(parsed?.evidence),
    };
  } catch (err) {
    return {
      decision: allowUnknown ? "unknown" : "no",
      evidence: "Could not classify reliably.",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function classify({ thesisUrl, abstractText = "", pageText = "", pdfText = "", allowUnknown = false }) {
  try {
    const response = await client.responses.create({
      model: "gpt-5.4",
      input: [
        {
          role: "system",
          content: `
You are a strict classifier.

Decide whether the thesis was done for Nokia company.

Return "yes" only with clear evidence:
- commissioned by Nokia
- done in collaboration with Nokia
- internship or employment at Nokia
- built for Nokia internal use
- conducted in Nokia's lab, team, or environment
- Nokia Solutions and Networks
- Nokia Bell Labs
- Nokia Networks
- Nokia R&D

Return "no" when:
- Nokia is only mentioned
- Nokia is only a case study or example
- Nokia is one of several companies discussed
- Nokia refers to the city
- evidence is too weak

Return "unknown" only if more evidence should be checked.

Return JSON only:
{
  "decision": "yes" or "no"${allowUnknown ? ' or "unknown"' : ""},
  "evidence": "one short sentence"
}
          `.trim(),
        },
        {
          role: "user",
          content: `
Thesis URL:
${thesisUrl}

Abstract text:
${String(abstractText).slice(0, 6000)}

Thesis page text:
${String(pageText).slice(0, 9000)}

PDF text:
${String(pdfText).slice(0, 12000)}
          `.trim(),
        },
      ],
    });

    return parseClassification(response.output_text?.trim() || "", allowUnknown);
  } catch (err) {
    return {
      decision: allowUnknown ? "unknown" : "no",
      evidence: "Could not classify reliably.",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function analyzeThesisLink(thesisUrl) {
  const result = {
    thesisUrl,
    decision: "no",
    isNokiaProject: false,
    evidence: "",
    decisionSource: "",
    abstractText: "",
    pdfLinksChecked: [],
    errors: [],
  };

  let html = "";
  let pageText = "";
  let abstractText = "";
  let pdfText = "";

  if (!thesisUrl) {
    result.evidence = "Missing thesis URL.";
    result.decisionSource = "missing_url";
    return result;
  }

  if (isHeldaUrl(thesisUrl)) {
    try {
      abstractText = await getHeldaAbstractByUrl(thesisUrl);
      result.abstractText = abstractText;
    } catch (err) {
      result.errors.push(`Helda API abstract fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  if (abstractText) {
    const abstractDecision = await classify({
      thesisUrl,
      abstractText,
      allowUnknown: true,
    });

    if (abstractDecision.error) result.errors.push(`Abstract classification failed: ${abstractDecision.error}`);

    if (abstractDecision.decision !== "unknown") {
      result.decision = abstractDecision.decision;
      result.isNokiaProject = abstractDecision.decision === "yes";
      result.evidence = abstractDecision.evidence;
      result.decisionSource = "abstract";
      return result;
    }
  }

  try {
    html = await fetchText(thesisUrl);
    pageText = extractPageText(html);

    if (!abstractText) {
      abstractText = extractAbstractText(html);
      result.abstractText = abstractText;
    }
  } catch (err) {
    result.errors.push(`Page fetch failed: ${err instanceof Error ? err.message : String(err)}`);
    result.evidence = "Page could not be fetched.";
    result.decisionSource = "page_fetch_failed";
    return result;
  }

  const pageDecision = await classify({
    thesisUrl,
    abstractText,
    pageText,
    allowUnknown: true,
  });

  if (pageDecision.error) result.errors.push(`Page classification failed: ${pageDecision.error}`);

  const isWeakNo =
  pageDecision.decision === "no" &&
  /no clear|insufficient|not specified|unclear|only mentioned/i.test(
    pageDecision.evidence || ""
  );

if (pageDecision.decision === "yes") {
  result.decision = "yes";
  result.isNokiaProject = true;
  result.evidence = pageDecision.evidence;
  result.decisionSource = abstractText ? "abstract_or_page" : "page";
  return result;
}

if (pageDecision.decision === "no" && !isWeakNo) {
  result.decision = "no";
  result.isNokiaProject = false;
  result.evidence = pageDecision.evidence;
  result.decisionSource = abstractText ? "abstract_or_page" : "page";
  return result;
}

  const pdfLinks = extractPdfLinks(html, thesisUrl);
  result.pdfLinksChecked = pdfLinks;

  let readCount = 0;

  for (const pdfUrl of pdfLinks) {
    if (readCount >= MAX_PDFS_TO_READ || pdfText.length >= MIN_PDF_TEXT_CHARS) break;

    try {
      const text = await fetchPdfText(pdfUrl);
      if (text.trim()) {
        readCount += 1;
        pdfText += `\n\n--- PDF: ${pdfUrl} ---\n${text}`;
      }
    } catch (err) {
      result.errors.push(`PDF read failed (${pdfUrl}): ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const finalDecision = await classify({
    thesisUrl,
    abstractText,
    pageText,
    pdfText,
    allowUnknown: false,
  });

  if (finalDecision.error) result.errors.push(`Final classification failed: ${finalDecision.error}`);

  result.decision = finalDecision.decision;
  result.isNokiaProject = finalDecision.decision === "yes";
  result.evidence = finalDecision.evidence;
  result.decisionSource = pdfText ? "pdf" : "abstract_or_page";

  return result;
}