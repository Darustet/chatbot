import { resolveThesisLink } from "./helpers.js";

// add optional thesisId to the normalized thesis object
export function normalizeThesis({ handle, link, thesisId, title, author, year, publisher, universityCode, abstractByLanguage}) {
  const link = resolveThesisLink(handle, universityCode);
  const normalizedYear = year
    ? String(year).slice(0, 4)
    : "";

  return {
    thesis: { 
      handle, 
      link,
      thesisId,
      title, 
      author, 
      year: normalizedYear,
      publisher, 
      universityCode, 
      abstractByLanguage}
  };
}

//export { resolveThesisLink };