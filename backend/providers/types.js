const THESIS_BASE_URL_BY_UNI = {
  AALTO: "https://aaltodoc.aalto.fi",
  HELDA: "https://helda.helsinki.fi",
  TREPO: "https://trepo.tuni.fi",
  OULUREPO: "https://oulurepo.oulu.fi",
};

const THESEUS_BASE_URL = "https://www.theseus.fi";

function resolveThesisLink(handle, universityCode) {
  const safeHandle = String(handle || "").trim();
  if (!safeHandle) return "";

  if (/^https?:\/\//i.test(safeHandle)) {
    return safeHandle;
  }

  const baseUrl = THESIS_BASE_URL_BY_UNI[universityCode] || THESEUS_BASE_URL;

  try {
    return new URL(safeHandle, `${baseUrl}/`).href;
  } catch {
    return "";
  }
}

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