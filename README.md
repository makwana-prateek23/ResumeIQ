# AI Resume ATS Checker & Job Description Matcher

Full stack project with a React/Vite client and Express API server.

## Development

Install dependencies in each app:

```bash
cd client
npm install

cd ../server
npm install
```

Run the client:

```bash
cd client
npm run dev
```

Run the server:

```bash
cd server
npm run dev
```

The API health check is available at `GET /api/health`.

## Gemini resume tailoring

Set `GEMINI_API_KEY` in `server/.env` (or the backend hosting environment).
The default model is `gemini-3.1-pro-preview`; override it with `GEMINI_MODEL`
if needed. API billing and quota must be available for that model. Restart the
server after configuration changes. Never put the key in frontend variables.

After signing in, upload a resume or fill in the builder, paste a job description
of 100–20,000 characters, and choose **Generate tailored draft**. Review the
original and proposed summary and experience bullets, then apply or discard.
Other resume fields are preserved. Applying updates the existing local draft;
undo is available until you make further edits. Resume content and the JD are
sent to Gemini, excluding the editor's contact fields. Check all generated claims
before exporting; schema and numeric checks do not guarantee factual accuracy.

The authenticated endpoint is `POST /api/analysis/tailor`. It uses the analysis
rate limit and returns clear configuration, quota, timeout, and output errors.
