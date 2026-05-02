import axios from "axios";
import * as cheerio from "cheerio";
import { normalizeThesis } from "./types.js";
import { fetchDetailPageAbstracts, runWithConcurrency } from "./helpers.js";
import { analyzeAbstract } from "./openAiDecision.js"

const BASE_URL = "https://oulurepo.oulu.fi/";
const OULUREPO_SCOPE = "10024/1102";

export const OuluRepoProvider = {
  buildUrl({ query, rpp, yearMin, yearMax }) {
    const encodedQuery = encodeURIComponent(query);
    const encodedDateFilter = encodeURIComponent(`[${yearMin} TO ${yearMax}]`);

    return `${BASE_URL}discover?query=${encodedQuery}&scope=${OULUREPO_SCOPE}&filtertype=dateIssued&filter_relational_operator=equals&filter=${encodedDateFilter}&rpp=${rpp}`
   ;
  },

  parse(response) {
    const $ = cheerio.load(response.data);
    const elements = $(".artifact-description").toArray();
    return { elements, $ };
  },

  async normalize(parsedInput, { uniCode }) {
    const { elements, $ } = parsedInput;
    const CONCURRENCY_LIMIT = 3;

    // Use lazy tasks so requests only start inside runWithConcurrency batches.
    const tasks = elements.map((element) => async () => {
      const el = $(element);

      const title =
        el.find("h4").first().text().trim() ||
        el.find("a").first().text().trim() ||
        "No Title";

      const handle = el.find("a").first().attr("href") || "";

      let author = "";
      const authorElem = el.find('.author, span:contains("Author")');
      if (authorElem.length) {
        author = authorElem.text().replace(/Author:?\s*/i, '').trim();
      } else {
        const text = el.text();
        const authorMatch = text.match(/Author:\s*([^,;\n]+)/i);
        if (authorMatch?.[1]) {
          author = authorMatch[1].trim();
        }
      }

      // Extract year
      let year = "";
      const yearElem = el.find('.date, span:contains("Date")');
      if (yearElem.length) {
        year = yearElem.text().replace(/Date:?\s*/i, '').trim();
        year = year.substring(0, 4);
      } else {
        const text = el.text();
        const yearMatch = text.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) {
          year = yearMatch[0];
        }
      }

      const abstractByLanguage = await fetchDetailPageAbstracts(handle,BASE_URL);
      const abstract = Object.values(abstractByLanguage).join(" ").toLowerCase();

      const thesisUrl = /^https?:\/\//i.test(handle)
        ? handle
        : new URL(handle, BASE_URL).href;

      const getOpenAIDecision = await analyzeAbstract(thesisUrl, abstract)

      return normalizeThesis({
        handle,
        thesisId: null,
        title,
        author: author || "Unknown Author",
        year: year || "Unknown Date",
        publisher: "Oulu University",
        universityCode: uniCode,
        abstractByLanguage,
        isNokiaProject: getOpenAIDecision.decision.toUpperCase() ||"Unknown is done for Nokia",
        evidence: getOpenAIDecision.evidence || "Unknown evidence"
      });
    });

    return await runWithConcurrency(tasks, CONCURRENCY_LIMIT);
  }
};