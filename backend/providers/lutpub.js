import axios from "axios";
import * as cheerio from "cheerio";
import { normalizeThesis } from "./types.js";
import { fetchDetailPageAbstracts, runWithConcurrency, resolveThesisLink } from "./helpers.js";

const BASE_URL = "https://lutpub.lut.fi/";
const LUT_BACHELOR_SCOPE = "10024/158300";
const LUT_MASTER_SCOPE = "10024/158299";

export const LutPubProvider = {
  // Build both LUT search URLs
  buildUrls({ query, rpp, yearMin, yearMax }) {
    const encodedQuery = encodeURIComponent(query);
    const encodedDateFilter = encodeURIComponent(`[${yearMin} TO ${yearMax}]`);

    //const bachelorUrl = `${BASE_URL}discover?&submit_apply_filter=&query=nokia&scope=${LUT_BACHELOR_SCOPE}&rpp=${rpp}`;
    const bachelorUrl =`${BASE_URL}discover?query=${encodedQuery}&scope=${LUT_BACHELOR_SCOPE}&filtertype=dateIssued&filter_relational_operator=equals&filter=${encodedDateFilter}&rpp=${rpp}`;
    const masterUrl = `${BASE_URL}discover?query=${encodedQuery}&scope=${LUT_MASTER_SCOPE}&filtertype=dateIssued&filter_relational_operator=equals&filter=${encodedDateFilter}&rpp=${rpp}`;
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

      return normalizeThesis({
        handle,
        thesisId: null,
        title,
        author: author || "Unknown Author",
        year: year || "Unknown Date",
        publisher: "LUT University",
        universityCode: "LUTPUB",
        abstractByLanguage,
      });
    });
  });

  return await runWithConcurrency(tasks, CONCURRENCY_LIMIT);
}
};