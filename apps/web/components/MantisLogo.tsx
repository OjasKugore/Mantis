import React from 'react';

interface MantisLogoProps {
  className?: string;
  size?: number;
  alt?: string;
}

export function MantisLogo({ className = 'w-8 h-8', size = 32, alt = 'Mantis Logo' }: MantisLogoProps) {
  return (
    <span className={`inline-flex items-center justify-center shrink-0 bg-transparent ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt={alt}
        width={size}
        height={size}
        className="w-full h-full object-contain bg-transparent"
      />
    </span>
  );
}
