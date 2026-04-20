import dotenv from "dotenv";
import OpenAI from "openai";
import { PDFParse } from "pdf-parse";

dotenv.config();

if (!process.env.OPENAI_API_KEY) {
  throw new Error(
    "OPENAI_API_KEY is missing. Make sure the .env file is loaded correctly."
  );
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function fetchText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "text/html,application/xhtml+xml",
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch ${url}: ${res.status} ${res.statusText}`);
  }

  return await res.text();
}

async function fetchPdfText(url) {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0",
      Accept: "application/pdf,*/*",
    },
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch PDF ${url}: ${res.status} ${res.statusText}`
    );
  }

  const contentType = res.headers.get("content-type") || "";
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

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
  return html
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
  if (!match || match.index == null) {
    return "";
  }

  const start = match.index + match[0].length;
  const rest = plain.slice(start);

  const endMatch = rest.match(
    /\n\s*(keywords?|avainsanat|introduction|1\.?\s+[A-ZÅÄÖa-zåäö]|contents|table of contents|references|bibliography|author|title)\b/i
  );

  const section = endMatch
    ? rest.slice(0, endMatch.index)
    : rest.slice(0, 2500);

  return normalizeText(section).slice(0, 3000);
}

function extractAbstractText(html) {
  const metaMatches = [
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"]+)["'][^>]*>/i,
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"]+)["'][^>]*>/i,
    /<meta[^>]+name=["']citation_abstract["'][^>]+content=["']([^"]+)["'][^>]*>/i,
  ];

  for (const regex of metaMatches) {
    const match = html.match(regex);
    if (match?.[1]?.trim()) {
      return normalizeText(match[1]);
    }
  }

  const headingPatterns = [
    /\babstract\b[\s:]*\n?/i,
    /\btiivistelmä\b[\s:]*\n?/i,
    /\bsummary\b[\s:]*\n?/i,
  ];

  for (const pattern of headingPatterns) {
    const extracted = extractSectionByHeading(html, pattern);
    if (extracted && extracted.length > 120) {
      return extracted;
    }
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

  while ((match = anchorRegex.exec(html)) !== null) {
    const fullTag = match[0];
    const rawHref = match[1];

    try {
      const absoluteUrl = new URL(rawHref, baseUrl).href;
      const tagLooksPdf =
        /\.pdf(\?|#|$)/i.test(rawHref) ||
        /application\/pdf/i.test(fullTag) ||
        /download/i.test(fullTag) ||
        /bitstreams\//i.test(rawHref);

      if (tagLooksPdf) {
        pdfLinks.add(absoluteUrl);
      }
    } catch {
      // Ignore invalid URLs
    }
  }

  return [...pdfLinks];
}

function cleanEvidence(text) {
  if (!text || typeof text !== "string") {
    return "Could not classify reliably.";
  }

  return text
    .replace(/^yes[:,]?\s*/i, "")
    .replace(/^no[:,]?\s*/i, "")
    .replace(/^unknown[:,]?\s*/i, "")
    .replace(/^this thesis\s+/i, "")
    .trim();
}

function safeParseClassification(raw, allowUnknown) {
  try {
    const parsed = JSON.parse(raw);

    const normalizedDecision = String(parsed?.decision || "")
      .trim()
      .toLowerCase();

    const decision =
      normalizedDecision === "yes"
        ? "yes"
        : normalizedDecision === "no"
        ? "no"
        : allowUnknown
        ? "unknown"
        : "no";

    return {
      decision,
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

async function triageFromAbstractOrPage({
  thesisUrl,
  abstractText,
  pageText,
}) {
  try {
    const response = await client.responses.create({
      model: "gpt-5.4",
      input: [
        {
          role: "system",
          content: `
You are a strict classifier.

Task:
First inspect the abstract text. If abstract is missing or insufficient, inspect the thesis page text.

Decide whether the thesis was done for Nokia company.

Return:
- "yes" if there is clear evidence it was done for Nokia company
- "no" if there is clear evidence it was not done for Nokia company
- "unknown" if the abstract/page text is insufficient and PDF should be checked next

Count as Nokia company work when evidence shows for example:
- commissioned by Nokia
- done in collaboration with Nokia
- internship or employment at Nokia
- built for Nokia internal use
- conducted in Nokia's lab, team, or environment as actual partner organization
- Nokia Solutions and Networks
- Nokia Bell Labs
- Nokia Networks
- Nokia R&D

Return "no" when:
- Nokia is only mentioned
- Nokia is only a case study or example
- Nokia is one of several companies discussed
- Nokia refers to the city, not the company

Return JSON only in exactly this format:
{
  "decision": "yes" or "no" or "unknown",
  "evidence": "one short sentence"
}
          `.trim(),
        },
        {
          role: "user",
          content: `
Thesis URL: ${thesisUrl}

Abstract text:
${abstractText.slice(0, 6000)}

Thesis page text:
${pageText.slice(0, 9000)}
          `.trim(),
        },
      ],
    });

    const text = response.output_text ? response.output_text.trim() : "";
    if (!text) {
      return {
        decision: "unknown",
        evidence: "Could not classify reliably from abstract or page text.",
      };
    }

    return safeParseClassification(text, true);
  } catch (err) {
    return {
      decision: "unknown",
      evidence: "Could not classify reliably from abstract or page text.",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function explainWithOpenAI({
  thesisUrl,
  abstractText,
  pageText,
  pdfText,
}) {
  try {
    const response = await client.responses.create({
      model: "gpt-5.4",
      input: [
        {
          role: "system",
          content: `
You are a strict classifier.

Task:
Decide whether a thesis was done for Nokia company.

Use the abstract/page text first, and use PDF text as additional evidence only because earlier evidence was insufficient.

Return "yes" only when the work was actually done for Nokia company, for example:
- commissioned by Nokia
- done in collaboration with Nokia
- internship or employment at Nokia
- built for Nokia internal use
- conducted in Nokia's lab, team, or environment as the actual partner organization
- Nokia Solutions and Networks
- Nokia Bell Labs
- Nokia Networks
- Nokia R&D

Return "no" when:
- Nokia is only mentioned
- Nokia is only a case study or example
- Nokia is one of several companies discussed
- Nokia refers to the city, not the company
- the evidence is too weak to conclude it was done for Nokia company

Return JSON only in exactly this format:
{
  "decision": "yes" or "no",
  "evidence": "one short sentence"
}
          `.trim(),
        },
        {
          role: "user",
          content: `
Thesis URL: ${thesisUrl}

Abstract text:
${abstractText.slice(0, 6000)}

Thesis page text:
${pageText.slice(0, 9000)}

Linked PDF content:
${pdfText.slice(0, 12000)}
          `.trim(),
        },
      ],
    });

    const text = response.output_text ? response.output_text.trim() : "";
    if (!text) {
      return {
        decision: "no",
        isNokiaProject: false,
        evidence: "Could not classify reliably.",
        decisionSource: pdfText.trim() ? "pdf" : "abstract/page",
      };
    }

    const parsed = safeParseClassification(text, false);
    const decision = parsed.decision === "yes" ? "yes" : "no";

    return {
      decision,
      isNokiaProject: decision === "yes",
      evidence: parsed.evidence,
      decisionSource: pdfText.trim() ? "pdf" : "abstract/page",
      error: parsed.error,
    };
  } catch (err) {
    return {
      decision: "no",
      isNokiaProject: false,
      evidence: "Could not classify reliably.",
      decisionSource: "unknown",
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
  let pdfCombinedText = "";

  try {
    html = await fetchText(thesisUrl);
  } catch (err) {
    result.errors.push(
      `Page fetch failed: ${err instanceof Error ? err.message : String(err)}`
    );
    result.evidence = "Thesis page could not be fetched.";
    result.decisionSource = "page_fetch_failed";
    return result;
  }

  abstractText = extractAbstractText(html);
  pageText = extractPageText(html);
  result.abstractText = abstractText;

  const triage = await triageFromAbstractOrPage({
    thesisUrl,
    abstractText,
    pageText,
  });

  if (triage.error) {
    result.errors.push(`Abstract/page classification failed: ${triage.error}`);
  }

  if (triage.decision === "yes" || triage.decision === "no") {
    result.decision = triage.decision;
    result.isNokiaProject = triage.decision === "yes";
    result.evidence = triage.evidence;
    result.decisionSource = abstractText ? "abstract" : "page";
    return result;
  }

  const pdfLinks = extractPdfLinks(html, thesisUrl);
  result.pdfLinksChecked = pdfLinks;

  for (const pdfUrl of pdfLinks) {
    try {
      const pdfText = await fetchPdfText(pdfUrl);
      if (pdfText.trim()) {
        pdfCombinedText += `\n\n--- PDF: ${pdfUrl} ---\n${pdfText}`;
      }
    } catch (err) {
      result.errors.push(
        `PDF read failed (${pdfUrl}): ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  }

  const aiDecision = await explainWithOpenAI({
    thesisUrl,
    abstractText,
    pageText,
    pdfText: pdfCombinedText,
  });

  result.decision = aiDecision.decision;
  result.isNokiaProject = aiDecision.isNokiaProject;
  result.evidence = aiDecision.evidence;
  result.decisionSource = aiDecision.decisionSource;

  if (aiDecision.error) {
    result.errors.push(`OpenAI classification failed: ${aiDecision.error}`);
  }

  return result;
}
