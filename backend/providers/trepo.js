import axios from "axios";
import * as cheerio from "cheerio";
import { normalizeThesis } from "./types.js";
import { fetchDetailPageAbstracts, runWithConcurrency } from "./helpers.js";
import { analyzeAbstract } from "./openAiDecision.js"

const BASE_URL = "https://trepo.tuni.fi/";
const TREPO_BACHELOR_SCOPE = "10024/105881";
const TREPO_MASTER_SCOPE = "10024/105882";

export const TrepoProvider = {
  // Build both TREPO search URLs
  buildUrls({ query, rpp, yearMin, yearMax }) {
    const encodedQuery = encodeURIComponent(query);
    const encodedDateFilter = encodeURIComponent(`[${yearMin} TO ${yearMax}]`);

    const bachelorUrl = `${BASE_URL}discover?filtertype_1=julkaisuvuosi&filter_relational_operator_1=equals&filter_1=${encodedDateFilter}&submit_apply_filter=&query=nokia&scope=${TREPO_BACHELOR_SCOPE}&rpp=${rpp}`;
    const masterUrl = `${BASE_URL}discover?filtertype_1=julkaisuvuosi&filter_relational_operator_1=equals&filter_1=${encodedDateFilter}&submit_apply_filter=&query=nokia&scope=${TREPO_MASTER_SCOPE}&rpp=${rpp}`;

    return [bachelorUrl, masterUrl];
  },

  parse(response) {
    const $ = cheerio.load(response.data);
    const elements = $(".artifact-description").toArray();
    return { elements, $ };
  },

  async normalize(parsedInput, { uniCode }) {
  const CONCURRENCY_LIMIT = 3;

  const parsedList = Array.isArray(parsedInput) ? parsedInput : [parsedInput];

  const tasks = parsedList.flatMap((parsed) => {
    if (!parsed?.elements || !parsed?.$) return [];

    const { elements, $ } = parsed;

    return elements.map((element) => async () => {
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

      // Extract university/publisher
      let publisher = "";
      const publisherElem = el.find('.publisher, span:contains("Publisher")');
      if (publisherElem.length) {
          publisher = publisherElem.text().replace(/Publisher:?\s*/i, '').trim();
      } else {
        const text = el.text();
        const publisherMatch = text.match(/Publisher:\s*([^,;\n]+)/i);
        if (publisherMatch?.[1]) {
          publisher = publisherMatch[1].trim();
        }
      }

      // Extract year
      let year = "";
      const yearElem = el.find('.date, span:contains("Date")');
      if (yearElem.length) {
          year = yearElem.text().replace(/Date:?\s*/i, '').trim();
      } else {
        const text = el.text();
        const yearMatch = text.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) {
          year = yearMatch[0];
        }
      }

      //Extract abstract
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
        publisher: publisher || "Tampere University",
        universityCode: uniCode,
        abstractByLanguage,
        isNokiaProject: getOpenAIDecision.decision.toUpperCase() ||"Unknown is done for Nokia",
        evidence: getOpenAIDecision.evidence || "Unknown evidence"
      });
    });
  });

  return await runWithConcurrency(tasks, CONCURRENCY_LIMIT);
}
};