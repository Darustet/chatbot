import db from '../db.js';

const getLabelIdByName = (name) => {
  const labelId = db
    .prepare('SELECT id FROM labels WHERE name = ?')
    .get(name);
  if (!labelId) {
    return null;
  }
  return labelId.id;
};

const getLabelById = (id) => {
  const label = db
    .prepare('SELECT * FROM labels WHERE id = ?')
    .get(id);
  if (!label) {
    return null;
  }
  return label;
};


const createLabel = (name) => {
  const stmt = db
    .prepare('INSERT INTO labels (name) VALUES (?)')
    .run(name);
  if (stmt.lastInsertRowid === 0) {
    throw new Error('Failed to create label');
  }
  return getLabelIdByName(name);
};

const updateLabel = (id, name) => {
  const stmt = db
    .prepare('UPDATE labels SET name = ? WHERE id = ?')
    .run(name, id);
  if (stmt.changes === 0) {
    throw new Error('Failed to update label');
  }
  return getLabelById(id);
};

const deleteLabel = (id) => {
  const deleteTransaction  = db.transaction((labelId) => {
    const stmt = db.prepare('DELETE FROM labels WHERE id = ?').run(id);
    if (stmt.changes === 0) {
      throw new Error('Failed to delete label');
    }
  });

  deleteTransaction(id);
}

export {
  getLabelIdByName,
  getLabelById,
  createLabel,
  updateLabel,
  deleteLabel
};