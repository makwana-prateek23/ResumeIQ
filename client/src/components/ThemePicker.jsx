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
      className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <span aria-hidden="true" className="h-5 w-5 rounded-full" style={{ background: 'linear-gradient(135deg, var(--accent-1), var(--accent-2))' }} />
    </button>
    {open && <div role="radiogroup" aria-label="Accent color" className="absolute right-0 top-12 z-65 w-64 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl">
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
