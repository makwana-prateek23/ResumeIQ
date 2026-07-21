import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';

const links = [
  ['/', 'Home'],
  ['/resume', 'My resume'],
  ['/match', 'Job match'],
];

function AppShell() {
  const [resumeUploaded, setResumeUploaded] = useState(false);
  const [editorResumeData, setEditorResumeData] = useState(null);
  const [uploadedResumeFile, setUploadedResumeFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const navigate = useNavigate();

  function requireResume(event) {
    if (resumeUploaded || localStorage.getItem('resumeiq-builder-v1')) return;
    event.preventDefault();
    setUploadMessage('Please upload a resume before using Edit & Format.');
    navigate('/');
  }

  return <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-5 py-3 sm:px-8 lg:flex-row lg:items-center lg:justify-between">
        <NavLink to="/" className="flex items-center gap-3 no-underline"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-indigo-600 font-black text-white shadow-lg shadow-indigo-200">R</span><div><p className="font-extrabold tracking-tight">ResumeIQ</p><p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Resume workspace</p></div></NavLink>
        <nav aria-label="Main navigation" className="flex overflow-x-auto rounded-xl bg-slate-100 p-1">
          {links.map(([to, label]) => <NavLink key={to} to={to} end={to === '/'} onClick={to === '/resume' ? requireResume : undefined} className={({ isActive }) => `whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition ${isActive ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>{label}</NavLink>)}
        </nav>
        <span className="hidden rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 lg:block">ATS-friendly workspace</span>
      </div>
    </header>
    {uploadMessage && <div role="alert" className="fixed left-1/2 top-24 z-[60] flex w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900 shadow-2xl"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-200">!</span><span className="flex-1">{uploadMessage}</span><button type="button" onClick={() => setUploadMessage('')} className="rounded-lg px-2 py-1 text-amber-700 hover:bg-amber-100" aria-label="Dismiss message">×</button></div>}
    <Outlet context={{ resumeUploaded, setResumeUploaded, uploadedResumeFile, setUploadedResumeFile, uploadMessage, setUploadMessage, editorResumeData, setEditorResumeData }} />
  </div>;
}

export default AppShell;
