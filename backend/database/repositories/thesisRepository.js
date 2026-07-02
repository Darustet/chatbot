import db from '../db.js';

const getAllTheses = async () => {
  const result = await db.query('SELECT * FROM theses ORDER BY id DESC');
  return result.rows;
};

const getThesisById = async (id) => {
  const result = await db.query(
    'SELECT * FROM theses WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) {
    throw new Error('Thesis not found');
  }

  return result.rows[0];
};

const getThesisByLink = async (link) => {
  const result = await db.query(
    'SELECT * FROM theses WHERE link = $1',
    [link]
  );

  return result.rows[0] || null;
};

const getAbstractByLink = async (link) => {
  const result = await db.query(
    'SELECT abstract_text FROM theses WHERE link = $1',
    [link]
  );

  if (result.rows.length === 0) {
    throw new Error('Thesis not found');
  }

  return result.rows[0].abstract_text;
};

const getThesesByUniversityCode = async (universityCode) => {
  console.log("Searching universityCode:", universityCode);

  const result = await db.query(
    "SELECT * FROM theses WHERE university_code = $1",
    [universityCode]
  );

  console.log("Found rows:", result.rows.length);

  return result.rows;
};

const createThesis = async (thesis) => {
  const result = await db.query(
    `
    INSERT INTO theses (
      title, author, year, university, university_code, handle, link, thesisId,
      abstract_text, rule_label_id, rule_score, rule_reasons, final_label_id,
      openAI_decision, openAI_evidence
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
    )
    RETURNING *
    `,
    [
      thesis.title,
      thesis.author,
      thesis.year,
      thesis.university,
      thesis.university_code,
      thesis.handle,
      thesis.link,
      thesis.thesisId,
      thesis.abstract_text,
      thesis.rule_label_id,
      thesis.rule_score,
      thesis.rule_reasons,
      thesis.final_label_id,
      thesis.openAI_decision,
      thesis.openAI_evidence
    ]
  );

  return result.rows[0];
};

const updateThesis = async (id, thesis) => {
  const result = await db.query(
    `
    UPDATE theses SET
      title = $1,
      author = $2,
      year = $3,
      university = $4,
      university_code = $5,
      handle = $6,
      link = $7,
      thesisId = $8,
      abstract_text = $9,
      rule_label_id = $10,
      rule_score = $11,
      rule_reasons = $12,
      final_label_id = $13,
      openAI_decision = $14,
      openAI_evidence = $15
    WHERE id = $16
    RETURNING *
    `,
    [
      thesis.title,
      thesis.author,
      thesis.year,
      thesis.university,
      thesis.university_code,
      thesis.handle,
      thesis.link,
      thesis.thesisId,
      thesis.abstract_text,
      thesis.rule_label_id,
      thesis.rule_score,
      thesis.rule_reasons,
      thesis.final_label_id,
      thesis.openAI_decision,
      thesis.openAI_evidence,
      id
    ]
  );

  if (result.rows.length === 0) {
    throw new Error('Failed to update thesis');
  }

  return result.rows[0];
};

const deleteThesis = async (id) => {
  const result = await db.query(
    'DELETE FROM theses WHERE id = $1 RETURNING id',
    [id]
  );

  if (result.rows.length === 0) {
    throw new Error('Failed to delete thesis');
  }

  return { id, deleted: true };
};

export {
  getAllTheses,
  getThesisById,
  getThesisByLink,
  getAbstractByLink,
  getThesesByUniversityCode,
  createThesis,
  updateThesis,
  deleteThesis
};