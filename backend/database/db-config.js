const labels = `
CREATE TABLE IF NOT EXISTS labels (
  id SERIAL PRIMARY KEY,
  name VARCHAR(250) NOT NULL UNIQUE
);
`;

const theses = `
CREATE TABLE IF NOT EXISTS theses (
  id SERIAL PRIMARY KEY,
  title VARCHAR(250) NOT NULL,
  author VARCHAR(250),
  year INTEGER,
  university VARCHAR(250),
  university_code VARCHAR(250),
  handle VARCHAR(250),
  link VARCHAR(500) UNIQUE,
  thesisId VARCHAR(250),
  abstract_text TEXT,

  rule_label_id INTEGER REFERENCES labels(id),
  rule_score INTEGER,
  rule_reasons TEXT,

  final_label_id INTEGER REFERENCES labels(id),
  openAI_decision TEXT CHECK (openAI_decision IN ('yes', 'no', 'unknown')) DEFAULT 'unknown',
  openAI_evidence TEXT,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

const summaries = `
CREATE TABLE IF NOT EXISTS summaries (
  id SERIAL PRIMARY KEY,
  link VARCHAR(500) UNIQUE,
  summary TEXT NOT NULL,
  CONSTRAINT fk_summaries_link
    FOREIGN KEY (link)
    REFERENCES theses(link)
    ON DELETE CASCADE
);
`;

const thesisExportView = `
CREATE OR REPLACE VIEW theses_export_view AS
SELECT
  t.id,
  t.university,
  t.author,
  t.year,
  t.title,
  t.link,
  t.abstract_text,
  rl.name AS rule_label,
  t.rule_score,
  t.rule_reasons,
  fl.name AS final_label,
  t."openAI_decision",
  t."openAI_evidence"
FROM theses t
LEFT JOIN labels rl ON rl.id = t.rule_label_id
LEFT JOIN labels fl ON fl.id = t.final_label_id;
`;

const checkTheses = `SELECT COUNT(*) AS count FROM theses;`;

const labelsData = `
INSERT INTO labels (name) VALUES
('NOKIA_COLLABORATION'),
('AMBIGUOUS'),
('NO_INDICATION_OF_COLLABORATION')
ON CONFLICT (name) DO NOTHING;
`;

const checkLabels = `SELECT COUNT(*) AS count FROM labels;`;

export {
  theses,
  labels,
  summaries,
  thesisExportView,
  checkTheses,
  labelsData,
  checkLabels
};