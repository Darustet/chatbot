import db from '../db.js';
import { normalizeUniCode } from '../../providers/helpers.js';

const getAllTheses = () => {
  return db.prepare('SELECT * FROM theses').all();
};

const getThesisById = (id) => {
  const result = db
    .prepare('SELECT * FROM theses WHERE id = ?')
    .get(id);
  if (!result) {
    throw new Error('Thesis not found');
  }
  return result;
};

const createThesis = (thesis) => {
  const stmt = db
    .prepare('INSERT INTO theses (title, author, year, university, university_code, handle, link, thesisId, abstract_text, publisher, final_label_id, rule_label, rule_score, rule_reasons, ml_label, ml_probability, hybrid_label, hybrid_reasons) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(thesis.title, thesis.author, thesis.year, thesis.university, thesis.university_code, thesis.handle, thesis.link, thesis.thesisId, thesis.abstract_text, thesis.publisher, thesis.final_label_id, thesis.rule_label, thesis.rule_score, thesis.rule_reasons, thesis.ml_label, thesis.ml_probability, thesis.hybrid_label, thesis.hybrid_reasons);
  if (!stmt.lastInsertRowid) {
    throw new Error('Failed to insert thesis');
  }
  return getThesisById(stmt.lastInsertRowid);
};

const updateThesis = (id, thesis) => {
  const stmt = db
    .prepare(
      'UPDATE theses SET title = ?, author = ?, year = ?, university = ?, university_code = ?, handle = ?, link = ?, thesisId = ?, abstract_text = ?, publisher = ?, final_label_id = ?, rule_label = ?, rule_score = ?, rule_reasons = ?, ml_label = ?, ml_probability = ?, hybrid_label = ?, hybrid_reasons = ? WHERE id = ?'
    )
    .run(thesis.title, thesis.author, thesis.year, thesis.university, thesis.university_code, thesis.handle, thesis.link, thesis.thesisId, thesis.abstract_text, thesis.publisher, thesis.final_label_id, thesis.rule_label, thesis.rule_score, thesis.rule_reasons, thesis.ml_label, thesis.ml_probability, thesis.hybrid_label, thesis.hybrid_reasons, id);
  if (stmt.changes === 0) {
    throw new Error('Failed to update thesis');
  }
  return getThesisById(id);
};

const deleteThesis = (id) => {
  const stmt = db
    .prepare('DELETE FROM theses WHERE id = ?')
    .run(id); 
  if (stmt.changes === 0) {
    throw new Error('Failed to delete thesis');
  }
  return { id, deleted: true };
};

/**
 * Get theses by university code with optional limit
 * @param {string} uniCode - University code
 * @param {number} limit - Maximum results to return
 * @returns {Array} Array of thesis records
 */
const getThesesByUniversityCode = (uniCode, limit = null) => {
  try {
    // Normalize university code to encoded format to match database
    // Database stores codes as encoded (e.g., 10024%2F6)
    // Route receives decoded from URL (e.g., 10024/6)
    const normalizedUniCode = normalizeUniCode(uniCode);
    const baseQuery = `
      SELECT t.*, l.name AS final_label
      FROM theses t
      LEFT JOIN labels l ON t.final_label_id = l.id
      WHERE t.university_code = ?
      ORDER BY t.rule_score DESC, t.year DESC
    `;
    const query = Number(limit) > 0
      ? `${baseQuery} LIMIT ?`
      : baseQuery;
    const stmt = db.prepare(query);
    const rows = Number(limit) > 0
      ? stmt.all(normalizedUniCode, Number(limit))
      : stmt.all(normalizedUniCode);
    if (rows.length === 0) {
      return null;
    }
    return rows;
  } catch (error) {
    console.error('Database error in getThesesByUniversityCode:', error.message);
    throw error;
  }
};

/**
 * Update only scoring-related fields for a thesis row
 * @param {number} id - thesis row id
 * @param {object} scores - object with scoring fields
 */
const updateThesisScores = (id, scores) => {
  const stmt = db.prepare(
    `UPDATE theses SET
       rule_label = ?,
       rule_score = ?,
       rule_reasons = ?,
       ml_label = ?,
       ml_probability = ?,
       hybrid_label = ?,
       hybrid_reasons = ?,
       final_label_id = ?
     WHERE id = ?`
  );
  const result = stmt.run(
    scores.rule_label ?? null,
    scores.rule_score ?? null,
    scores.rule_reasons ?? null,
    scores.ml_label ?? null,
    scores.ml_probability ?? null,
    scores.hybrid_label ?? null,
    scores.hybrid_reasons ?? null,
    scores.final_label_id ?? null,
    id
  );
  if (result.changes === 0) {
    throw new Error('Failed to update thesis scores');
  }
  return getThesisById(id);
};


export { 
  getAllTheses, 
  getThesisById, 
  createThesis, 
  updateThesis, 
  deleteThesis,
  getThesesByUniversityCode,
  updateThesisScores,
};
