import { Link } from 'react-router-dom';
import landing3dResume from '../assets/landing-3d-resume.png';

export default function LandingPage() {
  return <main className="landing-page mx-auto max-w-7xl px-5 py-8 sm:px-8 sm:py-12">
    <section className="landing-hero-3d relative overflow-hidden rounded-[2rem] text-white shadow-2xl" style={{ backgroundImage: `url(${landing3dResume})` }}>
      <div className="landing-hero-wash absolute inset-0" aria-hidden="true" />
      <div className="landing-depth-grid absolute inset-0" aria-hidden="true" />
      <div className="relative grid min-h-[520px] items-center lg:grid-cols-[1.05fr_.95fr]">
        <div className="z-10 p-8 sm:p-12 lg:py-16">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-(--accent-eyebrow)">Free ATS resume check · No login required</p>
          <h1 className="mt-4 max-w-2xl text-4xl font-black leading-tight tracking-tight drop-shadow-2xl sm:text-6xl">See what hiring systems see—before you apply.</h1>
          <p className="mt-5 max-w-xl text-lg leading-8 text-slate-200">Get an instant ATS readiness score, uncover formatting and content issues, and learn exactly what to improve before your resume reaches a recruiter.</p>
          <div className="mt-7">
            <Link to="/ats" className="hero-ats-cta group inline-flex items-center gap-3 rounded-2xl bg-cyan-400 px-6 py-4 text-base font-black text-slate-950 shadow-xl shadow-cyan-950/30 transition duration-300 hover:-translate-y-1 hover:bg-cyan-300 hover:shadow-2xl">Check my ATS score <span className="grid h-7 w-7 place-items-center rounded-full bg-slate-950 text-sm text-white transition group-hover:translate-x-1">→</span></Link>
            <p className="mt-3 text-xs font-bold text-slate-300">Free to check · PDF or DOCX · Results in seconds</p>
          </div>
        </div>
        <div className="pointer-events-none relative hidden h-full lg:block">
          <div className="hero-float hero-float-score"><span className="text-[10px] font-black uppercase tracking-wider text-cyan-200">ATS ready</span><strong className="mt-1 block text-2xl">92%</strong></div>
          <div className="hero-float hero-float-match"><span className="text-lg">✓</span><span className="text-xs font-black">Skills matched</span></div>
          <div className="hero-float hero-float-export"><span className="text-lg">↗</span><span className="text-xs font-black">Ready to export</span></div>
        </div>
      </div>
    </section>
  </main>;
}
