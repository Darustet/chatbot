# Thesis ML Scripts README

This folder contains helper scripts for exporting thesis data from SQLite, training a baseline TF-IDF model, and comparing rule labels vs ML predictions.

## Scripts in this folder

- export_data.py
  - Reads theses + labels from backend/theses.sqlite
  - Builds training rows
  - Writes backend/data/exports/tfidf_training_set.csv

- train_tfidf.py
  - Reads the training CSV
  - Trains TF-IDF + Logistic Regression
  - Writes model and metrics:
    - backend/data/exports/tfidf_model.pkl
    - backend/data/exports/tfidf_metrics.json

- compare_rule_vs_ml.py
  - Reads theses + labels from SQLite
  - Loads trained model
  - Compares rule binary labels against ML predictions
  - Writes:
    - backend/data/exports/rule_vs_ml_all.csv
    - backend/data/exports/rule_vs_ml_disagreements.csv
    - backend/data/exports/rule_vs_ml_summary.json

## Recommended workflow

Run scripts in this order from repo root:

1. Export data

   python backend/scripts/export_data.py

2. Train model

   python backend/scripts/train_tfidf.py --sep ","

3. Compare rule vs ML

   python backend/scripts/compare_rule_vs_ml.py

Optional: include AMBIGUOUS as class 0 during comparison:

    python backend/scripts/compare_rule_vs_ml.py --map-ambiguous-to-zero

## Why --sep "," is important

- export_data.py writes CSV using pandas default separator (comma).
- train_tfidf.py defaults to semicolon separator.
- If you do not pass --sep ",", training may fail to find expected columns.

## Data and label policy

Current label handling in scripts:

- Supported labels:
  - NOKIA_COLLABORATION
  - NO_INDICATION_OF_COLLABORATION
  - AMBIGUOUS

- export_data.py
  - By default excludes AMBIGUOUS from training (MAP_AMBIGUOUS_TO_ZERO = False).
  - If MAP_AMBIGUOUS_TO_ZERO is set True, AMBIGUOUS is mapped to 0.

- compare_rule_vs_ml.py
  - By default excludes AMBIGUOUS from comparison.
  - Use --map-ambiguous-to-zero to include AMBIGUOUS as 0.

## Inputs and outputs (contract)

Input database:

- backend/theses.sqlite

Produced artifacts:

- backend/data/exports/tfidf_training_set.csv
- backend/data/exports/tfidf_model.pkl
- backend/data/exports/tfidf_metrics.json
- backend/data/exports/rule_vs_ml_all.csv
- backend/data/exports/rule_vs_ml_disagreements.csv
- backend/data/exports/rule_vs_ml_summary.json

These files are intended to be reproducible from the scripts above.

## Runtime integration

- The trained model artifact (`backend/data/exports/tfidf_model.pkl`) is loaded by the Flask service endpoint `POST /classify-thesis`.
- During `POST /api/admin/collect-theses`, the Node backend calls `POST /classify-thesis` for each thesis (title + abstract text).
- Classification probability is persisted to SQLite as `ml_probability` together with `ml_label` and `hybrid_label`.

## Environment notes

Minimum Python packages needed:

- pandas
- scikit-learn

Install dependencies in the active environment:

.\backend\summary-script\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install pandas scikit-learn

If you run the scripts directly, activate the Python environment first and run them from the repository root so relative paths resolve correctly.

Recommended direct-run flow in PowerShell:

.\backend\summary-script\.venv\Scripts\Activate.ps1
python backend/scripts/export_data.py
python backend/scripts/train_tfidf.py --sep ","
python backend/scripts/compare_rule_vs_ml.py

If you use run_all.bat, you do not need to activate the virtual environment manually because the batch file starts the Python summary service with backend/summary-script/.venv\Scripts\python.exe.

## Troubleshooting

1. Error: Input CSV not found

- Ensure export_data.py was run first.

2. Error: Missing required columns in train_tfidf.py

- Most likely wrong CSV separator.
- Use --sep ",".

3. Error: Model file not found in compare_rule_vs_ml.py

- Ensure train_tfidf.py completed and produced tfidf_model.pkl.

4. Empty dataset after filtering

- Check labels in DB and whether AMBIGUOUS filtering removed too many rows.

## Team conventions

- Keep script defaults stable for reproducibility.
- Document any behavior change in this README.
- If changing output schema, update downstream consumers and this file in the same PR.

## Quick command summary

    python backend/scripts/export_data.py
    python backend/scripts/train_tfidf.py --sep ","
    python backend/scripts/compare_rule_vs_ml.py
