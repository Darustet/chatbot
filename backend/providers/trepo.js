import * as cheerio from "cheerio";
import { normalizeThesis } from "./types.js";
import { toAbstractByLanguage } from "./aalto.js";

const TREPO_BASE = "https://trepo.tuni.fi/";
const TREPO_BACHELOR_SCOPE = "10024/105881";
const TREPO_MASTER_SCOPE = "10024/105882";

export const detectAbstractLanguage = (text) => {
  if (!text) return "unknown";
  const lower = text.toLowerCase();
  if (
    /[äöå]/i.test(text) ||
    /\b(tutkielma|tarkoitus|käyttäjäkokemus|selvittää|suosituksia|opinnäytetyö|yhteistyö)\b/i.test(lower)
  ) {
    return "fi";
  }
  // English detection: common English words
  if (/\b(the|this thesis|abstract|study|purpose|research|conclusion)\b/i.test(lower)) {
    return "en";
  }
  return "unknown";
};

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

    return elements.map((element) => {
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

      let abstracts = [];

      const possibleAbstract =
        el.find(".abstract").first().text().trim() ||
        el.find('[class*="abstract"]').first().text().trim();

      if (possibleAbstract) {
        abstractText = possibleAbstract;
      }

      const abstracts = abstractText
        ? [
            {
              language: detectAbstractLanguage(abstractText),
              value: abstractText.replace(/\s+/g, " ").trim(),
            },
          ]
        : [];

      const abstractByLanguage = toAbstractByLanguage(abstracts);

      return {
        handle,
        thesisId: null,
        title,
        author: author || "Unknown Author",
        year: year || "Unknown Date",
        publisher: publisher || "Tampere University",
        abstractByLanguage,
      };
    });
  },

  // Saa nyt sisäänsä yhdistetyn arrayn parse()-tuloksista
  normalize(parsedItems, { uniCode }) {
    return parsedItems.map((item) =>
      normalizeThesis({
        handle: item.handle,
        thesisId: item.thesisId,
        title: item.title,
        author: item.author,
        year: item.year,
        publisher: item.publisher,
        universityCode: uniCode,
        abstractByLanguage: item.abstractByLanguage,
      })
    );
  },
};