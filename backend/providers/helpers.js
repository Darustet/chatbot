import axios from "axios";
import * as cheerio from "cheerio";

const THESIS_BASE_URL_BY_UNI = {
  AALTO: "https://aaltodoc.aalto.fi",
  HELDA: "https://helda.helsinki.fi",
  TREPO: "https://trepo.tuni.fi",
  OULUREPO: "https://oulurepo.oulu.fi",
  LUTPUB: "https://lup.lut.fi",
};

const THESEUS_BASE_URL = "https://www.theseus.fi";

/**
 * Normalize university code to encoded format.
 * Handles both already-encoded and decoded inputs by decoding first, then encoding.
 * This ensures idempotent behavior: normalizeUniCode(code) === normalizeUniCode(normalizeUniCode(code))
 * 
 * Examples:
 * - normalizeUniCode('10024/6') → '10024%2F6'
 * - normalizeUniCode('10024%2F6') → '10024%2F6'
 * - normalizeUniCode('AALTO') → 'AALTO'
 * 
 * @param {string} uniCode - University code (encoded or decoded)
 * @returns {string} Encoded university code
 */
export const normalizeUniCode = (uniCode) => {
  try {
    return encodeURIComponent(decodeURIComponent(String(uniCode || "")));
  } catch {
    return encodeURIComponent(String(uniCode || ""));
  }
};

// Provider-level shared helper utilities.
export const toAbstractByLanguage = (abstracts) => {
  if (!Array.isArray(abstracts)) return {};

  const byLanguage = {};
  for (const abs of abstracts) {
    const lang = String(abs.language || "unknown").toLowerCase();
    const text = String(abs.value || "").trim();
    if (text) {
      byLanguage[lang] = text;
    }
  }
  return byLanguage;
};

export const detectAbstractLanguage = (text) => {
  if (!text) return "unknown";

  const lower = text.toLowerCase();

  if (
    /[äöå]/i.test(text) ||
    /\b(tutkielma|tarkoitus|käyttäjäkokemus|selvittää|suosituksia|opinnäytetyö|yhteistyö)\b/i.test(lower)
  ) {
    return "fi";
  }

  if (/\b(the|this thesis|abstract|study|purpose|research|conclusion)\b/i.test(lower)) {
    return "en";
  }

  return "unknown";
};

export const runWithConcurrency = async (tasks, limit) => {
  const safeLimit = Math.max(1, Number(limit) || 1);
  const results = [];
  for (let i = 0; i < tasks.length; i += safeLimit) {
    const batch = tasks.slice(i, i + safeLimit);
    const batchResults = await Promise.all(
      batch.map((task) => (typeof task === "function" ? task() : task))
    );
    results.push(...batchResults);
  }
  return results;
};

// Deduplicate by title and author
export const deduplicate = (theses) => {
  const seen = new Map();
  for (const thesis of theses || []) {
    if (!thesis?.thesis) continue;

    const title = String(thesis.thesis.title || "").toLowerCase();
    const author = String(thesis.thesis.author || "").toLowerCase();
    const key = `${title}|${author}`;

    if (!seen.has(key)) {
      seen.set(key, thesis);
    }
  }
  return Array.from(seen.values());
};

/**
 * Fetch detail page and extract full abstracts.
 * Primary source: DCTERMS.abstract meta tags
 * Fallback for OuluRepo: visible HTML abstract block
 */
export const fetchDetailPageAbstracts = async (handle, BASE_URL) => {
  if (!handle) return {};

  try {
    const detailUrl = /^https?:\/\//i.test(handle)
      ? handle
      : new URL(handle, BASE_URL).href;

    const response = await axios.get(detailUrl, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
      },
      timeout: 10000,
    });

    const $d = cheerio.load(response.data);
    const abstracts = [];

    if (BASE_URL === "https://oulurepo.oulu.fi/") {
      const abstractContainer = $d(".simple-item-view-description > div").first();

      if (abstractContainer.length) {
        const abstractText = abstractContainer
          .text()
          .replace(/\s+/g, " ")
          .trim();

        if (abstractText) {
          abstracts.push({
            language: detectAbstractLanguage(abstractText),
            value: abstractText,
          });
        }
      }
    } else {
      const abstractMetas = $d('meta[name="DCTERMS.abstract"]').toArray();

      abstractMetas.forEach((meta) => {
        const abstractText = ($d(meta).attr("content") || "").trim();
        if (!abstractText) return;

        let detectedLang = $d(meta).attr("xml:lang");
        if (!detectedLang || detectedLang === "-") {
          detectedLang = detectAbstractLanguage(abstractText);
        }

        abstracts.push({
          language: detectedLang,
          value: abstractText,
        });
      });
    }

    return toAbstractByLanguage(abstracts);
  } catch (error) {
    console.warn(`Failed to fetch detail page for ${handle}:`, error.message);
    return {};
  }
};

export const resolveThesisLink = (handle, universityCode) => {
  const safeHandle = String(handle || "").trim();
  if (!safeHandle) return "";

  if (/^https?:\/\//i.test(safeHandle)) {
    return safeHandle;
  }

  const baseUrl = THESIS_BASE_URL_BY_UNI[universityCode] || THESEUS_BASE_URL;

  try {
    return new URL(safeHandle, `${baseUrl}/`).href;
  } catch {
    return "";
  }
};

