import React from 'react';
import { Moon, Sun } from 'lucide-react';

export default function PortalThemeToggle({ theme, onToggle }: { theme: 'dark' | 'light'; onToggle: () => void }) {
  const label = theme === 'dark' ? 'Ativar modo claro' : 'Ativar modo escuro';
  return <button type="button" onClick={onToggle} aria-label={label} title={label}
    className="lb-portal-theme-toggle w-12 h-12 rounded-2xl inline-flex items-center justify-center shrink-0 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-500">
    {theme === 'dark' ? <Sun className="w-5 h-5" aria-hidden="true" /> : <Moon className="w-5 h-5" aria-hidden="true" />}
  </button>;
}
