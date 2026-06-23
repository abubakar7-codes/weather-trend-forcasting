import type { ReactNode } from "react";

interface IsobarBackgroundProps {
  children: ReactNode;
  className?: string;
}

export function IsobarBackground({ children, className = "" }: IsobarBackgroundProps) {
  return (
    <div className={`hero-isobar-wrap ${className}`}>
      <svg
        className="hero-isobar-svg"
        viewBox="0 0 800 200"
        preserveAspectRatio="xMidYMid slice"
        aria-hidden="true"
      >
        <defs>
          <pattern id="isobar-grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path
              d="M 40 0 L 0 0 0 40"
              fill="none"
              stroke="currentColor"
              strokeWidth="0.5"
              opacity="0.15"
            />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#isobar-grid)" />
        <ellipse cx="200" cy="120" rx="180" ry="60" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.12" />
        <ellipse cx="400" cy="100" rx="220" ry="70" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.1" />
        <ellipse cx="600" cy="130" rx="160" ry="55" fill="none" stroke="currentColor" strokeWidth="1" opacity="0.14" />
        <path
          d="M 0 80 Q 200 40 400 90 T 800 70"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          opacity="0.18"
        />
        <path
          d="M 0 120 Q 250 160 500 100 T 800 140"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          opacity="0.12"
        />
        <path
          d="M 0 50 Q 300 110 600 60 T 800 95"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.8"
          opacity="0.1"
        />
      </svg>
      {children}
    </div>
  );
}
