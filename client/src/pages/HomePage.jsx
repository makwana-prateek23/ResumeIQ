import { useState } from 'react';
import { analyzeResume } from '../services/analysis.js';

const scoreLabels = { requirements: 'Technical keywords', experience: 'Experience' };

function ScoreBar({ label, score }) {
  return <div><div className="mb-2 flex justify-between text-sm font-semibold text-slate-700"><span>{label}</span><span>{score}%</span></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-indigo-600 transition-all duration-700" style={{ width: `${score}%` }} /></div></div>;
}

function TagList({ items, emptyText, missing = false }) {
  if (!items.length) return <p className="text-sm text-slate-400">{emptyText}</p>;
  return <div className="flex flex-wrap gap-2">{items.map((item) => <span key={item} className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${missing ? 'border-rose-200 bg-rose-50 text-rose-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>{item}</span>)}</div>;
}

function RequirementList({ items, emptyText, tone = 'red' }) {
  if (!items.length) return <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">{emptyText}</p>;
  const colors = tone === 'amber' ? 'border-amber-200 bg-amber-50/70' : tone === 'green' ? 'border-emerald-200 bg-emerald-50/70' : 'border-rose-200 bg-rose-50/70';
  return <div className="grid gap-3">{items.map((item) => <article key={item.term} className={`rounded-2xl border p-4 ${colors}`}><div className="flex flex-wrap items-start justify-between gap-2"><h4 className="font-bold text-slate-900">{item.term}</h4><span className="rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">{item.type} / {item.priority}</span></div>{item.evidence && <p className="mt-2 text-xs leading-5 text-slate-600">Evidence: {item.evidence}</p>}<p className="mt-2 text-[11px] font-medium text-slate-500">JD {item.jobDescriptionCount} / Resume {item.resumeCount} / TF-IDF {item.tfIdfScore?.toFixed(2) ?? '-'}</p></article>)}</div>;
}

function Panel({ title, children, className = '' }) {
  return <section className={`rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_-35px_rgba(15,23,42,0.35)] sm:p-8 ${className}`}><h2 className="mb-5 text-lg font-bold tracking-tight text-slate-900">{title}</h2>{children}</section>;
}

function HomePage() {
  const [resume, setResume] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);

  function selectResume(event) {
    const file = event.target.files?.[0] ?? null;
    setError(''); setResult(null);
    const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    const validExtension = file && /\.(pdf|docx)$/i.test(file.name);
    if (file && (!validTypes.includes(file.type) || !validExtension)) { event.target.value = ''; setResume(null); return setError('Choose a valid PDF or Word (.docx) resume.'); }
    if (file && file.size > 5 * 1024 * 1024) { event.target.value = ''; setResume(null); return setError('Resume file must be 5 MB or smaller.'); }
    setResume(file);
  }

  async function submitAnalysis(event) {
    event.preventDefault(); setError(''); setResult(null);
    if (!resume) return setError('Choose a PDF or Word (.docx) resume.');
    if (jobDescription.trim().length < 100) return setError('Enter at least 100 characters from the job description.');
    setIsAnalyzing(true);
    try { const { data } = await analyzeResume(resume, jobDescription.trim()); setResult(data); }
    catch (requestError) { setError(requestError.response?.data?.error ?? 'Analysis failed. Please try again.'); }
    finally { setIsAnalyzing(false); }
  }

  async function downloadPdfReport() {
    setError('');
    setIsDownloadingPdf(true);
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const margin = 48;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const textWidth = pageWidth - (margin * 2);
      let y = margin;

      const addText = (text, size = 10, style = 'normal', gap = 7) => {
        pdf.setFont('helvetica', style);
        pdf.setFontSize(size);
        const lines = pdf.splitTextToSize(String(text), textWidth);
        for (const line of lines) {
          if (y > pageHeight - margin) {
            pdf.addPage();
            y = margin;
          }
          pdf.text(line, margin, y);
          y += size * 1.35;
        }
        y += gap;
      };

      addText('ResumeIQ Role Match Report', 20, 'bold', 12);
      if (result.roleSuitability?.targetRole) addText(`Target role: ${result.roleSuitability.targetRole}`, 12, 'bold');
      addText(`Role suitability: ${result.roleSuitability?.score ?? result.overallScore}%`, 15, 'bold', 12);
      Object.entries(result.breakdown).forEach(([key, score]) => addText(`${scoreLabels[key] ?? key}: ${score}%`));
      addText('Matched technical keywords', 13, 'bold');
      addText(result.matchedSkills.length ? result.matchedSkills.join(', ') : 'None detected.');
      addText('Missing technical keywords', 13, 'bold');
      addText(result.missingSkills.length ? result.missingSkills.join(', ') : 'None detected.');
      addText('Exact resume changes', 13, 'bold');
      result.tailoringPlan.keywordActions.forEach((item, index) => {
        addText(`${index + 1}. ${item.term} - ${item.priority} / ${item.recommendedSection}`, 10, 'bold', 2);
        if (item.location) {
          addText(`Update area: ${item.location.primarySection}`, 10, 'normal', 2);
          addText(`Missing part: ${item.location.missingPart}`, 10, 'normal', 2);
          if (item.location.supportingSection) addText(`Also support in: ${item.location.supportingSection}`, 10, 'normal', 2);
          if (item.location.targetElement) addText(`Target element: ${item.location.targetElement}`, 10, 'normal', 2);
          addText(`Placement confidence: ${item.location.confidence}`, 10, 'normal', 2);
        }
        addText(item.guidance, 10, 'normal', 2);
        if (item.bulletPrompt) addText(`Suggested change: ${item.bulletPrompt}`, 10, 'normal', 8);
      });

      const blobUrl = URL.createObjectURL(pdf.output('blob'));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `resumeiq-report-${new Date().toISOString().slice(0, 10)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
    } catch {
      setError('PDF download failed. Refresh the page and try again.');
    } finally {
      setIsDownloadingPdf(false);
    }
  }

  return <main className="relative min-h-screen overflow-hidden bg-[#f5f7fb] text-slate-900">
    <div className="pointer-events-none absolute -left-40 -top-40 h-96 w-96 rounded-full bg-cyan-200/40 blur-3xl" /><div className="pointer-events-none absolute right-0 top-64 h-96 w-96 rounded-full bg-indigo-200/40 blur-3xl" />
    <nav className="relative z-10 border-b border-white/70 bg-white/70 backdrop-blur-xl"><div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 font-black text-white shadow-lg shadow-indigo-200">R</span><div><p className="font-extrabold tracking-tight">ResumeIQ</p><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">ATS Analyzer</p></div></div><span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">Secure PDF & Word analysis</span></div></nav>

    <div className="relative z-10 mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
      <header className="relative overflow-hidden rounded-[2rem] bg-slate-950 px-7 py-10 text-white shadow-2xl shadow-slate-300 sm:px-12 sm:py-14"><div className="absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(circle_at_center,rgba(34,211,238,0.22),transparent_65%)]" /><div className="relative max-w-3xl"><span className="inline-flex rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Technical match intelligence</span><h1 className="mt-5 text-4xl font-black leading-tight tracking-tight sm:text-6xl">Turn every job description into a clearer resume strategy.</h1><p className="mt-5 max-w-2xl text-base leading-7 text-slate-300 sm:text-lg">Find the technical keywords you match, the ones you miss, and the experience evidence that will strengthen your application.</p><div className="mt-7 flex flex-wrap gap-5 text-xs font-semibold text-slate-300"><span>70% technical keywords</span><span>30% experience</span><span>Explainable TF-IDF scoring</span></div></div></header>

      <section className="mt-8 rounded-3xl border border-indigo-200 bg-gradient-to-r from-indigo-950 to-slate-950 p-6 text-white shadow-xl sm:p-8"><div className="grid items-center gap-7 lg:grid-cols-[1fr_auto]"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">Chrome extension</p><h2 className="mt-2 text-2xl font-black">Analyze job postings without leaving the page</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">Download the ResumeIQ extension, extract the current job description, upload a PDF or DOCX resume, and view the role match directly in the popup.</p></div><a href="/downloads/resumeiq-extension.zip" download className="rounded-xl bg-white px-5 py-3 text-center text-sm font-black text-indigo-700 shadow-lg transition hover:-translate-y-0.5">Download extension</a></div><details className="mt-6 rounded-2xl border border-white/15 bg-white/5 p-4"><summary className="cursor-pointer font-bold">How to install in Chrome</summary><ol className="mt-4 grid gap-2 pl-5 text-sm leading-6 text-slate-300"><li>Download and extract the ZIP file.</li><li>Open <code className="rounded bg-black/30 px-1.5 py-0.5">chrome://extensions</code>.</li><li>Enable <strong>Developer mode</strong>.</li><li>Click <strong>Load unpacked</strong> and select the extracted extension folder.</li><li>Pin ResumeIQ, open a job posting, and click the extension icon.</li><li>Select the JD text or use “Get job description from page,” then upload your resume and analyze.</li></ol></details></section>

      <div className="mt-8 grid items-start gap-8 lg:grid-cols-[420px_minmax(0,1fr)]">
        <form onSubmit={submitAnalysis} className="rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_24px_70px_-35px_rgba(15,23,42,0.4)] lg:sticky lg:top-6 sm:p-7">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Step 1</p><h2 className="mt-1 text-xl font-extrabold">Add your resume</h2></div>
          <label htmlFor="resume" className={`mt-5 flex cursor-pointer flex-col items-center rounded-2xl border-2 border-dashed p-6 text-center transition ${resume ? 'border-emerald-300 bg-emerald-50' : 'border-slate-300 bg-slate-50 hover:border-indigo-400 hover:bg-indigo-50/50'}`}><span className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-sm font-black shadow-sm">PDF/DOCX</span><span className="mt-3 text-sm font-bold">{resume ? resume.name : 'Choose your PDF or Word resume'}</span><span className="mt-1 text-xs text-slate-500">PDF or DOCX, maximum 5 MB, processed in memory</span></label><input id="resume" name="resume" type="file" accept="application/pdf,.pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.docx" onChange={selectResume} className="sr-only" />
          <div className="mt-7 flex items-end justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-indigo-600">Step 2</p><label className="mt-1 block text-xl font-extrabold" htmlFor="jobDescription">Paste the job description</label></div><span className="text-xs text-slate-400">{jobDescription.length}/20,000</span></div>
          <textarea id="jobDescription" rows="12" maxLength="20000" value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} placeholder="Paste the complete role description here..." className="mt-4 w-full resize-y rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100" />
          {error && <p role="alert" className="mt-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm font-semibold text-rose-700">{error}</p>}
          <button type="submit" disabled={isAnalyzing} className="mt-5 w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-cyan-500 px-5 py-4 font-bold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60">{isAnalyzing ? 'Analyzing technical match...' : 'Analyze my resume'}</button>
        </form>

        {!result ? <section className="grid min-h-[520px] place-items-center rounded-3xl border border-slate-200/80 bg-white/80 p-8 text-center shadow-[0_24px_70px_-40px_rgba(15,23,42,0.35)] backdrop-blur"><div className="max-w-md"><div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-indigo-100 to-cyan-100 text-3xl font-black text-indigo-600">%</div><h2 className="mt-6 text-2xl font-extrabold">Your match report starts here</h2><p className="mt-3 leading-7 text-slate-500">Upload a resume and job description to see technical keyword coverage, experience alignment, missing terms, and prioritized resume updates.</p><div className="mt-7 grid grid-cols-3 gap-3 text-xs font-semibold text-slate-500"><span className="rounded-xl bg-slate-50 p-3">Keyword match</span><span className="rounded-xl bg-slate-50 p-3">Experience</span><span className="rounded-xl bg-slate-50 p-3">Action plan</span></div></div></section> :
        <div aria-live="polite" className="print-report grid gap-6">
          <div className="no-print flex justify-end"><button type="button" onClick={downloadPdfReport} disabled={isDownloadingPdf} className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-60">{isDownloadingPdf ? 'Creating PDF...' : 'Download PDF'}</button></div>
          <Panel title="Role suitability"><div className="grid items-center gap-7 sm:grid-cols-[170px_1fr]"><div className="mx-auto grid h-40 w-40 place-items-center rounded-full p-3" style={{ background: `conic-gradient(#4f46e5 ${result.roleSuitability?.score ?? result.overallScore}%, #e2e8f0 0)` }}><div className="grid h-full w-full place-items-center rounded-full bg-white text-center"><div><p className="text-4xl font-black tracking-tight">{result.roleSuitability?.score ?? result.overallScore}%</p><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Role match</p></div></div></div><div>{result.roleSuitability?.targetRole && <p className="mb-5 rounded-xl bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-800">Target role: {result.roleSuitability.targetRole}</p>}<div className="grid gap-5">{Object.entries(result.breakdown).map(([key, score]) => <ScoreBar key={key} label={scoreLabels[key] ?? key} score={score} />)}</div><p className="mt-5 text-xs font-semibold text-slate-400">Parsing confidence: {result.confidence}%</p></div></div></Panel>
          <Panel title="Technical keyword coverage"><div className="grid gap-7 sm:grid-cols-2"><div><h3 className="mb-3 text-sm font-bold text-emerald-700">Matched keywords</h3><TagList items={result.matchedSkills} emptyText="No technical matches found." /></div><div><h3 className="mb-3 text-sm font-bold text-rose-700">Missing keywords</h3><TagList items={result.missingSkills} emptyText="No technical gaps detected." missing /></div></div></Panel>
          <Panel title="Missing and partial requirements"><div className="grid gap-7"><div><h3 className="mb-3 text-sm font-bold text-rose-700">Missing</h3><RequirementList items={result.missing} emptyText="No missing technical requirements detected." /></div><div><h3 className="mb-3 text-sm font-bold text-amber-700">Partial matches</h3><RequirementList items={result.partiallyMatched} emptyText="No partial matches detected." tone="amber" /></div><details className="rounded-2xl border border-slate-200 p-4"><summary className="cursor-pointer font-bold">View matched evidence ({result.matched.length})</summary><div className="mt-4"><RequirementList items={result.matched} emptyText="No matched evidence." tone="green" /></div></details></div></Panel>
          <Panel title="Exact resume changes" className="border-indigo-200 bg-gradient-to-br from-white to-indigo-50/60"><div className="grid gap-3">{result.tailoringPlan.keywordActions.slice(0, 8).map((item, index) => <article key={item.term} className="rounded-2xl border border-indigo-100 bg-white p-5 shadow-sm"><div className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-indigo-600 text-xs font-bold text-white">{index + 1}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-bold">{item.term}</h3><span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">{item.priority}</span></div>{item.location && <div className="mt-3 grid gap-2 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-xs text-slate-700 sm:grid-cols-2"><p><span className="font-bold text-indigo-700">Update area:</span> {item.location.primarySection}</p><p><span className="font-bold text-indigo-700">Missing part:</span> {item.location.missingPart}</p>{item.location.supportingSection && <p><span className="font-bold text-indigo-700">Also support in:</span> {item.location.supportingSection}</p>}<p><span className="font-bold text-indigo-700">Placement confidence:</span> {item.location.confidence}</p>{item.location.targetElement && <p className="sm:col-span-2"><span className="font-bold text-indigo-700">Target existing element:</span> “{item.location.targetElement}”</p>}<p className="sm:col-span-2 text-slate-500">{item.location.placementReason}</p></div>}<p className="mt-3 text-sm leading-6 text-slate-600">{item.guidance}</p>{item.bulletPrompt && <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">Suggested change: {item.bulletPrompt}</p>}</div></div></article>)}</div></Panel>
          <Panel title="Optimization checklist"><div className="grid gap-3">{result.report.checklist.map((check) => <div key={check.item} className="flex items-center gap-3 rounded-2xl border border-slate-200 p-4"><span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${check.passed ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>{check.passed ? 'OK' : '--'}</span><span className="text-sm font-medium">{check.item}</span></div>)}</div></Panel>
        </div>}
      </div>
    </div>
  </main>;
}

export default HomePage;
