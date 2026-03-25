import * as cheerio from "cheerio";
import { normalizeThesis } from "./types.js";
import {toAbstractByLanguage } from "./aalto.js";

const TREPO_BASE = "https://trepo.tuni.fi/";
const TREPO_BACHELOR_SCOPE = "10024/105881"

const detectAbstractLanguage = (text) => {
  const lower = text.toLowerCase();

  if (/[äöå]/i.test(text) || /\b(tutkielma|tarkoitus|käyttäjäkokemus|selvittää|suosituksia)\b/i.test(lower)) {
    return "fi";
  } else {
  return "en";
  }

  return "unknown";
};

export const TrepoProvider = {
  // Build the API URL based on the query and filters
  buildUrl({ query, rpp, uniCode }) {
    const encodedQuery = encodeURIComponent(query);
    return `${TREPO_BASE}discover?scope=${TREPO_BACHELOR_SCOPE}&query=+${encodedQuery}&rpp=${rpp}`;
  },

  // Parse the API response to extract thesis elements
  parse(response) {
    // Use cheerio to parse the HTML response and extract thesis elements
    const $ = cheerio.load(response.data);
    const elements = $(".artifact-description").toArray();
    return { elements, $ };
  },

  // Normalize the parsed data into a consistent format for the frontend
  normalize({ elements, $ }, { uniCode, uniCodes }) {

    return elements.map((element) => {
      const el = $(element);
      // Extract title
      const title = el.find('h4').text().trim();

      // Extract handle/URL
      const handle = el.find('a').first().attr('href') || "";

      // Extract author
      let author = "";
      const authorElem = el.find('.author, span:contains("Author")');
      if (authorElem.length) {
          author = authorElem.text().replace(/Author:?\s*/i, '').trim();
      } else {
          const text = el.text();
          const authorMatch = text.match(/Author:\s*([^,;\n]+)/i);
          if (authorMatch && authorMatch[1]) {
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
          if (publisherMatch && publisherMatch[1]) {
              publisher = publisherMatch[1].trim();
          } else {
              // Fallback: Use the university code to map to a university name
              if (uniCode === "all") {
                  // For "all" case, publisher might be detected elsewhere in the element
                  const fullText = el.text();
                  for (const uniData of uniCodes) {
                      if (fullText.includes(uniData.uni)) {
                          publisher = uniData.uni;
                          break;
                      }
                  }
              } else {
                  // For specific university code
                  const uniMatch = uniCodes.find(u => u.code === uniCode);
                  if (uniMatch) {
                      publisher = uniMatch.uni;
                  }
              }
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

      const abstracts = [];
        const abstractElem = el.find(".abstract").first();

        if (abstractElem.length) {
          const abstractText = abstractElem
            .text()
            .replace(/\.\.\./g, "")
            .replace(/\s+/g, " ")
            .trim();

          if (abstractText) {
            abstracts.push({
              language: detectAbstractLanguage(abstractText),
              value: abstractText,
            });
          }
        }

        const abstractByLanguage = toAbstractByLanguage(abstracts);

      return normalizeThesis({
        handle,
        thesisId: null,
        title: title || "No Title",
        author: author || "Unknown Author",
        year: year || "Unknown Date",
        publisher: publisher || "Unknown University",
        universityCode: uniCode,
        abstractByLanguage
      });
    });
  }
};