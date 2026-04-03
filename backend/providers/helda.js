import { toAbstractByLanguage } from "./helpers.js";
import { normalizeThesis } from "./types.js";

// Link for Helda doc api
const HELDA_API_BASE = "https://helda.helsinki.fi/server/api/";
const HELDA_SCOPE = "f0e1c8b9-5a3c-4d9e-8b1a-2c3d4e5f6a7b"; // bachelor and master theses
const HELDA_BACHELOR_SCOPE = "09dc20ad-06ac-4423-bab3-4d725a7efbe";
const HELDA_MASTER_SCOPE = "13d90218-edf0-4beb-887b-71fc1ecea33e";

export const HeldaProvider = {
  // rpp = results per page
  buildUrl: function({ query, rpp, yearMin, yearNow }) {
    const encodedQuery = encodeURIComponent(query);
    const encodedDateFilter = encodeURIComponent(`[${yearMin} TO ${yearNow}]`);
    console.log(`Building Helda URL with query=${query}, rpp=${rpp}, yearMin=${yearMin}, yearNow=${yearNow}`);
    const url = `${HELDA_API_BASE}discover/search/objects?query=dc.subject:${encodedQuery}&scope=${HELDA_SCOPE}&size=${rpp}&f.dateIssued=${encodedDateFilter},equals`;
    console.log(`Constructed Helda URL: ${url}`);
    return url;
  },

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
    return objects.map((obj, index) => {
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

      const englishPub = publisherArr.find(p => p.language === "en");
      if (englishPub) publisher = englishPub.value;
      else if (publisherArr[0]?.value) publisher = publisherArr[0].value;

      const abstracts = item.metadata?.["dc.description.abstract"]; // array of { value, language }
      const abstractByLanguage = toAbstractByLanguage(abstracts);

      return normalizeThesis({ 
        thesisId, 
        title, 
        handle, 
        author, 
        year, 
        publisher: publisher || "University of Helsinki",
        universityCode: "HELDA",
        abstractByLanguage
      });
    });
  }
}