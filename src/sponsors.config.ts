/**
 * Sponsor configuration per event.
 * Key: exact event name (must match the folder name inside public/sponsers/)
 *
 * imgClass: Tailwind classes for width/height of that specific logo.
 *   Use responsive prefixes freely e.g. 'h-10 sm:h-12'
 *   Square logos need more height; wide text logos need less.
 */
export const sponsorsConfig: Record<string, { file: string; alt: string; imgClass?: string }[]> = {
  XPERIA: [
    // Wide horizontal logo — standard height
    { file: 'bsz.png', alt: 'Birat Sports Zone',  imgClass: 'h-9 sm:h-11 max-w-[160px]' },
    // Square logo — needs taller to look balanced
    { file: 'gs.png',  alt: 'Goti Soda',          imgClass: 'h-14 sm:h-16 max-w-[110px]' },
    // Very wide pure-text logo — keep height short or it looks huge
    { file: 'ls.png',  alt: 'Laxmi iStore',       imgClass: 'h-7 sm:h-9 max-w-[170px]'  },
    // Square logo — needs taller to look balanced
    { file: 'tkg.png', alt: 'The Kush Garden',    imgClass: 'h-14 sm:h-16 max-w-[140px]' },
  ],
};

/**
 * Returns the public URL path for a sponsor logo.
 * NOTE: folder name uses the original "sponsers" spelling to match your public dir.
 */
export function getSponsorLogoUrl(eventName: string, file: string): string {
  return `/sponsers/${encodeURIComponent(eventName)}/${file}`;
}
