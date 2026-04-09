// add optional thesisId to the normalized thesis object, and update aalto provider to include it in the normalization process
export function normalizeThesis({ handle, thesisId, title, author, year, publisher, universityCode, abstractByLanguage }) {
  return {
    thesis: { handle, thesisId, title, author, year, publisher, universityCode, abstractByLanguage }
  };
}