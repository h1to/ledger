import {
  LANG_KEY,
  MONTH_SHORT_EN,
  MONTH_FULL_EN,
  MONTH_SHORT_RU,
  MONTH_FULL_RU,
} from '../constants';
import type { Lang, MonthKey } from '../types';
import { keyMonth, keyYear } from '../lib/dates';
import { RU, RU_CAT } from './ru';
import { INFO, INFO_RU } from './info';

/**
 * Current language lives as a module-level variable so `tt()` can be called from
 * anywhere (matching the original global LANG). The Zustand store keeps this in
 * sync via setCurrentLang() and re-renders components, so lookups are correct.
 */
let currentLang: Lang = 'en';

export function getLang(): Lang {
  return currentLang;
}

export function loadLang(): Lang {
  try {
    const v = localStorage.getItem(LANG_KEY);
    if (v === 'ru' || v === 'en') currentLang = v;
  } catch {
    /* ignore */
  }
  return currentLang;
}

export function setCurrentLang(v: Lang): void {
  currentLang = v === 'ru' ? 'ru' : 'en';
  try {
    localStorage.setItem(LANG_KEY, currentLang);
  } catch {
    /* ignore */
  }
}

/** Translate a UI string. Missing keys fall back to the English source. */
export function tt(key: string): string {
  if (currentLang === 'ru' && Object.prototype.hasOwnProperty.call(RU, key)) return RU[key];
  return key;
}

/** Category label. Categories are stored in English; only display is translated. */
export function catLabel(c: string): string {
  if (currentLang === 'ru' && Object.prototype.hasOwnProperty.call(RU_CAT, c)) return RU_CAT[c];
  return c;
}

/** Localized info-tip text for a key ('' if unknown). */
export function infoText(key: string): string {
  if (currentLang === 'ru' && INFO_RU[key]) return INFO_RU[key];
  return INFO[key] || '';
}

export function monthShort(): string[] {
  return currentLang === 'ru' ? MONTH_SHORT_RU : MONTH_SHORT_EN;
}
export function monthFull(): string[] {
  return currentLang === 'ru' ? MONTH_FULL_RU : MONTH_FULL_EN;
}

export function labelFull(k: MonthKey): string {
  return monthFull()[keyMonth(k) - 1] + ' ' + keyYear(k);
}
export function labelShortKey(k: MonthKey): string {
  return monthShort()[keyMonth(k) - 1] + ' ' + keyYear(k);
}
