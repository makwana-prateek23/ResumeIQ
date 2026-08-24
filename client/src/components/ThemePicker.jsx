import { useEffect, useRef, useState } from 'react';
import { useTheme } from '../hooks/useTheme.js';

export default function ThemePicker() {
  const { accent, setAccent, accents } = useTheme();
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function handlePointerDown(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) setOpen(false);
    }
    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  function choose(id) {
    setAccent(id);
    setOpen(false);
    triggerRef.current?.focus();
  }

  return <div ref={containerRef} className="relative">
    <button
      ref={triggerRef}
      type="button"
      onClick={() => setOpen((value) => !value)}
      aria-expanded={open}
      aria-label="Choose theme color"
      title="Choose theme color"
      className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/15 bg-white/10 text-white shadow-lg shadow-slate-950/20 transition hover:-translate-y-0.5 hover:border-cyan-300/40 hover:bg-white/15"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3a9 9 0 0 0 0 18h1.4a1.8 1.8 0 0 0 1.2-3.2 1.8 1.8 0 0 1 1.2-3.2H18A3 3 0 0 0 21 12a9 9 0 0 0-9-9Z"/><circle cx="7.5" cy="10" r=".7" fill="currentColor" stroke="none"/><circle cx="10" cy="6.8" r=".7" fill="currentColor" stroke="none"/><circle cx="14" cy="6.8" r=".7" fill="currentColor" stroke="none"/><circle cx="17" cy="9.5" r=".7" fill="currentColor" stroke="none"/></svg>
      <span aria-hidden="true" className="absolute bottom-1 right-1 h-2.5 w-2.5 rounded-full ring-2 ring-slate-900" style={{ background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2))' }} />
    </button>
    {open && <div role="radiogroup" aria-label="Accent color" className="absolute right-0 top-12 z-65 w-[min(16rem,calc(100vw-1.5rem))] rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
      <p className="px-1 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Theme</p>
      <div className="grid grid-cols-1 gap-1.5">
        {accents.map((preset) => {
          const selected = preset.id === accent;
          return <button
            key={preset.id}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => choose(preset.id)}
            className={`flex items-center gap-3 rounded-xl border p-2.5 text-left transition ${selected ? 'border-slate-900 bg-slate-50' : 'border-transparent hover:bg-slate-50'}`}
          >
            <span aria-hidden="true" className="h-8 w-8 shrink-0 rounded-lg" style={{ background: `linear-gradient(135deg, ${preset.preview[0]}, ${preset.preview[1]})` }} />
            <span className="flex-1 text-sm font-bold text-slate-800">{preset.name}</span>
            {selected && <span aria-hidden="true" className="text-sm font-black text-slate-900">✓</span>}
          </button>;
        })}
      </div>
    </div>}
  </div>;
}
