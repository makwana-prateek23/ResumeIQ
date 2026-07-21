import { useMemo, useState } from 'react';
import resumeBlocks from '../assets/resume-blocks.png';

const initialResume = {
  name: '', role: '', email: '', phone: '', location: '', linkedin: '',
  summary: '', skills: '',
  experience: [{ id: 1, role: '', company: '', location: '', start: '', end: '', bullets: [''] }],
  education: [{ id: 1, degree: '', school: '', year: '' }],
};

const initialStyle = { font: 'Arial', size: 10.5, spacing: 1.45, accent: '#000000', margin: 34, template: 'classic' };
const makeId = () => Date.now() + Math.random();

function Field({ label, className = '', ...props }) {
  return <label className={`block text-xs font-bold text-slate-600 ${className}`}>{label}<input {...props} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100" /></label>;
}

function Block({ number, title, hint, children }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-indigo-600 text-xs font-black text-white">{number}</span><div><h2 className="font-extrabold">{title}</h2><p className="mt-0.5 text-xs text-slate-500">{hint}</p></div></div>{children}</section>;
}

function ResumeWorkspace({ mode = 'create' }) {
  const storageKey = 'resumeiq-builder-v1';
  const [resume, setResume] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey))?.resume || initialResume; } catch { return initialResume; }
  });
  const [style, setStyle] = useState(() => {
    try {
      const savedStyle = JSON.parse(localStorage.getItem(storageKey))?.style;
      if (!savedStyle) return initialStyle;
      return { ...initialStyle, ...savedStyle, accent: savedStyle.accent === '#3730a3' ? '#000000' : savedStyle.accent };
    } catch { return initialStyle; }
  });
  const [saved, setSaved] = useState(false);
  const [downloading, setDownloading] = useState(false);

  const completion = useMemo(() => {
    const required = [resume.name, resume.role, resume.email, resume.summary, resume.skills, resume.experience[0]?.role, resume.experience[0]?.company, resume.experience[0]?.bullets.some(Boolean), resume.education[0]?.school];
    return Math.round((required.filter(Boolean).length / required.length) * 100);
  }, [resume]);

  function update(field, value) { setResume((current) => ({ ...current, [field]: value })); }
  function updateExperience(id, field, value) { setResume((current) => ({ ...current, experience: current.experience.map((item) => item.id === id ? { ...item, [field]: value } : item) })); }
  function updateBullet(id, index, value) { setResume((current) => ({ ...current, experience: current.experience.map((item) => item.id === id ? { ...item, bullets: item.bullets.map((bullet, bulletIndex) => bulletIndex === index ? value : bullet) } : item) })); }
  function updateEducation(id, field, value) { setResume((current) => ({ ...current, education: current.education.map((item) => item.id === id ? { ...item, [field]: value } : item) })); }
  function saveDraft() { localStorage.setItem(storageKey, JSON.stringify({ resume, style })); setSaved(true); }
  function resetDraft() { if (window.confirm('Clear every resume field and start again?')) { setResume(initialResume); setStyle(initialStyle); localStorage.removeItem(storageKey); } }

  async function downloadPdf() {
    setDownloading(true);
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ unit: 'pt', format: 'a4' });
      const margin = style.margin + 14;
      const width = pdf.internal.pageSize.getWidth() - margin * 2;
      let y = margin;
      const text = (value, size = style.size, weight = 'normal', gap = 5, color = '#334155') => {
        if (!value) return;
        pdf.setFont('helvetica', weight); pdf.setFontSize(size); pdf.setTextColor(color);
        const lines = pdf.splitTextToSize(String(value), width);
        lines.forEach((line) => { if (y > 790) { pdf.addPage(); y = margin; } pdf.text(line, margin, y); y += size * style.spacing; }); y += gap;
      };
      const heading = (value) => { y += 5; text(value.toUpperCase(), 10, 'bold', 5, style.accent); pdf.setDrawColor(style.accent); pdf.line(margin, y - 3, margin + width, y - 3); };
      text(resume.name || 'YOUR NAME', 22, 'bold', 2, '#0f172a');
      text(resume.role || 'TARGET ROLE', 12, 'bold', 3, style.accent);
      text([resume.location, resume.phone, resume.email, resume.linkedin].filter(Boolean).join('  •  '), 9, 'normal', 8);
      heading('Professional summary'); text(resume.summary);
      heading('Experience'); resume.experience.forEach((item) => { text([item.role, item.company].filter(Boolean).join(' — '), 11, 'bold', 1, '#0f172a'); text([item.location, [item.start, item.end].filter(Boolean).join(' – ')].filter(Boolean).join('  |  '), 9, 'normal', 2); item.bullets.filter(Boolean).forEach((bullet) => text(`• ${bullet}`, style.size, 'normal', 1)); });
      heading('Skills'); text(resume.skills);
      heading('Education'); resume.education.forEach((item) => text([item.degree, item.school, item.year].filter(Boolean).join(' — '), style.size, 'bold', 3));
      pdf.save(`${(resume.name || 'resume').trim().replace(/\s+/g, '-').toLowerCase()}.pdf`);
    } finally { setDownloading(false); }
  }

  const contact = [resume.location, resume.phone, resume.email, resume.linkedin].filter(Boolean).join(' · ');
  return <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7">
    <header className="relative mb-6 overflow-hidden rounded-3xl bg-slate-950 p-6 text-white sm:p-8"><div className="absolute inset-y-0 right-0 hidden w-[38%] lg:block"><div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/30 to-transparent" /><img src={resumeBlocks} alt="Resume content blocks combining into a finished document" className="h-full w-full object-cover opacity-75" /></div><div className="relative max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">{mode === 'format' ? 'Resume formatting studio' : 'Guided resume builder'}</p><h1 className="mt-2 text-3xl font-black tracking-tight">{mode === 'format' ? 'Make every page clean and consistent.' : 'Build your resume, one simple block at a time.'}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Fill in the blocks on the left. Your professional, ATS-friendly document updates instantly on the right.</p><div className="mt-5 max-w-xs"><div className="flex justify-between text-xs font-bold"><span>Resume complete</span><span>{completion}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-cyan-400 transition-all duration-500" style={{ width: `${completion}%` }} /></div></div></div></header>
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(400px,0.9fr)_minmax(560px,1.1fr)]">
      <div className="grid gap-4">
        <Block number="1" title="Name and target role" hint="Lead with the role you are applying for."><div className="grid gap-3 sm:grid-cols-2"><Field label="Full name" value={resume.name} onChange={(e) => update('name', e.target.value)} placeholder="Jordan Lee" /><Field label="Target role" value={resume.role} onChange={(e) => update('role', e.target.value)} placeholder="Product Designer" /></div></Block>
        <Block number="2" title="Contact information" hint="Keep it short and professional."><div className="grid gap-3 sm:grid-cols-2"><Field label="Email" type="email" value={resume.email} onChange={(e) => update('email', e.target.value)} placeholder="jordan@email.com" /><Field label="Phone" value={resume.phone} onChange={(e) => update('phone', e.target.value)} placeholder="(555) 000-0000" /><Field label="City, State" value={resume.location} onChange={(e) => update('location', e.target.value)} placeholder="Austin, TX" /><Field label="LinkedIn or portfolio" value={resume.linkedin} onChange={(e) => update('linkedin', e.target.value)} placeholder="linkedin.com/in/jordan" /></div></Block>
        <Block number="3" title="Professional summary" hint="Write 2–4 lines: experience, specialty, and strongest result."><textarea rows="5" value={resume.summary} maxLength="600" onChange={(e) => update('summary', e.target.value)} placeholder="Example: Product designer with 5 years of experience creating accessible B2B products..." className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100" /><p className="mt-2 text-right text-xs text-slate-400">{resume.summary.length}/600</p></Block>
        <Block number="4" title="Experience and bullet points" hint="Start bullets with an action and finish with a measurable result."><div className="grid gap-4">{resume.experience.map((item, itemIndex) => <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-extrabold">Experience {itemIndex + 1}</p>{resume.experience.length > 1 && <button type="button" onClick={() => setResume((current) => ({ ...current, experience: current.experience.filter((entry) => entry.id !== item.id) }))} className="text-xs font-bold text-rose-600">Remove</button>}</div><div className="grid gap-3 sm:grid-cols-2"><Field label="Role" value={item.role} onChange={(e) => updateExperience(item.id, 'role', e.target.value)} placeholder="Senior Designer" /><Field label="Company" value={item.company} onChange={(e) => updateExperience(item.id, 'company', e.target.value)} placeholder="Company name" /><Field label="Start" value={item.start} onChange={(e) => updateExperience(item.id, 'start', e.target.value)} placeholder="Jan 2022" /><Field label="End" value={item.end} onChange={(e) => updateExperience(item.id, 'end', e.target.value)} placeholder="Present" /></div><div className="mt-3 grid gap-2">{item.bullets.map((bullet, bulletIndex) => <div key={bulletIndex} className="flex gap-2"><span className="mt-3 text-indigo-500">•</span><input value={bullet} onChange={(e) => updateBullet(item.id, bulletIndex, e.target.value)} placeholder="Improved [metric] by [number] through [action]" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />{item.bullets.length > 1 && <button aria-label="Remove bullet" type="button" onClick={() => updateExperience(item.id, 'bullets', item.bullets.filter((_, index) => index !== bulletIndex))} className="px-2 text-rose-500">×</button>}</div>)}</div><button type="button" onClick={() => updateExperience(item.id, 'bullets', [...item.bullets, ''])} className="mt-3 text-xs font-bold text-indigo-600">+ Add bullet point</button></div>)}</div><button type="button" onClick={() => setResume((current) => ({ ...current, experience: [...current.experience, { id: makeId(), role: '', company: '', location: '', start: '', end: '', bullets: [''] }] }))} className="mt-4 w-full rounded-xl border border-dashed border-indigo-300 py-3 text-sm font-bold text-indigo-600 hover:bg-indigo-50">+ Add another experience</button></Block>
        <Block number="5" title="Skills" hint="Separate specific, job-relevant skills with commas."><textarea rows="3" value={resume.skills} onChange={(e) => update('skills', e.target.value)} placeholder="Product strategy, Figma, user research, prototyping" className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100" /></Block>
        <Block number="6" title="Education" hint="Include your degree, institution, and graduation year.">{resume.education.map((item, index) => <div key={item.id} className="mb-3 grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-3"><Field label={`Degree ${index + 1}`} value={item.degree} onChange={(e) => updateEducation(item.id, 'degree', e.target.value)} placeholder="B.S. Design" /><Field label="School" value={item.school} onChange={(e) => updateEducation(item.id, 'school', e.target.value)} placeholder="State University" /><Field label="Year" value={item.year} onChange={(e) => updateEducation(item.id, 'year', e.target.value)} placeholder="2022" /></div>)}<button type="button" onClick={() => setResume((current) => ({ ...current, education: [...current.education, { id: makeId(), degree: '', school: '', year: '' }] }))} className="text-xs font-bold text-indigo-600">+ Add education</button></Block>
      </div>

      <aside className="self-start">
        <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-3 sm:grid-cols-3"><label className="text-xs font-bold text-slate-600">Font<select value={style.font} onChange={(e) => setStyle({ ...style, font: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 p-2"><option>Arial</option><option>Calibri</option><option>Georgia</option><option>Times New Roman</option></select></label><label className="text-xs font-bold text-slate-600">Text size<select value={style.size} onChange={(e) => setStyle({ ...style, size: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-200 p-2"><option value="10">10 pt</option><option value="10.5">10.5 pt</option><option value="11">11 pt</option><option value="12">12 pt</option></select></label><label className="text-xs font-bold text-slate-600">Spacing<select value={style.spacing} onChange={(e) => setStyle({ ...style, spacing: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-200 p-2"><option value="1.3">Compact</option><option value="1.45">Normal</option><option value="1.65">Spacious</option></select></label></div><div className="mt-3 flex flex-wrap items-center gap-2"><label className="mr-auto flex items-center gap-2 text-xs font-bold text-slate-600">Heading color <input type="color" value={style.accent} onChange={(e) => setStyle({ ...style, accent: e.target.value })} className="h-8 w-10" /></label><button type="button" onClick={resetDraft} className="rounded-lg px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50">Start over</button><button type="button" onClick={saveDraft} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-50">{saved ? 'Saved ✓' : 'Save draft'}</button><button type="button" onClick={downloadPdf} disabled={downloading} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">{downloading ? 'Creating…' : 'Download PDF'}</button></div></div>
        <div className="overflow-x-auto overflow-y-visible rounded-2xl bg-slate-200 p-3 pb-8 sm:p-6 sm:pb-10"><article className="mx-auto min-h-[842px] min-w-[520px] max-w-[595px] bg-white shadow-2xl" style={{ padding: `${style.margin}px`, fontFamily: style.font, fontSize: `${style.size}px`, lineHeight: style.spacing }}><header className={style.template === 'modern' ? 'text-left' : 'text-center'}><h1 className="text-[2.25em] font-black tracking-tight text-slate-950">{resume.name || 'YOUR NAME'}</h1><p className="mt-1 text-[1.2em] font-bold" style={{ color: style.accent }}>{resume.role || 'TARGET ROLE'}</p><p className="mt-2 break-words text-[0.9em] text-slate-500">{contact || 'City, State · phone · email · LinkedIn'}</p></header><ResumeSection title="Professional Summary" color={style.accent}><p className="break-words">{resume.summary || 'Write a focused 2–4 line summary that highlights your experience, specialization, and strongest result.'}</p></ResumeSection><ResumeSection title="Experience" color={style.accent}>{resume.experience.map((item) => <div key={item.id} className="mb-4 break-inside-avoid"><div className="flex flex-wrap justify-between gap-x-4 gap-y-1 font-bold text-slate-950"><span>{item.role || 'ROLE TITLE'}{item.company ? ` · ${item.company}` : ' · COMPANY'}</span><span className="whitespace-nowrap">{item.start || 'START'} – {item.end || 'END'}</span></div><ul className="mt-1 list-disc space-y-0.5 pl-5">{item.bullets.map((bullet, index) => <li key={index} className="break-words">{bullet || 'Describe what you achieved, how you did it, and the measurable result.'}</li>)}</ul></div>)}</ResumeSection><ResumeSection title="Skills" color={style.accent}><p className="break-words">{resume.skills || 'Add relevant skills separated by commas.'}</p></ResumeSection><ResumeSection title="Education" color={style.accent}>{resume.education.map((item) => <div key={item.id} className="mb-1 flex flex-wrap items-start justify-between gap-x-4 gap-y-0.5 font-bold"><span className="min-w-0 flex-1 break-words">{item.degree || 'DEGREE'} · {item.school || 'INSTITUTION'}</span><span className="whitespace-nowrap">{item.year || 'YEAR'}</span></div>)}</ResumeSection></article></div>
      </aside>
    </div>
  </main>;
}

function ResumeSection({ title, color, children }) {
  return <section className="mt-6 text-slate-700"><div className="mb-2 flex items-center gap-3"><h2 className="shrink-0 text-[1.05em] font-black uppercase tracking-[0.14em]" style={{ color }}>{title}</h2><span aria-hidden="true" className="h-px min-w-0 flex-1" style={{ backgroundColor: `${color}55` }} /></div><div>{children}</div></section>;
}

export default ResumeWorkspace;
