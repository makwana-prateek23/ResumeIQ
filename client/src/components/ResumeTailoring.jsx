import { useState } from 'react';
import { tailorResume } from '../services/analysis.js';

export default function ResumeTailoring({ resume, onApply }) {
  const [jobDescription, setJobDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [review, setReview] = useState(null);
  const [undo, setUndo] = useState(null);
  const stale = review && (review.source !== JSON.stringify(resume) || review.jobDescription !== jobDescription);

  async function generate(event) {
    event.preventDefault();
    setError(''); setNotice(''); setReview(null); setBusy(true);
    const source = JSON.stringify(resume);
    // Contact details are not needed for job matching and stay in the editor.
    const { role, summary, skills, experience, education, customSections } = resume;
    try {
      const { data } = await tailorResume({ role, summary, skills, experience, education, customSections }, jobDescription);
      setReview({ ...data, original: JSON.parse(source), source, jobDescription });
    } catch (requestError) {
      setError(requestError.response?.status === 401 ? 'Sign in again to tailor your resume.' : requestError.response?.data?.error || 'Could not generate a tailored resume. Please try again.');
    } finally { setBusy(false); }
  }

  function apply() {
    if (stale) return;
    const next = { ...resume, summary: review.summary, experience: resume.experience.map((item, index) => ({ ...item, bullets: review.experience.find((entry) => entry.index === index).bullets })) };
    setUndo({ original: resume, applied: JSON.stringify(next) });
    onApply(next);
    setReview(null);
    setNotice('Tailored draft applied. Review it in the editor before exporting.');
  }

  return <section aria-labelledby="tailor-title" className="mb-6 rounded-2xl border border-cyan-200 bg-white p-5 shadow-sm sm:p-6">
    <h2 id="tailor-title" className="text-lg font-black text-slate-950">Tailor your resume to a job with Gemini</h2>
    <p className="mt-1 text-sm text-slate-600">Review your fit and rewrite your summary and experience bullets using the experience you already have.</p>
    <form onSubmit={generate} className="mt-4 grid gap-3">
      <label htmlFor="tailor-jd" className="text-sm font-bold text-slate-700">Job description</label>
      <textarea id="tailor-jd" required minLength={100} maxLength={20000} rows={5} value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} placeholder="Paste the job description here (at least 100 characters)…" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-900 focus:border-indigo-400 focus:outline-none focus:ring-4 focus:ring-indigo-100" />
      <p className="text-xs text-slate-500">Generating sends your resume content and this job description to Google Gemini. Contact fields are excluded. AI suggestions can be inaccurate; check every claim.</p>
      <button type="submit" disabled={busy || jobDescription.trim().length < 100} className="justify-self-start rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Reviewing and tailoring…' : 'Generate tailored draft'}</button>
    </form>
    <p role="status" className="mt-3 text-sm text-indigo-700">{busy ? 'Gemini is reviewing your resume. This may take up to a minute.' : notice}</p>
    {error && <p role="alert" className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
    {review && <div className="mt-4 space-y-4 rounded-xl border border-indigo-100 bg-indigo-50/50 p-4">
      <h3 className="font-bold text-slate-950">Review proposed changes</h3>
      <div className="grid gap-4 md:grid-cols-2">{[['Supported strengths', review.strengths], ['Gaps to review', review.gaps]].map(([title, items]) => <div key={title}><h4 className="text-sm font-bold text-slate-800">{title}</h4><ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-700">{items.map((item, index) => <li key={index}>{item}</li>)}</ul>{!items.length && <p className="mt-2 text-sm text-slate-500">None identified.</p>}</div>)}</div>
      <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700">{review.changes.map((item, index) => <li key={index}>{item}</li>)}</ul>
      <Comparison title="Professional summary" before={review.original.summary} after={review.summary} />
      {review.experience.map((item) => <Comparison key={item.index} title={[review.original.experience[item.index].role, review.original.experience[item.index].company].filter(Boolean).join(' · ') || `Experience ${item.index + 1}`} before={review.original.experience[item.index].bullets.filter(Boolean).join('\n')} after={item.bullets.filter(Boolean).join('\n')} />)}
      {stale && <p role="alert" className="text-sm font-bold text-amber-800">Your resume or job description changed. Generate a new draft to include your latest edits.</p>}
      <div className="flex flex-wrap gap-3"><button type="button" disabled={Boolean(stale)} onClick={apply} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-50">Apply tailored draft</button><button type="button" onClick={() => setReview(null)} className="rounded-xl border border-indigo-200 px-4 py-2 text-sm font-bold text-indigo-700">Discard suggestions</button></div>
    </div>}
    {undo && <button type="button" disabled={JSON.stringify(resume) !== undo.applied} onClick={() => { onApply(undo.original); setUndo(null); setNotice('Original draft restored.'); }} className="mt-3 text-sm font-bold text-indigo-700 disabled:opacity-40">Undo last AI rewrite</button>}
    {undo && JSON.stringify(resume) !== undo.applied && <p className="mt-1 text-xs text-slate-500">Undo is unavailable after further edits to avoid overwriting your changes.</p>}
  </section>;
}

function Comparison({ title, before, after }) {
  return <div><h4 className="mb-2 text-sm font-bold text-slate-900">{title}</h4><div className="grid gap-3 md:grid-cols-2">{[['Original', before], ['Proposed', after]].map(([label, value]) => <div key={label} className="min-w-0 rounded-lg border border-slate-200 bg-white p-3"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{label}</p><p className="whitespace-pre-wrap break-words text-sm text-slate-800">{value || 'Empty'}</p></div>)}</div></div>;
}
