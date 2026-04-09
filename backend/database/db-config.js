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
  thesisId VARCHAR(250),
  abstract_text TEXT,
  publisher VARCHAR(250),
  language VARCHAR(50),
  source_system VARCHAR(250),
  label_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (label_id) REFERENCES labels(id)
)`;



const checkTheses = `SELECT COUNT(*) AS count FROM theses`;

const exampleTheses = `INSERT INTO theses (title, author, year, university, university_code, handle, thesisId, abstract_text, publisher, language, source_system, label_id) VALUES
('Thesis 1', 'This is the first thesis', 2020, 'University of Example', 'EXAMPLE', 'handle1', 'thesisId1', 'Example abstract about Nokia collaboration.', 'Example Repository', 'en', 'seed', 1),
('Thesis 2', 'This is the second thesis', 2019, 'University of Example', 'EXAMPLE', 'handle2', 'thesisId2', 'Example abstract with no collaboration signal.', 'Example Repository', 'en', 'seed', 2),
('Thesis 3', 'This is the third thesis', 2021, 'University of Example', 'EXAMPLE', 'handle3', 'thesisId3', 'Example abstract mentioning Nokia in passing.', 'Example Repository', 'en', 'seed', 3)`;

const labelsData = `INSERT INTO labels (name) VALUES
('NOKIA_COLLABORATION'),
('AMBIGUOUS'),
('NO_INDICATION_OF_COLLABORATION')`;

const checkLabels = `SELECT COUNT(*) AS count FROM labels`;

export {filename, theses, labels, checkTheses, exampleTheses, labelsData, checkLabels};