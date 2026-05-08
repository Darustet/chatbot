import { resolveThesisLink } from "./helpers.js";

// add optional thesisId to the normalized thesis object
export function normalizeThesis({ handle, thesisId, title, author, year, publisher, universityCode, abstractByLanguage, extractedText }) {
  const link = resolveThesisLink(handle, universityCode);

  return {
    thesis: { 
      handle, 
      link,
      thesisId, 
      title, 
      author, 
      year, 
      publisher, 
      universityCode, 
      abstractByLanguage,
      extractedText: extractedText || ""
    }
  };
}

export { resolveThesisLink };