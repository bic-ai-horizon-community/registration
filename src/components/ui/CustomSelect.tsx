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
        className={`flex items-center justify-between w-full h-11 px-4 rounded-xl border text-sm transition-all
          bg-white/[0.05]
          border-white/[0.08]
          text-white
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/50
          hover:bg-white/[0.08] hover:border-white/[0.12]
          ${open ? 'ring-2 ring-brand-500/50 border-brand-500/50 bg-white/[0.08]' : ''}
          ${!value ? 'text-gray-500' : 'text-white'}`}
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
          className="absolute z-50 mt-1 w-full rounded-xl border border-white/[0.12] max-h-56 overflow-y-auto shadow-2xl"
          style={{
            background: '#0f1117',
            animationDuration: '0.12s',
          }}
        >
          {options.map(opt => (
            <li
              key={opt}
              role="option"
              aria-selected={value === opt}
              onClick={() => { onChange(opt); setOpen(false); }}
              style={value === opt ? { background: 'rgba(99,102,241,0.15)' } : undefined}
              className={`flex items-center justify-between px-4 py-3 text-sm cursor-pointer select-none
                transition-colors
                ${value === opt
                  ? 'text-brand-300 font-medium'
                  : 'text-gray-200 hover:text-white'}`}
              onMouseEnter={e => { if (value !== opt) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { if (value !== opt) (e.currentTarget as HTMLElement).style.background = ''; }}
            >
              {opt}
              {value === opt && <Check className="w-4 h-4 shrink-0 text-brand-400" />}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
