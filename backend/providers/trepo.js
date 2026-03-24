import * as cheerio from "cheerio";
import { normalizeThesis } from "./types.js";
import {toAbstractByLanguage } from "./aalto.js";

const TREPO_BASE = "https://trepo.tuni.fi/";
const TREPO_BACHELOR_SCOPE = "10024/105881";
const TREPO_MASTER_SCOPE = "10024/105882";

export const TrepoProvider = {
  // Build both TREPO search URLs
  buildUrls({ query, rpp }) {
    const encodedQuery = encodeURIComponent(query);

    const bachelorUrl = `${TREPO_BASE}discover?scope=${TREPO_BACHELOR_SCOPE}&query=${encodedQuery}&rpp=${rpp}`;
    const masterUrl = `${TREPO_BASE}discover?scope=${TREPO_MASTER_SCOPE}&query=${encodedQuery}&rpp=${rpp}`;

    return [bachelorUrl, masterUrl];
  },

  // Parse one TREPO HTML response
  parse(response) {
    const $ = cheerio.load(response.data);
    const elements = $(".artifact-description").toArray();

    return { elements, $ };
  },

  // Normalize one parsed TREPO response
  normalize({ elements, $ } = {}, { uniCode, uniCodes }) {
    if (!Array.isArray(elements) || typeof $ !== "function") {
      console.warn("TREPO normalize got invalid input:", { elementsType: typeof elements, hasDollar: typeof $ });
      return [];
    }

    return elements.map((element) => {
      const el = $(element);

      // Title
      const title =
        el.find("h4 a").first().text().trim() ||
        el.find("h4").first().text().trim() ||
        "No Title";

      // Handle
      let handle = el.find("h4 a, a").first().attr("href") || "";
      if (handle && handle.startsWith("/")) {
        handle = handle;
      }

      // Whole text fallback source
      const fullText = el.text().replace(/\s+/g, " ").trim();

      // Author
      let author = "";
      const authorElem = el.find(
        '.author, span:contains("Author"), span:contains("Tekijä")'
      );

      if (authorElem.length) {
        author = authorElem
          .first()
          .text()
          .replace(/^(Author|Tekijä):?\s*/i, "")
          .trim();
      }

      if (!author) {
        const authorMatch = fullText.match(/(?:Author|Tekijä):\s*([^|;]+)/i);
        if (authorMatch?.[1]) {
          author = authorMatch[1].trim();
        }
      }

      // Publisher
      let publisher = "";
      const publisherElem = el.find(
        '.publisher, span:contains("Publisher"), span:contains("Julkaisija")'
      );

      if (publisherElem.length) {
        publisher = publisherElem
          .first()
          .text()
          .replace(/^(Publisher|Julkaisija):?\s*/i, "")
          .trim();
      }

      if (!publisher) {
        const publisherMatch = fullText.match(/(?:Publisher|Julkaisija):\s*([^|;]+)/i);
        if (publisherMatch?.[1]) {
          publisher = publisherMatch[1].trim();
        }
      }

      if (!publisher) {
        const uniMatch = uniCodes.find((u) => u.code === uniCode);
        if (uniMatch) {
          publisher = uniMatch.uni;
        } else {
          publisher = "Tampere university";
        }
      }

      // Year
      let year = "";
      const yearElem = el.find(
        '.date, span:contains("Date"), span:contains("Päivämäärä")'
      );

      //Abstract
      let abstracts = "";
        const abstractElem = el.find(".abstract");
        if (abstractElem.length) {
            abstracts = abstractElem.first().text().trim();
        }

      if (yearElem.length) {
        year = yearElem
          .first()
          .text()
          .replace(/^(Date|Päivämäärä):?\s*/i, "")
          .trim();
      }

      if (!year) {
        const yearMatch = fullText.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) {
          year = yearMatch[0];
        }
      }

      const abstractByLanguage = toAbstractByLanguage(abstracts);

      return normalizeThesis({
        handle,
        thesisId: null,
        title: author ? title.replace(author, "").trim() : title,
        author: author || "Unknown Author",
        year: year || "Unknown Date",
        publisher: publisher || "Tampere university",
        universityCode: uniCode,
        abstractByLanguage,
      });
    });
  },
};