import Database from 'better-sqlite3';
import { filename, theses, checkTheses, exampleTheses, labels, labelsData, checkLabels } from './db-config.js';

console.log(`Opening SQLite database at: ${filename}`);
const db = new Database(filename);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// init tables, use exec only for CREATE TABLE
db.exec(labels);
db.exec(theses);

// check if the labels table is empty
const labelsCount = (db.prepare(checkLabels).get()).count;
if (labelsCount === 0) {
  db.prepare(labelsData).run();
  console.log('Inserted example labels.');
} else {
  console.log('Labels table already populated.');
}

// chekck if the theses table is empty
const thesesCount = (db.prepare(checkTheses).get()).count;
// If the table is empty, insert example theses
if (thesesCount === 0) {
  db.prepare(exampleTheses).run();
  console.log('Inserted example theses.');
} else {
  console.log('Theses table already populated.');
}


// // Test
// const labelsRow = db.prepare('SELECT * FROM labels').all();
// console.log(`Current labels in database: ${labelsRow.length}`);
// const firstLabel = labelsRow[0];
// if (firstLabel) {
//   console.log('Example label record:', firstLabel);
// } else {
//   console.log('No labels found in database after initialization.');
// }

const thesesRows = db.prepare('SELECT * FROM theses').all();
console.log(`Current theses in database: ${thesesRows.length}`);
const firstThesis = thesesRows[5];
if (firstThesis) {
  console.log('Example thesis record:', firstThesis);
} else {
  console.log('No theses found in database after initialization.');
}

export default db;