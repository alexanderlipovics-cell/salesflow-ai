import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SliderProps {
  value: number[];
  min?: number;
  max?: number;
  step?: number;
  onValueChange?: (value: number[]) => void;
  onValueCommit?: (value: number[]) => void;
  disabled?: boolean;
  className?: string;
}

export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  onValueChange,
  onValueCommit,
  disabled = false,
  className,
}: SliderProps) {
  const [isDragging, setIsDragging] = React.useState(false);
  const sliderRef = React.useRef<HTMLDivElement>(null);
  const currentValue = value[0] ?? min;

  const percentage = ((currentValue - min) / (max - min)) * 100;

  const handleMouseDown = (e: React.MouseEvent) => {
    if (disabled) return;
    setIsDragging(true);
    updateValue(e);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || disabled) return;
    updateValue(e);
  };

  const handleMouseUp = () => {
    if (isDragging) {
      setIsDragging(false);
      onValueCommit?.([currentValue]);
    }
  };

  const updateValue = (e: MouseEvent | React.MouseEvent) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    const newValue = Math.round((min + (percentage / 100) * (max - min)) / step) * step;
    const clampedValue = Math.max(min, Math.min(max, newValue));
    onValueChange?.([clampedValue]);
  };

  React.useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging]);

  return (
    <div
      ref={sliderRef}
      onMouseDown={handleMouseDown}
      className={cn(
        'relative h-2 w-full cursor-pointer rounded-full bg-slate-700',
        disabled && 'cursor-not-allowed opacity-50',
        className
      )}
    >
      <div
        className="absolute h-2 rounded-full bg-emerald-500"
        style={{ width: `${percentage}%` }}
      />
      <div
        className="absolute h-4 w-4 -translate-y-1 rounded-full border-2 border-emerald-500 bg-white shadow-md transition-transform hover:scale-110"
        style={{ left: `calc(${percentage}% - 8px)` }}
      />
    </div>
  );
}

