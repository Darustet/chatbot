import axios from "axios";
import * as cheerio from "cheerio";
import { normalizeThesis } from "./types.js";
import {
  fetchDetailPageAbstracts,
  runWithConcurrency
} from "./helpers.js";

const BASE_URL = "https://www.theseus.fi/";
// const theseusExampleUrl = "https://www.theseus.fi/discover?filtertype_1=vuosi&filter_relational_operator_1=equals&filter_1=%5B2023+TO+2025%5D&submit_apply_filter=&query=+nokia&scope=10024%2F12&rpp=50";

export const TheseusProvider = {
  // Build the API URL based on the query and filters
  buildUrl({ query, rpp, uniCode, yearMin, yearNow }) {
    const encodedQuery = encodeURIComponent(query);
    const encodedDateFilter = encodeURIComponent(`[${yearMin} TO ${yearNow}]`);
    const encodedUniCode = encodeURIComponent(uniCode);
    console.log('from theseusExampleUrl.fi: ', 'query:', query, 'rpp:', rpp, 'uniCode:', uniCode, 'yearMin:', yearMin, 'yearNow:', yearNow);
    // TODO: Currently "all" return only Metropolia
    if (uniCode === "all") {
      return `${BASE_URL}discover?scope=10024%2F6&query=${encodedQuery}&submit=&filtertype_0=vuosi&filter_relational_operator_0=equals&filter_0=${encodedDateFilter}&rpp=${rpp}`;
    }
    return `${BASE_URL}discover?filtertype_1=vuosi&filter_relational_operator_1=equals&filter_1=${encodedDateFilter}&submit_apply_filter=&query=${encodedQuery}&scope=${encodedUniCode}&rpp=${rpp}`;
  },

  // Parse the API response to extract thesis elements
  parse(response) {
    // Use cheerio to parse the HTML response and extract thesis elements
    const $ = cheerio.load(response.data);
    const elements = $(".artifact-description").toArray();
    return { elements, $ };
  },

  // Normalize the parsed data into a consistent format for the frontend
  async normalize({ elements, $ }, { uniCode, uniCodes }) {

    const CONCURRENCY_LIMIT = 3;

    // Create lazy task functions so requests start only when each batch is executed.
    const tasks = elements.map((element) => async () => {
      const el = $(element);
      // Extract title
      const title = el.find("h4").text().trim();

      // Extract handle/URL
      const handle = el.find("a").first().attr("href") || "";

      // Extract author
      let author = "";
      const authorElem = el.find('.author, span:contains("Author")');
      if (authorElem.length) {
        author = authorElem
          .text()
          .replace(/Author:?\s*/i, "")
          .trim();
      } else {
        const text = el.text();
        const authorMatch = text.match(/Author:\s*([^,;\n]+)/i);
        if (authorMatch && authorMatch[1]) {
          author = authorMatch[1].trim();
        }
      }

      // university/publisher
      const uniMatch = uniCodes.find((u) => u.code === encodeURIComponent(uniCode));
      const publisher = uniMatch ? uniMatch.uni : "Unknown University";

      // Extract year
      let year = "";
      const yearElem = el.find('.date, span:contains("Date")');
      if (yearElem.length) {
        year = yearElem.text().replace(/Date:?\s*/i, "").trim();
      } else {
        const text = el.text();
        const yearMatch = text.match(/\b(19|20)\d{2}\b/);
        if (yearMatch) {
          year = yearMatch[0];
        }
      }

      // Fetch detail page abstracts with concurrency limit
      const abstractByLanguage = await fetchDetailPageAbstracts(handle, BASE_URL);

      return normalizeThesis({
        handle,
        thesisId: null,
        title: title || "No Title",
        author: author || "Unknown Author",
        year: year || "Unknown Date",
        publisher: publisher ? `${publisher} UAS` : "Unknown UAS",
        universityCode: uniCode,
        abstractByLanguage,
      });
    });

    // Run with concurrency limit to avoid hammering Theseus
    const normalized = await runWithConcurrency(tasks, CONCURRENCY_LIMIT);
    console.log(
      `Normalized ${normalized.length} theses with abstact details from Theseus`
    );
    return normalized;
  }
};