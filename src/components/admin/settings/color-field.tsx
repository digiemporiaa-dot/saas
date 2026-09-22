'use client';

import { Field, Input } from '@/components/ui/field';
import { HEX_COLOR, parseColor, composeColor } from '@/lib/cms/color';
import { OpacitySlider, SWATCH_CHECKS } from '@/components/cms/color-opacity';

/**
 * Hex text input paired with a native colour picker, kept in sync, plus the
 * opacity the picker itself cannot express.
 *
 * Opacity is part of the colour — `#0061FF80` — rather than a field of its
 * own, so nothing here has a second value to keep in step with the first.
 *
 * `allowOpacity` is off for the eight palette colours. Those are published as
 * `R G B` triples for Tailwind's own alpha modifier — `bg-brand/10` and the
 * rest — so a second opacity inside them would have nowhere to go and would
 * quietly do nothing.
 */
export function ColorField({
  label,
  name,
  value,
  onChange,
  error,
  allowOpacity = true,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (next: string) => void;
  error?: string[];
  allowOpacity?: boolean;
}) {
  const parsed = parseColor(value);
  const isValid = HEX_COLOR.test(value);

  return (
    <Field label={label} htmlFor={name} error={error}>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span
            className="relative h-10 w-12 shrink-0 overflow-hidden rounded-lg border border-hairline"
            style={SWATCH_CHECKS}
          >
            <input
              type="color"
              value={parsed?.hex ?? '#000000'}
              onChange={(e) =>
                onChange(composeColor(e.target.value.toUpperCase(), parsed?.alpha ?? 100))
              }
              aria-label={`${label} colour picker`}
              className="absolute inset-0 h-full w-full cursor-pointer border-0 bg-transparent p-1"
            />
            {parsed && parsed.alpha < 100 ? (
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-0"
                style={{ background: value }}
              />
            ) : null}
          </span>
          <Input
            id={name}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onBlur={(e) => onChange(e.target.value.trim().toUpperCase())}
            placeholder="#0061FF"
            aria-invalid={!isValid || undefined}
            className="font-mono text-sm uppercase"
          />
        </div>
        {allowOpacity ? (
          <OpacitySlider id={`${name}-opacity`} value={value} onChange={onChange} />
        ) : null}
      </div>
    </Field>
  );
}
