# Summary Script - Python Thesis Summarization Service

This module provides AI-powered summarization for university theses from multiple data sources.

## 📁 Folder Structure

```
summary-script/
├── providers/           # University-specific thesis data fetchers
│   ├── __init__.py      # Provider registry (maps university codes to providers)
│   ├── aalto_provider.py    # Aalto University (REST API)
│   └── theseus_provider.py  # Theseus platform (PDF downloads)
│   └── other_university.py  # Other university provider
├── utils/              # Shared utilities (university-agnostic)
│   ├── __init__.py
│   └── summarizer.py   # AI summarization logic (BART transformer + fallback)
├── app.py             # Flask server entry point
└── requirements.txt   # Python dependencies
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

- **Data Source:** REST API (aaltodoc.aalto.fi)
- **Data Fetching:** Queries JSON metadata endpoint
- **Abstract Extraction:** Prefers English, falls back to Finnish
- **Use Case:** Fast, doesn't require file downloads

### 2. **Theseus Provider** (`providers/theseus_provider.py`)

- **Data Source:** Theseus platform (theseus.fi)
- **Data Fetching:** Downloads PDF, extracts text
- **Abstract Extraction:** Reads from PDF metadata/content
- **Use Case:** Finnish universities using Theseus

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
