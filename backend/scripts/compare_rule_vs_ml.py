import argparse
import json
import pickle
import sqlite3
from pathlib import Path

import pandas as pd
from sklearn.metrics import classification_report, confusion_matrix


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Compare rule-based labels from SQLite against ML model predictions."
    )
    parser.add_argument(
        "--db-path",
        default="backend/theses.sqlite",
        help="Path to SQLite database.",
    )
    parser.add_argument(
        "--model-path",
        default="backend/data/exports/tfidf_model.pkl",
        help="Path to trained TF-IDF model pickle.",
    )
    parser.add_argument(
        "--map-ambiguous-to-zero",
        action="store_true",
        help="If set, map AMBIGUOUS to 0; otherwise exclude AMBIGUOUS rows.",
    )
    parser.add_argument(
        "--output-all",
        default="backend/data/exports/rule_vs_ml_all.csv",
        help="Path to save row-level comparison CSV.",
    )
    parser.add_argument(
        "--output-disagreements",
        default="backend/data/exports/rule_vs_ml_disagreements.csv",
        help="Path to save disagreement-only CSV.",
    )
    parser.add_argument(
        "--output-summary",
        default="backend/data/exports/rule_vs_ml_summary.json",
        help="Path to save summary metrics JSON.",
    )
    return parser.parse_args()


def load_sqlite_data(db_path: Path) -> pd.DataFrame:
    query = """
    SELECT
      t.id,
      t.title,
      t.abstract_text,
      l.name AS rule_label
    FROM theses t
    LEFT JOIN labels l ON l.id = t.label_id
    """

    with sqlite3.connect(str(db_path)) as conn:
        df = pd.read_sql_query(query, conn)

    return df


def prepare_data(df: pd.DataFrame, map_ambiguous_to_zero: bool) -> pd.DataFrame:
    df = df.dropna(subset=["title", "abstract_text", "rule_label"]).copy()
    df["title"] = df["title"].astype(str).str.strip()
    df["abstract_text"] = df["abstract_text"].astype(str).str.strip()
    df = df[(df["title"] != "") | (df["abstract_text"] != "")]

    df["text"] = (df["title"] + " " + df["abstract_text"]).str.replace(r"\s+", " ", regex=True).str.strip()

    allowed_labels = {
        "NOKIA_COLLABORATION",
        "NO_INDICATION_OF_COLLABORATION",
        "AMBIGUOUS",
    }
    df = df[df["rule_label"].isin(allowed_labels)].copy()

    label_map = {
        "NOKIA_COLLABORATION": 1,
        "NO_INDICATION_OF_COLLABORATION": 0,
    }

    if map_ambiguous_to_zero:
        label_map["AMBIGUOUS"] = 0
    else:
        df = df[df["rule_label"] != "AMBIGUOUS"].copy()

    df["rule_binary"] = df["rule_label"].map(label_map)
    df = df.dropna(subset=["rule_binary"]).copy()
    df["rule_binary"] = df["rule_binary"].astype(int)

    return df


def main() -> None:
    args = parse_args()

    db_path = Path(args.db_path)
    model_path = Path(args.model_path)

    if not db_path.exists():
        raise FileNotFoundError(f"SQLite database not found: {db_path}")
    if not model_path.exists():
        raise FileNotFoundError(f"Model file not found: {model_path}")

    with model_path.open("rb") as f:
        model = pickle.load(f)

    raw_df = load_sqlite_data(db_path)
    df = prepare_data(raw_df, args.map_ambiguous_to_zero)

    if df.empty:
        raise ValueError("No comparable rows after filtering. Check label mapping settings.")

    df["ml_binary"] = model.predict(df["text"])
    df["ml_binary"] = pd.to_numeric(df["ml_binary"], errors="coerce")
    df = df.dropna(subset=["ml_binary"]).copy()
    df["ml_binary"] = df["ml_binary"].astype(int)

    df["is_disagree"] = df["rule_binary"] != df["ml_binary"]

    total_rows = int(len(df))
    disagree_rows = int(df["is_disagree"].sum())
    agree_rows = total_rows - disagree_rows
    agreement_rate = (agree_rows / total_rows) if total_rows else 0.0

    cm = confusion_matrix(df["rule_binary"], df["ml_binary"], labels=[0, 1]).tolist()
    report = classification_report(
        df["rule_binary"],
        df["ml_binary"],
        labels=[0, 1],
        target_names=["rule_0", "rule_1"],
        output_dict=True,
        zero_division=0,
    )

    summary = {
        "rows_compared": total_rows,
        "rows_agree": agree_rows,
        "rows_disagree": disagree_rows,
        "agreement_rate": agreement_rate,
        "map_ambiguous_to_zero": args.map_ambiguous_to_zero,
        "confusion_matrix_rule_vs_ml": cm,
        "classification_report_rule_as_truth": report,
    }

    output_all = Path(args.output_all)
    output_disagreements = Path(args.output_disagreements)
    output_summary = Path(args.output_summary)

    output_all.parent.mkdir(parents=True, exist_ok=True)
    output_disagreements.parent.mkdir(parents=True, exist_ok=True)
    output_summary.parent.mkdir(parents=True, exist_ok=True)

    ordered_cols = [
        "id",
        "rule_label",
        "rule_binary",
        "ml_binary",
        "is_disagree",
        "link",
        "title",
        "abstract_text",
        "text",
    ]

    df.to_csv(output_all, index=False, columns=ordered_cols, encoding="utf-8")
    df[df["is_disagree"]].to_csv(
        output_disagreements, index=False, columns=ordered_cols, encoding="utf-8"
    )

    with output_summary.open("w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2)

    print("Comparison completed.")
    print(f"Rows compared: {total_rows}")
    print(f"Agreement rate: {agreement_rate:.4f}")
    print(f"Disagreements: {disagree_rows}")
    print(f"All rows CSV: {output_all}")
    print(f"Disagreements CSV: {output_disagreements}")
    print(f"Summary JSON: {output_summary}")


if __name__ == "__main__":
    main()
