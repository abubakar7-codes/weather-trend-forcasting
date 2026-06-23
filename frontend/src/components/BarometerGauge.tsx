interface BarometerGaugeProps {
  size?: number;
  className?: string;
}

/** Conic-gradient ring — barometer-style loading indicator */
export function BarometerGauge({ size = 18, className = "" }: BarometerGaugeProps) {
  return (
    <span
      className={`gauge-ring ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    />
  );
}
