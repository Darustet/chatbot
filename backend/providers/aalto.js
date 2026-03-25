import { normalizeThesis } from "./types.js";

export const toAbstractByLanguage = (abstracts) => {
  if (!Array.isArray(abstracts)) return {};

  const byLanguage = {};
  for (const abs of abstracts) {
    const lang = String(abs.language || "unknown").toLowerCase();
    const text = String(abs.value || "").trim();
    if (text) {
      byLanguage[lang] = text;
    }
  }
  return byLanguage;
};

// Link for Aalto doc api
const AALTO_API_BASE = "https://aaltodoc.aalto.fi/server/api";
const AALTO_BACHELOR_SCOPE = "4e50a35c-f00f-49ae-93b2-3223353681ec"; // size=20 is the default
const AALTO_MASTER_SCOPE = "663a76cb-af53-4943-a224-19e055302c24";

export const AaltoProvider = {
  // Build the API URL based on the query and filters
  // buildUrl: function({ query, rpp, yearMin, yearNow }) {
  //   const encodedQuery = encodeURIComponent(query);
  //   const encodedDateFilter = encodeURIComponent(`[${yearMin} TO ${yearNow}]`);
  //   return `${AALTO_API_BASE}/discover/search/objects?scope=${AALTO_BACHELOR_SCOPE}&query=${encodedQuery}&configuration=default&size=${rpp}&f.dateIssued=${encodedDateFilter},equals`;
  // },

  buildUrls: function({ query, rpp, yearMin, yearNow }) {
    const encodedQuery = encodeURIComponent(query);
    const encodedDateFilter = encodeURIComponent(`[${yearMin} TO ${yearNow}]`);

    const bachelorUrl = `${AALTO_API_BASE}/discover/search/objects?scope=${AALTO_BACHELOR_SCOPE}&query=${encodedQuery}&configuration=default&size=${rpp}&f.dateIssued=${encodedDateFilter},equals`;

    const masterUrl = `${AALTO_API_BASE}/discover/search/objects?scope=${AALTO_MASTER_SCOPE}&query=${encodedQuery}&configuration=default&size=${rpp}&f.dateIssued=${encodedDateFilter},equals`;
    return  [ bachelorUrl, masterUrl ];
  },

  // Parse the API response to extract the relevant data
  parse: function(response) {
    return response.data?._embedded?.searchResult?._embedded?.objects ?? [];
  },

  // Normalize the parsed data into a consistent format for the frontend
  normalize(objects) {
    return objects.map((obj, index) => {
      const item = obj._embedded?.indexableObject ?? {};
      const thesisId = item.id || `unknown-id-${index}`;
      const title = item.name || "No Title";
      const handle = item.handle ? `/handle/${item.handle}` : "";
      const authorArr = item.metadata?.["dc.contributor.author"] ?? [];
      const dateIssuedArr = item.metadata?.["dc.date.issued"] ?? [];
      const publisherArr = item.metadata?.["dc.contributor"] ?? [];

      const author = authorArr[0]?.value ?? "Unknown Author";
      const year = dateIssuedArr[0]?.value ?? "Unknown Date";
      let publisher = "Unknown University";

      const englishPub = publisherArr.find(p => p.language === "en");
      if (englishPub) publisher = englishPub.value;
      else if (publisherArr[0]?.value) publisher = publisherArr[0].value;

      const abstracts = item.metadata?.["dc.description.abstract"];

      const abstractByLanguage = toAbstractByLanguage(abstracts);
      
      return normalizeThesis({
        handle,
        thesisId,
        title,
        author,
        year,
        publisher,
        universityCode: "AALTO",
        abstractByLanguage,
      });
    });
  }
};