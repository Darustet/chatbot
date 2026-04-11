import {
	getAllTheses,
	getThesisById,
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

// resolve label_id from payload, if label_id is provided return it, otherwise try to resolve it from labelName 
// or label, if not found create a new label and return its id
function resolveLabelId(payload) {
	if (payload.label_id !== undefined && payload.label_id !== null) {
		return payload.label_id;
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
	return {
		title: payload.title ?? '',
		author: payload.author ?? '',
		year: toIntOrNull(payload.year),
		university: payload.university ?? null,
		university_code: payload.university_code ?? payload.universityCode ?? null,
		handle: payload.handle ?? null,
		thesisId: payload.thesisId ?? payload.thesis_id ?? null,
		abstract_text: payload.abstract_text ?? payload.abstractText ?? null,
		publisher: payload.publisher ?? null,
		label_id: resolveLabelId(payload)
	};
}

const listTheses = () => getAllTheses();

const findThesisById = (id) => getThesisById(id);

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
	createThesisEntry,
	updateThesisEntry,
	deleteThesisEntry,
	normalizeThesisPayload
};
