import { useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { extractResume } from '../services/analysis.js';
import resumeWorkspaceHero from '../assets/resume-workspace-hero.png';

export default function LandingPage() {
  const { setResumeUploaded, setUploadedResumeFile, setEditorResumeData, setUploadMessage } = useOutletContext();
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  async function uploadResume(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError('');
    if (!/\.(pdf|docx)$/i.test(file.name)) return setError('Choose a PDF or Word (.docx) resume.');
    if (file.size > 5 * 1024 * 1024) return setError('Resume file must be 5 MB or smaller.');
    setPreparing(true);
    setUploadedResumeFile(file);
    setResumeUploaded(true);
    try {
      const { data } = await extractResume(file);
      setEditorResumeData(data.editorData);
      setUploadMessage('');
      navigate('/resume');
    } catch (requestError) {
      setResumeUploaded(false);
      setUploadedResumeFile(null);
      setError(requestError.response?.data?.error ?? 'We could not read this resume. Please try another PDF or DOCX file.');
    } finally { setPreparing(false); }
  }

  return <main className="mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
    <section className="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-2xl"><div className="grid items-center lg:grid-cols-2"><div className="p-8 sm:p-12"><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">Your resume workspace</p><h1 className="mt-4 text-4xl font-black leading-tight tracking-tight sm:text-6xl">Start with your resume. Finish ready to apply.</h1><p className="mt-5 max-w-xl text-lg leading-8 text-slate-300">Upload an existing resume or build a new one. Edit the content, reorder sections, match a job, and export from one workspace.</p><div className="mt-7 flex flex-wrap gap-3"><label className="cursor-pointer rounded-xl bg-white px-5 py-3 text-sm font-black text-indigo-700 shadow-lg transition hover:-translate-y-0.5"><input type="file" className="sr-only" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={uploadResume} disabled={preparing} />{preparing ? 'Preparing your resume…' : 'Upload existing resume'}</label><Link to="/create" className="rounded-xl border border-white/20 bg-white/10 px-5 py-3 text-sm font-black text-white transition hover:bg-white/20">Create new resume</Link></div>{error && <p role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm font-bold text-rose-200">{error}</p>}</div><div className="relative h-full min-h-80"><div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-transparent to-transparent" /><img src={resumeWorkspaceHero} alt="Resume editing and review workspace" className="h-full w-full object-cover" /></div></div></section>
    <section className="mt-8 grid gap-4 md:grid-cols-3"><article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><span className="text-xs font-black uppercase tracking-wider text-indigo-600">Step 1</span><h2 className="mt-2 text-xl font-black">Edit your content</h2><p className="mt-2 text-sm leading-6 text-slate-500">Your uploaded resume becomes editable blocks for summary, experience, skills, and education.</p></article><article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><span className="text-xs font-black uppercase tracking-wider text-cyan-600">Step 2</span><h2 className="mt-2 text-xl font-black">Match a job</h2><p className="mt-2 text-sm leading-6 text-slate-500">Compare the resume with any job description and review missing requirements.</p><Link to="/match" className="mt-4 inline-block text-sm font-bold text-cyan-700">Open Job Match →</Link></article><article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><span className="text-xs font-black uppercase tracking-wider text-emerald-600">Step 3</span><h2 className="mt-2 text-xl font-black">Format and export</h2><p className="mt-2 text-sm leading-6 text-slate-500">Reorder sections, choose readable formatting, and download an ATS-safe PDF.</p></article></section>
    <section className="mt-8 flex flex-col gap-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-indigo-950">Using the Chrome extension?</p><p className="mt-1 text-sm text-indigo-700">Use it only for job-description matching and missing-keyword checks.</p></div><a href="/downloads/resumeiq-extension.zip" download className="rounded-xl bg-indigo-600 px-5 py-3 text-center text-sm font-bold text-white">Download extension</a></section>
  </main>;
}
