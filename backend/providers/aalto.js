import { normalizeThesis } from "./types.js";
import { toAbstractByLanguage } from "./helpers.js";
import axios from "axios";

// Link for Aalto doc api
const AALTO_API_BASE = "https://aaltodoc.aalto.fi/server/api";
const AALTO_BACHELOR_SCOPE = "4e50a35c-f00f-49ae-93b2-3223353681ec"; // size=20 is the default
const AALTO_MASTER_SCOPE = "663a76cb-af53-4943-a224-19e055302c24";

// take first 10 pages or 2200 words
function takeFirstPages(text, pageCount = 10) {
  const safeText = String(text || "").trim();
  if (!safeText) return "";

  const pages = safeText.split(/\f|\u000c/);
  if (pages.length > 1) {
    return pages.slice(0, pageCount).join("\n\n").trim();
  }

  const words = safeText.split(/\s+/);
  if (words.length > 2200) {
    return words.slice(0, 2200).join(" ").trim();
  }

  return safeText;
}

async function fetchAaltoExtractedText(thesisId) {
  if (!thesisId) return "";

  try {
    const coreItemUrl = `${AALTO_API_BASE}/core/items/${thesisId}`;
    const itemResponse = await axios.get(coreItemUrl, { timeout: 10000 });
    const itemBundlesUrl = itemResponse.data?._links?.bundles?.href || `${AALTO_API_BASE}/core/items/${thesisId}/bundles`;

    const bundlesResponse = await axios.get(itemBundlesUrl, { timeout: 10000 });
    const bundles = bundlesResponse.data?._embedded?.bundles ?? [];
    const textBundle = bundles.find((bundle) => String(bundle.name || "").toUpperCase() === "TEXT");
    if (!textBundle?.uuid) return "";

    const bitstreamsUrl = `${AALTO_API_BASE}/core/bundles/${textBundle.uuid}/bitstreams`;
    const bitstreamsResponse = await axios.get(bitstreamsUrl, { timeout: 10000 });
    const bitstreams = bitstreamsResponse.data?._embedded?.bitstreams ?? [];
    const textBitstream = bitstreams.find((bitstream) => bitstream?._links?.content?.href) || bitstreams[0];
    const contentUrl = textBitstream?._links?.content?.href;
    if (!contentUrl) return "";

    const contentResponse = await axios.get(contentUrl, { responseType: "text", timeout: 10000 });
    return takeFirstPages(contentResponse.data, 10);
  } catch (error) {
    const status = error?.response?.status;
    if (status === 401) {
      console.debug(`Aalto thesis ${thesisId} is access restricted (401)`);
    } else {
      console.warn(`Failed to fetch Aalto extracted text for ${thesisId}:`, error.message);
    }
    return "";
  }
}

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

  // Normalize the parsed data into a consistent format for the frontend
  async normalize(objects) {
    return Promise.all(objects.map(async (obj, index) => {
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
      const extractedText = await fetchAaltoExtractedText(thesisId);
      
      return normalizeThesis({
        handle,
        thesisId,
        title,
        author,
        year,
        publisher: publisher || "Aalto University",
        universityCode: "AALTO",
        abstractByLanguage,
        extractedText,
      });
    }));
  }
};