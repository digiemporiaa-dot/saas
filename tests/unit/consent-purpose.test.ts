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

  it('still refuses a notice missing the parts a visitor reads', () => {
    for (const key of ['enquiryLabel', 'termsLabel', 'withdrawalText', 'privacyUrl', 'termsUrl']) {
      const result = consentNoticeSchema.safeParse({ ...complete, [key]: '' });
      expect(result.success, `${key} should still be required`).toBe(false);
    }
  });

  it('still caps the purpose at a sane length', () => {
    expect(consentNoticeSchema.safeParse({ ...complete, purposeText: 'x'.repeat(2001) }).success).toBe(
      false,
    );
  });
});
