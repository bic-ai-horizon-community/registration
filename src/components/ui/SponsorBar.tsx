import React from 'react';
import { sponsorsConfig, getSponsorLogoUrl } from '../../sponsors.config';

interface SponsorBarProps {
  eventName: string;
}

export const SponsorBar: React.FC<SponsorBarProps> = ({ eventName }) => {
  const sponsors = sponsorsConfig[eventName];
  if (!sponsors || sponsors.length === 0) return null;

  // Triplicate so the loop is gapless even on narrow mobile screens
  const loopedSponsors = [...sponsors, ...sponsors, ...sponsors];

  return (
    <div className="mt-8 animate-fade-in animate-delay-200">
      <p className="text-center text-xs font-semibold tracking-[0.2em] uppercase text-gray-600 mb-6">
        Our Sponsors
      </p>

      <div className="relative overflow-hidden">
        {/* Fade edges */}
        <div className="pointer-events-none absolute inset-y-0 left-0 w-12 sm:w-20 z-10 bg-gradient-to-r from-[#030712] to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 sm:w-20 z-10 bg-gradient-to-l from-[#030712] to-transparent" />

        <div
          className="flex items-center gap-10 sm:gap-16 py-2"
          style={{ animation: 'sponsorScroll 18s linear infinite' }}
        >
          {loopedSponsors.map((s, i) => (
            <div
              key={`${s.file}-${i}`}
              className="flex-shrink-0 flex items-center justify-center group"
            >
              <img
                src={getSponsorLogoUrl(eventName, s.file)}
                alt={s.alt}
                className={`w-auto object-contain opacity-55 group-hover:opacity-90 brightness-0 invert transition-opacity duration-300 ${s.imgClass ?? 'h-9 max-w-[120px]'}`}
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 border-t border-white/[0.04]" />

      <style>{`
        @keyframes sponsorScroll {
          0%   { transform: translateX(0); }
          100% { transform: translateX(-33.333%); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sponsor-track { animation: none !important; }
        }
      `}</style>
    </div>
  );
};
