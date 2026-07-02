import db from '../db.js';

const getSummaryByLink = async (link) => {
  const result = await db.query(
    `SELECT summary
     FROM summaries
     WHERE link = $1`,
    [link]
  );

  return result.rows[0]?.summary ?? [];
};

const createSummary = async (link, summary) => {
  const result = await db.query(
    `INSERT INTO summaries (link, summary)
     VALUES ($1, $2)
     RETURNING *`,
    [link, summary]
  );

  return result.rows[0]?.summary ?? "";
};

export {getSummaryByLink, createSummary};
