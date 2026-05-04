import {
	getAllTheses,
	getThesisById,
	createThesis,
	updateThesis,
	deleteThesis,
	getThesesByUniversityCode,
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
	};
}

const thesesGet = () => getAllTheses();

const thesisByIdGet = (id) => getThesisById(id);

const thesisEntryPost = (payload) => {
	const thesis = normalizeThesisPayload(payload);
	return createThesis(thesis);
};

const ThesisEntryUpdate = (id, payload) => {
	const thesis = normalizeThesisPayload(payload);
	return updateThesis(id, thesis);
};

const ThesisEntryDelete = (id) => deleteThesis(id);

function toReasonArray(value) {
	if (Array.isArray(value)) {
		return value.map((item) => String(item));
	}

	if (typeof value !== 'string' || value.trim() === '') {
		return [];
	}

	try {
		const parsed = JSON.parse(value);
		if (Array.isArray(parsed)) {
			return parsed.map((item) => String(item));
		}
	} catch {
		// Stored reasons can be plain text; keep fallback parsing below.
	}

	if (value.includes(';')) {
		return value
			.split(';')
			.map((part) => part.trim())
			.filter(Boolean);
	}

	return [value];
}

function mapDbThesisRowToApiItem(row) {
	const finalLabel = row.final_label || row.hybrid_label || row.rule_label || null;
	const ruleScore = Number(row.rule_score) ?? null;

	return {
		thesis: {
			handle: row.handle,
			link: row.link,
			thesisId: row.thesisId,
			title: row.title,
			author: row.author,
			year: row.year == null ? null : String(row.year),
			publisher: row.publisher,
			universityCode: row.university_code,
			abstractByLanguage: {
				en: row.abstract_text || ''
			}
		},
		ruleScore: ruleScore,
		ruleLabel: row.rule_label || null,
		ruleReasons: toReasonArray(row.rule_reasons),
		mlProbability: typeof row.ml_probability === 'number' ? row.ml_probability : null,
		finalLabel: finalLabel,
		_isCollaboration: finalLabel === 'NOKIA_COLLABORATION' ? 'yes' : 'no'
	};
}

/**
 * Get all theses for a university by university code, mapped to frontend contract with stored labels
 * 
 * @param {string} uniCode - University code
 * @returns {Array} Theses mapped to frontend contract with stored labels
 */
const thesesByUniversityCodeGet = (uniCode, rpp = null) => {
	try {
		const theses = getThesesByUniversityCode(uniCode, rpp);
		console.log(`[thesesByUniversityCodeGet] Retrieved ${theses ? theses.length : 0} theses for university code: ${uniCode} with limit: ${rpp}`);
		if (theses) {
			const thesesWithScores = theses.map(mapDbThesisRowToApiItem);
			// return sorted by rule score descending
			const sortedTheses = thesesWithScores.sort(
				(a, b) => {
					if (a.ruleScore == null && b.ruleScore == null) return 0;
					if (a.ruleScore == null) return 1;
					if (b.ruleScore == null) return -1;
					return b.ruleScore - a.ruleScore;
				}
			);
			return sortedTheses;
		}
		throw new Error("No theses found");
	} catch (error) {
		console.error('Error in thesesByUniversityCodeGet:', error.message);
		throw error;
	}
};


export {
	thesesGet,
	thesisByIdGet,
	thesisEntryPost,
	ThesisEntryUpdate,
	ThesisEntryDelete,
	normalizeThesisPayload,
	thesesByUniversityCodeGet,
};
