const filename = 'theses.sqlite';

const labels = `CREATE TABLE IF NOT EXISTS labels (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name VARCHAR(250) NOT NULL
)`;

const theses = `CREATE TABLE IF NOT EXISTS theses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title VARCHAR(250) NOT NULL,
  author VARCHAR(250),
  year INTEGER,
  university VARCHAR(250),
  university_code VARCHAR(250),
  handle VARCHAR(250),
  link VARCHAR(500),
  thesisId VARCHAR(250),
  abstract_text TEXT,
  publisher VARCHAR(250),
  label_id INTEGER,
  nokia_score INTEGER,
  nokia_reasons TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (label_id) REFERENCES labels(id)
)`;

const checkTheses = `SELECT COUNT(*) AS count FROM theses`;

const labelsData = `INSERT INTO labels (name) VALUES
('NOKIA_COLLABORATION'),
('AMBIGUOUS'),
('NO_INDICATION_OF_COLLABORATION')`;

const checkLabels = `SELECT COUNT(*) AS count FROM labels`;

export {filename, theses, labels, checkTheses, labelsData, checkLabels};