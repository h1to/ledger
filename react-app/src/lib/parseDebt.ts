/**
 * Pure parsers for Kazakhstan bank debt certificates (справка о задолженности).
 * Input is the plain text extracted from a PDF (see pdfText.ts); output is a list of
 * debts with the remaining amount owed. These certificates do NOT contain a monthly
 * payment, term or rate — only the outstanding debt — so the user fills payment in later.
 */

export type BankId = 'Halyk' | 'Kaspi' | 'Alatau City Bank';

export interface ParsedDebt {
  name: string;
  kind: string;
  contract: string | null;
  debt: number; // remaining owed, in KZT
  opened: string | null; // origination date as printed (dd.mm.yyyy), when present
}

export interface ParseResult {
  bank: BankId | null;
  debts: ParsedDebt[];
}

/** Parse a KZ money token like "40 128,00", "210 521.51" or "401 801.18 ₸" to a number. */
export function parseKzt(s: string): number {
  let t = (s || '').replace(/[^\d.,]/g, ''); // keep digits and separators only (spaces are thousands)
  if (/,\d{1,2}$/.test(t)) t = t.replace(/\./g, '').replace(',', '.'); // comma decimal
  else t = t.replace(/,/g, ''); // dot decimal (or none) — commas are thousands
  const n = parseFloat(t);
  return isFinite(n) ? n : 0;
}

export function detectBank(text: string): BankId | null {
  if (/Kaspi|CASPKZKA/i.test(text)) return 'Kaspi';
  if (/Alatau\s*City\s*Bank|TSESKZKA/i.test(text)) return 'Alatau City Bank';
  if (/Народный\s+Банк|Halyk|Қазақстан\s+халық/i.test(text)) return 'Halyk';
  return null;
}

const HALYK_KINDS = ['Беззалоговый кредит', 'Рассрочка', 'Ипотека', 'Автокредит', 'Кредитная карта', 'Кредитный лимит', 'Кредит'];

function parseHalyk(text: string): ParsedDebt[] {
  const out: ParsedDebt[] = [];
  const re = /Номер договора:\s*(\S+)[\s\S]*?Остаток долга\s*\(Итого\):\s*([\d\s.,]+?)\s*(?:теңге|тенге|₸)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const contract = m[1].trim();
    const debt = parseKzt(m[2]);
    if (debt <= 0) continue;
    // kind = the known type keyword printed NEAREST before "Номер договора" (max index wins;
    // on a tie prefer the longer, more specific label)
    const before = text.slice(0, m.index);
    let kind = 'Кредит';
    let bestIdx = -1;
    for (const k of HALYK_KINDS) {
      const idx = before.lastIndexOf(k);
      if (idx > bestIdx || (idx >= 0 && idx === bestIdx && k.length > kind.length)) { bestIdx = idx; kind = k; }
    }
    out.push({ name: kind + ' · ' + contract, kind, contract, debt, opened: null });
  }
  return out;
}

function parseKaspi(text: string): ParsedDebt[] {
  const out: ParsedDebt[] = [];
  const re = /(Кредит на Покупки|Кредит Наличными|Карта для платежей|Kaspi Red|Рассрочка|Ипотека|Кредит)\s*от\s*(\d{2}\.\d{2}\.\d{4})[\s\S]*?Остаток долга\s*([\d\s]+,\d{2})/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const kind = m[1].trim();
    const opened = m[2];
    const debt = parseKzt(m[3]);
    if (debt <= 0) continue; // paid-off / zero rows
    out.push({ name: kind + ' от ' + opened, kind, contract: null, debt, opened });
  }
  return out;
}

function parseAlatau(text: string): ParsedDebt[] {
  const out: ParsedDebt[] = [];
  const re = /Договор\s*№\s*(\S+)\s*от[\s\S]*?Общая задолженность\s*([\d\s.,]+?)\s*₸/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const contract = m[1].trim();
    const debt = parseKzt(m[2]);
    if (debt <= 0) continue;
    out.push({ name: 'Договор ' + contract, kind: 'Кредит', contract, debt, opened: null });
  }
  return out;
}

/** Detect the bank and parse its debt rows from extracted PDF text. */
export function parseDebtText(text: string): ParseResult {
  const bank = detectBank(text);
  let debts: ParsedDebt[] = [];
  if (bank === 'Halyk') debts = parseHalyk(text);
  else if (bank === 'Kaspi') debts = parseKaspi(text);
  else if (bank === 'Alatau City Bank') debts = parseAlatau(text);
  return { bank, debts };
}
