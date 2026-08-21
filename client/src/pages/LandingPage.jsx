import { useEffect, useState } from 'react';
import { Link, useNavigate, useOutletContext } from 'react-router-dom';
import { checkResumeAts, extractResume } from '../services/analysis.js';
import { getCareerArticles } from '../services/career-content.js';
import landing3dResume from '../assets/landing-3d-resume.png';
import useAuth from '../hooks/useAuth.js';

const fallbackArticles = [
  { id: 'resume', title: 'Build a resume recruiters can scan quickly', description: 'Use clear sections, specific outcomes, and a simple reading order.', url: '/resume', author: 'ResumeIQ', readingTime: 4 },
  { id: 'interview', title: 'Turn your experience into interview stories', description: 'Prepare concise situation, action, and measurable result examples.', url: '/match', author: 'ResumeIQ', readingTime: 5 },
  { id: 'search', title: 'Make every application more focused', description: 'Match your strongest evidence to the role instead of adding keyword clutter.', url: '/ats', author: 'ResumeIQ', readingTime: 3 }
];

const testimonials = [
  { quote: 'The ATS review showed me exactly which sections were difficult to scan.', name: 'Jordan M.', role: 'Product analyst' },
  { quote: 'I kept my original formatting and made every bullet much more specific.', name: 'Priya S.', role: 'Software engineer' },
  { quote: 'Separating resume health from job matching made the feedback much clearer.', name: 'Marcus T.', role: 'Operations manager' },
  { quote: 'The editor helped me keep custom sections that other builders removed.', name: 'Elena R.', role: 'UX designer' }
];

export default function LandingPage() {
  const { setResumeUploaded, setUploadedResumeFile, setEditorResumeData, setUploadMessage } = useOutletContext();
  const [preparing, setPreparing] = useState(false);
  const [error, setError] = useState('');
  const [atsFile, setAtsFile] = useState(null);
  const [atsResult, setAtsResult] = useState(null);
  const [atsError, setAtsError] = useState('');
  const [checkingAts, setCheckingAts] = useState(false);
  const [articles, setArticles] = useState(fallbackArticles);
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    const controller = new AbortController();
    getCareerArticles(controller.signal).then((items) => items.length && setArticles(items)).catch(() => {});
    return () => controller.abort();
  }, []);

  async function runAtsCheck(event) {
    event.preventDefault();
    if (!atsFile) return setAtsError('Choose a PDF or Word resume first.');
    setCheckingAts(true); setAtsError(''); setAtsResult(null);
    try {
      const { data } = await checkResumeAts(atsFile);
      setAtsResult(data);
      setResumeUploaded(true); setUploadedResumeFile(atsFile);
      setEditorResumeData(data.resume?.editorData ?? null);
    } catch (requestError) {
      setAtsError(requestError.response?.status === 404 ? 'The updated ATS service still needs to be deployed.' : requestError.response?.data?.error ?? 'We could not check this resume.');
    } finally { setCheckingAts(false); }
  }

  async function uploadResume(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!isAuthenticated) { navigate('/login', { state: { from: '/' } }); return; }
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

  return <main className="landing-page mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
    <section className="landing-hero-3d relative overflow-hidden rounded-[2rem] text-white shadow-2xl" style={{ backgroundImage: `url(${landing3dResume})` }}><div className="landing-hero-wash absolute inset-0" aria-hidden="true" /><div className="landing-depth-grid absolute inset-0" aria-hidden="true" /><div className="relative grid min-h-[520px] items-center lg:grid-cols-[1.05fr_.95fr]"><div className="z-10 p-8 sm:p-12 lg:py-16"><p className="text-xs font-bold uppercase tracking-[0.2em] text-(--accent-eyebrow)">Your resume workspace</p><h1 className="mt-4 max-w-2xl text-4xl font-black leading-tight tracking-tight drop-shadow-2xl sm:text-6xl">Start with your resume. Finish ready to apply.</h1><p className="mt-5 max-w-xl text-lg leading-8 text-slate-200">Upload an existing resume or build a new one. Edit the content, check ATS readiness, match a job, and export from one workspace.</p><div className="mt-7 flex flex-wrap gap-3">{isAuthenticated ? <label className="cursor-pointer rounded-xl bg-white px-5 py-3 text-sm font-black text-(--accent-solid) shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl"><input type="file" className="sr-only" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={uploadResume} disabled={preparing} />{preparing ? 'Preparing your resume…' : 'Upload existing resume'}</label> : <Link to="/login" state={{ from: '/' }} className="rounded-xl bg-white px-5 py-3 text-sm font-black text-(--accent-solid) shadow-lg transition duration-300 hover:-translate-y-1 hover:shadow-xl">🔒 Sign in to upload</Link>}<Link to="/create" className="rounded-xl border border-white/25 bg-white/10 px-5 py-3 text-sm font-black text-white shadow-lg backdrop-blur transition duration-300 hover:-translate-y-1 hover:bg-white/20">{!isAuthenticated && '🔒 '}Create new resume</Link></div>{error && <p role="alert" className="mt-4 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-sm font-bold text-rose-200">{error}</p>}</div><div className="pointer-events-none relative hidden h-full lg:block"><div className="hero-float hero-float-score"><span className="text-[10px] font-black uppercase tracking-wider text-cyan-200">ATS ready</span><strong className="mt-1 block text-2xl">92%</strong></div><div className="hero-float hero-float-match"><span className="text-lg">✓</span><span className="text-xs font-black">Skills matched</span></div><div className="hero-float hero-float-export"><span className="text-lg">↗</span><span className="text-xs font-black">Ready to export</span></div></div></div></section>
    <section className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <Link to="/resume" className="service-card group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-black uppercase tracking-wider text-indigo-600">Workspace</span>{!isAuthenticated && <span aria-label="Login required">🔒</span>}</div><h2 className="mt-2 text-xl font-black transition group-hover:text-indigo-700">Edit your content</h2><p className="mt-2 text-sm leading-6 text-slate-500">Turn an uploaded resume into editable summary, experience, skills, education, and custom sections.</p><span className="mt-4 inline-block text-sm font-black text-indigo-700">{isAuthenticated ? 'Open editor' : 'Sign in to access'} →</span></Link>
      <Link to="/ats" className="service-card group relative overflow-hidden rounded-2xl border border-cyan-300 bg-gradient-to-br from-slate-950 via-slate-900 to-cyan-950 p-6 text-white shadow-lg shadow-cyan-100"><div aria-hidden="true" className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-cyan-400/20 blur-2xl transition duration-500 group-hover:scale-150" /><div className="relative"><div className="flex items-center justify-between gap-3"><span className="text-xs font-black uppercase tracking-wider text-cyan-300">Public tool</span><span className="rounded-full border border-cyan-300/25 bg-cyan-300/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-cyan-200">No login</span></div><h2 className="mt-3 text-2xl font-black">Resume ATS Checker</h2><p className="mt-2 text-sm leading-6 text-slate-300">Audit resume structure, searchability, achievement evidence, and U.S. recruiter readiness.</p><span className="mt-5 inline-flex rounded-xl bg-cyan-400 px-4 py-2.5 text-sm font-black text-slate-950">Check my resume →</span></div></Link>
      <Link to="/match" className="service-card group rounded-2xl border border-indigo-200 bg-indigo-50 p-6 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-black uppercase tracking-wider text-indigo-600">Job tool</span>{!isAuthenticated && <span aria-label="Login required">🔒</span>}</div><h2 className="mt-2 text-xl font-black transition group-hover:text-indigo-700">JD & Resume Matcher</h2><p className="mt-2 text-sm leading-6 text-slate-600">Compare your resume with a specific job description for missing requirements and exact tailoring actions.</p><span className="mt-4 inline-block text-sm font-black text-indigo-700">{isAuthenticated ? 'Match a job' : 'Sign in to access'} →</span></Link>
      <Link to="/resume" className="service-card group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"><div className="flex items-center justify-between"><span className="text-xs font-black uppercase tracking-wider text-emerald-600">Export</span>{!isAuthenticated && <span aria-label="Login required">🔒</span>}</div><h2 className="mt-2 text-xl font-black transition group-hover:text-emerald-700">Format and export</h2><p className="mt-2 text-sm leading-6 text-slate-500">Reorder sections, choose readable formatting, and download ATS-safe PDF and Word files.</p><span className="mt-4 inline-block text-sm font-black text-emerald-700">{isAuthenticated ? 'Open workspace' : 'Sign in to access'} →</span></Link>
    </section>
    <section className="mt-12 overflow-hidden rounded-[2rem] border border-cyan-200 bg-white shadow-xl shadow-cyan-100/40">
      <div className="grid lg:grid-cols-[1.05fr_.95fr]"><div className="bg-slate-950 p-7 text-white sm:p-10"><p className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">Instant resume health check</p><h2 className="mt-3 text-3xl font-black sm:text-4xl">Check your ATS score here</h2><p className="mt-3 max-w-xl leading-7 text-slate-300">No job description needed. Review structure, searchability, evidence, and U.S. recruiter readiness directly from the home page.</p><form onSubmit={runAtsCheck} className="mt-6"><label className="flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-dashed border-slate-600 bg-white/5 p-4 transition hover:border-cyan-300 hover:bg-white/10"><span><span className="block text-sm font-black">{atsFile?.name ?? 'Choose PDF or DOCX'}</span><span className="mt-1 block text-xs text-slate-400">Maximum 5 MB</span></span><span className="rounded-xl bg-cyan-400 px-3 py-2 text-xs font-black text-slate-950">Browse</span><input type="file" className="sr-only" accept=".pdf,.docx" onChange={(event) => { const selected = event.target.files?.[0] ?? null; setAtsError(''); setAtsResult(null); if (selected?.size > 5 * 1024 * 1024) return setAtsError('Resume must be 5 MB or smaller.'); setAtsFile(selected); }} /></label>{atsError && <p role="alert" className="mt-3 rounded-xl bg-rose-400/10 p-3 text-sm font-bold text-rose-200">{atsError}</p>}<button disabled={checkingAts} className="mt-4 w-full rounded-xl bg-cyan-400 px-5 py-3.5 text-sm font-black text-slate-950 transition hover:-translate-y-0.5 hover:bg-cyan-300 disabled:opacity-60">{checkingAts ? 'Checking resume…' : 'Check ATS score'}</button></form></div>
      <div className="grid min-h-80 place-items-center bg-gradient-to-br from-cyan-50 to-indigo-50 p-8 text-center">{atsResult ? <div className="w-full max-w-md"><div className="mx-auto grid h-32 w-32 place-items-center rounded-full bg-white text-4xl font-black text-cyan-700 shadow-xl ring-8 ring-cyan-100">{atsResult.atsScore}%</div><h3 className="mt-6 text-2xl font-black text-slate-950">Your resume readiness score</h3><div className="mt-5 grid grid-cols-2 gap-3"><div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs font-bold text-slate-500">Readability</p><p className="mt-1 text-2xl font-black">{atsResult.searchability.score}%</p></div><div className="rounded-2xl bg-white p-4 shadow-sm"><p className="text-xs font-bold text-slate-500">Recruiter ready</p><p className="mt-1 text-2xl font-black">{atsResult.usRecruiting.score}%</p></div></div><Link to="/ats" className="mt-5 inline-block text-sm font-black text-indigo-700">View the complete audit →</Link></div> : <div className="max-w-sm"><span className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-cyan-100 text-2xl font-black text-cyan-800">ATS</span><h3 className="mt-5 text-2xl font-black">A clear score, useful checks</h3><p className="mt-2 leading-7 text-slate-500">Upload your resume to reveal its standalone ATS audit without leaving this page.</p></div>}</div></div>
    </section>
    <section className="mt-14"><div className="flex items-end justify-between gap-4"><div><p className="text-xs font-black uppercase tracking-[.2em] text-(--accent-solid)">Career reading</p><h2 className="mt-2 text-3xl font-black text-slate-950">Latest job-search articles</h2></div><span className="hidden rounded-full border border-white/70 bg-white/70 px-3 py-1.5 text-xs font-bold text-(--accent-soft-text) shadow-sm backdrop-blur sm:block">Live from DEV Community</span></div><div className="mt-6 grid gap-5 md:grid-cols-2 xl:grid-cols-3">{articles.slice(0, 6).map((article, index) => <a key={article.id} href={article.url} target={String(article.url).startsWith('http') ? '_blank' : undefined} rel="noreferrer" className="article-card group overflow-hidden rounded-3xl"> <div className="article-card-media relative overflow-hidden">{article.image ? <img src={article.image} alt="" className="h-44 w-full object-cover transition duration-700 group-hover:scale-110" /> : <div className="grid h-44 place-items-center text-5xl font-black text-white/90">{String(index + 1).padStart(2, '0')}</div>}<span className="absolute left-4 top-4 rounded-full border border-white/30 bg-slate-950/70 px-3 py-1.5 text-[10px] font-black uppercase tracking-[.16em] text-white backdrop-blur">Career insight</span></div><div className="relative p-6"><div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-wider text-(--accent-soft-text)"><span>{article.author}</span><span>•</span><span>{article.readingTime || 4} min read</span></div><h3 className="mt-3 text-xl font-black leading-snug text-slate-950 transition duration-300 group-hover:text-(--accent-solid)">{article.title}</h3><p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">{article.description}</p><span className="mt-5 inline-flex items-center gap-2 rounded-xl bg-(--accent-soft-bg) px-3.5 py-2 text-sm font-black text-(--accent-soft-text) transition duration-300 group-hover:gap-3 group-hover:bg-(--accent-solid) group-hover:text-white">Read article <span>→</span></span></div></a>)}</div></section>
    <section className="mt-14 overflow-hidden rounded-[2rem] bg-slate-950 py-10 text-white"><div className="px-7 sm:px-10"><p className="text-xs font-black uppercase tracking-[.2em] text-cyan-300">What job seekers say</p><h2 className="mt-2 text-3xl font-black">Built for real resume work</h2></div><div className="testimonial-track mt-7 flex w-max gap-4 px-4">{[...testimonials, ...testimonials].map((item, index) => <blockquote key={`${item.name}-${index}`} className="w-[300px] shrink-0 rounded-2xl border border-white/10 bg-white/5 p-5 sm:w-[360px]"><p className="leading-7 text-slate-200">“{item.quote}”</p><footer className="mt-5"><p className="font-black">{item.name}</p><p className="text-xs text-cyan-300">{item.role}</p></footer></blockquote>)}</div></section>
    <section className="mt-8 flex flex-col gap-4 rounded-2xl border border-indigo-200 bg-indigo-50 p-6 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-black text-indigo-950">Using the Chrome extension?</p><p className="mt-1 text-sm text-indigo-700">Use it only for job-description matching and missing-keyword checks.</p></div>{isAuthenticated ? <a href="/downloads/resumeiq-extension.zip" download className="rounded-xl bg-indigo-600 px-5 py-3 text-center text-sm font-bold text-white transition hover:-translate-y-1 hover:bg-indigo-700">Download extension</a> : <Link to="/login" className="rounded-xl bg-indigo-600 px-5 py-3 text-center text-sm font-bold text-white transition hover:-translate-y-1 hover:bg-indigo-700">🔒 Sign in to download</Link>}</section>
  </main>;
}
