import { useMemo, useState } from 'react';
import resumeBlocks from '../assets/resume-blocks.png';

const initialResume = {
  name: '', role: '', email: '', phone: '', location: '', linkedin: '', github: '', website: '',
  summary: '', skills: '',
  experience: [{ id: 1, role: '', company: '', location: '', start: '', end: '', bullets: [''] }],
  education: [{ id: 1, degree: '', school: '', year: '' }],
  sectionOrder: ['summary', 'experience', 'skills', 'education'],
};

function linkTarget(value = '', type = 'url') {
  const trimmed = String(value).trim();
  if (!trimmed) return '';
  if (type === 'email') return `mailto:${trimmed}`;
  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed.replace(/^\/+/, '')}`;
}

const layoutPresets = {
  compact: { size: 9.5, spacing: 1.12, margin: 30, sectionGap: 14, itemGap: 5, bulletIndent: 6 },
  professional: { size: 10, spacing: 1.2, margin: 36, sectionGap: 20, itemGap: 8, bulletIndent: 6 },
  spacious: { size: 11, spacing: 1.4, margin: 48, sectionGap: 26, itemGap: 12, bulletIndent: 10 }
};
const initialStyle = { font: 'Arial', accent: '#000000', template: 'classic', pageSize: 'letter', preset: 'professional', ...layoutPresets.professional };
const makeId = () => Date.now() + Math.random();
const pageMarker = /^--?\s*\d+\s+of\s+\d+(?:\s*--)?$/i;

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
      if (headingParts.length === 2 && bullet.length < 140) {
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
  return { ...data, imported: true, experience: cleanedExperience, education: cleanedEducation };
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
  if (section === 'summary') return <ResumeSection title="Professional Summary" color={color} gap={style.sectionGap}><p className="break-words text-justify [text-align-last:left]">{placeholder(resume.summary, 'Write a focused 2–4 line summary that highlights your experience, specialization, and strongest result.')}</p></ResumeSection>;
  if (section === 'experience') return <ResumeSection title="Experience" color={color} gap={style.sectionGap}>{resume.experience.map((item) => <div key={item.id} className="break-inside-avoid" style={{ marginBottom: `${style.itemGap}px` }}><div className="flex flex-wrap justify-between gap-x-4 gap-y-1 font-bold text-slate-950"><span>{placeholder(item.role, 'ROLE TITLE')}{item.company ? ` · ${item.company}` : resume.imported ? '' : ' · COMPANY'}</span>{(item.start || item.end || !resume.imported) && <span className="whitespace-nowrap">{placeholder(item.start, 'START')} – {placeholder(item.end, 'END')}</span>}</div>{item.bullets.length > 0 && <ul className="mt-0.5 list-disc" style={{ paddingLeft: `${style.bulletIndent}px` }}>{item.bullets.map((bullet, index) => <li key={index} className="break-words">{placeholder(bullet, 'Describe what you achieved, how you did it, and the measurable result.')}</li>)}</ul>}</div>)}</ResumeSection>;
  if (section === 'skills') return <ResumeSection title="Skills" color={color} gap={style.sectionGap}><SkillsContent value={resume.skills} fallback={resume.imported ? '' : 'Add relevant skills separated by commas.'} /></ResumeSection>;
  if (section === 'education') return <ResumeSection title="Education" color={color} gap={style.sectionGap}>{resume.education.map((item) => <div key={item.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-0.5 font-bold" style={{ marginBottom: `${Math.max(2, style.itemGap / 2)}px` }}><span className="min-w-0 flex-1 break-words">{placeholder(item.degree, 'DEGREE')}{item.school ? ` · ${item.school}` : resume.imported ? '' : ' · INSTITUTION'}</span><span className="whitespace-nowrap">{placeholder(item.year, 'YEAR')}</span></div>)}</ResumeSection>;
  return null;
}

function ImportedSection({ section, color, gap }) {
  return <ResumeSection title={section.title} color={color} gap={gap}><div className="whitespace-pre-line break-words">{section.content}</div></ResumeSection>;
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
      return { ...initialStyle, ...savedStyle, accent: savedStyle.accent === '#3730a3' ? '#000000' : savedStyle.accent };
    } catch { return initialStyle; }
  });
  const [saved, setSaved] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [downloadingWord, setDownloadingWord] = useState(false);
  const [draggedSection, setDraggedSection] = useState(null);

  const completion = useMemo(() => {
    const required = [resume.name, resume.role, resume.email, resume.summary, resume.skills, resume.experience[0]?.role, resume.experience[0]?.company, resume.experience[0]?.bullets.some(Boolean), resume.education[0]?.school];
    return Math.round((required.filter(Boolean).length / required.length) * 100);
  }, [resume]);

  function update(field, value) {
    setResume((current) => {
      const next = { ...current, [field]: value };
      if (current.importedSections?.length && (field === 'summary' || field === 'skills')) {
        const aliases = field === 'summary'
          ? ['summary', 'professional summary', 'profile', 'professional profile', 'career summary']
          : ['skills', 'technical skills', 'core competencies'];
        next.importedSections = current.importedSections.map((section) => aliases.includes(section.title.toLowerCase().replace(/:$/, '').trim())
          ? { ...section, content: value }
          : section);
      }
      return next;
    });
  }
  function applyLayoutPreset(preset) {
    const next = { ...style, ...layoutPresets[preset], preset };
    setStyle(next);
    setResume((current) => ({ ...current, layoutStyle: next }));
  }
  function updateStyle(field, value) {
    const next = { ...style, [field]: value, preset: 'custom' };
    setStyle(next);
    setResume((current) => ({ ...current, layoutStyle: next }));
  }
  function updateExperience(id, field, value) { setResume((current) => ({ ...current, experience: current.experience.map((item) => item.id === id ? { ...item, [field]: value } : item) })); }
  function updateBullet(id, index, value) { setResume((current) => ({ ...current, experience: current.experience.map((item) => item.id === id ? { ...item, bullets: item.bullets.map((bullet, bulletIndex) => bulletIndex === index ? value : bullet) } : item) })); }
  function updateEducation(id, field, value) { setResume((current) => ({ ...current, education: current.education.map((item) => item.id === id ? { ...item, [field]: value } : item) })); }
  function updateImportedContent(id, value) {
    setResume((current) => {
      const section = current.importedSections.find((item) => item.id === id);
      const title = section?.title.toLowerCase().replace(/:$/, '').trim();
      const next = { ...current, importedSections: current.importedSections.map((item) => item.id === id ? { ...item, content: value } : item) };
      if (['summary', 'professional summary', 'profile', 'professional profile', 'career summary'].includes(title)) next.summary = value;
      if (['skills', 'technical skills', 'core competencies'].includes(title)) next.skills = value;
      return next;
    });
  }
  function saveDraft() { localStorage.setItem(storageKey, JSON.stringify({ resume, style })); setSaved(true); }
  function resetDraft() { if (window.confirm('Clear every resume field and start again?')) { setResume(initialResume); setStyle(initialStyle); localStorage.removeItem(storageKey); } }
  function moveSection(target) {
    if (!draggedSection || draggedSection === target) return;
    setResume((current) => {
      const order = [...(current.sectionOrder || initialResume.sectionOrder)];
      const from = order.indexOf(draggedSection);
      const to = order.indexOf(target);
      order.splice(from, 1);
      order.splice(to, 0, draggedSection);
      return { ...current, sectionOrder: order };
    });
    setDraggedSection(null);
  }

  async function downloadPdf() {
    setDownloading(true);
    try {
      const { jsPDF } = await import('jspdf');
      const pdf = new jsPDF({ unit: 'pt', format: style.pageSize || 'letter' });
      const margin = style.margin;
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const width = pageWidth - margin * 2;
      let y = margin;
      const ensureSpace = (points) => { if (y + points > pageHeight - margin) { pdf.addPage(); y = margin; } };
      const text = (value, size = style.size, weight = 'normal', gap = 5, color = '#334155', indent = 0) => {
        if (!value) return;
        pdf.setFont('helvetica', weight); pdf.setFontSize(size); pdf.setTextColor(color);
        const lines = pdf.splitTextToSize(String(value), width - indent);
        lines.forEach((line) => { if (y > pageHeight - margin) { pdf.addPage(); y = margin; } pdf.text(line, margin + indent, y); y += size * style.spacing; }); y += gap;
      };
      const heading = (value) => {
        ensureSpace(42);
        y += Math.max(6, style.sectionGap - 12);
        pdf.setFont('helvetica', 'bold'); pdf.setFontSize(10); pdf.setTextColor(style.accent);
        const label = value.toUpperCase();
        pdf.text(label, margin, y);
        pdf.setDrawColor(style.accent); pdf.setLineWidth(0.5);
        pdf.line(margin, y + 3, margin + width, y + 3);
        y += 16;
      };
      const justifiedText = (value) => {
        if (!value) return;
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(style.size); pdf.setTextColor('#334155');
        const lines = pdf.splitTextToSize(String(value), width);
        lines.forEach((line, index) => {
          if (y > pageHeight - margin) { pdf.addPage(); y = margin; }
          const isLast = index === lines.length - 1;
          pdf.text(line, margin, y, isLast ? undefined : { align: 'justify', maxWidth: width });
          y += style.size * style.spacing;
        });
        y += 5;
      };
      const twoColumnText = (left, right, size = style.size, weight = 'bold', gap = 2) => {
        if (!left && !right) return;
        ensureSpace(size * style.spacing + gap);
        pdf.setFont('helvetica', weight); pdf.setFontSize(size); pdf.setTextColor('#0f172a');
        const rightWidth = right ? pdf.getTextWidth(right) + 12 : 0;
        const leftLines = pdf.splitTextToSize(String(left || ''), Math.max(120, width - rightWidth));
        leftLines.forEach((line, index) => {
          ensureSpace(size * style.spacing);
          pdf.text(line, margin, y);
          if (index === 0 && right) pdf.text(right, margin + width, y, { align: 'right' });
          y += size * style.spacing;
        });
        y += gap;
      };
      const labeledText = (label, value) => {
        if (!label) { text(value, style.size, 'normal', 1); return; }
        ensureSpace(style.size * style.spacing * 2);
        pdf.setFontSize(style.size); pdf.setTextColor('#334155');
        pdf.setFont('helvetica', 'bold');
        const prefix = `${label}: `;
        const prefixWidth = pdf.getTextWidth(prefix);
        pdf.text(prefix, margin, y);
        pdf.setFont('helvetica', 'normal');
        const lines = pdf.splitTextToSize(String(value), width - prefixWidth);
        lines.forEach((line, index) => {
          ensureSpace(style.size * style.spacing);
          pdf.text(line, index === 0 ? margin + prefixWidth : margin, y);
          y += style.size * style.spacing;
        });
        y += 1;
      };
      const centeredText = (value, size, weight = 'normal', gap = 4, color = '#000000') => {
        if (!value) return;
        pdf.setFont('helvetica', weight); pdf.setFontSize(size); pdf.setTextColor(color);
        const lines = pdf.splitTextToSize(String(value), width);
        lines.forEach((line) => { pdf.text(line, pageWidth / 2, y, { align: 'center' }); y += size * style.spacing; });
        y += gap;
      };
      const centeredContact = (items) => {
        const visible = items.filter((item) => item.value);
        if (!visible.length) return;
        const separator = '  •  ';
        pdf.setFont('helvetica', 'normal'); pdf.setFontSize(9); pdf.setTextColor('#334155');
        const totalWidth = visible.reduce((sum, item) => sum + pdf.getTextWidth(item.value), 0) + pdf.getTextWidth(separator) * (visible.length - 1);
        let x = Math.max(margin, (pageWidth - totalWidth) / 2);
        visible.forEach((item, index) => {
          if (item.url) pdf.textWithLink(item.value, x, y, { url: item.url });
          else pdf.text(item.value, x, y);
          x += pdf.getTextWidth(item.value);
          if (index < visible.length - 1) { pdf.text(separator, x, y); x += pdf.getTextWidth(separator); }
        });
        y += 9 * style.spacing + 8;
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
        summary: () => { heading('Professional summary'); justifiedText(resume.summary); },
        experience: () => { heading('Experience'); resume.experience.forEach((item) => { const dates = [item.start, item.end].filter(Boolean).join(' – '); ensureSpace(44); twoColumnText([item.role, item.company].filter(Boolean).join(' — '), dates, 11, 'bold', 1); text(item.location, 9, 'normal', 2); item.bullets.filter(Boolean).forEach((bullet) => text(`• ${bullet}`, style.size, 'normal', 1, '#334155', style.bulletIndent)); y += style.itemGap; }); },
        skills: () => { heading('Skills'); parseSkillRows(resume.skills).forEach((row) => labeledText(row.category, row.skills)); },
        education: () => { heading('Education'); resume.education.forEach((item) => twoColumnText([item.degree, item.school].filter(Boolean).join(' — '), item.year, style.size, 'bold', Math.max(3, style.itemGap / 2))); }
      };
      if (resume.importedSections?.length) resume.importedSections.forEach((section) => { heading(section.title); text(section.content, style.size, 'normal', 5); });
      else (resume.sectionOrder || initialResume.sectionOrder).forEach((section) => pdfSections[section]?.());
      pdf.save(`${(resume.name || 'resume').trim().replace(/\s+/g, '-').toLowerCase()}.pdf`);
    } finally { setDownloading(false); }
  }

  async function downloadWord() {
    setDownloadingWord(true);
    try {
      const { AlignmentType, BorderStyle, Document, ExternalHyperlink, Packer, Paragraph, TabStopPosition, TabStopType, TextRun } = await import('docx');
      const bodySize = Math.round(style.size * 2);
      const children = [];
      const paragraph = (value, options = {}) => new Paragraph({
        alignment: options.center ? AlignmentType.CENTER : options.justify ? AlignmentType.JUSTIFIED : AlignmentType.LEFT,
        spacing: { after: options.after ?? 80, line: Math.round(style.spacing * 240) },
        tabStops: options.tabs ? [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }] : undefined,
        bullet: options.bullet ? { level: 0 } : undefined,
        border: options.heading ? { bottom: { color: '000000', style: BorderStyle.SINGLE, size: 4, space: 2 } } : undefined,
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
      const sectionHeading = (title) => children.push(paragraph(title.toUpperCase(), { heading: true, bold: true, size: 20, after: 80 }));
      const wordSections = {
        summary: () => { if (!resume.summary) return; sectionHeading('Professional Summary'); children.push(paragraph(resume.summary, { justify: true })); },
        experience: () => {
          if (!resume.experience.length) return;
          sectionHeading('Experience');
          resume.experience.forEach((item) => {
            const title = [item.role, item.company].filter(Boolean).join(' · ');
            const dates = [item.start, item.end].filter(Boolean).join(' – ');
            children.push(paragraph(`${title}${dates ? `\t${dates}` : ''}`, { bold: true, tabs: true, after: 30 }));
            item.bullets.filter(Boolean).forEach((bullet) => children.push(paragraph(bullet, { bullet: true, after: Math.round(style.itemGap * 5) })));
          });
        },
        skills: () => {
          if (!resume.skills) return;
          sectionHeading('Skills');
          parseSkillRows(resume.skills).forEach((row) => children.push(new Paragraph({
            spacing: { after: 30, line: Math.round(style.spacing * 240) },
            children: [
              ...(row.category ? [new TextRun({ text: `${row.category}: `, bold: true, size: bodySize, color: '000000', font: style.font })] : []),
              new TextRun({ text: row.skills, size: bodySize, color: '000000', font: style.font })
            ]
          })));
        },
        education: () => {
          if (!resume.education.length) return;
          sectionHeading('Education');
          resume.education.forEach((item) => {
            const study = [item.degree, item.school].filter(Boolean).join(' · ');
            children.push(paragraph(`${study}${item.year ? `\t${item.year}` : ''}`, { bold: true, tabs: true, after: 30 }));
          });
        }
      };
      if (resume.importedSections?.length) resume.importedSections.forEach((section) => { sectionHeading(section.title); children.push(paragraph(section.content)); });
      else (resume.sectionOrder || initialResume.sectionOrder).forEach((section) => wordSections[section]?.());
      const wordMargin = Math.round(style.margin * 20);
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
  return <main className="mx-auto max-w-[1500px] px-4 py-7 sm:px-7">
    <header className="relative mb-6 overflow-hidden rounded-3xl bg-slate-950 p-6 text-white sm:p-8"><div className="absolute inset-y-0 right-0 hidden w-[38%] lg:block"><div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/30 to-transparent" /><img src={resumeBlocks} alt="Resume content blocks combining into a finished document" className="h-full w-full object-cover opacity-75" /></div><div className="relative max-w-3xl"><p className="text-xs font-bold uppercase tracking-[0.2em] text-cyan-300">{mode === 'format' ? 'Resume formatting studio' : 'Guided resume builder'}</p><h1 className="mt-2 text-3xl font-black tracking-tight">{mode === 'format' ? 'Make every page clean and consistent.' : 'Build your resume, one simple block at a time.'}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Fill in the blocks on the left. Your professional, ATS-friendly document updates instantly on the right.</p><div className="mt-5 max-w-xs"><div className="flex justify-between text-xs font-bold"><span>Resume complete</span><span>{completion}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-cyan-400 transition-all duration-500" style={{ width: `${completion}%` }} /></div></div></div></header>
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(400px,0.9fr)_minmax(560px,1.1fr)]">
      <div className="grid gap-4">
        <Block number="1" title="Name and target role" hint="Lead with the role you are applying for."><div className="grid gap-3 sm:grid-cols-2"><Field label="Full name" value={resume.name} onChange={(e) => update('name', e.target.value)} placeholder="Jordan Lee" /><Field label="Target role" value={resume.role} onChange={(e) => update('role', e.target.value)} placeholder="Product Designer" /></div></Block>
        <Block number="2" title="Contact information" hint="Links stay clickable in the preview, PDF, and Word exports."><div className="grid gap-3 sm:grid-cols-2"><Field label="Email" type="email" value={resume.email} onChange={(e) => update('email', e.target.value)} placeholder="jordan@email.com" /><Field label="Phone" value={resume.phone} onChange={(e) => update('phone', e.target.value)} placeholder="(555) 000-0000" /><Field label="City, State" value={resume.location} onChange={(e) => update('location', e.target.value)} placeholder="Austin, TX" /><Field label="LinkedIn" value={resume.linkedin} onChange={(e) => update('linkedin', e.target.value)} placeholder="linkedin.com/in/jordan" /><Field label="GitHub" value={resume.github} onChange={(e) => update('github', e.target.value)} placeholder="github.com/jordan" /><Field label="Portfolio / website" value={resume.website} onChange={(e) => update('website', e.target.value)} placeholder="jordan.design" /></div></Block>
        {resume.importedSections?.length > 0 && <Block number="3" title="Imported resume content" hint="Original section text is preserved. Edit it directly without losing custom sections."><div className="grid gap-4">{resume.importedSections.map((section) => <div key={section.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><Field label="Section heading" value={section.title} onChange={(e) => setResume((current) => ({ ...current, importedSections: current.importedSections.map((item) => item.id === section.id ? { ...item, title: e.target.value } : item) }))} /><label className="mt-3 block text-xs font-bold text-slate-600">Content<textarea rows="7" value={section.content} onChange={(e) => updateImportedContent(section.id, e.target.value)} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm leading-6 outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" /></label></div>)}</div></Block>}
        <Block number="3" title="Professional summary" hint="Write 2–4 lines: experience, specialty, and strongest result."><textarea rows="5" value={resume.summary} maxLength="600" onChange={(e) => update('summary', e.target.value)} placeholder="Example: Product designer with 5 years of experience creating accessible B2B products..." className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100" /><p className="mt-2 text-right text-xs text-slate-400">{resume.summary.length}/600</p></Block>
        <Block number="4" title="Experience and bullet points" hint="Start bullets with an action and finish with a measurable result."><div className="grid gap-4">{resume.experience.map((item, itemIndex) => <div key={item.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4"><div className="mb-3 flex items-center justify-between"><p className="text-sm font-extrabold">Experience {itemIndex + 1}</p>{resume.experience.length > 1 && <button type="button" onClick={() => setResume((current) => ({ ...current, experience: current.experience.filter((entry) => entry.id !== item.id) }))} className="text-xs font-bold text-rose-600">Remove</button>}</div><div className="grid gap-3 sm:grid-cols-2"><Field label="Role" value={item.role} onChange={(e) => updateExperience(item.id, 'role', e.target.value)} placeholder="Senior Designer" /><Field label="Company" value={item.company} onChange={(e) => updateExperience(item.id, 'company', e.target.value)} placeholder="Company name" /><Field label="Start" value={item.start} onChange={(e) => updateExperience(item.id, 'start', e.target.value)} placeholder="Jan 2022" /><Field label="End" value={item.end} onChange={(e) => updateExperience(item.id, 'end', e.target.value)} placeholder="Present" /></div><div className="mt-3 grid gap-2">{item.bullets.map((bullet, bulletIndex) => <div key={bulletIndex} className="flex gap-2"><span className="mt-3 text-indigo-500">•</span><input value={bullet} onChange={(e) => updateBullet(item.id, bulletIndex, e.target.value)} placeholder="Improved [metric] by [number] through [action]" className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100" />{item.bullets.length > 1 && <button aria-label="Remove bullet" type="button" onClick={() => updateExperience(item.id, 'bullets', item.bullets.filter((_, index) => index !== bulletIndex))} className="px-2 text-rose-500">×</button>}</div>)}</div><button type="button" onClick={() => updateExperience(item.id, 'bullets', [...item.bullets, ''])} className="mt-3 text-xs font-bold text-indigo-600">+ Add bullet point</button></div>)}</div><button type="button" onClick={() => setResume((current) => ({ ...current, experience: [...current.experience, { id: makeId(), role: '', company: '', location: '', start: '', end: '', bullets: [''] }] }))} className="mt-4 w-full rounded-xl border border-dashed border-indigo-300 py-3 text-sm font-bold text-indigo-600 hover:bg-indigo-50">+ Add another experience</button></Block>
        <Block number="5" title="Skills" hint="Use one category per line so recruiters can scan your strengths quickly."><textarea rows="7" value={resume.skills} onChange={(e) => update('skills', e.target.value)} placeholder={'Design: Figma, prototyping, design systems\nResearch: User interviews, usability testing\nTools: Jira, Miro, Adobe Creative Suite'} className="w-full rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm leading-6 outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100" /><p className="mt-2 text-xs leading-5 text-slate-500"><span className="font-bold text-slate-700">Recommended format:</span> Category: skill, skill, skill. Put each category on a new line and prioritize the categories most relevant to the job.</p></Block>
        <Block number="6" title="Education" hint="Include your degree, institution, and graduation year.">{resume.education.map((item, index) => <div key={item.id} className="mb-3 grid gap-3 rounded-xl bg-slate-50 p-3 sm:grid-cols-3"><Field label={`Degree ${index + 1}`} value={item.degree} onChange={(e) => updateEducation(item.id, 'degree', e.target.value)} placeholder="B.S. Design" /><Field label="School" value={item.school} onChange={(e) => updateEducation(item.id, 'school', e.target.value)} placeholder="State University" /><Field label="Year" value={item.year} onChange={(e) => updateEducation(item.id, 'year', e.target.value)} placeholder="2022" /></div>)}<button type="button" onClick={() => setResume((current) => ({ ...current, education: [...current.education, { id: makeId(), degree: '', school: '', year: '' }] }))} className="text-xs font-bold text-indigo-600">+ Add education</button></Block>
      </div>

      <aside className="self-start">
        <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><p className="text-xs font-bold text-slate-700">Choose a layout</p><p className="mt-0.5 text-xs text-slate-500">Start with a polished preset. Use the controls below only when you want to fine-tune it.</p><div className="mt-3 grid grid-cols-3 gap-2">{Object.entries({ compact: ['Compact', 'Fits more'], professional: ['Professional', 'Recommended'], spacious: ['Spacious', 'More air'] }).map(([key, [label, note]]) => <button key={key} type="button" onClick={() => applyLayoutPreset(key)} className={`rounded-xl border p-2 text-left ${style.preset === key ? 'border-indigo-500 bg-indigo-50 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-indigo-300'}`}><span className="block text-xs font-extrabold text-slate-800">{label}</span><span className="block text-[10px] text-slate-500">{note}</span></button>)}</div><details className="mt-4 border-t border-slate-100 pt-3"><summary className="cursor-pointer text-xs font-bold text-indigo-700">Fine-tune page spacing and indentation</summary><div className="mt-3 grid gap-3 sm:grid-cols-3"><label className="text-xs font-bold text-slate-600">Page size<select value={style.pageSize} onChange={(e) => updateStyle('pageSize', e.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 p-2"><option value="letter">US Letter</option><option value="a4">A4</option></select></label><label className="text-xs font-bold text-slate-600">Page margins<select value={style.margin} onChange={(e) => updateStyle('margin', Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 p-2"><option value="30">Narrow</option><option value="36">Standard</option><option value="48">Comfortable</option><option value="60">Wide</option></select></label><label className="text-xs font-bold text-slate-600">Section spacing<select value={style.sectionGap} onChange={(e) => updateStyle('sectionGap', Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 p-2"><option value="14">Tight</option><option value="20">Standard</option><option value="26">Relaxed</option></select></label><label className="text-xs font-bold text-slate-600">Job spacing<select value={style.itemGap} onChange={(e) => updateStyle('itemGap', Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 p-2"><option value="5">Tight</option><option value="8">Standard</option><option value="12">Relaxed</option></select></label><label className="text-xs font-bold text-slate-600">Bullet indent<select value={style.bulletIndent} onChange={(e) => updateStyle('bulletIndent', Number(e.target.value))} className="mt-1 w-full rounded-lg border border-slate-200 p-2"><option value="6">Minimal</option><option value="10">Standard</option><option value="16">Deep</option></select></label></div></details></div>
        <div className="mb-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="grid gap-3 sm:grid-cols-3"><label className="text-xs font-bold text-slate-600">Font<select value={style.font} onChange={(e) => setStyle({ ...style, font: e.target.value })} className="mt-1 w-full rounded-lg border border-slate-200 p-2"><option>Arial</option><option>Calibri</option><option>Georgia</option><option>Times New Roman</option></select></label><label className="text-xs font-bold text-slate-600">Text size<select value={style.size} onChange={(e) => setStyle({ ...style, size: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-200 p-2"><option value="10">10 pt</option><option value="10.5">10.5 pt</option><option value="11">11 pt</option><option value="12">12 pt</option></select></label><label className="text-xs font-bold text-slate-600">Spacing<select value={style.spacing} onChange={(e) => setStyle({ ...style, spacing: Number(e.target.value) })} className="mt-1 w-full rounded-lg border border-slate-200 p-2"><option value="1.3">Compact</option><option value="1.45">Normal</option><option value="1.65">Spacious</option></select></label></div><div className="mt-4 border-t border-slate-100 pt-3"><p className="text-xs font-bold text-slate-600">Drag to reorder entire sections</p><div className="mt-2 flex flex-wrap gap-2">{(resume.sectionOrder || initialResume.sectionOrder).map((section) => <button key={section} type="button" draggable onDragStart={() => setDraggedSection(section)} onDragOver={(event) => event.preventDefault()} onDrop={() => moveSection(section)} onDragEnd={() => setDraggedSection(null)} className={`cursor-grab rounded-lg border px-3 py-2 text-xs font-bold active:cursor-grabbing ${draggedSection === section ? 'border-indigo-400 bg-indigo-50 text-indigo-700 opacity-60' : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-indigo-300'}`}><span className="mr-1 text-slate-400">⠿</span>{sectionLabels[section]}</button>)}</div></div><div className="mt-3 flex flex-wrap items-center gap-2"><label className="mr-auto flex items-center gap-2 text-xs font-bold text-slate-600">Heading color <input type="color" value={style.accent} onChange={(e) => setStyle({ ...style, accent: e.target.value })} className="h-8 w-10" /></label><button type="button" onClick={resetDraft} className="rounded-lg px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50">Start over</button><button type="button" onClick={saveDraft} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold hover:bg-slate-50">{saved ? 'Saved ✓' : 'Save draft'}</button><button type="button" onClick={downloadWord} disabled={downloadingWord} className="rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-2 text-xs font-bold text-indigo-700 disabled:opacity-60">{downloadingWord ? 'Creating…' : 'Download Word'}</button><button type="button" onClick={downloadPdf} disabled={downloading} className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60">{downloading ? 'Creating…' : 'Download PDF'}</button></div></div>
        <div className="overflow-x-auto overflow-y-visible rounded-2xl bg-slate-200 p-3 pb-8 sm:p-6 sm:pb-10"><article className="mx-auto min-h-[842px] min-w-[520px] max-w-[595px] bg-white shadow-2xl" style={{ padding: `${style.margin}px`, fontFamily: style.font, fontSize: `${style.size}px`, lineHeight: style.spacing }}><header className={style.template === 'modern' ? 'text-left' : 'text-center'}><h1 className="text-[2.25em] font-black tracking-tight text-slate-950">{resume.name || (resume.imported ? '' : 'YOUR NAME')}</h1><p className="mt-1 text-[1.2em] font-bold" style={{ color: style.accent }}>{resume.role || (resume.imported ? '' : 'TARGET ROLE')}</p><p className="mt-2 break-words text-[0.9em] text-slate-500">{contactItems.length ? contactItems.map((item, index) => <span key={`${item.value}-${index}`}>{index > 0 && ' · '}{item.href ? <a href={item.href} target="_blank" rel="noreferrer" className="text-blue-700 underline">{item.value}</a> : item.value}</span>) : (resume.imported ? '' : 'City, State · phone · email · LinkedIn')}</p></header>{resume.importedSections?.length ? resume.importedSections.map((section) => <ImportedSection key={section.id} section={section} color={style.accent} gap={style.sectionGap} />) : (resume.sectionOrder || initialResume.sectionOrder).map((section) => <PreviewSectionContent key={section} section={section} resume={resume} color={style.accent} />)}</article></div>
      </aside>
    </div>
  </main>;
}

function ResumeSection({ title, color, gap = 20, children }) {
  return <section className="text-slate-700" style={{ marginTop: `${gap}px` }}><div className="mb-1"><h2 className="text-[1.05em] font-black uppercase tracking-[0.08em]" style={{ color }}>{title}</h2><div aria-hidden="true" className="mt-0.5 h-px w-full" style={{ backgroundColor: `${color}88` }} /></div><div>{children}</div></section>;
}

export default ResumeWorkspace;
