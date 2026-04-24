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
  rule_label VARCHAR(64),
  rule_score INTEGER,
  rule_reasons TEXT,
  ml_label VARCHAR(64),
  ml_probability REAL,
  hybrid_label VARCHAR(64),
  hybrid_reasons TEXT,
  final_label_id INTEGER,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (final_label_id) REFERENCES labels(id)
)`;

const thesisExportView = `CREATE VIEW IF NOT EXISTS theses_export_view AS
SELECT
  t.id,
  t.university,
  t.author,
  t.year,
  t.title,
  t.link,
  t.rule_score,
  t.ml_probability,
  l.name AS final_label,
  t.rule_reasons,
  t.abstract_text
FROM theses t
LEFT JOIN labels l
  ON l.id = t.final_label_id`;

const checkTheses = `SELECT COUNT(*) AS count FROM theses`;

const labelsData = `INSERT INTO labels (name) VALUES
('NOKIA_COLLABORATION'),
('AMBIGUOUS'),
('NO_INDICATION_OF_COLLABORATION')`;

const checkLabels = `SELECT COUNT(*) AS count FROM labels`;

export {filename, theses, labels, thesisExportView, checkTheses, labelsData, checkLabels};