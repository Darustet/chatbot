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
// // Show all tables in the database
// console.log("Tables in database:", db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all());

// Fetch all rows from theses table and log them
// const allTheses = db.prepare('SELECT * FROM theses').all();
// console.log("All theses in database:", allTheses);

// // Get a single row
// const row = db.prepare('SELECT * FROM theses WHERE id = ?').get(1);
// console.log("Row number 1:", row);

// // Check table structure (columns)
// const columns = db.prepare("PRAGMA table_info(theses)").all();
// console.log("Columns in theses table:", columns);

export default db;