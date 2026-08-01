import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
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
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Position the portal dropdown relative to the trigger button
  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setDropdownStyle({
      position: 'fixed',
      top: rect.bottom + 4,
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
    });
  };

  const handleOpen = () => {
    updatePosition();
    setOpen(o => !o);
  };

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        containerRef.current && !containerRef.current.contains(target) &&
        !document.getElementById('custom-select-portal')?.contains(target)
      ) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Reposition on scroll/resize
  useEffect(() => {
    if (!open) return;
    const update = () => updatePosition();
    window.addEventListener('scroll', update, true);
    window.addEventListener('resize', update);
    return () => {
      window.removeEventListener('scroll', update, true);
      window.removeEventListener('resize', update);
    };
  }, [open]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); handleOpen(); }
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

  const dropdown = open ? (
    <ul
      id="custom-select-portal"
      role="listbox"
      style={{
        ...dropdownStyle,
        background: '#0f1117',
        border: '1px solid rgba(255,255,255,0.12)',
        borderRadius: '12px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.8)',
        maxHeight: '224px',
        overflowY: 'auto',
        padding: '4px 0',
      }}
    >
      {options.map(opt => (
        <li
          key={opt}
          role="option"
          aria-selected={value === opt}
          onClick={() => { onChange(opt); setOpen(false); }}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '10px 16px',
            fontSize: '14px',
            cursor: 'pointer',
            userSelect: 'none',
            color: value === opt ? '#a5b4fc' : '#e2e8f0',
            background: value === opt ? 'rgba(99,102,241,0.15)' : 'transparent',
            fontWeight: value === opt ? 500 : 400,
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => {
            if (value !== opt) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.07)';
          }}
          onMouseLeave={e => {
            if (value !== opt) (e.currentTarget as HTMLElement).style.background = 'transparent';
          }}
        >
          {opt}
          {value === opt && <Check style={{ width: 16, height: 16, color: '#818cf8', flexShrink: 0 }} />}
        </li>
      ))}
    </ul>
  ) : null;

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
        ref={triggerRef}
        id={id}
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        onKeyDown={handleKeyDown}
        onClick={handleOpen}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          height: '44px',
          padding: '0 16px',
          borderRadius: '12px',
          border: open ? '1px solid rgba(99,102,241,0.5)' : '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.05)',
          color: value ? '#fff' : '#6b7280',
          fontSize: '14px',
          cursor: 'pointer',
          outline: open ? '2px solid rgba(99,102,241,0.3)' : 'none',
          outlineOffset: '2px',
          transition: 'all 0.15s',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value || placeholder}
        </span>
        <ChevronDown
          style={{
            width: 16,
            height: 16,
            flexShrink: 0,
            marginLeft: 8,
            color: '#9ca3af',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s',
          }}
        />
      </button>

      {/* Render dropdown in document.body via portal to escape any parent stacking context */}
      {typeof document !== 'undefined' && createPortal(dropdown, document.body)}
    </div>
  );
};
