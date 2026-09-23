'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash } from 'lucide-react';
import { saveFooter } from '@/lib/actions/footer';
import {
  LOGO_MODES,
  SOCIAL_STYLES,
  type FooterContent,
  type FooterDesign,
} from '@/lib/cms/footer';
import { SettingsSection, SettingsDivider } from '@/components/admin/settings-section';
import { ColorInput, UnitInput } from '@/components/cms/design-controls';
import { MediaOrIcon } from '@/components/cms/media-or-icon';
import { Card, CardBody } from '@/components/ui/card';
import { Field, Input, Select, Switch, Textarea } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/toast';

/**
 * The footer, as a form.
 *
 * One screen for the whole thing: what it says, then what it looks like. There
 * is deliberately no builder and no second place — the footer this replaces was
 * a block registry, a drag-and-drop screen and a settings tab that each held
 * part of the answer, and the usual result was changing the one that did
 * nothing.
 */

const LOGO_MODE_LABELS: Record<(typeof LOGO_MODES)[number], string> = {
  logoAndName: 'Logo and name',
  logo: 'Logo only',
  name: 'Name only',
  none: 'Neither',
};

const SOCIAL_STYLE_LABELS: Record<(typeof SOCIAL_STYLES)[number], string> = {
  outline: 'Outlined circle',
  filled: 'Filled circle',
  plain: 'No circle',
};

export function FooterForm({
  initialContent,
  initialDesign,
  canEdit,
}: {
  initialContent: FooterContent;
  initialDesign: FooterDesign;
  canEdit: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [content, setContent] = React.useState(initialContent);
  const [design, setDesign] = React.useState(initialDesign);
  const [pending, setPending] = React.useState(false);

  const setBrand = <K extends keyof FooterContent['brand']>(
    key: K,
    value: FooterContent['brand'][K],
  ) => setContent((prev) => ({ ...prev, brand: { ...prev.brand, [key]: value } }));

  const setContact = <K extends keyof FooterContent['contact']>(
    key: K,
    value: FooterContent['contact'][K],
  ) => setContent((prev) => ({ ...prev, contact: { ...prev.contact, [key]: value } }));

  const setBottom = <K extends keyof FooterContent['bottom']>(
    key: K,
    value: FooterContent['bottom'][K],
  ) => setContent((prev) => ({ ...prev, bottom: { ...prev.bottom, [key]: value } }));

  const setDesignValue = <K extends keyof FooterDesign>(key: K, value: FooterDesign[K]) =>
    setDesign((prev) => ({ ...prev, [key]: value }));

  const patchColumn = (index: number, next: Partial<FooterContent['columns'][number]>) =>
    setContent((prev) => ({
      ...prev,
      columns: prev.columns.map((column, i) => (i === index ? { ...column, ...next } : column)),
    }));

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    const result = await saveFooter({ content, design });
    setPending(false);
    if (!result.ok) {
      toast(result.error, 'error');
      return;
    }
    toast(result.message ?? 'Footer saved.');
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit}>
      <Card>
        <CardBody className="space-y-5">
          <div>
            <h2 className="font-heading text-base font-semibold text-content">Footer</h2>
            <p className="mt-1 text-sm text-muted">
              Everything the footer shows and everything it looks like. The contact column falls
              back to whichever market is being browsed, so one footer serves all of them.
            </p>
          </div>

          <Switch
            label="Show the footer"
            checked={content.enabled}
            onChange={(next) => setContent((prev) => ({ ...prev, enabled: next }))}
          />

          <SettingsDivider />

          {/* --- brand ------------------------------------------------------ */}
          <SettingsSection title="Brand" description="The first column: mark, line and socials.">
            <Switch
              label="Show this column"
              checked={content.brand.show}
              onChange={(next) => setBrand('show', next)}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Show" htmlFor="footer-logo-mode">
                <Select
                  id="footer-logo-mode"
                  value={content.brand.logoMode}
                  onChange={(e) =>
                    setBrand('logoMode', e.target.value as FooterContent['brand']['logoMode'])
                  }
                >
                  {LOGO_MODES.map((mode) => (
                    <option key={mode} value={mode}>
                      {LOGO_MODE_LABELS[mode]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Name" htmlFor="footer-title" hint="Blank uses the site name.">
                <Input
                  id="footer-title"
                  value={content.brand.title}
                  onChange={(e) => setBrand('title', e.target.value)}
                />
              </Field>
            </div>
            <MediaOrIcon
              label="Footer logo"
              mediaId={content.brand.logoId || null}
              icon={content.brand.logoIcon}
              onChangeMedia={(id) => setBrand('logoId', id ?? '')}
              onChangeIcon={(name) => setBrand('logoIcon', name)}
            />
            <Field label="Line under it" htmlFor="footer-description">
              <Textarea
                id="footer-description"
                rows={2}
                value={content.brand.description}
                onChange={(e) => setBrand('description', e.target.value)}
              />
            </Field>
            <Switch
              label="Show the social icons"
              hint="The links themselves are on Settings → Branding."
              checked={content.brand.showSocials}
              onChange={(next) => setBrand('showSocials', next)}
            />
          </SettingsSection>

          <SettingsDivider />

          {/* --- link columns ----------------------------------------------- */}
          <SettingsSection
            title="Link columns"
            description="Up to four. A path like /pricing is resolved inside the market being browsed."
          >
            {content.columns.length === 0 ? (
              <p className="text-sm text-muted">No columns yet.</p>
            ) : null}

            {content.columns.map((column, index) => (
              <fieldset key={index} className="space-y-3 rounded-lg border border-hairline p-4">
                <legend className="px-1 text-sm font-medium text-content">
                  Column {index + 1}
                </legend>

                <div className="flex items-end gap-2">
                  <Field label="Heading" htmlFor={`footer-col-${index}`} className="flex-1">
                    <Input
                      id={`footer-col-${index}`}
                      value={column.heading}
                      onChange={(e) => patchColumn(index, { heading: e.target.value })}
                    />
                  </Field>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      setContent((prev) => ({
                        ...prev,
                        columns: prev.columns.filter((_, i) => i !== index),
                      }))
                    }
                  >
                    <Trash className="h-4 w-4" aria-hidden="true" />
                    Remove column
                  </Button>
                </div>

                {column.links.map((link, linkIndex) => (
                  <div key={linkIndex} className="flex items-end gap-2">
                    <Field
                      label="Label"
                      htmlFor={`footer-col-${index}-link-${linkIndex}-label`}
                      className="flex-1"
                    >
                      <Input
                        id={`footer-col-${index}-link-${linkIndex}-label`}
                        value={link.label}
                        onChange={(e) =>
                          patchColumn(index, {
                            links: column.links.map((l, i) =>
                              i === linkIndex ? { ...l, label: e.target.value } : l,
                            ),
                          })
                        }
                      />
                    </Field>
                    <Field
                      label="Link"
                      htmlFor={`footer-col-${index}-link-${linkIndex}-url`}
                      className="flex-1"
                    >
                      <Input
                        id={`footer-col-${index}-link-${linkIndex}-url`}
                        placeholder="/destinations"
                        value={link.url}
                        onChange={(e) =>
                          patchColumn(index, {
                            links: column.links.map((l, i) =>
                              i === linkIndex ? { ...l, url: e.target.value } : l,
                            ),
                          })
                        }
                      />
                    </Field>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-label={`Remove link ${linkIndex + 1}`}
                      onClick={() =>
                        patchColumn(index, {
                          links: column.links.filter((_, i) => i !== linkIndex),
                        })
                      }
                    >
                      <Trash className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={column.links.length >= 12}
                  onClick={() =>
                    patchColumn(index, { links: [...column.links, { label: '', url: '' }] })
                  }
                >
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add a link
                </Button>
              </fieldset>
            ))}

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={content.columns.length >= 4}
              onClick={() =>
                setContent((prev) => ({
                  ...prev,
                  columns: [...prev.columns, { heading: '', links: [] }],
                }))
              }
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add a column
            </Button>
          </SettingsSection>

          <SettingsDivider />

          {/* --- contact ----------------------------------------------------- */}
          <SettingsSection
            title="Contact column"
            description="Leave a line blank to use the market's own value."
          >
            <Switch
              label="Show this column"
              checked={content.contact.show}
              onChange={(next) => setContact('show', next)}
            />
            <Field label="Heading" htmlFor="footer-contact-heading">
              <Input
                id="footer-contact-heading"
                value={content.contact.heading}
                onChange={(e) => setContact('heading', e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Switch
                label="Phone"
                checked={content.contact.showPhone}
                onChange={(next) => setContact('showPhone', next)}
              />
              <Field label="Phone override" htmlFor="footer-phone">
                <Input
                  id="footer-phone"
                  placeholder="This market's own"
                  value={content.contact.phone}
                  onChange={(e) => setContact('phone', e.target.value)}
                />
              </Field>
              <Switch
                label="Email"
                checked={content.contact.showEmail}
                onChange={(next) => setContact('showEmail', next)}
              />
              <Field label="Email override" htmlFor="footer-email">
                <Input
                  id="footer-email"
                  placeholder="This market's own"
                  value={content.contact.email}
                  onChange={(e) => setContact('email', e.target.value)}
                />
              </Field>
              <Switch
                label="Address"
                checked={content.contact.showAddress}
                onChange={(next) => setContact('showAddress', next)}
              />
              <Field label="Address override" htmlFor="footer-address">
                <Input
                  id="footer-address"
                  placeholder="This market's own"
                  value={content.contact.address}
                  onChange={(e) => setContact('address', e.target.value)}
                />
              </Field>
            </div>
          </SettingsSection>

          <SettingsDivider />

          {/* --- bottom bar --------------------------------------------------- */}
          <SettingsSection title="Bottom bar" description="The line under the rule.">
            <div className="grid gap-4 sm:grid-cols-2">
              <Switch
                label="Show it"
                checked={content.bottom.show}
                onChange={(next) => setBottom('show', next)}
              />
              <Switch
                label="Rule above it"
                checked={content.bottom.showDivider}
                onChange={(next) => setBottom('showDivider', next)}
              />
            </div>
            <Field
              label="Text"
              htmlFor="footer-copyright"
              hint="{year} becomes this year and {site} the site name."
            >
              <Input
                id="footer-copyright"
                value={content.bottom.text}
                onChange={(e) => setBottom('text', e.target.value)}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Alignment" htmlFor="footer-bottom-align">
                <Select
                  id="footer-bottom-align"
                  value={content.bottom.align}
                  onChange={(e) =>
                    setBottom('align', e.target.value as FooterContent['bottom']['align'])
                  }
                >
                  <option value="center">Centre</option>
                  <option value="left">Left</option>
                  <option value="between">Ends apart</option>
                </Select>
              </Field>
              <Switch
                label="Rule across the full width"
                checked={design.fullWidthDivider}
                onChange={(next) => setDesignValue('fullWidthDivider', next)}
              />
            </div>
          </SettingsSection>

          <SettingsDivider />

          {/* --- appearance ---------------------------------------------------- */}
          <SettingsSection
            title="Appearance"
            description="Leave anything blank to keep the footer exactly as it looks now."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <ColorInput
                id="footer-colour-background"
                label="Background"
                value={design.background}
                onChange={(v) => setDesignValue('background', v)}
              />
              <ColorInput
                id="footer-colour-text"
                label="Text"
                value={design.text}
                onChange={(v) => setDesignValue('text', v)}
              />
              <ColorInput
                id="footer-colour-heading"
                label="Headings"
                value={design.heading}
                onChange={(v) => setDesignValue('heading', v)}
              />
              <ColorInput
                id="footer-colour-link"
                label="Links"
                value={design.link}
                onChange={(v) => setDesignValue('link', v)}
              />
              <ColorInput
                id="footer-colour-linkhover"
                label="Links on hover"
                value={design.linkHover}
                onChange={(v) => setDesignValue('linkHover', v)}
              />
              <ColorInput
                id="footer-colour-icon"
                label="Contact icons"
                value={design.icon}
                onChange={(v) => setDesignValue('icon', v)}
              />
              <ColorInput
                id="footer-colour-divider"
                label="Divider line"
                value={design.divider}
                onChange={(v) => setDesignValue('divider', v)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Vertical padding" htmlFor="footer-padding-y" hint="Default 3.5rem.">
                <UnitInput
                  id="footer-padding-y"
                  value={design.paddingY}
                  placeholder="3.5rem"
                  aria-label="Vertical padding"
                  onChange={(v) => setDesignValue('paddingY', v)}
                />
              </Field>
              <Field label="Content width" htmlFor="footer-width" hint="Default 80rem.">
                <UnitInput
                  id="footer-width"
                  value={design.width}
                  placeholder="80rem"
                  aria-label="Content width"
                  onChange={(v) => setDesignValue('width', v)}
                />
              </Field>
              <Field label="Space between columns" htmlFor="footer-column-gap">
                <UnitInput
                  id="footer-column-gap"
                  value={design.columnGap}
                  placeholder="2.5rem"
                  aria-label="Space between columns"
                  onChange={(v) => setDesignValue('columnGap', v)}
                />
              </Field>
              <Field label="Space between rows" htmlFor="footer-row-gap">
                <UnitInput
                  id="footer-row-gap"
                  value={design.rowGap}
                  placeholder="2.5rem"
                  aria-label="Space between rows"
                  onChange={(v) => setDesignValue('rowGap', v)}
                />
              </Field>
              <Field label="Logo height" htmlFor="footer-logo-height" hint="Default 2.5rem.">
                <UnitInput
                  id="footer-logo-height"
                  value={design.logoHeight}
                  placeholder="2.5rem"
                  aria-label="Logo height"
                  onChange={(v) => setDesignValue('logoHeight', v)}
                />
              </Field>
              <Field label="Social icon size" htmlFor="footer-social-size" hint="Default 2.5rem.">
                <UnitInput
                  id="footer-social-size"
                  value={design.socialSize}
                  placeholder="2.5rem"
                  aria-label="Social icon size"
                  onChange={(v) => setDesignValue('socialSize', v)}
                />
              </Field>
              <Field label="Social icon style" htmlFor="footer-social-style">
                <Select
                  id="footer-social-style"
                  value={design.socialStyle}
                  onChange={(e) =>
                    setDesignValue('socialStyle', e.target.value as FooterDesign['socialStyle'])
                  }
                >
                  {SOCIAL_STYLES.map((style) => (
                    <option key={style} value={style}>
                      {SOCIAL_STYLE_LABELS[style]}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field
                label="Brand column width"
                htmlFor="footer-brand-width"
                hint="A track like 1.4fr. Blank shares the row equally."
              >
                <Input
                  id="footer-brand-width"
                  placeholder="1.4fr"
                  value={design.brandWidth}
                  onChange={(e) => setDesignValue('brandWidth', e.target.value)}
                />
              </Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Columns on tablet" htmlFor="footer-cols-tablet" hint="0 narrows it.">
                <Input
                  id="footer-cols-tablet"
                  type="number"
                  min={0}
                  max={6}
                  value={design.tabletColumns}
                  onChange={(e) => setDesignValue('tabletColumns', Number(e.target.value) || 0)}
                />
              </Field>
              <Field label="Columns on mobile" htmlFor="footer-cols-mobile" hint="0 puts one per row.">
                <Input
                  id="footer-cols-mobile"
                  type="number"
                  min={0}
                  max={6}
                  value={design.mobileColumns}
                  onChange={(e) => setDesignValue('mobileColumns', Number(e.target.value) || 0)}
                />
              </Field>
            </div>
          </SettingsSection>
        </CardBody>

        {canEdit ? (
          <div className="flex justify-end border-t border-hairline bg-muted/[0.03] px-4 py-3 sm:px-5">
            <Button type="submit" disabled={pending}>
              {pending ? 'Saving…' : 'Save footer'}
            </Button>
          </div>
        ) : null}
      </Card>
    </form>
  );
}
