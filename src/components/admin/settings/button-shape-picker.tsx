'use client';

import * as React from 'react';
import { Field, Input } from '@/components/ui/field';
import { BUTTON_SHAPES, buttonShapeOf } from '@/lib/cms/buttons';
import { cn } from '@/lib/utils/cn';

/** How big each preset's corner is drawn on its small sample button. */
const SWATCH_RADIUS: Record<(typeof BUTTON_SHAPES)[number]['id'], string> = {
  square: '0px',
  slight: '2px',
  rounded: '4px',
  pill: '999px',
};

/**
 * A button's corner shape, picked by looking at it.
 *
 * Each preset is a radius, and choosing one stores that radius; "Custom"
 * reveals the radius itself for anything else. With `inheritLabel`, a first
 * option stores blank, which means "follow the shared shape".
 */
export function ButtonShapePicker({
  id,
  label,
  value,
  onChange,
  error,
  inheritLabel,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  error?: string[];
  inheritLabel?: string;
}) {
  const preset = buttonShapeOf(value);
  const inheriting = Boolean(inheritLabel) && value.trim() === '';
  // "Custom" is a mode, not a value: picking it keeps the radius as it is and
  // shows the box, even when that radius happens to equal a preset.
  const [custom, setCustom] = React.useState(!preset && !inheriting);
  const showCustom = custom || (!preset && !inheriting);

  const chip = (active: boolean) =>
    cn(
      'flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-colors',
      active
        ? 'border-brand bg-brand/10 text-content'
        : 'border-hairline text-muted hover:border-content/30 hover:text-content',
    );

  return (
    <Field label={label} htmlFor={showCustom ? id : undefined} error={error}>
      <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
        {inheritLabel ? (
          <button
            type="button"
            aria-pressed={inheriting && !custom}
            className={chip(inheriting && !custom)}
            onClick={() => {
              setCustom(false);
              onChange('');
            }}
          >
            {inheritLabel}
          </button>
        ) : null}
        {BUTTON_SHAPES.map((shape) => {
          const active = !showCustom && preset?.id === shape.id;
          return (
            <button
              key={shape.id}
              type="button"
              aria-pressed={active}
              className={chip(active)}
              onClick={() => {
                setCustom(false);
                onChange(shape.radius);
              }}
            >
              <span
                aria-hidden="true"
                className="h-3.5 w-7 shrink-0 border-[1.5px] border-current"
                style={{ borderRadius: SWATCH_RADIUS[shape.id] }}
              />
              {shape.label}
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={showCustom}
          className={chip(showCustom)}
          onClick={() => setCustom(true)}
        >
          Custom
        </button>
      </div>
      {showCustom ? (
        <Input
          id={id}
          value={value}
          placeholder="e.g. 12px or 0.75rem"
          className="mt-2 max-w-[12rem]"
          onChange={(e) => onChange(e.target.value)}
        />
      ) : null}
    </Field>
  );
}
