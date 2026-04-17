""" 
Script to train a TF-IDF + Logistic Regression classifier from a CSV export of thesis data. The CSV should have a text column and a target label column. The script will split the data into training and test sets, train the model, evaluate it, and save both the trained model and the evaluation metrics.
"""
import argparse
import json
import pickle
from pathlib import Path

import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
  accuracy_score,
  classification_report,
  confusion_matrix,
  f1_score,
  precision_score,
  recall_score,
)
from sklearn.model_selection import train_test_split
from sklearn.pipeline import Pipeline

# configuration constants
DEFAULT_INPUT_CSV = "backend/data/exports/tfidf_training_set.csv"


def parse_args() -> argparse.Namespace:
  parser = argparse.ArgumentParser(
    description="Train a TF-IDF + Logistic Regression classifier from exported thesis CSV."
  )
  parser.add_argument(
    "--input",
    default=DEFAULT_INPUT_CSV,
    help="Path to input CSV with text and target columns.",
  )
  parser.add_argument(
    "--sep",
    default=";",
    help="CSV separator used by the input file. Default is ';' for reviewed exports.",
  )
  parser.add_argument(
    "--encoding",
    default=None,
    help="Optional CSV encoding (for example: utf-8, cp1252, latin1). If omitted, the script tries common encodings.",
  )
  parser.add_argument(
    "--text-column",
    default="text",
    help="Name of the text column in CSV.",
  )
  parser.add_argument(
    "--target-column",
    default="target",
    help="Name of the target label column in CSV.",
  )
  parser.add_argument(
    "--test-size",
    type=float,
    default=0.2,
    help="Fraction of data reserved for test split (0-1).",
  )
  parser.add_argument(
    "--random-state",
    type=int,
    default=42,
    help="Random seed for reproducible splits.",
  )
  parser.add_argument(
    "--max-features",
    type=int,
    default=20000,
    help="Maximum TF-IDF vocabulary size.",
  )
  parser.add_argument(
    "--ngram-max",
    type=int,
    default=2,
    choices=[1, 2, 3],
    help="Upper n-gram bound for TF-IDF.",
  )
  parser.add_argument(
    "--output-model",
    default="backend/data/exports/tfidf_model.pkl",
    help="Path to save trained pipeline (pickle).",
  )
  parser.add_argument(
    "--output-metrics",
    default="backend/data/exports/tfidf_metrics.json",
    help="Path to save evaluation metrics JSON.",
  )
  return parser.parse_args()


def read_csv_with_fallback(input_path: Path, sep: str, encoding: str | None) -> pd.DataFrame:
  # When encoding is provided, use it directly so failures are explicit.
  if encoding:
    return pd.read_csv(input_path, sep=sep, encoding=encoding)

  fallback_encodings = ["utf-8", "utf-8-sig", "cp1252", "latin1"]
  last_error: UnicodeDecodeError | None = None

  for candidate in fallback_encodings:
    try:
      return pd.read_csv(input_path, sep=sep, encoding=candidate)
    except UnicodeDecodeError as exc:
      last_error = exc

  raise UnicodeDecodeError(
    "utf-8",
    b"",
    0,
    1,
    (
      "Failed to decode CSV with common encodings "
      f"({', '.join(fallback_encodings)}). "
      "Provide an explicit --encoding value."
    ),
  ) from last_error


def main() -> None:
  args = parse_args()

  input_path = Path(args.input)
  if not input_path.exists():
    raise FileNotFoundError(f"Input CSV not found: {input_path}")

  df = read_csv_with_fallback(input_path, sep=args.sep, encoding=args.encoding)

  required_columns = {args.text_column, args.target_column}
  missing = required_columns.difference(df.columns)
  if missing:
    raise ValueError(f"Missing required columns: {sorted(missing)}")

  # Clean the data
  df = df.dropna(subset=[args.text_column, args.target_column]).copy() # drop rows with missing text or target
  df[args.text_column] = df[args.text_column].astype(str).str.strip() # remove empty texts
  df = df[df[args.text_column] != ""] # drop rows with empty text

  if df.empty:
    raise ValueError("No training data left after cleaning.")

  # Prepare features: x: thesis text, y: 0 or 1
  y = pd.to_numeric(df[args.target_column], errors="coerce") # convert target to numeric, coerce errors to NaN
  df = df.loc[y.notna()].copy() # keep only rows where target could be converted to numeric
  y = y.loc[y.notna()].astype(int) # convert target to integer (0 or 1)
  X = df[args.text_column] # text data for TF-IDF

  # Check class distribution and decide on stratification
  class_counts = y.value_counts().to_dict()
  if len(class_counts) < 2:
    raise ValueError(
      "Need at least two classes in target column to train a classifier."
    )

  # Use stratification only if each class has at least 2 samples.
  min_class_count = min(class_counts.values())
  stratify_target = y if min_class_count >= 2 else None

  X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=args.test_size,
    random_state=args.random_state,
    stratify=stratify_target,
  )

  # Build a pipeline with TF-IDF vectorizer and Logistic Regression classifier
  model = Pipeline(
    steps=[
      (
        "tfidf",
        TfidfVectorizer(
          lowercase=True,
          strip_accents="unicode",
          ngram_range=(1, args.ngram_max),
          max_features=args.max_features,
          sublinear_tf=True,
        ),
      ),
      (
        "clf",
        LogisticRegression(
          max_iter=2000,
          class_weight="balanced",
          random_state=args.random_state,
        ),
      ),
    ]
  )

  # Train the model
  model.fit(X_train, y_train)

  # Predict on the test set
  y_pred = model.predict(X_test)

  metrics = {
    "rows_total": int(len(df)),
    "rows_train": int(len(X_train)),
    "rows_test": int(len(X_test)),
    "class_distribution": {str(k): int(v) for k, v in class_counts.items()},
    "accuracy": float(accuracy_score(y_test, y_pred)),
    "precision": float(precision_score(y_test, y_pred, zero_division=0)),
    "recall": float(recall_score(y_test, y_pred, zero_division=0)),
    "f1": float(f1_score(y_test, y_pred, zero_division=0)),
    "confusion_matrix": confusion_matrix(y_test, y_pred).tolist(),
    "classification_report": classification_report(
      y_test,
      y_pred,
      output_dict=True,
      zero_division=0,
    ),
  }

  # Save the trained model and metrics
  output_model_path = Path(args.output_model)
  output_metrics_path = Path(args.output_metrics)
  output_model_path.parent.mkdir(parents=True, exist_ok=True)
  output_metrics_path.parent.mkdir(parents=True, exist_ok=True)


  # Save the model as a pickle file
  with output_model_path.open("wb") as f:
    pickle.dump(model, f)
  # Save the metrics as a JSON file
  with output_metrics_path.open("w", encoding="utf-8") as f:
    json.dump(metrics, f, indent=2)

  print("Training completed.")
  print(f"Train rows: {metrics['rows_train']}")
  print(f"Test rows: {metrics['rows_test']}")
  print(f"Accuracy: {metrics['accuracy']:.4f}")
  print(f"Precision: {metrics['precision']:.4f}")
  print(f"Recall: {metrics['recall']:.4f}")
  print(f"F1: {metrics['f1']:.4f}")
  print(f"Model saved to: {output_model_path}")
  print(f"Metrics saved to: {output_metrics_path}")


if __name__ == "__main__":
  main()
