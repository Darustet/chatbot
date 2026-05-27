# Summary Script - Python Thesis AI Service

This module provides AI-powered summarization and ML classification support for university theses.

##  Folder Structure

```
summary-script/
├── providers/                # University-specific thesis data fetchers
│   ├── __init__.py           # Provider registry (maps university codes to providers)
│   ├── repo_provider.py      # Repository provider (builds thesis page URLs and retrieves abstracts from the database)
│   ├── summarizer.py         # AI summarization logic (BART transformer with fallback)
├── app.py                    # Flask server entry point
└── requirements.txt          # Python dependencies
```

## How It Works
### Data Flow
```
University Thesis ID
    ↓
get_provider(uni_code)  [providers/__init__.py]
    ↓
provider.summarize(thesis_key)  [providers/repo_provider.py]
    ├─ _build_handle_page_url(thesis_key)
    ├─ subprocess.run(["node", RUNNER_PATH, page_url])
    │    └─ Fetch abstract from database using page_url
    └─ getSummarize(abstract_text)  [providers/summarizer.py]
         └─ Generate 4 summary bullet points

Return:
{
    "summary": "...",
    "Abstract": "...",
    "page_url": "..."
}
```

### Example



```python
from providers import get_provider

# Fetch provider for Aalto
provider = get_provider("AALTO")

# Summarize an Aalto thesis
result = provider.summarize("12345")

# Returns:
# {
#     "summary": "• Point 1\n• Point 2\n...",
#     "Abstract": "Full abstract text from the thesis...",
#     "page_url": "https://aaltodoc.aalto.fi/handle/12345"
# }

```

## 🏫 Providers
AALTO      → https://aaltodoc.aalto.fi 

THESEUS    → https://www.theseus.fi

TREPO      → https://trepo.tuni.fi

HELDA      → https://helda.helsinki.fi

OULUREPO   → https://oulurepo.oulu.fi

LUTPUB     → https://lutpub.lut.fi

### Each provider:

- Builds the thesis page URL from a thesis handle/identifier
- Fetches the abstract from the database
- Generates AI-based summary bullet points using the summarizer service


##  Summarization Engine (`utils/summarizer.py`)

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

##  API Endpoints

### `GET /ping`

Simple health endpoint for service liveness checks.

Response:

```json
{
  "status": "ok"
}
```