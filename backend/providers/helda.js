import { toAbstractByLanguage } from "./helpers.js";
import { normalizeThesis } from "./types.js";
import { analyzeThesisLink } from "./openAiDecision.js";

// Link for Helda doc api
const HELDA_API_BASE = "https://helda.helsinki.fi/server/api/";
const BASE_URL = "https://helda.helsinki.fi/"
const HELDA_BACHELOR_SCOPE = "09dc20ad-06ac-4423-bab3-4d725a7efbe";
const HELDA_MASTER_SCOPE = "13d90218-edf0-4beb-887b-71fc1ecea33e";

export const HeldaProvider = {
  // rpp = results per page
  buildUrls: function({ query, rpp, yearMin, yearNow }) {
    const encodedQuery = encodeURIComponent(query);
    const encodedDateFilter = encodeURIComponent(`[${yearMin} TO ${yearNow}]`);

    const bachelorUrl = `${HELDA_API_BASE}discover/search/objects?scope=${HELDA_BACHELOR_SCOPE}&query=${encodedQuery}&configuration=default&size=${rpp}&f.dateIssued=${encodedDateFilter},equals`;

    const masterUrl = `${HELDA_API_BASE}discover/search/objects?scope=${HELDA_MASTER_SCOPE}&query=${encodedQuery}&configuration=default&size=${rpp}&f.dateIssued=${encodedDateFilter},equals`;
    return  [ bachelorUrl, masterUrl ];
  },

  parse: function(response) {
    return response.data?._embedded?.searchResult?._embedded?.objects ?? [];
  },

  normalize(objects) {
    return Promise.all(
      objects.map(async (obj, index) => {
        const item = obj._embedded?.indexableObject ?? {};
        const thesisId = item.id || `unknown-id-${index}`;
        const title = item.name || "No Title";
        const handle = thesisId ? `/items/${thesisId}` : "";
        const authorArr = item.metadata?.["dc.contributor.author"] ?? [];
        const dateIssuedArr = item.metadata?.["dc.date.issued"] ?? [];
        const publisherArr = item.metadata?.["dc.contributor"] ?? [];

        const author = authorArr.map(a => a.value).join("; ") || "Unknown Author";
        const year = dateIssuedArr[0]?.value ?? "Unknown Date";

        let publisher = "";
        const englishPub = publisherArr.find(p => p.language === "en");
        if (englishPub) publisher = englishPub.value;
        else if (publisherArr[0]?.value) publisher = publisherArr[0].value;

        const abstracts = item.metadata?.["dc.description.abstract"]; // array of { value, language }
        const abstractByLanguage = toAbstractByLanguage(abstracts);

        const thesisUrl = /^https?:\/\//i.test(handle)
          ? handle
          : new URL(handle, BASE_URL).href;

        const getOpenAIDecision = await analyzeThesisLink(thesisUrl);

        return normalizeThesis({
          thesisId,
          title,
          handle,
          author,
          year,
          publisher: publisher || "University of Helsinki",
          universityCode: "HELDA",
          abstractByLanguage,
          isNokiaProject: getOpenAIDecision?.decision?.toUpperCase() || "Unknown is done for Nokia",
          evidence: getOpenAIDecision?.evidence || "Unknown evidence"
        });
      })
    );
  }
}