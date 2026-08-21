import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuth from '../hooks/useAuth.js';

function decodeUser(token) {
  try { const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/'))); return { id: payload.sub, name: payload.name, email: payload.email }; } catch { return null; }
}
export default function AuthCallbackPage() {
  const { establishSession } = useAuth(); const navigate = useNavigate();
  useEffect(() => { const token = new URLSearchParams(window.location.hash.slice(1)).get('token'); const user = token && decodeUser(token); if (token && user) { establishSession({ token, user }); navigate('/create', { replace: true }); } else navigate('/login?error=Social%20sign-in%20failed', { replace: true }); }, [establishSession, navigate]);
  return <main className="grid min-h-screen place-items-center bg-slate-950 text-white"><div className="text-center"><span className="mx-auto grid h-16 w-16 animate-pulse place-items-center rounded-2xl bg-cyan-400 font-black text-slate-950">R</span><p className="mt-5 font-black">Completing secure sign-in…</p></div></main>;
}
