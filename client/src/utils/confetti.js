const MONO_CONFETTI_COLORS = ['#f59e0b', '#06b6d4', '#f43f5e', '#10b981', '#a855f7'];

export function generateConfetti(useMonoPalette) {
  return Array.from({ length: 28 }, (_, index) => ({
    id: index,
    left: Math.round(Math.random() * 100),
    delay: Math.round(Math.random() * 300),
    duration: 900 + Math.round(Math.random() * 700),
    size: 6 + Math.round(Math.random() * 5),
    color: useMonoPalette ? MONO_CONFETTI_COLORS[index % MONO_CONFETTI_COLORS.length] : index % 2 === 0 ? 'var(--accent-1)' : 'var(--accent-2)',
    rounded: index % 3 === 0,
  }));
}
