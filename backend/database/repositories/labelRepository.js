import db from '../db.js';

const getLabelIdByName = async (name) => {
  const result = await db.query(
    'SELECT id FROM labels WHERE name = $1',
    [name]
  );

  if (result.rows.length === 0) return null;
  return result.rows[0].id;
};

const getLabelById = async (id) => {
  const result = await db.query(
    'SELECT * FROM labels WHERE id = $1',
    [id]
  );

  if (result.rows.length === 0) return null;
  return result.rows[0];
};

const createLabel = async (name) => {
  const result = await db.query(
    'INSERT INTO labels (name) VALUES ($1) RETURNING id',
    [name]
  );

  return result.rows[0].id;
};

const updateLabel = async (id, name) => {
  const result = await db.query(
    'UPDATE labels SET name = $1 WHERE id = $2 RETURNING *',
    [name, id]
  );

  if (result.rows.length === 0) {
    throw new Error('Failed to update label');
  }

  return result.rows[0];
};

const deleteLabel = async (id) => {
  const result = await db.query(
    'DELETE FROM labels WHERE id = $1 RETURNING id',
    [id]
  );

  if (result.rows.length === 0) {
    throw new Error('Failed to delete label');
  }
};

export {
  getLabelIdByName,
  getLabelById,
  createLabel,
  updateLabel,
  deleteLabel
};