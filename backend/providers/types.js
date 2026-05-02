import { resolveThesisLink } from "./helpers.js";

// add optional thesisId to the normalized thesis object
export function normalizeThesis({ handle, thesisId, title, author, year, publisher, universityCode, abstractByLanguage }) {
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
      abstractByLanguage
    }
  };
}

export { resolveThesisLink };