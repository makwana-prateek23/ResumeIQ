import { createContext } from 'react';

export const ACCENTS = [
  { id: 'indigo', name: 'Modern SaaS', preview: ['#06b6d4', '#4f46e5'] },
  { id: 'emerald', name: 'Emerald', preview: ['#10b981', '#0d9488'] },
  { id: 'violet', name: 'Violet', preview: ['#a855f7', '#d946ef'] },
  { id: 'amber', name: 'Amber', preview: ['#f59e0b', '#ea580c'] },
  { id: 'mono', name: 'Slate Mono', preview: ['#334155', '#0f172a'] },
];

export const ACCENT_IDS = new Set(ACCENTS.map((accent) => accent.id));
export const ThemeContext = createContext(null);
