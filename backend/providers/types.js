//import { resolveThesisLink } from "./helpers.js";

// add optional thesisId to the normalized thesis object
export function normalizeThesis({ handle, link, thesisId, title, author, year, publisher, universityCode, abstractByLanguage, isNokiaProject, evidence }) {

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
      isNokiaProject,
      evidence}
  };
}

//export { resolveThesisLink };