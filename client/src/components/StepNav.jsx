import { NavLink, useLocation } from 'react-router-dom';

const steps = [
  { to: '/', label: 'Upload', match: (path) => path === '/' },
  { to: '/resume', label: 'Edit & format', match: (path) => path === '/resume' || path === '/create' },
  { to: '/match', label: 'ATS checker', match: (path) => path === '/match' },
];

export default function StepNav({ resumeUploaded, onLockedClick }) {
  const location = useLocation();
  const currentIndex = steps.findIndex((step) => step.match(location.pathname));

  return <nav aria-label="Resume workflow" className="flex items-center overflow-x-auto rounded-xl bg-slate-100 p-1.5">
    {steps.map((step, index) => {
      const locked = index === 1 && !resumeUploaded;
      const state = index === currentIndex ? 'current' : index < currentIndex ? 'done' : 'upcoming';
      return <div key={step.to} className="flex items-center">
        {index > 0 && <span aria-hidden="true" className={`mx-1.5 h-px w-4 shrink-0 sm:w-8 ${state === 'upcoming' ? 'bg-slate-300' : 'bg-(--accent-solid)'}`} />}
        <NavLink
          to={step.to}
          end={step.to === '/'}
          onClick={locked ? onLockedClick : undefined}
          className="flex items-center gap-2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-sm font-bold text-slate-500 transition hover:text-slate-900"
        >
          <span
            aria-hidden="true"
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[11px] font-black ${state === 'upcoming' ? 'bg-white text-slate-400' : 'bg-(--accent-solid) text-white'}`}
          >
            {state === 'done' ? '✓' : index + 1}
          </span>
          <span className={state === 'current' ? 'text-slate-900' : ''}>{step.label}</span>
        </NavLink>
      </div>;
    })}
  </nav>;
}
