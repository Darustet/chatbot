import {
  getAllTheses,
  getThesisById,
  getThesisByLink,
  createThesis,
  updateThesis,
  deleteThesis
} from '../repositories/thesisRepository.js';

// convert empty strings, undefined or null to null, otherwise return the integer value
function toIntOrNull(value) {
	if (value === undefined || value === null || value === '') {
		return null;
	}
	const parsed = Number.parseInt(String(value), 10);
	return Number.isNaN(parsed) ? null : parsed;
}

function toTextOrNull(value) {
  if (value === undefined || value === null || value === '') return null;
  if (Array.isArray(value)) return JSON.stringify(value);
  return String(value);
}

function normalizeThesisPayload(payload = {}) {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Invalid payload: expected an object');
  }

  if (!payload.title) {
    throw new Error('Missing required field: title');
  }

  return {
    title: payload.title ?? '',
    author: payload.author ?? '',
    year: toIntOrNull(payload.year),
    university: payload.university ?? null,
    university_code: payload.university_code ?? payload.universityCode ?? null,
    handle: payload.handle ?? null,
    link: payload.link ?? null,
    thesisId: payload.thesisId ?? payload.thesis_id ?? null,
    abstract_text: payload.abstract_text ?? payload.abstractText ?? null,
    rule_score: toIntOrNull(payload.rule_score),
    rule_reasons: toTextOrNull(payload.rule_reasons),
    openAI_decision: payload.openAI_decision ?? null,
    openAI_evidence: payload.openAI_evidence ?? null
  };
}

const listTheses = async () => await getAllTheses();

const findThesisById = async (id) => await getThesisById(id);

const findThesisByLink = async (link) => await getThesisByLink(link);

const createThesisEntry = async (payload) => {
  const thesis = normalizeThesisPayload(payload);
  return await createThesis(thesis);
};

const updateThesisEntry = async (id, payload) => {
  const thesis = normalizeThesisPayload(payload);
  return await updateThesis(id, thesis);
};

const deleteThesisEntry = async (id) => await deleteThesis(id);

export {
  listTheses,
  findThesisById,
  findThesisByLink,
  createThesisEntry,
  updateThesisEntry,
  deleteThesisEntry,
  normalizeThesisPayload
};