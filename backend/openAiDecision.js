import dotenv from "dotenv";
import OpenAI from "openai";

dotenv.config();

if (!process.env.OPENAI_API_KEY) {
  throw new Error("OPENAI_API_KEY is missing. Check your .env file.");
}

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function cleanEvidence(text) {
  return String(text || "Could not classify reliably.")
    .replace(/^(yes|no|unknown)[:,]?\s*/i, "")
    .replace(/^this thesis\s+/i, "")
    .trim();
}

function parseClassification(raw) {
  try {
    const parsed = JSON.parse(raw);
    const decision = String(parsed.decision || "").toLowerCase().trim();

    return {
      decision: decision === "yes" ? "yes" : "no",
      evidence: cleanEvidence(parsed.evidence),
    };
  } catch (err) {
    return {
      decision: "no",
      evidence: "Could not classify reliably.",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

async function classify(abstractText = "") {
  try {
    const response = await client.responses.create({
      model: "gpt-5.4",
      input: [
        {
          role: "system",
          content: `
You are a strict classifier.

Decide whether the thesis was done for Nokia company.
The evidence MUST always be in English, regardless of the input language.

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

          `.trim(),
        },
        {
          role: "user",
          content: `Abstract text:\n${String(abstractText).slice(0, 6000)}`,
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "nokia_thesis_classification",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              decision: {
                type: "string",
                enum: ["yes", "no"],
              },
              evidence: {
                type: "string",
                "description": "One short sentence in English.",
              },
            },
            required: ["decision", "evidence"],
          },
        },
      },
    });

    return parseClassification(response.output_text || "");
  } catch (err) {
    return {
      decision: "no",
      evidence: "Could not classify reliably.",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function analyzeDecisionSource(thesisUrl = "", title = "", abstractText = "") {

  const result = {
    decision: "no",
    isNokiaProject: false,
    evidence: "",
    decisionSource: "",
    abstractText,
    errors: [],
  };

  try {
    // Analyze title first
    if (String(title).trim()) {
      const titleResult = await classify(title);

      // If title gives YES, return immediately
      if (!titleResult.error && titleResult.decision === "yes") {
        result.decision = "yes";
        result.isNokiaProject = true;
        result.evidence = titleResult.evidence;
        result.decisionSource = "title";
        return result;
      }
    }

    // Otherwise analyze abstract
    if (!String(abstractText).trim()) {
      result.decision = "unknown";
      result.evidence = "Abstract text is missing.";
      result.decisionSource = "missing_abstract";
      return result;
    }

    const abstractResult = await classify(abstractText);

  if (classification.error) {
    result.errors.push(`Abstract classification failed: ${classification.error}`);
  }

    result.decision = abstractResult.decision;
    result.isNokiaProject = abstractResult.decision === "yes";
    result.evidence = abstractResult.evidence;
    result.decisionSource = "abstract";

    return result;
  } catch (err) {
    result.errors.push(
      `Unexpected error: ${
        err instanceof Error ? err.message : String(err)
      }`
    );

    return result;
  }
}