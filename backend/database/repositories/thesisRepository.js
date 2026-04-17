import db from '../db.js';

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
    .prepare('INSERT INTO theses (title, author, year, university, university_code, handle, link, thesisId, abstract_text, publisher, label_id, nokia_score, nokia_reasons) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .run(thesis.title, thesis.author, thesis.year, thesis.university, thesis.university_code, thesis.handle, thesis.link, thesis.thesisId, thesis.abstract_text, thesis.publisher, thesis.label_id, thesis.nokia_score, thesis.nokia_reasons);
  if (!stmt.lastInsertRowid) {
    throw new Error('Failed to insert thesis');
  }
  return getThesisById(stmt.lastInsertRowid);
};

const updateThesis = (id, thesis) => {
  const stmt = db
    .prepare(
      'UPDATE theses SET title = ?, author = ?, year = ?, university = ?, university_code = ?, handle = ?, link = ?, thesisId = ?, abstract_text = ?, publisher = ?, label_id = ?, nokia_score = ?, nokia_reasons = ? WHERE id = ?'
    )
    .run(thesis.title, thesis.author, thesis.year, thesis.university, thesis.university_code, thesis.handle, thesis.link, thesis.thesisId, thesis.abstract_text, thesis.publisher, thesis.label_id, thesis.nokia_score, thesis.nokia_reasons, id);
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

export { 
  getAllTheses, 
  getThesisById, 
  createThesis, 
  updateThesis, 
  deleteThesis 
};
