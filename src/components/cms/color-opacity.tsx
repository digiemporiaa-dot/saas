'use client';

import * as React from 'react';
import { parseColor, composeColor } from '@/lib/cms/color';
import { cn } from '@/lib/utils/cn';

/**
 * The opacity half of a colour control.
 *
 * Opacity lives in the colour itself — `#0061FF80` — rather than in a field of
 * its own, so there is nothing to keep in sync and nothing extra to store. A
 * native `<input type="color">` cannot express alpha, which is the only reason
 * this is a separate control at all: the picker sets the colour, this sets how
 * much of it there is, and the two are written back as one value.
 *
 * It renders nothing until there is a colour to be transparent, because 40%
 * of "inherit" is not a thing anybody means.
 */
export function OpacitySlider({
  value,
  onChange,
  id,
  className,
}: {
  /** The whole colour, `#RRGGBB` or `#RRGGBBAA`. */
  value: string;
  onChange: (next: string) => void;
  id: string;
  className?: string;
}) {
  const parsed = parseColor(value);
  if (!parsed) return null;

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <label htmlFor={id} className="shrink-0 text-xs text-muted">
        Opacity
      </label>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={parsed.alpha}
        onChange={(event) => onChange(composeColor(parsed.hex, Number(event.target.value)))}
        className="h-1.5 min-w-0 flex-1 cursor-pointer accent-[rgb(var(--brand-primary))]"
      />
      <output
        htmlFor={id}
        className="w-10 shrink-0 text-right font-mono text-xs tabular-nums text-muted"
      >
        {parsed.alpha}%
      </output>
    </div>
  );
}

/**
 * The chequerboard behind a swatch, so a transparent colour looks transparent
 * rather than looking like a lighter one.
 */
export const SWATCH_CHECKS: React.CSSProperties = {
  backgroundImage:
    'linear-gradient(45deg, rgb(0 0 0 / 0.08) 25%, transparent 25%),' +
    'linear-gradient(-45deg, rgb(0 0 0 / 0.08) 25%, transparent 25%),' +
    'linear-gradient(45deg, transparent 75%, rgb(0 0 0 / 0.08) 75%),' +
    'linear-gradient(-45deg, transparent 75%, rgb(0 0 0 / 0.08) 75%)',
  backgroundSize: '8px 8px',
  backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0',
};
