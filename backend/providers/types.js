// add optional thesisId to the normalized thesis object, and update aalto provider to include it in the normalization process
export function normalizeThesis({ handle, title, author, year, publisher, universityCode, thesisId }) {
  return {
    handle,
    thesisId,
    thesis: { title, author, year, publisher, universityCode }
  };
}