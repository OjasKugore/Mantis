import React from 'react';

interface MantisLogoProps {
  className?: string;
  size?: number;
  alt?: string;
}

export function MantisLogo({ className = '', size = 32, alt = 'Mantis Logo' }: MantisLogoProps) {
  return (
    <span
      style={{ width: size, height: size, minWidth: size, minHeight: size }}
      className={`inline-flex items-center justify-center shrink-0 bg-transparent ${className}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt={alt}
        width={size}
        height={size}
        style={{ width: size, height: size }}
        className="w-full h-full object-contain bg-transparent shrink-0"
      />
    </span>
  );
}
