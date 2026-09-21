import { describe, it, expect } from 'vitest';
import { consentNoticeSchema } from '@/lib/privacy/consent';

/**
 * The purpose paragraph may be published empty.
 *
 * Every other part of a notice still has to be there — an empty tick-box
 * label is a control nobody can read, which is a different thing from a
 * notice whose purpose wording has not been written yet.
 */
const complete = {
  purposeText: 'To answer your enquiry.',
  enquiryLabel: 'I agree to be contacted about this enquiry.',
  marketingLabel: '',
  termsLabel: 'I accept the Terms.',
  withdrawalText: 'Email us to withdraw.',
  privacyUrl: '/privacy',
  termsUrl: '/terms',
};

describe('consent notice purpose', () => {
  it('publishes with an empty purpose', () => {
    expect(consentNoticeSchema.parse({ ...complete, purposeText: '' }).purposeText).toBe('');
    expect(consentNoticeSchema.parse({ ...complete, purposeText: '   ' }).purposeText).toBe('');
  });

  it('keeps the purpose when there is one', () => {
    expect(consentNoticeSchema.parse(complete).purposeText).toBe('To answer your enquiry.');
  });

  it('publishes with every wording field empty', () => {
    const blank = consentNoticeSchema.safeParse({
      purposeText: '',
      enquiryLabel: '',
      marketingLabel: '',
      termsLabel: '',
      withdrawalText: '',
      privacyUrl: '',
      termsUrl: '',
    });
    expect(blank.success, JSON.stringify(blank.success ? {} : blank.error.issues)).toBe(true);
  });

  it('still caps every field, so a paste cannot fill the column', () => {
    const tooLong: Array<[string, number]> = [
      ['purposeText', 2001],
      ['enquiryLabel', 1001],
      ['termsLabel', 1001],
      ['withdrawalText', 1001],
      ['privacyUrl', 501],
      ['termsUrl', 501],
    ];
    for (const [key, length] of tooLong) {
      const result = consentNoticeSchema.safeParse({ ...complete, [key]: 'x'.repeat(length) });
      expect(result.success, `${key} should still be capped`).toBe(false);
    }
  });

});
