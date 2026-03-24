import * as cheerio from "cheerio";
import { normalizeThesis } from "./types.js";

const THESEUS_BASE = "https://www.theseus.fi/";
const theseusExampleUrl = "https://www.theseus.fi/discover?filtertype_1=vuosi&filter_relational_operator_1=equals&filter_1=%5B2023+TO+2025%5D&submit_apply_filter=&query=+nokia&scope=10024%2F12&rpp=50";
const theseusExampleUrl2 = "https://www.theseus.fi/discover?scope=10024%2F160908&query=nokia&submit=&filtertype_0=vuosi&filter_relational_operator_0=equals&filter_0=%5B2023+TO+2025%5D&rpp=50";

export const TheseusProvider = {
  // Build the API URL based on the query and filters
  buildUrl({ query, rpp, uniCode, yearMin, yearNow }) {
    const encodedQuery = encodeURIComponent(query);
    const encodedDateFilter = encodeURIComponent(`[${yearMin} TO ${yearNow}]`);
    const encodedUniCode = encodeURIComponent(uniCode);
    console.log('from theseusExampleUrl.fi: ', 'query:', query, 'rpp:', rpp, 'uniCode:', uniCode, 'yearMin:', yearMin, 'yearNow:', yearNow);
    // TODO: Currently "all" return only Metropolia
    if (uniCode === "all") {
      return `${THESEUS_BASE}discover?scope=10024%2F6&query=${encodedQuery}&submit=&filtertype_0=vuosi&filter_relational_operator_0=equals&filter_0=${encodedDateFilter}&rpp=${rpp}`;
    }
    return `${THESEUS_BASE}discover?scope=${encodedUniCode}&query=${encodedQuery}&submit=&filtertype_0=vuosi&filter_relational_operator_0=equals&filter_0=${encodedDateFilter}&rpp=${rpp}`;
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

      return normalizeThesis({
        handle,
        thesisId: null,
        title: title || "No Title",
        author: author || "Unknown Author",
        year: year || "Unknown Date",
        publisher: publisher || "Unknown University",
        universityCode: uniCode
      });
    });
  }
};