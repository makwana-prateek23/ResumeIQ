export default function CompletionCelebration({ show, confetti, reduceMotion, onClose, atsScore, onDownloadPdf, onDownloadWord, downloadingPdf, downloadingWord }) {
  if (!show) return null;

  return <div className="fixed inset-0 z-70 grid place-items-center bg-slate-950/40 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="celebration-title">
    <div className="relative max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-y-auto rounded-3xl bg-white p-5 text-center shadow-2xl sm:p-7" style={{ animation: `${reduceMotion ? 'celebration-fade' : 'celebration-in'} 320ms ease-out` }}>
      {confetti.length > 0 && <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-24 overflow-hidden">
        {confetti.map((piece) => <span
          key={piece.id}
          className={`absolute top-0 ${piece.rounded ? 'rounded-full' : 'rounded-sm'}`}
          style={{
            left: `${piece.left}%`,
            width: piece.size,
            height: piece.size,
            background: piece.color,
            animation: `confetti-fall ${piece.duration}ms ease-in ${piece.delay}ms both`,
          }}
        />)}
      </div>}
      <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-(--accent-soft-bg) text-3xl">🎉</div>
      <h2 id="celebration-title" className="mt-5 text-2xl font-black tracking-tight text-slate-900">Resume complete!</h2>
      <p className="mt-2 text-sm leading-6 text-slate-500">Every required section is filled in. Download it now or keep polishing the details.</p>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Complete</p><p className="mt-1 text-2xl font-black text-slate-900">100%</p></div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-400">ATS ready</p><p className="mt-1 text-2xl font-black text-slate-900">{atsScore}%</p></div>
      </div>
      <div className="mt-6 grid gap-2">
        <button type="button" onClick={onDownloadPdf} disabled={downloadingPdf} className="rounded-xl bg-(--accent-solid) px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-(--accent-solid-hover) disabled:cursor-wait disabled:opacity-60">{downloadingPdf ? 'Creating…' : 'Download PDF'}</button>
        <button type="button" onClick={onDownloadWord} disabled={downloadingWord} className="rounded-xl border border-(--accent-solid)/30 bg-(--accent-soft-bg) px-4 py-3 text-sm font-bold text-(--accent-soft-text) transition hover:brightness-95 disabled:cursor-wait disabled:opacity-60">{downloadingWord ? 'Creating…' : 'Download Word'}</button>
        <button type="button" onClick={onClose} className="mt-1 text-sm font-bold text-slate-400 hover:text-slate-700">Keep editing</button>
      </div>
    </div>
  </div>;
}
