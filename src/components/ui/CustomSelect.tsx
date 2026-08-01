import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

interface CustomSelectProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
  required?: boolean;
  className?: string;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  id,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  required,
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setOpen(o => !o); }
    if (e.key === 'Escape') setOpen(false);
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const idx = options.indexOf(value);
      onChange(options[Math.min(idx + 1, options.length - 1)]);
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const idx = options.indexOf(value);
      if (idx > 0) onChange(options[idx - 1]);
    }
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Hidden native input for form validation */}
      {required && (
        <input
          tabIndex={-1}
          required
          value={value}
          onChange={() => {}}
          className="absolute inset-0 opacity-0 pointer-events-none w-full"
          aria-hidden="true"
        />
      )}

      {/* Trigger button */}
      <button
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        onKeyDown={handleKeyDown}
        onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-between w-full h-11 px-4 rounded-md border text-sm transition-all
          bg-white dark:bg-gray-900
          border-gray-300 dark:border-gray-700
          text-gray-900 dark:text-gray-50
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500
          ${open ? 'ring-2 ring-brand-500 border-brand-500' : ''}
          ${!value ? 'text-gray-400 dark:text-gray-500' : ''}`}
      >
        <span className="truncate">{value || placeholder}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 ml-2 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <ul
          role="listbox"
          className="absolute z-50 mt-1 w-full rounded-md border border-gray-200 dark:border-gray-700
                     bg-white dark:bg-gray-900
                     shadow-lg shadow-black/20
                     max-h-56 overflow-y-auto
                     animate-fade-in"
          style={{ animationDuration: '0.12s' }}
        >
          {options.map(opt => (
            <li
              key={opt}
              role="option"
              aria-selected={value === opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              className={`flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer select-none
                text-gray-900 dark:text-gray-100
                hover:bg-brand-50 dark:hover:bg-brand-900/30
                hover:text-brand-700 dark:hover:text-brand-300
                transition-colors
                ${value === opt ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 font-medium' : ''}`}
            >
              {opt}
              {value === opt && <Check className="w-4 h-4 shrink-0 text-brand-500" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
