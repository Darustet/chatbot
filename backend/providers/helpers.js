// Provider-level shared helper utilities.

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

export const detectAbstractLanguage = (text) => {
  if (!text) return "unknown";

  const lower = text.toLowerCase();

  if (
    /[äöå]/i.test(text) ||
    /\b(tutkielma|tarkoitus|käyttäjäkokemus|selvittää|suosituksia|opinnäytetyö|yhteistyö)\b/i.test(lower)
  ) {
    return "fi";
  }

  if (/\b(the|this thesis|abstract|study|purpose|research|conclusion)\b/i.test(lower)) {
    return "en";
  }

  return "unknown";
};

export const runWithConcurrency = async (tasks, limit) => {
  const results = [];
  for (let i = 0; i < tasks.length; i += limit) {
    const batch = tasks.slice(i, i + limit);
    const batchResults = await Promise.all(batch);
    results.push(...batchResults);
  }
  return results;
};

// Deduplicate by title and author
export const deduplicate = (theses) => {
  const seen = new Map();
  for (const thesis of theses) {
    const key = `${thesis.thesis.title.toLowerCase()}|${thesis.thesis.author.toLowerCase()}`;
    if (!seen.has(key)) {
        seen.set(key, thesis);
    }
  }            
  return Array.from(seen.values());
};