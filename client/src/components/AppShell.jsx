import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import ThemePicker from './ThemePicker.jsx';
import useAuth from '../hooks/useAuth.js';

function AppShell() {
  const [resumeUploaded, setResumeUploaded] = useState(() => Boolean(localStorage.getItem('resumeiq-builder-v1')));
  const [editorResumeData, setEditorResumeData] = useState(null);
  const [uploadedResumeFile, setUploadedResumeFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  return <div className="min-h-screen bg-[#f5f7fb] text-slate-900">
    <header className="app-header sticky top-0 z-50 border-b border-cyan-300/15 bg-slate-950/95 text-white shadow-xl shadow-slate-950/10 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-2 px-3 py-3 sm:gap-4 sm:px-8">
        <NavLink to="/" className="flex min-w-0 items-center gap-2 no-underline sm:gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-(--accent-1) to-(--accent-2) font-black text-white shadow-lg shadow-cyan-950 sm:h-10 sm:w-10">R</span><div className="min-w-0"><p className="truncate text-sm font-extrabold tracking-tight text-white sm:text-base">ResumeIQ</p><p className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-200/60 sm:block">Resume workspace</p></div></NavLink>
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3"><ThemePicker />{isAuthenticated ? <div className="flex items-center gap-1.5 sm:gap-2"><span className="hidden h-9 w-9 place-items-center overflow-hidden rounded-full bg-cyan-100 text-xs font-black text-cyan-800 min-[420px]:grid">{user.avatarUrl ? <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" /> : user.name?.slice(0, 1).toUpperCase()}</span><span className="hidden max-w-28 truncate text-xs font-bold text-slate-200 xl:block">{user.name}</span><button onClick={() => { logout(); navigate('/'); }} className="min-h-9 rounded-lg border border-white/15 bg-white/5 px-2.5 py-2 text-xs font-bold text-slate-200 transition hover:border-rose-300/40 hover:bg-rose-400/10 hover:text-rose-200 sm:px-3">Sign out</button></div> : <div className="flex items-center gap-1 sm:gap-2"><NavLink to="/login" className="rounded-lg px-2 py-2 text-xs font-black text-slate-200 hover:bg-white/10 sm:px-3">Sign in</NavLink><NavLink to="/signup" className="rounded-lg bg-gradient-to-r from-(--accent-2) to-(--accent-1) px-2.5 py-2 text-xs font-black text-white shadow-lg shadow-cyan-950 transition hover:-translate-y-0.5 sm:px-3">Sign up</NavLink></div>}</div>
      </div>
    </header>
    {uploadMessage && <div role="alert" className="fixed left-1/2 top-24 z-[60] flex w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900 shadow-2xl"><span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-amber-200">!</span><span className="flex-1">{uploadMessage}</span><button type="button" onClick={() => setUploadMessage('')} className="rounded-lg px-2 py-1 text-amber-700 hover:bg-amber-100" aria-label="Dismiss message">×</button></div>}
    <Outlet context={{ resumeUploaded, setResumeUploaded, uploadedResumeFile, setUploadedResumeFile, uploadMessage, setUploadMessage, editorResumeData, setEditorResumeData }} />
  </div>;
}

export default AppShell;
