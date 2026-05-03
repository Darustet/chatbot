import { normalizeThesis } from "./types.js";
import { toAbstractByLanguage, resolveThesisLink } from "./helpers.js";
//import { analyzeAbstract } from "./openAiDecision.js";

// Link for Aalto doc api
const AALTO_API_BASE = "https://aaltodoc.aalto.fi/server/api";
const BASE_URL = "https://aaltodoc.aalto.fi";
const AALTO_BACHELOR_SCOPE = "4e50a35c-f00f-49ae-93b2-3223353681ec";
const AALTO_MASTER_SCOPE = "663a76cb-af53-4943-a224-19e055302c24";

export const AaltoProvider = {

  buildUrls: function({ query, rpp, yearMin, yearMax }) {
    const encodedQuery = encodeURIComponent(query);
    const encodedDateFilter = encodeURIComponent(`[${yearMin} TO ${yearMax}]`);

    const bachelorUrl = `${AALTO_API_BASE}/discover/search/objects?scope=${AALTO_BACHELOR_SCOPE}&query=${encodedQuery}&configuration=default&size=${rpp}&f.dateIssued=${encodedDateFilter},equals`;

    const masterUrl = `${AALTO_API_BASE}/discover/search/objects?scope=${AALTO_MASTER_SCOPE}&query=${encodedQuery}&configuration=default&size=${rpp}&f.dateIssued=${encodedDateFilter},equals`;
    return  [ bachelorUrl, masterUrl ];
  },

  // Parse the API response to extract the relevant data
  parse: function(response) {
    return response.data?._embedded?.searchResult?._embedded?.objects ?? [];
  },

  async normalize(objects) {
    return Promise.all(
      objects.map(async (obj, index) => {
        const item = obj._embedded?.indexableObject ?? {};
        const thesisId = item.id || `unknown-id-${index}`;
        const title = item.name || "No Title";
        const handle = item.handle ? `/handle/${item.handle}` : "";
        const authorArr = item.metadata?.["dc.contributor.author"] ?? [];
        const dateIssuedArr = item.metadata?.["dc.date.issued"] ?? [];
        const publisherArr = item.metadata?.["dc.contributor"] ?? [];

        const author = authorArr.map(a => a.value).join("; ") || "Unknown Author";
        const year = dateIssuedArr[0]?.value ?? "Unknown Date";

        let publisher = "";
        const englishPub = publisherArr.find((p) => p.language === "en");
        if (englishPub) publisher = englishPub.value;
        else if (publisherArr[0]?.value) publisher = publisherArr[0].value;

        const abstracts = item.metadata?.["dc.description.abstract"]; // array of { value, language }
        const abstractByLanguage = toAbstractByLanguage(abstracts);
        const abstract = Object.values(abstractByLanguage).join(" ").toLowerCase();

        const thesisUrl = /^https?:\/\//i.test(handle)
        ? handle
        : new URL(handle, BASE_URL).href;

        const getOpenAIDecision = await analyzeAbstract(thesisUrl, abstract)
        const link = resolveThesisLink(handle, "AALTO");

        return normalizeThesis({
          handle,
          link,
          thesisId,
          title,
          author,
          year,
          publisher: publisher || "Aalto University",
          universityCode: "AALTO",
          abstractByLanguage,
          isNokiaProject: getOpenAIDecision?.decision?.toUpperCase() ?? "UNKNOWN",
          evidence: getOpenAIDecision?.evidence ?? "Unknown evidence",
        });
      })
    );
  },
};