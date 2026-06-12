import {
	getAllTheses,
	getThesisById,
	getThesisByLink,
	getAbstractByLink,
	createThesis,
	updateThesis,
	deleteThesis
} from '../repositories/thesisRepository.js';
import { getLabelIdByName, createLabel } from '../repositories/labelRepository.js';

// convert empty strings, undefined or null to null, otherwise return the integer value
function toIntOrNull(value) {
	if (value === undefined || value === null || value === '') {
		return null;
	}
	const parsed = Number.parseInt(String(value), 10);
	return Number.isNaN(parsed) ? null : parsed;
}

function toFloatOrNull(value) {
	if (value === undefined || value === null || value === '') {
		return null;
	}
	const parsed = Number.parseFloat(String(value));
	return Number.isNaN(parsed) ? null : parsed;
}

function toTextOrNull(value) {
	if (value === undefined || value === null || value === '') {
		return null;
	}
	if (Array.isArray(value)) {
		return JSON.stringify(value);
	}
	return String(value);
}

const getFinalLabelName = (openAIDecision) => {
  if (openAIDecision === 'yes') {
    return 'NOKIA_COLLABORATION';
  }

  if (openAIDecision === 'no') {
    return 'NO_INDICATION_OF_COLLABORATION';
  }

  return 'AMBIGUOUS';
};

function resolveLabelId(labelName) {
  if (!labelName) {
    return null;
  }

  const existing = getLabelIdByName(labelName);

  if (existing) {
    return existing;
  }

  return createLabel(labelName);
}

function normalizeThesisPayload(payload = {}) {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Invalid payload: expected an object');
  }

  if (!payload.title) {
    throw new Error('Missing required field: title');
  }

  const openAIDecision = payload.openAI_decision ?? 'unknown';
  const finalLabelName = getFinalLabelName(openAIDecision);

  return {
    title: payload.title ?? '',
    author: payload.author ?? '',
    year: toIntOrNull(payload.year),
    university: payload.university ?? null,
    university_code: payload.university_code ?? payload.universityCode ?? null,
    handle: payload.handle ?? null,
    link: payload.link?.trim() ?? null,
    thesisId: payload.thesisId ?? payload.thesis_id ?? null,
    abstract_text: payload.abstract_text ?? payload.abstractText ?? null,

    rule_label_id: payload.rule_label_id ?? resolveLabelId(payload.rule_label),
    rule_score: toIntOrNull(payload.rule_score),
    rule_reasons: toTextOrNull(payload.rule_reasons),

    final_label_id: payload.final_label_id ?? resolveLabelId(finalLabelName),
    openAI_decision: openAIDecision,
    openAI_evidence: payload.openAI_evidence ?? null
  };
}

const listTheses = () => getAllTheses();

const findThesisById = (id) => getThesisById(id);
const findThesisByLink = (link) => getThesisByLink(link);
const findAbstractByLink = (link) => getAbstractByLink(link);

const createThesisEntry = (payload) => {
	const thesis = normalizeThesisPayload(payload);
	return createThesis(thesis);
};

const updateThesisEntry = (id, payload) => {
	const thesis = normalizeThesisPayload(payload);
	return updateThesis(id, thesis);
};

const deleteThesisEntry = (id) => deleteThesis(id);

export {
	listTheses,
	findThesisById,
	findThesisByLink,
	findAbstractByLink,
	createThesisEntry,
	updateThesisEntry,
	deleteThesisEntry,
	normalizeThesisPayload
};
