import dotenv from "dotenv";
import OpenAI from "openai";
import * as pdf from "pdf-parse";

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
    },
  });

  if (!res.ok) {
    throw new Error(
      `Failed to fetch PDF ${url}: ${res.status} ${res.statusText}`
    );
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const data = await pdf(buffer);

  return data.text || "";
}

function extractPdfLinks(html, baseUrl) {
  const hrefRegex = /href\s*=\s*["']([^"']+)["']/gi;
  const pdfLinks = new Set();
  let match;

  while ((match = hrefRegex.exec(html)) !== null) {
    const rawHref = match[1];

    try {
      const absoluteUrl = new URL(rawHref, baseUrl).href;
      if (absoluteUrl.toLowerCase().includes(".pdf")) {
        pdfLinks.add(absoluteUrl);
      }
    } catch {
      // ignore invalid URLs
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
    .replace(/^this thesis\s+/i, "")
    .trim();
}

async function explainWithOpenAI({ thesisUrl, pageText, pdfText }) {
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
- System-on-Chip (SoC)

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

Thesis page content:
${pageText.slice(0, 12000)}

Linked PDF content:
${pdfText.slice(0, 12000)}
          `.trim(),
        },
      ],
    });

    const text = response.output_text?.trim();
    if (!text) {
      return {
        decision: "no",
        isNokiaProject: false,
        evidence: "Could not classify reliably.",
      };
    }

    const parsed = JSON.parse(text);

    const decision = parsed?.decision === "yes" ? "yes" : "no";
    const evidence = cleanEvidence(parsed?.evidence);

    return {
      decision,
      isNokiaProject: decision === "yes",
      evidence,
    };
  } catch (err) {
    return {
      decision: "no",
      isNokiaProject: false,
      evidence: "Could not classify reliably.",
      error: err.message,
    };
  }
}


export async function analyzeThesisLink(thesisUrl) {
  const result = {
    thesisUrl,
    decision: "no",
    isNokiaProject: false,
    evidence: "",
    pdfLinksChecked: [],
    errors: [],
  };

  let html = "";
  let pdfCombinedText = "";

  try {
    html = await fetchText(thesisUrl);
  } catch (err) {
    result.errors.push(`Page fetch failed: ${err.message}`);
    result.evidence = "Thesis page could not be fetched.";
    return result;
  }

  const pdfLinks = extractPdfLinks(html, thesisUrl);
  result.pdfLinksChecked = pdfLinks;

  for (const pdfUrl of pdfLinks) {
    try {
      const pdfText = await fetchPdfText(pdfUrl);
      pdfCombinedText += `\n\n--- PDF: ${pdfUrl} ---\n${pdfText}`;
    } catch (err) {
      result.errors.push(`PDF read failed (${pdfUrl}): ${err.message}`);
    }
  }

  const aiDecision = await explainWithOpenAI({
    thesisUrl,
    pageText: html,
    pdfText: pdfCombinedText,
  });

  result.decision = aiDecision.decision;
  result.isNokiaProject = aiDecision.isNokiaProject;
  result.evidence = aiDecision.evidence;

  if (aiDecision.error) {
    result.errors.push(`OpenAI classification failed: ${aiDecision.error}`);
  }

  return result;
}
