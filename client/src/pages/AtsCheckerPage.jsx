import { useState } from 'react';
import { Link, useOutletContext } from 'react-router-dom';
import { checkResumeAts } from '../services/analysis.js';

const labels = {
  email: 'Email address detected', phone: 'Phone number detected', summary: 'Professional summary detected',
  experienceSection: 'Experience section detected', educationSection: 'Education section detected', dates: 'Dated work history',
  professionalLink: 'LinkedIn, GitHub, or portfolio link', contactBasics: 'Complete contact basics', standardSections: 'Standard resume sections',
  datedExperience: 'Clearly dated experience', quantifiedImpact: 'Measurable achievements', actionOrientedBullets: 'Action-oriented bullets',
  conciseBullets: 'Concise, scannable bullets', noSensitivePersonalDetails: 'No unnecessary sensitive personal details'
};

export default function AtsCheckerPage() {
  const { setResumeUploaded, setUploadedResumeFile, setEditorResumeData } = useOutletContext();
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  function chooseFile(event) {
    const selected = event.target.files?.[0] ?? null;
    setError(''); setResult(null);
    if (selected && !/\.(pdf|docx)$/i.test(selected.name)) return setError('Choose a PDF or Word (.docx) resume.');
    if (selected && selected.size > 5 * 1024 * 1024) return setError('Resume file must be 5 MB or smaller.');
    setFile(selected);
  }

  async function submit(event) {
    event.preventDefault();
    if (!file) return setError('Choose a resume to check.');
    setChecking(true); setError(''); setResult(null);
    try {
      const { data } = await checkResumeAts(file);
      setResult(data);
      setResumeUploaded(true);
      setUploadedResumeFile(file);
      setEditorResumeData(data.resume?.editorData ?? null);
    } catch (requestError) {
      const status = requestError.response?.status;
      const apiError = requestError.response?.data?.error;
      setError(
        status === 404
          ? 'ATS Checker API is not available on the deployed server yet. Deploy or restart the updated backend, then try again.'
          : apiError ?? 'ATS check failed. Please try again.'
      );
    } finally { setChecking(false); }
  }

  return <main className="mx-auto max-w-6xl px-5 py-8 sm:px-8 sm:py-12">
    <header className="overflow-hidden rounded-3xl bg-slate-950 p-8 text-white shadow-xl sm:p-10"><p className="text-xs font-black uppercase tracking-[0.2em] text-cyan-300">Standalone resume review</p><h1 className="mt-3 text-4xl font-black tracking-tight">Resume ATS Score Checker</h1><p className="mt-3 max-w-2xl leading-7 text-slate-300">Check ATS readability and U.S. recruiter readiness without a job description. For role-specific keywords, use the separate Job Matcher.</p><div className="mt-5 flex flex-wrap gap-2 text-xs font-bold"><span className="rounded-full bg-white/10 px-3 py-1.5">No job description needed</span><span className="rounded-full bg-white/10 px-3 py-1.5">PDF or DOCX</span><span className="rounded-full bg-white/10 px-3 py-1.5">U.S. recruiting checks</span></div></header>
    <div className="mt-8 grid items-start gap-6 lg:grid-cols-[360px_1fr]">
      <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Upload your resume</h2><p className="mt-2 text-sm leading-6 text-slate-500">Your file is analyzed for structure, searchability, evidence, and recruiter-friendly content.</p><label className="mt-5 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-7 text-center hover:border-cyan-400 hover:bg-cyan-50"><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-xl font-black text-cyan-700 shadow-sm">↑</span><span className="mt-3 text-sm font-bold">{file?.name ?? 'Choose PDF or DOCX'}</span><span className="mt-1 text-xs text-slate-500">Maximum 5 MB</span><input type="file" className="sr-only" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={chooseFile} /></label>{error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold text-rose-700">{error}</p>}<button type="submit" disabled={checking} className="mt-5 w-full rounded-2xl bg-cyan-600 px-5 py-3.5 text-sm font-black text-white shadow-lg shadow-cyan-100 hover:bg-cyan-700 disabled:opacity-60">{checking ? 'Checking resume…' : 'Check ATS score'}</button><Link to="/match" className="mt-3 block text-center text-xs font-bold text-slate-500 hover:text-cyan-700">Need job-specific matching? Open Job Matcher →</Link></form>
      {!result ? <section className="grid min-h-[430px] place-items-center rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm"><div className="max-w-md"><div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-cyan-100 text-2xl font-black text-cyan-800">ATS</div><h2 className="mt-5 text-2xl font-black">Your standalone ATS audit appears here</h2><p className="mt-3 leading-7 text-slate-500">This score measures resume health. It does not claim to predict a particular employer’s proprietary ATS.</p></div></section> : <section className="grid gap-5"><div className="rounded-3xl bg-gradient-to-br from-cyan-600 to-indigo-700 p-7 text-white shadow-xl"><p className="text-xs font-black uppercase tracking-[0.18em] text-cyan-100">Resume ATS score</p><div className="mt-3 flex items-end gap-3"><span className="text-6xl font-black">{result.atsScore}%</span><span className="pb-2 text-sm font-bold text-cyan-100">overall readiness</span></div><div className="mt-5 h-3 overflow-hidden rounded-full bg-white/20"><div className="h-full rounded-full bg-white" style={{ width: `${result.atsScore}%` }} /></div><div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs font-bold text-cyan-100">ATS readability</p><p className="mt-1 text-2xl font-black">{result.searchability.score}%</p></div><div className="rounded-2xl bg-white/10 p-4"><p className="text-xs font-bold text-cyan-100">U.S. recruiter readiness</p><p className="mt-1 text-2xl font-black">{result.usRecruiting.score}%</p></div></div></div><div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Resume checks</h2><div className="mt-5 grid gap-2 sm:grid-cols-2">{[...result.passedChecks, ...result.improvementChecks].map((check) => <div key={`${check.group}-${check.key}`} className={`flex items-center gap-3 rounded-xl border p-3 ${check.passed ? 'border-emerald-200 bg-emerald-50' : 'border-amber-200 bg-amber-50'}`}><span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full text-[10px] font-black ${check.passed ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-900'}`}>{check.passed ? 'OK' : 'FIX'}</span><div><p className="text-xs font-bold text-slate-800">{labels[check.key] ?? check.key}</p><p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-400">{check.group}</p></div></div>)}</div><div className="mt-5 flex flex-wrap gap-2"><Link to="/resume" className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white">Edit this resume</Link><Link to="/match" className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700">Match to a job</Link></div></div></section>}
    </div>
  </main>;
}
