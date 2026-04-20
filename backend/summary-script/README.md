# Summary Script - Python Thesis AI Service

This module provides AI-powered summarization and ML classification support for university theses.

## 📁 Folder Structure

```
summary-script/
├── providers/                      # University-specific thesis data fetchers
│   ├── __init__.py                 # Provider registry (maps university codes to providers)
│   ├── aalto_provider.py           # Aalto University (REST API)
│   ├── helda_provider.py           # Helda University (REST API)
│   ├── non_api_repo_provider.py    # Non-API repository provider (opens an HTML page to locate the abstract text)
│   └── theseus_provider.py         # Theseus platform (PDF downloads)
│   ├── oulurepository_provider.py  # Oulu repository provider (provide the base URL)
│   ├── theseus_provider.py         # Theseus repository provider (provide the base URL)
│   └── trepo_provider.py           # Tampere repository provider (provide the base URL)
├── utils/                          # Shared utilities (university-agnostic)
│   ├── __init__.py
│   └── summarizer.py               # AI summarization logic (BART transformer + fallback)
├── app.py                          # Flask server entry point
└── requirements.txt                # Python dependencies
```

## 🔄 How It Works

### Data Flow

```
University Thesis ID
    ↓
get_provider(uni_code)  [providers/__init__.py]
    ↓
provider.summarize(thesis_id)
    ├─ fetch_abstract()  [provider-specific]
    └─ generate_thesis_points()  [from utils/summarizer.py]
    ↓
Return: Summary points (4 bullet points)
```

### Example

```python
from providers import get_provider

# Fetch provider for Aalto
provider = get_provider('AALTO')

# Summarize an Aalto thesis
result = provider.summarize(thesis_id='12345')
# Returns: {"status": "success", "summary": "• Point 1\n• Point 2\n..."}
```

## 🏫 Providers

### 1. **Aalto Provider** (`providers/aalto_provider.py`)

- **Data Source:** REST API (`aaltodoc.aalto.fi`)
- **Data Fetching:** Queries JSON metadata endpoint
- **Abstract Extraction:** Prefers English, falls back to Finnish
- **Use Case:** Fast, doesn't require file downloads

### 2. **Helda Provider** (`providers/helda_provider.py`)

- **Data Source:** REST API (`helda.helsinki.fi`)
- **Data Fetching:** Queries JSON metadata endpoint
- **Abstract Extraction:** Prefers English, falls back to Finnish
- **Use Case:** Fast, doesn't require file downloads

### 3. **Oulurepo Provider** (`providers/oulurepo_provider.py`)

- **Data Source:** Oulurepo repository (`oulurepo.oulu.fi`)
- **Data Fetching:** Opens the thesis HTML page and looks for the abstract text
- **Abstract Extraction:** Extracts the abstract from HTML meta tags or visible page content
- **Use Case:** Oulu university theses using Oulurepo

### 4. **Theseus Provider** (`providers/theseus_provider.py`)

- **Data Source:** Theseus platform (`theseus.fi`)

- **Data Fetching:** Opens the thesis HTML page and looks for the abstract text
- **Abstract Extraction:** Extracts the abstract from HTML meta tags or visible page content
- **Use Case:** Finnish UAS theses using Theseus

### 5. **Trepo Provider** (`providers/trepo_provider.py`)

- **Data Source:** TREPO repository (`trepo.tuni.fi`)
- **Data Fetching:** Opens the thesis HTML page and looks for the abstract text
- **Abstract Extraction:** Extracts the abstract from HTML meta tags or visible page content
- **Use Case:** Tampere University theses stored in Trepo

## 🧠 Summarization Engine (`utils/summarizer.py`)

Two-tier approach:

1. **Transformer-based (Primary)**
   - Model: `facebook/bart-large-cnn`
   - Automatic AI summary with fallback to manual extraction
   - Requires GPU/CPU (slower but higher quality)

2. **Manual Fallback**
   - Extracts key sentences from abstract
   - Works offline, no model downloads
   - Used when BART fails or is unavailable

**Flow:** Transformer → Manual summary → Error messages

## 🌐 API Endpoints

### `GET /ping`

Simple health endpoint for service liveness checks.

Response:

```json
{
  "status": "ok"
}
```

### `GET /ml-ready`

Diagnostic endpoint for ML inference readiness. Useful for troubleshooting environment and model path issues.

Response fields include:

- `python_executable`
- `python_version`
- `cwd`
- `model_path`
- `model_exists`
- `sklearn_ok`
- `sklearn_version`
- `sklearn_error`

Example:

```json
{
  "python_executable": "...\\.venv\\Scripts\\python.exe",
  "model_exists": true,
  "sklearn_ok": true,
  "sklearn_version": "1.8.0"
}
```

### `POST /classify-thesis`

Returns ML probability that a thesis belongs to the collaboration class.

Request body:

```json
{
  "text": "Thesis title and abstract text"
}
```

Success response:

```json
{
  "probability": 0.7342
}
```

Error behavior:

- `400`: missing `text` field
- `503`: model missing or dependency missing (for example `sklearn`)
- `500`: unexpected runtime failure

## 🧩 Integration Notes

- The classification model is loaded from `backend/data/exports/tfidf_model.pkl`.
- This service returns ML probability only for `/classify-thesis`.
- Thresholding and hybrid decision logic (`NOKIA_COLLABORATION` / `AMBIGUOUS` / `NO_INDICATION_OF_COLLABORATION`) are applied in Node backend route `backend/routes/admin.js`.
