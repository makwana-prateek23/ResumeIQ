# ResumeIQ browser extension plan

The extension should collect the current job description, let the user select a PDF or DOCX resume, send both to the existing Render API, and display or open the analysis report.

## 1. Create the extension directory

Add a top-level `extension` directory containing:

```text
extension/
  manifest.json
  popup.html
  popup.css
  popup.js
  content.js
  icons/
```

## 2. Configure Manifest V3

Create `manifest.json`:

```json
{
  "manifest_version": 3,
  "name": "ResumeIQ Job Matcher",
  "version": "1.0.0",
  "description": "Compare a PDF or Word resume with the job description on the current page.",
  "action": {
    "default_popup": "popup.html"
  },
  "permissions": ["activeTab", "scripting", "storage"],
  "host_permissions": ["https://resumeiq-y88i.onrender.com/*"]
}
```

Keep permissions limited to the active tab, local extension storage, and the ResumeIQ API.

## 3. Extract the job description

In `content.js`, prefer selected text. If nothing is selected, inspect common job-description containers such as `main`, `article`, `[class*="job-description"]`, and `[data-testid*="job"]`. Return plain text only and cap it at 20,000 characters.

Do not collect passwords, form values, cookies, browsing history, or unrelated page data.

## 4. Build the popup

The popup should contain:

1. A PDF/DOCX file input with a 5 MB limit.
2. A `Get job description` button.
3. An editable job-description textarea.
4. An `Analyze` button.
5. A compact result showing role suitability, matched skills, missing skills, and exact section changes.
6. An `Open full report` link to the production ResumeIQ website.

Use the same client-side MIME and extension validation as `client/src/pages/HomePage.jsx`.

## 5. Call the existing API

In `popup.js`, create `FormData`, append `resume` and `jobDescription`, and send:

```js
const response = await fetch('https://resumeiq-y88i.onrender.com/api/analysis', {
  method: 'POST',
  body: formData
});
```

Show API validation errors inside the popup. Do not store the resume after the request finishes.

## 6. Configure API CORS

The downloadable package uses the stable extension ID `gbmiehmhaoeoibkcoapajaebeipakjjf`. The API permits only this exact extension origin, so the packaged version needs no additional Render environment setting.

If the Chrome Web Store assigns a different ID later, update the exact allowed extension origin in `server/src/app.js` and redeploy the API.

## 7. Test locally

1. Open Chrome and visit `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the `extension` directory.
5. Open a job posting.
6. Select the job-description text or let the extension detect it.
7. Upload one PDF and one DOCX resume in separate tests.
8. Confirm that matched skills, missing skills, placement guidance, and errors agree with the web application.

Test LinkedIn, Indeed, company career sites, multi-frame pages, pages with dynamically loaded content, an empty selection, unsupported files, oversized files, and a sleeping Render instance.

## 8. Prepare Chrome Web Store submission

1. Create 16, 32, 48, and 128 pixel icons.
2. Add screenshots and a concise store description.
3. Host a privacy policy explaining that resume and job-description text are sent to the ResumeIQ API for immediate analysis.
4. Explain every requested permission in the store submission.
5. Zip the contents of `extension`, not the parent directory.
6. Upload the ZIP in the Chrome Web Store Developer Dashboard.
7. Complete privacy, data-use, distribution, and reviewer-test instructions.
8. Submit for review.

## 9. Production hardening

- Keep HTTPS-only API access.
- Keep the 5 MB upload limit and server-side file-signature validation.
- Add extension origins explicitly instead of allowing every origin.
- Do not embed API keys or secrets in the extension.
- Display a clear notice before sending resume content.
- Add an API timeout, retry message, and Render cold-start message.
- Add extension-specific rate limiting or anonymous installation tokens before public launch.
