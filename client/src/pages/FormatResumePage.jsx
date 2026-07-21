import ResumeWorkspace from '../components/ResumeWorkspace.jsx';
import { Link, useOutletContext } from 'react-router-dom';

export default function FormatResumePage() {
  const { resumeUploaded, editorResumeData } = useOutletContext();
  if (!resumeUploaded) return <main className="mx-auto grid min-h-[70vh] max-w-3xl place-items-center px-5 py-12"><section className="w-full rounded-3xl border border-amber-200 bg-white p-8 text-center shadow-xl sm:p-12"><div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-amber-100 text-2xl font-black text-amber-700">↑</div><p className="mt-6 text-xs font-bold uppercase tracking-[0.18em] text-amber-600">Resume required</p><h1 className="mt-2 text-3xl font-black tracking-tight">Please upload a resume to edit and format.</h1><p className="mx-auto mt-3 max-w-lg leading-7 text-slate-500">Return to Resume Review and select a PDF or Word document. Edit & Format will unlock as soon as the file is accepted.</p><Link to="/#resume-review" className="mt-7 inline-flex rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:-translate-y-0.5">Upload a resume</Link></section></main>;
  return <ResumeWorkspace mode="format" initialResumeData={editorResumeData} />;
}
