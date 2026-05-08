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
  extracted_text TEXT,
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

// View to see the rule-based and ML-based decisions alongside
// If a rule score is larger than 8, it's collaboration,
// if a ml probability is larger than 0.5, it's collaboration
const thesisExportView = `
DROP VIEW IF EXISTS theses_export_view;
CREATE VIEW theses_export_view AS
SELECT
  id,
  university,
  abstract_text,
  title,
  author,
  year,
  link,
  rule_reasons,
  rule_score,
  ml_probability,
  CASE
    WHEN rule_score >= 8 THEN 'YES'
    ELSE '--'
  END AS rule_decision,
  CASE
    WHEN ml_probability > 0.5 THEN 'YES'
    ELSE '--'
  END AS ml_decision
FROM theses`;

const checkTheses = `SELECT COUNT(*) AS count FROM theses`;

const labelsData = `INSERT INTO labels (name) VALUES
('NOKIA_COLLABORATION'),
('AMBIGUOUS'),
('NO_INDICATION_OF_COLLABORATION')`;

const checkLabels = `SELECT COUNT(*) AS count FROM labels`;

export {filename, theses, labels, thesisExportView, checkTheses, labelsData, checkLabels};