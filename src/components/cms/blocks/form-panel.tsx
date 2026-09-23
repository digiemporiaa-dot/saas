import * as React from 'react';
import type { PublicForm } from '@/lib/services/forms';
import { PublicFormRenderer } from '@/components/forms/public-form';
import { applyFormStyle, formCardStyle, wantsFormCard, type FormStyle } from '@/lib/cms/form-style';
import { cn } from '@/lib/utils/cn';

type RendererProps = Omit<React.ComponentProps<typeof PublicFormRenderer>, 'form' | 'instanceKey'>;

/**
 * A form as a section places it: the card it sits in, a heading above it, and
 * the form itself — restyled by the section's Form tab where it was used.
 *
 * Every block that embeds a form draws it through here, so the Form tab means
 * the same thing wherever it appears. Each block passes the look its form has
 * always had (`card`, the heading classes); the Form tab's values are laid on
 * top as inline styles and design overrides, so a section nobody restyled
 * renders exactly as before.
 */
export function FormPanel({
  form,
  style,
  instanceKey,
  card = '',
  heading,
  description,
  headingAs: HeadingTag = 'h3',
  headerClassName = 'mb-5',
  headingClassName,
  descriptionClassName,
  inverted = false,
  className,
  children,
  ...renderer
}: RendererProps & {
  form: PublicForm;
  style: FormStyle;
  /** The section (or widget) id, which makes this copy of the form its own. */
  instanceKey: string;
  /** The block's own card classes; empty where the form has never had one. */
  card?: string;
  heading?: string;
  description?: string;
  headingAs?: 'h2' | 'h3' | 'p';
  headerClassName?: string;
  headingClassName?: string;
  descriptionClassName?: string;
  /** Light text for a dark section, where the form has no card behind it. */
  inverted?: boolean;
  className?: string;
  children?: React.ReactNode;
}) {
  const placed: PublicForm = {
    ...form,
    design: applyFormStyle(form.design, style),
    submitLabel: style.buttonLabel || form.submitLabel,
  };

  // A block with no card of its own gets one only when the Form tab asks.
  const cardClass =
    card ||
    (wantsFormCard(style)
      ? cn('rounded-2xl p-6 sm:p-8', style.cardBorderColor && 'border')
      : '');
  const onDark = inverted && !cardClass;

  const align = style.headingAlign === 'inherit' ? undefined : style.headingAlign;
  const headingText = heading?.trim();
  const descriptionText = description?.trim();

  return (
    <div className={cn(cardClass, className)} style={formCardStyle(style)}>
      {headingText || descriptionText ? (
        <div className={headerClassName} style={align ? { textAlign: align } : undefined}>
          {headingText ? (
            <HeadingTag
              className={
                headingClassName ??
                cn('font-heading text-lg font-semibold', onDark ? 'text-white' : 'text-content')
              }
              style={{
                color: style.headingColor || undefined,
                fontSize: style.headingSize || undefined,
              }}
            >
              {headingText}
            </HeadingTag>
          ) : null}
          {descriptionText ? (
            <p
              className={
                descriptionClassName ??
                cn(
                  'text-sm leading-relaxed',
                  headingText && 'mt-1.5',
                  onDark ? 'text-white/70' : 'text-muted',
                )
              }
              style={{ color: style.descriptionColor || undefined }}
            >
              {descriptionText}
            </p>
          ) : null}
        </div>
      ) : null}
      <PublicFormRenderer form={placed} instanceKey={instanceKey} {...renderer} />
      {children}
    </div>
  );
}
