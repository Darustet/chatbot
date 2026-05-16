# Backend Documentation

This project uses two backend services:

- Express API at port `3000`.
- Flask summary/ML API at port `5001`.

## Start Services

From project root on Windows:

```bat
install_all.bat
run_all.bat
```

From project root on Mac/Linux:

```bat
install_all.sh
run_all.sh
```

`run_all.bat`or `run_all.sh` starts:

- `backend/server.js` (Express)
- `backend/summary-script/app.py` (Flask, via `.venv\Scripts\python.exe`)

## API Surface

### Express (`http://localhost:3000`)

- `GET /uni/:uni`
- `GET /single-thesis/:handle`
- `GET /health`
- `POST /api/admin/collect-theses`
- `/api/chatbot/*`

### Flask (`http://localhost:5001`)

- `GET /ping`
- `GET /summary`
- `POST /classify-thesis`
- `GET /ml-ready`

For detailed Flask endpoint behavior, see `backend/summary-script/README.md`.


## MongoDB setup
Install mongoose: 
``` 
 npm install mongoose
```

### MongoDB view as a table

1. Install MongoDB Compass from https://www.mongodb.com/try/download/compass
2. Open MongoDB Compass and add new connect to MongoDB

- (URI:  mmongodb+srv://admin:admin123@cluster0.m3qwzdj.mongodb.net/thesisList?retryWrites=true&w=majority&appName=chatbot).

Thesis records are stored in MongoDB collection `theses` in database `thesisList`. Each document includes thesis metadata, rule-based scores, and OpenAI outputs:

Data written during collection includes:

- Thesis metadata (title, author, year, university, handle, link, abstract).
- Rule-based score and label (`rule_score`, `rule_reasons`).
- OpenAI output (`openAI_secision`, `openAI_evidence`).

Repository and service layers:

- `backend/database/repositories/`
- `backend/database/services/`

## Admin Collection Endpoint

### `POST /api/admin/collect-theses`

Purpose: fetch, score, classify, and save thesis data in one sequence.

Request body (example):

```json
{
  "uniCode": "all",
  "query": "nokia",
  "rpp": 30,
  "yearMin": 2023,
  "yearMax": 2026
}
```

Response (shape):

```json
{
  "requestedUniCode": "all",
  "targets": 4,
  "fetched": 120,
  "saved": 85,
  "skipped": 30,
  "failed": 5,
  "byUniversity": {
    "AALTO": { "fetched": 30, "saved": 25, "skipped": 4, "failed": 1 }
  },
  "startedAt": "2026-04-24T09:00:00.000Z",
  "finishedAt": "2026-04-24T09:01:30.000Z"
}
```

Notes:

- Duplicates are skipped using a normalized key (handle/title/year/universityCode).

## Troubleshooting

1.  Collection endpoint returns unknown university code

- Verify `uniCode` exists in `backend/config/universities.js`.

3. Summary or classification errors after dependency updates

- Re-run `install_all.bat` or `run_all.sh` to refresh the summary-script environment.
