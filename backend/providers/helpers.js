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
  const safeLimit = Math.max(1, Number(limit) || 1);
  const results = [];
  for (let i = 0; i < tasks.length; i += safeLimit) {
    const batch = tasks.slice(i, i + safeLimit);
    const batchResults = await Promise.all(
      batch.map((task) => (typeof task === "function" ? task() : task))
    );
    results.push(...batchResults);
  }
  return results;
};

// Deduplicate by title and author
export const deduplicate = (theses) => {
  const seen = new Map();
  for (const thesis of theses || []) {
    if (!thesis?.thesis) continue;

    const title = String(thesis.thesis.title || "").toLowerCase();
    const author = String(thesis.thesis.author || "").toLowerCase();
    const key = `${title}|${author}`;

    if (!seen.has(key)) {
      seen.set(key, thesis);
    }
  }
  return Array.from(seen.values());
};