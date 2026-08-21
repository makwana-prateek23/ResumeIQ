import { useEffect, useState } from 'react';
import { ACCENTS, ACCENT_IDS, ThemeContext } from './theme-config.js';

const STORAGE_KEY = 'resumeiq-accent';

export function ThemeProvider({ children }) {
  const [accent, setAccentState] = useState(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return ACCENT_IDS.has(stored) ? stored : 'indigo';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-accent', accent);
    localStorage.setItem(STORAGE_KEY, accent);
  }, [accent]);

  function setAccent(id) {
    if (ACCENT_IDS.has(id)) setAccentState(id);
  }

  return <ThemeContext.Provider value={{ accent, setAccent, accents: ACCENTS }}>{children}</ThemeContext.Provider>;
}
