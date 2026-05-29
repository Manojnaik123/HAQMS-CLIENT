'use client';

import { Moon, Sun } from 'lucide-react';
import { useTheme } from '@/context/ThemeContet';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      onClick={toggleTheme}
      className="p-2 rounded-xl border border-border hover:bg-slate-100 dark:hover:bg-slate-800 transition"
    >
      {theme === 'light' ? (
        <Moon className="h-5 w-5" />
      ) : (
        <Sun className="h-5 w-5" />
      )}
    </button>
  );
}