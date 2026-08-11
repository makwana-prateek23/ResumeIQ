import { useEffect, useMemo, useRef, useState } from 'react';
import resumeBlocks from '../assets/resume-blocks.png';

const initialResume = {
  name: '', role: '', email: '', phone: '', location: '', linkedin: '', github: '', website: '',
  summary: '', skills: '',
  experience: [{ id: 1, role: '', company: '', location: '', start: '', end: '', bullets: [''] }],
  education: [{ id: 1, degree: '', school: '', year: '' }],
  sectionOrder: ['summary', 'experience', 'skills', 'education'],
  customSections: [],
};

function linkTarget(value = '', type = 'url') {
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  if (type === 'email') return `mailto:${trimmed}`;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed.replace(/^\/+/, '')}`;
}

const layoutPresets = {
  compact: { size: 9, spacing: 1.05, margin: 24, sectionGap: 8, itemGap: 3, bulletIndent: 6 },
  professional: { size: 10, spacing: 1.15, margin: 30, sectionGap: 6, itemGap: 4, bulletIndent: 6 },
  spacious: { size: 11, spacing: 1.4, margin: 48, sectionGap: 20, itemGap: 10, bulletIndent: 10 }
};
const initialStyle = { font: 'Arial', accent: '#000000', template: 'classic', pageSize: 'letter', preset: 'professional', spacingModelVersion: 2, ...layoutPresets.professional };
function getLayoutMetrics(style) {
  const page = style.pageSize === 'a4' ? { width: 595.28, height: 841.89 } : { width: 612, height: 792 };
  const bodySize = Math.min(11, Math.max(9.5, Number(style.size) || 10));
  const spacing = Math.min(1.22, Math.max(1.08, Number(style.spacing) || 1.15));
  return {
    page,
    margin: Math.min(36, Math.max(24, Number(style.margin) || 30)),
    bodySize,
    spacing,
    lineHeight: bodySize * spacing,
    sectionGap: Math.min(6, Math.max(4, Number(style.sectionGap) || 6)),
    itemGap: Math.min(6, Math.max(3, Number(style.itemGap) || 4)),
    bulletIndent: style.bulletIndent,
    headingSize: 10,
    headingHeight: 14,
    headingContentGap: 4,
  };
}
const makeId = () => Date.now() + Math.random();
const pageMarker = /^--?\s*\d+\s+of\s+\d+(?:\s*--)?$/i;

const STANDARD_SECTION_TITLES = new Set([
  'summary', 'professional summary', 'profile', 'professional profile', 'career summary', 'career objective', 'objective', 'about me',
  'experience', 'work experience', 'employment', 'professional experience', 'work history', 'employment history', 'career history', 'relevant experience', 'internship experience',
  'education', 'academic background', 'academic qualifications', 'educational qualifications',
  'skills', 'technical skills', 'core competencies', 'key skills', 'core skills', 'areas of expertise', 'technical proficiencies', 'technologies', 'technical expertise'
]);
function isStandardSectionTitle(title = '') {
  return STANDARD_SECTION_TITLES.has(String(title).toLowerCase().replace(/:$/, '').trim());
}

function parseSkillRows(value = '') {
  const categoryNames = [
    'Programming Languages', 'Frontend', 'Backend', 'Databases', 'API & Authentication',
    'Tools & Platforms', 'Cloud & DevOps', 'AI & Development Tools', 'Concepts',
    'Frameworks', 'Libraries', 'Testing', 'DevOps', 'Cloud', 'Data', 'Design', 'Research'
  ];
  const categoryPattern = new RegExp(`^(${categoryNames.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})(?:\\s*[:|]\\s*|\\s+)(.*)$`, 'i');
  const lines = String(value)
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const rows = [];
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const separated = line.match(/^([^:|]{2,60})\s*[:|]\s*(.+)$/);
    const known = line.match(categoryPattern);
    if (separated) rows.push({ category: separated[1].trim(), skills: separated[2].trim() });
    else if (known && known[2]) rows.push({ category: known[1].trim(), skills: known[2].trim() });
    else if (categoryNames.some((name) => name.toLowerCase() === line.toLowerCase()) && lines[index + 1]) {
      rows.push({ category: line, skills: lines[index + 1] });
      index += 1;
    } else rows.push({ category: '', skills: line });
  }
  return rows;
}

function SkillsContent({ value, fallback = '' }) {
  const rows = parseSkillRows(value || fallback);
  return <div className="space-y-0.5 break-words">{rows.map((row, index) => <p key={`${row.category}-${index}`}><strong className="font-bold text-slate-950">{row.category}{row.category ? ': ' : ''}</strong>{row.skills}</p>)}</div>;
}

function cleanImportedResume(data) {
  const legacyImported = (data?.experience || []).some((item) => (!item.role || /^role title$/i.test(item.role)) && (item.start || item.end || item.bullets?.some(Boolean)))
    || (data?.education || []).some((item) => [item.degree, item.school, item.year].some((value) => pageMarker.test(String(value || '').trim())));
  if (!data?.imported && !legacyImported) return data;
  const cleanedExperience = [];
  let current = null;
  for (const item of data.experience || []) {
    const realHeading = (item.role && !/^role title$/i.test(item.role)) || (item.company && !/^company(?: name)?$/i.test(item.company));
    if (realHeading) {
      const normalizedRole = String(item.role || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      const currentRole = String(current?.role || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
      if (current && normalizedRole && normalizedRole === currentRole && !current.start && !current.end && current.bullets.length === 0) {
        Object.assign(current, item, { bullets: [] });
      } else {
        current = { ...item, bullets: [] };
        cleanedExperience.push(current);
      }
    } else if (!current) {
      continue;
    }
    if (item.start) current.start = item.start;
    if (item.end) current.end = item.end;
    for (const rawBullet of item.bullets || []) {
      const bullet = rawBullet.trim();
      if (!bullet || pageMarker.test(bullet)) continue;
      const headingParts = bullet.split(/\s+(?:—|–)\s+/);
      const looksLikeMisplacedHeading = headingParts.length === 2 && bullet.length < 100 && headingParts.every((part) => part.length <= 45) && !/[.!?]$/.test(bullet);
      if (looksLikeMisplacedHeading) {
        current = { id: makeId(), role: headingParts[0], company: headingParts[1], location: '', start: '', end: '', bullets: [] };
        cleanedExperience.push(current);
        continue;
      }
      const previous = current.bullets.at(-1);
      if (previous && !/[.!?)]$/.test(previous)) current.bullets[current.bullets.length - 1] = `${previous} ${bullet}`;
      else current.bullets.push(bullet);
    }
  }
  const cleanedEducation = [];
  for (const item of data.education || []) {
    const values = [item.degree, item.school, item.year].map((value) => String(value || '').trim());
    if (values.some((value) => pageMarker.test(value))) continue;
    const [degree, school, year] = values;
    const genericDegree = !degree || /^(degree|b\.s\. design)$/i.test(degree);
    const genericSchool = !school || /^(institution|school|state university)$/i.test(school);
    if (genericDegree && genericSchool) {
      if (year && !/^year$/i.test(year) && cleanedEducation.length) cleanedEducation.at(-1).year = year;
      continue;
    }
    cleanedEducation.push({ ...item, degree: genericDegree ? '' : degree, school: genericSchool ? '' : school, year: /^year$/i.test(year) ? '' : year });
  }
  // Structured summary/experience/education/skills fields already carry the parsed, corrected
  // content — only sections that don't map onto them (Projects, Certifications, ...) need to
  // stay as freeform blocks, otherwise the raw import text would duplicate and out-format them.
  const extraSections = (data.importedSections || []).filter((section) => !isStandardSectionTitle(section.title));
  const existingCustomIds = new Set((data.customSections || []).map((section) => section.id));
  const newCustomSections = extraSections.filter((section) => !existingCustomIds.has(section.id));
  const currentOrder = data.sectionOrder?.length ? data.sectionOrder : initialResume.sectionOrder;
  const newOrderIds = newCustomSections.map((section) => section.id).filter((id) => !currentOrder.includes(id));
  return {
    ...data,
    imported: true,
    experience: cleanedExperience,
    education: cleanedEducation,
    importedSections: [],
    customSections: [...(data.customSections || []), ...newCustomSections],
    sectionOrder: [...currentOrder, ...newOrderIds]
  };
}

function hydrateResume(data) {
  return cleanImportedResume({ ...initialResume, ...data });
}

function Field({ label, className = '', ...props }) {
  return <label className={`block text-xs font-bold text-slate-600 ${className}`}>{label}<input {...props} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100" /></label>;
}

function Block({ number, title, hint, children }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="mb-4 flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-indigo-600 text-xs font-black text-white">{number}</span><div><h2 className="font-extrabold">{title}</h2><p className="mt-0.5 text-xs text-slate-500">{hint}</p></div></div>{children}</section>;
}

const sectionLabels = { summary: 'Summary', experience: 'Experience', skills: 'Skills', education: 'Education' };

function PreviewSectionContent({ section, resume, color, style: selectedStyle }) {
  const style = selectedStyle || resume.layoutStyle || initialStyle;
  const placeholder = (value, fallback) => value || (resume.imported ? '' : fallback);
  const hasExperience = resume.experience.some((item) => item.role || item.company || item.start || item.end || item.bullets.some(Boolean));
  const hasEducation = resume.education.some((item) => item.degree || item.school || item.year);
  if (resume.imported && ((section === 'summary' && !resume.summary) || (section === 'experience' && !hasExperience) || (section === 'skills' && !resume.skills) || (section === 'education' && !hasEducation))) return null;
  if (section === 'summary') return <ResumeSection title="Professional Summary" color={color} gap={style.sectionGap}><p className="break-words">{placeholder(resume.summary, 'Write a focused 2–4 line summary that highlights your experience, specialization, and strongest result.')}</p></ResumeSection>;
  if (section === 'experience') return <ResumeSection title="Experience" color={color} gap={style.sectionGap}>{resume.experience.map((item, index) => <div key={item.id} className="break-inside-avoid" style={{ marginBottom: index < resume.experience.length - 1 ? `${style.itemGap}px` : 0 }}><div className="flex flex-wrap justify-between gap-x-4 gap-y-1 font-bold text-slate-950"><span>{placeholder(item.role, 'ROLE TITLE')}{item.company ? ` · ${item.company}` : resume.imported ? '' : ' · COMPANY'}</span>{(item.start || item.end || !resume.imported) && <span className="whitespace-nowrap">{placeholder(item.start, 'START')} – {placeholder(item.end, 'END')}</span>}</div>{item.bullets.length > 0 && <ul className="mt-0.5 list-disc" style={{ paddingLeft: `${style.bulletIndent}px` }}>{item.bullets.map((bullet, bulletIndex) => <li key={bulletIndex} className="break-words">{placeholder(bullet, 'Describe what you achieved, how you did it, and the measurable result.')}</li>)}</ul>}</div>)}</ResumeSection>;
  if (section === 'skills') return <ResumeSection title="Skills" color={color} gap={style.sectionGap}><SkillsContent value={resume.skills} fallback={resume.imported ? '' : 'Add relevant skills separated by commas.'} /></ResumeSection>;
  if (section === 'education') return <ResumeSection title="Education" color={color} gap={style.sectionGap}>{resume.education.map((item, index) => <div key={item.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-0.5 font-bold" style={{ marginBottom: index < resume.education.length - 1 ? `${Math.max(2, style.itemGap / 2)}px` : 0 }}><span className="min-w-0 flex-1 break-words">{placeholder(item.degree, 'DEGREE')}{item.school ? ` · ${item.school}` : resume.imported ? '' : ' · INSTITUTION'}</span><span className="whitespace-nowrap">{placeholder(item.year, 'YEAR')}</span></div>)}</ResumeSection>;
  return null;
}

function ImportedSection({ section, color, gap }) {
  return <ResumeSection title={section.title} color={color} gap={gap}><div className="whitespace-pre-wrap break-words [tab-size:4]">{section.content}</div></ResumeSection>;
}

function ResumeWorkspace({ mode = 'create', initialResumeData = null }) {
  const storageKey = 'resumeiq-builder-v1';
  const [resume, setResume] = useState(() => {
    if (initialResumeData) return hydrateResume(initialResumeData);
    try {
      const savedResume = JSON.parse(localStorage.getItem(storageKey))?.resume;
      return savedResume ? hydrateResume(savedResume) : initialResume;
    } catch { return initialResume; }
  });
  const [style, setStyle] = useState(() => {
    try {
      const savedStyle = JSON.parse(localStorage.getItem(storageKey))?.style;
      if (!savedStyle) return initialStyle;
      if (!savedStyle.preset || savedStyle.sectionGap == null || savedStyle.bulletIndent == null) {
        return { ...initialStyle, font: savedStyle.font || initialStyle.font, accent: savedStyle.accent === '#3730a3' ? '#000000' : (savedStyle.accent || initialStyle.accent), template: savedStyle.template || initialStyle.template };
      }
      const currentPreset = savedStyle.preset !== 'custom' ? layoutPresets[savedStyle.preset] : null;
      const merged = { ...initialStyle, ...savedStyle, ...currentPreset };
      const needsSpacingMigration = savedStyle.spacingModelVersion !== initialStyle.spacingModelVersion;
      return { ...merged, spacingModelVersion: initialStyle.spacingModelVersion, size: needsSpacingMigration ? initialStyle.size : Math.min(11, Math.max(9.5, Number(merged.size) || 10)), spacing: needsSpacingMigration ? initialStyle.spacing : Math.min(1.22, Math.max(1.08, Number(merged.spacing) || 1.15)), margin: needsSpacingMigration ? initialStyle.margin : Math.min(36, Math.max(24, Number(merged.margin) || 30)), sectionGap: needsSpacingMigration ? initialStyle.sectionGap : Math.min(6, Math.max(4, Number(merged.sectionGap) || 6)), itemGap: needsSpacingMigration ? initialStyle.itemGap : Math.min(6, Math.max(3, Number(merged.itemGap) || 4)), accent: savedStyle.accent === '#3730a3' ? '#000000' : savedStyle.accent };
    } catch { return initialStyle; }
  });
  const [saved, setSaved] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingWord, setDownloadingWord] = useState(false);
  const skipAutosaveRef = useRef(false);
  const layout = useMemo(() => getLayoutMetrics(style), [style]);

  useEffect(() => {
    if (skipAutosaveRef.current) { skipAutosaveRef.current = false; return; }
    const timeout = setTimeout(() => {
      localStorage.setItem(storageKey, JSON.stringify({ resume, style }));
    }, 400);
    return () => clearTimeout(timeout);
  }, [resume, style]);

  const completion = useMemo(() => {
    const required = [resume.name, resume.role, resume.email, resume.summary, resume.skills, resume.experience[0]?.role, resume.experience[0]?.company, resume.experience[0]?.bullets.some(Boolean), resume.education[0]?.school];
    return Math.round((required.filter(Boolean).length / required.length) * 100);
  }, [resume]);

  const atsReadiness = useMemo(() => {
    const summaryWords = resume.summary.trim().split(/\s+/).filter(Boolean).length;
    const bullets = resume.experience.flatMap((item) => item.bullets).filter(Boolean);
    const checks = [
      { passed: Boolean(resume.name && resume.role), label: 'Add your name and exact target job title' },
      { passed: Boolean(resume.email && resume.phone && resume.location), label: 'Complete email, phone, and location' },
      { passed: summaryWords >= 35 && summaryWords <= 100, label: 'Keep the summary between 35 and 100 words' },
      { passed: bullets.length >= 3, label: 'Add at least three achievement bullets' },
      { passed: bullets.some((bullet) => /\d|%|\$/.test(bullet)), label: 'Include a truthful number or measurable result' },
      { passed: Boolean(resume.skills.trim()), label: 'List job-relevant skills using standard names' },
      { passed: Boolean(resume.linkedin || resume.github || resume.website), label: 'Add LinkedIn, GitHub, or a portfolio' },
      { passed: resume.education.some((item) => item.degree && item.school), label: 'Complete degree and school details' }
    ];
    return { score: Math.round((checks.filter((check) => check.passed).length / checks.length) * 100), checks };
  }, [resume]);

  function update(field, value) { setResume((current) => ({ ...current, [field]: value })); }
  function updateAppearance(field, value) {
    const next = { ...style, [field]: value, preset: 'custom' };
    setStyle(next);
    setResume((current) => ({ ...current, layoutStyle: next }));
  }
  function updateExperience(id, field, value) { setResume((current) => ({ ...current, experience: current.experience.map((item) => item.id === id ? { ...item, [field]: value } : item) })); }
  function updateBullet(id, index, value) { setResume((current) => ({ ...current, experience: current.experience.map((item) => item.id === id ? { ...item, bullets: item.bullets.map((bullet, bulletIndex) => bulletIndex === index ? value : bullet) } : item) })); }
  function updateEducation(id, field, value) { setResume((current) => ({ ...current, education: current.education.map((item) => item.id === id ? { ...item, [field]: value } : item) })); }
  function addCustomSection(title = '') {
    const id = `custom-${makeId()}`;
    setResume((current) => ({
      ...current,
      customSections: [...(current.customSections || []), { id, title, content: '' }],
      sectionOrder: [...(current.sectionOrder || initialResume.sectionOrder), id]
    }));
  }
  function updateCustomSection(id, field, value) { setResume((current) => ({ ...current, customSections: current.customSections.map((item) => item.id === id ? { ...item, [field]: value } : item) })); }
  function removeCustomSection(id) {
    setResume((current) => ({
      ...current,
      customSections: current.customSections.filter((item) => item.id !== id),
      sectionOrder: (current.sectionOrder || initialResume.sectionOrder).filter((key) => key !== id)
    }));
  }
  function saveDraft() { localStorage.setItem(storageKey, JSON.stringify({ resume, style })); setSaved(true); }
  function resetDraft() {
    if (!window.confirm('Clear every resume field and start again?')) return;
    skipAutosaveRef.current = true;
    setResume(initialResume);
    setStyle(initialStyle);
    localStorage.removeItem(storageKey);
  }
  function shiftSection(section, direction) {
    setResume((current) => {
      const order = [...(current.sectionOrder || initialResume.sectionOrder)];
      const from = order.indexOf(section);
      const to = from + direction;
      if (from < 0 || to < 0 || to >= order.length) return current;
      [order[from], order[to]] = [order[to], order[from]];
      return { ...current, sectionOrder: order };
    });
  }

  async function downloadPdf() {
    setDownloading(true);
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ unit: 'pt', format: style.pageSize || 'letter' });
      const margin = layout.margin;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const width = pageWidth - margin * 2;
      const pdfFont = /times|georgia/i.test(style.font) ? 'times' : 'helvetica';
      let y = margin;
      const ensureSpace = (points) => { if (y + points > pageHeight - margin) { pdf.addPage(); y = margin; return true; } return false; };
      const measureLines = (value, size = layout.bodySize, indent = 0, weight = 'normal') => {
        if (!value) return [];
        pdf.setFont(pdfFont, weight); pdf.setFontSize(size);
        return pdf.splitTextToSize(String(value), width - indent);
      };
      const text = (value, size = layout.bodySize, weight = 'normal', gap = 5, color = '#334155', indent = 0) => {
        if (!value) return;
        pdf.setFont(pdfFont, weight); pdf.setFontSize(size); pdf.setTextColor(color);
        const lines = measureLines(value, size, indent, weight);
        lines.forEach((line) => { if (y > pageHeight - margin) { pdf.addPage(); y = margin; } pdf.text(line, margin + indent, y); y += size * layout.spacing; }); y += gap;
      };
      const heading = (value) => {
        const broke = ensureSpace(layout.headingHeight + layout.headingContentGap + layout.lineHeight);
        y += broke ? 0 : layout.sectionGap;
        pdf.setFont(pdfFont, 'bold'); pdf.setFontSize(layout.headingSize); pdf.setTextColor(style.accent);
        const label = value.toUpperCase();
        pdf.text(label, margin, y);
        pdf.setDrawColor(style.accent); pdf.setLineWidth(0.5);
        pdf.line(margin, y + 3, margin + width, y + 3);
        y += layout.headingHeight;
      };
      const twoColumnText = (left, right, size = layout.bodySize, weight = 'bold', gap = 2) => {
        if (!left && !right) return;
        ensureSpace(size * layout.spacing + gap);
        pdf.setFont(pdfFont, weight); pdf.setFontSize(size); pdf.setTextColor('#0f172a');
        const rightWidth = right ? pdf.getTextWidth(right) + 12 : 0;
        const leftLines = pdf.splitTextToSize(String(left || ''), Math.max(120, width - rightWidth));
        leftLines.forEach((line, index) => {
          ensureSpace(size * layout.spacing);
          pdf.text(line, margin, y);
          if (index === 0 && right) pdf.text(right, margin + width, y, { align: 'right' });
          y += size * layout.spacing;
        });
        y += gap;
      };
      const labeledText = (label, value, gap = 1) => {
        if (!label) { text(value, layout.bodySize, 'normal', gap); return; }
        ensureSpace(layout.lineHeight * 2);
        pdf.setFontSize(layout.bodySize); pdf.setTextColor('#334155');
        pdf.setFont(pdfFont, 'bold');
        const prefix = `${label}: `;
        const prefixWidth = pdf.getTextWidth(prefix);
        pdf.text(prefix, margin, y);
        pdf.setFont(pdfFont, 'normal');
        const lines = pdf.splitTextToSize(String(value), width - prefixWidth);
        lines.forEach((line, index) => {
          ensureSpace(layout.lineHeight);
          pdf.text(line, index === 0 ? margin + prefixWidth : margin, y);
          y += layout.lineHeight;
        });
        y += gap;
      };
      const centeredText = (value, size, weight = 'normal', gap = 4, color = '#000000') => {
        if (!value) return;
        pdf.setFont(pdfFont, weight); pdf.setFontSize(size); pdf.setTextColor(color);
        const lines = pdf.splitTextToSize(String(value), width);
        lines.forEach((line) => { pdf.text(line, pageWidth / 2, y, { align: 'center' }); y += size * 1.08; });
        y += gap;
      };
      const centeredContact = (items) => {
        const visible = items.filter((item) => item.value);
        if (!visible.length) return;
        const separator = '  •  ';
        pdf.setFont(pdfFont, 'normal'); pdf.setFontSize(9); pdf.setTextColor('#334155');
        const totalWidth = visible.reduce((sum, item) => sum + pdf.getTextWidth(item.value), 0) + pdf.getTextWidth(separator) * (visible.length - 1);
        let x = Math.max(margin, (pageWidth - totalWidth) / 2);
        visible.forEach((item, index) => {
          if (item.url) pdf.textWithLink(item.value, x, y, { url: item.url });
          else pdf.text(item.value, x, y);
          x += pdf.getTextWidth(item.value);
          if (index < visible.length - 1) { pdf.text(separator, x, y); x += pdf.getTextWidth(separator); }
        });
        y += 9 * 1.15;
      };
      centeredText(resume.name || (resume.imported ? '' : 'YOUR NAME'), 22, 'bold', 2, '#000000');
      centeredText(resume.role || (resume.imported ? '' : 'TARGET ROLE'), 12, 'bold', 3, '#000000');
      centeredContact([
        { value: resume.location }, { value: resume.phone }, { value: resume.email, url: linkTarget(resume.email, 'email') },
        { value: resume.linkedin ? 'LinkedIn' : '', url: linkTarget(resume.linkedin) },
        { value: resume.github ? 'GitHub' : '', url: linkTarget(resume.github) },
        { value: resume.website, url: linkTarget(resume.website) }
      ]);
      const pdfSections = {
        summary: () => { if (!resume.summary) return; heading('Professional summary'); text(resume.summary, layout.bodySize, 'normal', 0); },
        experience: () => { const items = resume.experience.filter((item) => item.role || item.company || item.start || item.end || item.bullets.some(Boolean)); if (!items.length) return; heading('Experience'); items.forEach((item, itemIndex) => { const dates = [item.start, item.end].filter(Boolean).join(' – '); const title = [item.role, item.company].filter(Boolean).join(' — '); const bullets = item.bullets.filter(Boolean); pdf.setFont(pdfFont, 'bold'); pdf.setFontSize(layout.bodySize); const dateWidth = dates ? pdf.getTextWidth(dates) + 12 : 0; const titleLines = pdf.splitTextToSize(title, Math.max(120, width - dateWidth)).length; const jobHeight = (titleLines * layout.lineHeight) + (item.location ? 9 * layout.spacing + 2 : 0) + bullets.reduce((height, bullet) => height + (measureLines(`• ${bullet}`, layout.bodySize, layout.bulletIndent).length * layout.lineHeight), 0); if (jobHeight < pageHeight - margin * 2) ensureSpace(jobHeight); twoColumnText(title, dates, layout.bodySize, 'bold', 1); text(item.location, 9, 'normal', 2); bullets.forEach((bullet) => text(`• ${bullet}`, layout.bodySize, 'normal', 0, '#334155', layout.bulletIndent)); if (itemIndex < items.length - 1) y += layout.itemGap; }); },
        skills: () => { if (!resume.skills) return; heading('Skills'); const rows = parseSkillRows(resume.skills); rows.forEach((row, index) => labeledText(row.category, row.skills, index < rows.length - 1 ? 1 : 0)); },
        education: () => { const items = resume.education.filter((item) => item.degree || item.school || item.year); if (!items.length) return; heading('Education'); items.forEach((item, index) => twoColumnText([item.degree, item.school].filter(Boolean).join(' — '), item.year, layout.bodySize, 'bold', index < items.length - 1 ? Math.max(3, layout.itemGap / 2) : 0)); }
      };
      (resume.sectionOrder || initialResume.sectionOrder).forEach((section) => {
        if (pdfSections[section]) { pdfSections[section](); return; }
        const custom = resume.customSections?.find((item) => item.id === section);
        if (custom?.content) {
          heading(custom.title || 'Section');
          String(custom.content).split(/\r?\n/).forEach((line) => text(line || ' ', layout.bodySize, 'normal', 1));
          y += 4;
        }
      });
      pdf.save(`${(resume.name || 'resume').trim().replace(/\s+/g, '-').toLowerCase()}.pdf`);
    } finally { setDownloading(false); }
  }

  async function downloadWord() {
    setDownloadingWord(true);
    try {
      const { AlignmentType, BorderStyle, Document, ExternalHyperlink, Packer, Paragraph, TabStopPosition, TabStopType, TextRun } = await import('docx');
      const bodySize = Math.round(layout.bodySize * 2);
      const children = [];
      const paragraph = (value, options = {}) => new Paragraph({
        alignment: options.center ? AlignmentType.CENTER : AlignmentType.LEFT,
        spacing: { before: options.before, after: options.after ?? 0, line: Math.round(layout.spacing * 240) },
        tabStops: options.tabs ? [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }] : undefined,
        bullet: options.bullet ? { level: 0 } : undefined,
        border: options.heading ? { bottom: { color: '000000', style: BorderStyle.SINGLE, size: 4, space: 2 } } : undefined,
        keepNext: options.keepNext,
        keepLines: true,
        children: [new TextRun({ text: value, bold: options.bold, size: options.size ?? bodySize, color: '000000', font: style.font })]
      });
      children.push(paragraph(resume.name, { center: true, bold: true, size: 32, after: 30 }));
      if (resume.role) children.push(paragraph(resume.role, { center: true, bold: true, size: 22, after: 30 }));
      const wordContacts = [
        { value: resume.location }, { value: resume.phone }, { value: resume.email, url: linkTarget(resume.email, 'email') },
        { value: resume.linkedin ? 'LinkedIn' : '', url: linkTarget(resume.linkedin) },
        { value: resume.github ? 'GitHub' : '', url: linkTarget(resume.github) },
        { value: resume.website, url: linkTarget(resume.website) }
      ].filter((item) => item.value);
      if (wordContacts.length) children.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 160 }, children: wordContacts.flatMap((item, index) => [
        ...(index ? [new TextRun({ text: '  •  ', size: 18, font: style.font })] : []),
        item.url ? new ExternalHyperlink({ link: item.url, children: [new TextRun({ text: item.value, size: 18, font: style.font, color: '0563C1', underline: {} })] }) : new TextRun({ text: item.value, size: 18, font: style.font })
      ]) }));
      const sectionHeading = (title, preserveCase = false) => children.push(paragraph(preserveCase ? title : title.toUpperCase(), { heading: true, bold: true, size: Math.round(layout.headingSize * 2), before: Math.round(layout.sectionGap * 20), after: Math.round(layout.headingContentGap * 20), keepNext: true }));
      const wordSections = {
        summary: () => { if (!resume.summary) return; sectionHeading('Professional Summary'); children.push(paragraph(resume.summary, { after: 0 })); },
        experience: () => {
          if (!resume.experience.length) return;
          sectionHeading('Experience');
          resume.experience.forEach((item, itemIndex) => {
            const title = [item.role, item.company].filter(Boolean).join(' · ');
            const dates = [item.start, item.end].filter(Boolean).join(' – ');
            const bullets = item.bullets.filter(Boolean);
            const hasFollowingItem = itemIndex < resume.experience.length - 1;
            children.push(paragraph(`${title}${dates ? `\t${dates}` : ''}`, { bold: true, tabs: true, after: bullets.length ? 0 : hasFollowingItem ? Math.round(layout.itemGap * 20) : 0, keepNext: bullets.length > 0 }));
            bullets.forEach((bullet, index) => children.push(paragraph(bullet, { bullet: true, keepNext: index < bullets.length - 1, after: index === bullets.length - 1 ? (hasFollowingItem ? Math.round(layout.itemGap * 20) : 0) : 0 })));
          });
        },
        skills: () => {
          if (!resume.skills) return;
          sectionHeading('Skills');
          const rows = parseSkillRows(resume.skills);
          rows.forEach((row, index) => children.push(new Paragraph({
            spacing: { after: index < rows.length - 1 ? 20 : 0, line: Math.round(layout.spacing * 240) },
            children: [
              ...(row.category ? [new TextRun({ text: `${row.category}: `, bold: true, size: bodySize, color: '000000', font: style.font })] : []),
              new TextRun({ text: row.skills, size: bodySize, color: '000000', font: style.font })
            ]
          })));
        },
        education: () => {
          if (!resume.education.length) return;
          sectionHeading('Education');
          resume.education.forEach((item, index) => {
            const study = [item.degree, item.school].filter(Boolean).join(' · ');
            children.push(paragraph(`${study}${item.year ? `\t${item.year}` : ''}`, { bold: true, tabs: true, after: index < resume.education.length - 1 ? Math.round(Math.max(2, layout.itemGap / 2) * 20) : 0 }));
          });
        }
      };
      (resume.sectionOrder || initialResume.sectionOrder).forEach((section) => {
        if (wordSections[section]) { wordSections[section](); return; }
        const custom = resume.customSections?.find((item) => item.id === section);
        if (custom?.content) {
          sectionHeading(custom.title || 'Section', true);
          String(custom.content).split(/\r?\n/).forEach((line) => children.push(paragraph(line, { after: 20 })));
        }
      });
      const wordMargin = Math.round(layout.margin * 20);
      const wordDocument = new Document({ sections: [{ properties: { page: { size: style.pageSize === 'a4' ? { width: 11906, height: 16838 } : { width: 12240, height: 15840 }, margin: { top: wordMargin, right: wordMargin, bottom: wordMargin, left: wordMargin } } }, children }] });
      const blob = await Packer.toBlob(wordDocument);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `${(resume.name || 'resume').trim().replace(/\s+/g, '-').toLowerCase()}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally { setDownloadingWord(false); }
  }

  const contactItems = [
    { value: resume.location }, { value: resume.phone }, { value: resume.email, href: linkTarget(resume.email, 'email') },
    { value: resume.linkedin ? 'LinkedIn' : '', href: linkTarget(resume.linkedin) },
    { value: resume.github ? 'GitHub' : '', href: linkTarget(resume.github) },
    { value: resume.website, href: linkTarget(resume.website) }
  ].filter((item) => item.value);
  const previewScale = 595 / layout.page.width;
  const previewStyle = { ...style, size: layout.bodySize, spacing: layout.spacing, sectionGap: layout.sectionGap, itemGap: layout.itemGap, bulletIndent: layout.bulletIndent };
  return <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7">
    <header className="relative mb-6 overflow-hidden rounded-3xl bg-slate-950 p-6 text-white sm:p-8"><div className="absolute inset-y-0 right-0 hidden w-[38%] lg:block"><div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/30 to-transparent" /><img src={resumeBlocks} alt="Resume content blocks combining into a finished document" className="h-full w-full object-cover opacity-75" /></div><div className="relative max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">{mode === 'format' ? 'Resume formatting studio' : 'Guided resume builder'}</p><h1 className="mt-2 text-3xl font-black tracking-tight">{mode === 'format' ? 'Make every page clean and consistent.' : 'Build your resume, one simple block at a time.'}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Fill in the blocks on the left. Your professional, ATS-friendly document updates instantly on the right.</p><div className="mt-5 max-w-xs"><div className="flex justify-between text-xs font-bold"><span>Resume complete</span><span>{completion}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-cyan-400 transition-all duration-500" style={{ width: `${completion}%` }} /></div></div></div></header>
    <section className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5" aria-labelledby="ats-readiness-title"><div><p id="ats-readiness-title" className="text-sm font-black text-emerald-950">ATS readiness: {atsReadiness.score}%</p><p className="mt-1 text-xs text-emerald-800">This checks résumé basics. Match the wording to each real job description for the strongest result.</p></div><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">{atsReadiness.checks.map((check) => <div key={check.label} className={`flex gap-2 rounded-xl p-3 text-xs font-semibold ${check.passed ? 'bg-white/70 text-emerald-800' : 'border border-amber-200 bg-amber-50 text-amber-900'}`}><span aria-hidden="true" className="font-black">{check.passed ? '✓' : '!'}</span><span>{check.label}</span></div>)}</div></section>
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(400px,0.9fr)_minmax(560px,1.1fr)]">
      <div className="grid gap-4">
        <Block number="1" title="Name and target role" hint="Lead with the role you are applying for."><div className="grid gap-3 sm:grid-cols-2"><Field label="Full name" value={resume.name} onChange={(e) => update('name', e.target.value)} placeholder="Jordan Lee" /><Field label="Target role" value={resume.role} onChange={(e) => update('role', e.target.value)} placeholder="Product Designer" /></div></Block>
        <Block number="2" title="Contact information" hint="Links stay clickable in the preview, PDF, and Word exports."><div className="grid gap-3 sm:grid-cols-2"><Field label="Email" type="email" value={resume.email} onChange={(e) => update('email', e.target.value)} placeholder="jordan@email.com" /><Field label="Phone" value={resume.phone} onChange={(e) => update('phone', e.target.value)} placeholder="(555) 000-0000" /><Field label="City, State" value={resume.location} onChange={(e) => update('location', e.target.value)} placeholder="Austin, TX" /><Field label="LinkedIn" value={resume.linkedin} onChange={(e) => update('linkedin', e.target.value)} placeholder="linkedin.com/in/jordan" /><Field label="GitHub" value={resume.github} onChange={(e) => update('github', e.target.value)} placeholder="github.com/jordan" /><Field label="Portfolio / website" value={resume.website} onChange={(e) => update('website', e.target.value)} placeholder="jordan.design" /></div></Block>
        <Block number="3" title="Professional summary" hint="In 35–100 words, say what you do, your experience, strongest skills, and one clear result."><textarea rows="5" value={resume.summary} maxLength="600" onChange={(e) => update('summary', e.target.value)} placeholder="Example: Software developer with 3 years of experience building React applications and reusable interfaces. Improved [real result] by [number] through [specific action]." className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100" /><div className="mt-2 flex justify-between gap-3 text-xs text-slate-500"><span>Use skills that also appear in your experience or projects.</span><span className="shrink-0">{resume.summary.trim().split(/\s+/).filter(Boolean).length} words</span></div></Block>
        <Block number="4" title="Experience and bullet points" hint="Start bullets with an action and finish with a measurable result."><div className="grid gap-4">{resume.experience.map((item, itemIndex) => <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-extrabold">Experience {itemIndex + 1}</p>{resume.experience.length > 1 && <button type="button" onClick={() => setResume((current) => ({ ...current, experience: current.experience.filter((entry) => entry.id !== item.id) }))} className="text-xs font-bold text-rose-600">Remove</button>}</div><div className="grid gap-3 sm:grid-cols-2"><Field label="Role" value={item.role} onChange={(e) => updateExperience(item.id, 'role', e.target.value)} placeholder="Senior Designer" /><Field label="Company" value={item.company} onChange={(e) => updateExperience(item.id, 'company', e.target.value)} placeholder="Company name" /><Field label="Start" value={item.start} onChange={(e) => updateExperience(item.id, 'start', e.target.value)} placeholder="Jan 2022" /><Field label="End" value={item.end} onChange={(e) => updateExperience(item.id, 'end', e.target.value)} placeholder="Present" /></div><div className="mt-3 grid gap-2">{item.bullets.map((bullet, bulletIndex) => <div key={bulletIndex} className="flex gap-2"><span className="mt-3 text-indigo-500">•</span><input value={bullet} onChange={(e) => updateBullet(item.id, bulletIndex, e.target.value)} placeholder="Improved [metric] by [number] through [action]" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />{item.bullets.length > 1 && <button aria-label="Remove bullet" type="button" onClick={() => updateExperience(item.id, 'bullets', item.bullets.filter((_, index) => index !== bulletIndex))} className="px-2 text-rose-500">×</button>}</div>)}</div><button type="button" onClick={() => updateExperience(item.id, 'bullets', [...item.bullets, ''])} className="mt-3 text-xs font-bold text-indigo-600">+ Add bullet point</button></div>)}</div><button type="button" onClick={() => setResume((current) => ({ ...current, experience: [...current.experience, { id: makeId(), role: '', company: '', location: '', start: '', end: '', bullets: [''] }] }))} className="mt-4 w-full rounded-xl border border-dashed border-indigo-300 py-3 text-sm font-bold text-indigo-600 hover:bg-indigo-50">+ Add another experience</button></Block>
        <Block number="5" title="Skills" hint="Use one category per line so recruiters can scan your strengths quickly."><textarea rows="7" value={resume.skills} onChange={(e) => update('skills', e.target.value)} placeholder={'Design: Figma, prototyping, design systems\nResearch: User interviews, usability testing\nTools: Jira, Miro, Adobe Creative Suite'} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100" /><p className="mt-2 text-xs leading-5 text-slate-500"><span className="font-bold text-slate-700">Recommended format:</span> Category: skill, skill, skill. Put each category on a new line and prioritize the categories most relevant to the job.</p></Block>
        <Block number="6" title="Education" hint="Include your degree, institution, and graduation year.">{resume.education.map((item, index) => <div key={item.id} className="mb-3 grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-3"><Field label={`Degree ${index + 1}`} value={item.degree} onChange={(e) => updateEducation(item.id, 'degree', e.target.value)} placeholder="B.S. Design" /><Field label="School" value={item.school} onChange={(e) => updateEducation(item.id, 'school', e.target.value)} placeholder="State University" /><Field label="Year" value={item.year} onChange={(e) => updateEducation(item.id, 'year', e.target.value)} placeholder="2022" /></div>)}<button type="button" onClick={() => setResume((current) => ({ ...current, education: [...current.education, { id: makeId(), degree: '', school: '', year: '' }] }))} className="text-xs font-bold text-indigo-600">+ Add education</button></Block>
        <Block number="7" title="Additional sections" hint="Add optional sections like Projects or Certifications.">{resume.imported && resume.customSections?.length > 0 && <p className="mb-3 -mt-1 text-xs text-slate-500">Sections detected in your uploaded resume that don't fit Summary, Experience, Skills, or Education are listed here so you can edit or remove them.</p>}<div className="grid gap-4">{(resume.customSections || []).map((section) => <div key={section.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="mb-3 flex items-center gap-2"><input value={section.title} onChange={(e) => updateCustomSection(section.id, 'title', e.target.value)} placeholder="Section title (e.g. Projects)" className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-bold outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" /><button type="button" onClick={() => removeCustomSection(section.id)} className="shrink-0 text-xs font-bold text-rose-600">Remove</button></div><textarea rows="4" value={section.content} onChange={(e) => updateCustomSection(section.id, 'content', e.target.value)} placeholder={'One item per line, e.g.\nProject name — one-line description of what you built and the result.'} className="w-full rounded-xl border border-slate-200 bg-white p-3 text-sm leading-6 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" /></div>)}</div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => addCustomSection('Projects')} className="rounded-xl border border-dashed border-indigo-300 px-4 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50">+ Projects</button><button type="button" onClick={() => addCustomSection('Certifications')} className="rounded-xl border border-dashed border-indigo-300 px-4 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50">+ Certifications</button><button type="button" onClick={() => addCustomSection('')} className="rounded-xl border border-dashed border-indigo-300 px-4 py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50">+ Custom section</button></div></Block>
      </div>

      <aside className="self-start">
        <section className="mb-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-bold text-slate-700">Choose section order</p><p className="mt-1 text-xs text-slate-500">Use the arrows—no dragging required.</p><div className="mt-3 grid gap-2">{(resume.sectionOrder || initialResume.sectionOrder).map((section, index, order) => <div key={section} className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2"><span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700">{index + 1}. {sectionLabels[section] || resume.customSections?.find((item) => item.id === section)?.title || 'Section'}</span><button type="button" aria-label={`Move ${sectionLabels[section] || 'section'} up`} disabled={index === 0} onClick={() => shiftSection(section, -1)} className="rounded-lg bg-white px-2 py-1 text-sm font-black text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-30">↑</button><button type="button" aria-label={`Move ${sectionLabels[section] || 'section'} down`} disabled={index === order.length - 1} onClick={() => shiftSection(section, 1)} className="rounded-lg bg-white px-2 py-1 text-sm font-black text-slate-600 shadow-sm disabled:cursor-not-allowed disabled:opacity-30">↓</button></div>)}</div></section>
        <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <p className="text-xs font-bold text-slate-700">Text appearance</p>
          <p className="mt-1 text-xs text-slate-500">Balanced values keep the preview and downloads consistent.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <label className="text-xs font-bold text-slate-600">Font<select value={style.font} onChange={(e) => updateAppearance('font', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2"><option>Arial</option><option>Calibri</option><option>Georgia</option><option>Times New Roman</option></select></label>
            <label className="text-xs font-bold text-slate-600">Text size<select value={layout.bodySize} onChange={(e) => updateAppearance('size', Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 p-2"><option value="9.5">Small</option><option value="10">Balanced</option><option value="10.5">Medium</option><option value="11">Large</option></select></label>
            <label className="text-xs font-bold text-slate-600">Line spacing<select value={layout.spacing} onChange={(e) => updateAppearance('spacing', Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 p-2"><option value="1.08">Tight</option><option value="1.15">Balanced</option><option value="1.22">Relaxed</option></select></label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3"><label className="mr-auto flex items-center gap-2 text-xs font-bold text-slate-600">Heading color <input type="color" value={style.accent} onChange={(e) => updateAppearance('accent', e.target.value)} className="h-8 w-10" /></label><button type="button" onClick={resetDraft} className="rounded-lg px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50">Start over</button><button type="button" onClick={saveDraft} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-50">{saved ? 'Saved ✓' : 'Save draft'}</button><button type="button" onClick={downloadWord} disabled={downloadingWord} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 disabled:opacity-60">{downloadingWord ? 'Creating…' : 'Download Word'}</button><button type="button" onClick={downloadPdf} disabled={downloading} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">{downloading ? 'Creating…' : 'Download PDF'}</button></div>
        </div>
        <div className="overflow-x-auto overflow-y-visible rounded-2xl bg-slate-200 p-3 pb-8 sm:p-6 sm:pb-10"><article className="mx-auto min-w-[520px] max-w-[595px] bg-white shadow-2xl" style={{ minHeight: `${layout.page.height * previewScale}px`, padding: `${layout.margin * previewScale}px`, fontFamily: style.font, fontSize: `${layout.bodySize * previewScale}px`, lineHeight: layout.spacing }}><header className={style.template === 'modern' ? 'text-left' : 'text-center'}><h1 className="text-[2.25em] font-black tracking-tight text-slate-950" style={{ lineHeight: 1.08 }}>{resume.name || (resume.imported ? '' : 'YOUR NAME')}</h1><p className="mt-1 text-[1.2em] font-bold" style={{ color: style.accent, lineHeight: 1.08 }}>{resume.role || (resume.imported ? '' : 'TARGET ROLE')}</p><p className="mt-2 break-words text-[0.9em] text-slate-500" style={{ lineHeight: 1.15 }}>{contactItems.length ? contactItems.map((item, index) => <span key={`${item.value}-${index}`}>{index > 0 && ' · '}{item.href ? <a href={item.href} target="_blank" rel="noreferrer" className="text-blue-700 underline">{item.value}</a> : item.value}</span>) : (resume.imported ? '' : 'City, State · phone · email · LinkedIn')}</p></header>{(resume.sectionOrder || initialResume.sectionOrder).map((section) => {
              const custom = resume.customSections?.find((item) => item.id === section);
              if (custom) return <ImportedSection key={custom.id} section={custom} color={style.accent} gap={layout.sectionGap} />;
              return <PreviewSectionContent key={section} section={section} resume={resume} color={style.accent} style={previewStyle} />;
            })}</article></div>
      </aside>
    </div>
  </main>;
}

function ResumeSection({ title, color, gap = 20, children }) {
  return <section className="text-slate-700" style={{ marginTop: `${gap}px` }}><div className="mb-1"><h2 className="text-[1.05em] font-black uppercase tracking-[0.08em]" style={{ color }}>{title}</h2><div aria-hidden="true" className="mt-0.5 h-px w-full" style={{ backgroundColor: `${color}88` }} /></div><div>{children}</div></section>;
}

export default ResumeWorkspace;
