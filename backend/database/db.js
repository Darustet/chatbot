import Database from 'better-sqlite3';
import { filename, theses, labels, thesisExportView, labelsData, checkLabels } from './db-config.js';

console.log(`Opening SQLite database at: ${filename}`);
const db = new Database(filename);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// init tables, use exec only for CREATE TABLE
db.exec(labels);
db.exec(theses);
db.exec(thesisExportView);

// check if the labels table is empty
const labelsCount = (db.prepare(checkLabels).get()).count;
if (labelsCount === 0) {
  db.prepare(labelsData).run();
  console.log('Inserted example labels.');
} else {
  console.log('Labels table already populated.');
}

// // TEST
//insert a test row
/* const insert = db.prepare(`
  INSERT INTO theses (
    title, author, year, university, university_code, handle, link, thesisId,
    abstract_text, final_label_id, rule_label, rule_score, rule_reasons,
    ml_label, ml_probability, hybrid_label, hybrid_reasons, openAI_decision, openAI_evidence
  )
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`).run(
  "Test Thesis",
  "John Doe",
  2024,
  "Test University",
  "TEST_UNIV",
  "12345/67890",
  "http://example.com/thesis/12345/67890",
  null,
  "This is a test abstract.",
  null,
  "NOKIA_COLLABORATION",
  8,
  "Contains keywords related to Nokia.",
  null,
  null,
  null,
  null,
  "yes",
  "Both rule-based and ML approaches indicate a collaboration with Nokia."
);

console.log("Inserted test thesis with ID:", insert.lastInsertRowid);
*/

//Show all tables in the database
//console.log("Tables in database:", db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all());

// Fetch all rows from theses table and log them
// const allTheses = db.prepare('SELECT * FROM theses').all();
// console.log("All theses in database:", allTheses);

// // Get a single row
//const row = db.prepare('SELECT * FROM theses WHERE id = ?').get(2);
//console.log("Row number 2:", row);

// // Check table structure (columns)
//const columns = db.prepare("PRAGMA table_info(theses)").all();
//console.log("Columns in theses table:", columns);

export default db;