import {
	getAllTheses,
	getThesisById,
	getThesisByLink,
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

// resolve final_label_id from payload, if final_label_id is provided return it, 
// otherwise try to resolve it from labelName or label,
// if not found create a new label and return its id
function resolveLabelId(payload) {
	if (payload.final_label_id !== undefined && payload.final_label_id !== null) {
		return payload.final_label_id;
	}

	const labelName = payload.labelName || payload.label;
	if (!labelName) {
		return null;
	}

	const existing = getLabelIdByName(labelName);
	return existing ?? createLabel(labelName);
}

function normalizeThesisPayload(payload = {}) {
  if (typeof payload !== 'object' || payload === null) {
    throw new Error('Invalid payload: expected an object');
  }
  if (!payload.title) {
    throw new Error('Missing required field: title');
  }
	const ruleReasonsRaw = payload.rule_reasons ?? null;
	const ruleReasonsStr = toTextOrNull(ruleReasonsRaw);


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
		publisher: payload.publisher ?? null,
		final_label_id: resolveLabelId(payload),
		rule_label: payload.rule_label ?? null,
		rule_score: toIntOrNull(payload.rule_score),
		rule_reasons: ruleReasonsStr,
		ml_label: payload.ml_label ?? null,
		ml_probability: toFloatOrNull(payload.ml_probability),
		hybrid_label: payload.hybrid_label ?? null,
		hybrid_reasons: payload.hybrid_reasons ?? null,
		openAI_decision: payload.openAI_decision ?? null,
		openAI_evidence: payload.openAI_evidence ?? null,
	};
}

const listTheses = () => getAllTheses();

const findThesisById = (id) => getThesisById(id);
const findThesisByLink = (link) => getThesisByLink(link);

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
	createThesisEntry,
	updateThesisEntry,
	deleteThesisEntry,
	normalizeThesisPayload
};
