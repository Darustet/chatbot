import sqlite3
import pandas as pd

DB_PATH = "backend/theses.sqlite"
OUTPUT_CSV = "backend/data/exports/tfidf_training_set.csv"

# exclude AMBIGUOUS from training
MAP_AMBIGUOUS_TO_ZERO = False

conn = sqlite3.connect(DB_PATH)
query = """
SELECT
  theses.id,
  theses.title,
  theses.abstract_text,
  labels.name AS label,
  theses.university,
  theses.author,
  theses.rule_score,
  theses.link,
  theses.nokia_reasons
FROM theses
LEFT JOIN labels ON labels.id = theses.label_id
"""

df = pd.read_sql_query(query, conn)

# Keep only rows with a label and non-empty text
df = df.dropna(subset=["title", "abstract_text", "label"])
df["title"] = df["title"].astype(str).str.strip()
df["abstract_text"] = df["abstract_text"].astype(str).str.strip()
df = df[(df["title"] != "") | (df["abstract_text"] != "")]

# Combine text fields for TF-IDF
df["text"] = df["title"] + " " + df["abstract_text"]

allowed_labels = {
  "NOKIA_COLLABORATION",
  "NO_INDICATION_OF_COLLABORATION",
  "AMBIGUOUS",
}
df = df[df["label"].isin(allowed_labels)].copy()

# Convert labels to binary target
label_map = {
  "NOKIA_COLLABORATION": 1,
  "NO_INDICATION_OF_COLLABORATION": 0,
}

if MAP_AMBIGUOUS_TO_ZERO:
  label_map["AMBIGUOUS"] = 0
else:
  # Exclude ambiguous rows from training
  df = df[df["label"] != "AMBIGUOUS"].copy()

# Map labels to target values
df["target"] = df["label"].map(label_map)

# Drop rows that still failed to map
df = df.dropna(subset=["target"])

# keep only the columns we need
export_df = df[["id", "text", "target", "label", "title", "university", "author", "rule_score", "link",  "nokia_reasons"]].copy()

export_df.to_csv(OUTPUT_CSV, index=False, encoding="utf-8")
print(f"Saved {len(export_df)} rows to {OUTPUT_CSV}")
print(export_df["target"].value_counts())