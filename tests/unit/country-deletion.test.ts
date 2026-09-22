import { describe, it, expect } from 'vitest';
import {
  describeContents,
  deletionWarning,
  hasContents,
  type CountryContents,
} from '@/lib/country/contents';

/**
 * What somebody is told before a market is deleted.
 *
 * Deleting a market now takes its content with it rather than refusing, so the
 * sentence in front of that button is the whole safeguard: it has to name
 * exactly what goes, and exactly what does not.
 */

const empty: CountryContents = {
  pages: 0,
  posts: 0,
  menus: 0,
  leads: 0,
  pricing: 0,
  popups: 0,
  forms: 0,
};
const holding = (over: Partial<CountryContents>): CountryContents => ({ ...empty, ...over });

describe('what a market is holding', () => {
  it('is nothing when it is empty', () => {
    expect(hasContents(empty)).toBe(false);
    expect(describeContents(empty)).toBe('nothing');
  });

  it('counts anything at all, not only the things that used to block a delete', () => {
    for (const key of Object.keys(empty) as Array<keyof CountryContents>) {
      expect(hasContents(holding({ [key]: 1 })), key).toBe(true);
    }
  });

  it('names what is there and stays quiet about what is not', () => {
    expect(describeContents(holding({ pages: 4 }))).toBe('4 pages');
    expect(describeContents(holding({ pages: 4, leads: 2 }))).toBe('4 pages and 2 leads');
    expect(describeContents(holding({ pages: 4, posts: 1, menus: 2, leads: 9 }))).toBe(
      '4 pages, 1 article, 2 menus and 9 leads',
    );
    // Zeroes are never listed: "0 menus" only hides the real numbers.
    expect(describeContents(holding({ menus: 0, posts: 3 }))).toBe('3 articles');
  });

  it('counts one of a thing as one of a thing', () => {
    expect(describeContents(holding({ pages: 1, posts: 1, menus: 1, leads: 1, popups: 1 }))).toBe(
      '1 page, 1 article, 1 menu, 1 lead and 1 popup',
    );
  });
});

describe('the sentence in front of the button', () => {
  it('says what is destroyed, and that it cannot be undone', () => {
    const warning = deletionWarning('United Arab Emirates', holding({ pages: 4, leads: 2 }));
    expect(warning).toContain('United Arab Emirates');
    expect(warning).toContain('4 pages and 2 leads');
    expect(warning).toContain('permanently');
    // The safer option is always offered alongside it.
    expect(warning).toMatch(/[Dd]eactivate/);
  });

  it('says a form is kept rather than letting that be a surprise', () => {
    const one = deletionWarning('India', holding({ pages: 1, forms: 1 }));
    expect(one).toContain('its form is kept and switched off'.replace('its', 'Its'));

    const many = deletionWarning('India', holding({ pages: 1, forms: 3 }));
    expect(many).toContain('3 forms are kept and switched off');

    // …and does not mention forms at all when there are none.
    expect(deletionWarning('India', holding({ pages: 1 }))).not.toMatch(/form/);
  });

  it('never claims content is destroyed when there is none', () => {
    expect(deletionWarning('India', empty)).toBe('India holds nothing.');
    expect(deletionWarning('India', empty)).not.toMatch(/permanently/);
  });
});
