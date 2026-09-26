import { describe, it, expect } from 'vitest';
import { parseDebtText, parseKzt, detectBank } from '../parseDebt';

const HALYK = `Клиент: МУРЗАЛИЕВ ЭЛДИЯР
ИИН: 011208000135
Настоящим АО «Народный Банк Казахстана» сообщает о наличии задолженности в размере 401 801.18. Из них:
Беззалоговый кредит
Номер договора: EKP107432156
Сумма кредита/лимита: 208 334 теңге
Просроченная задолженность: 0
Остаток долга (Итого): 19 105.43 теңге
Беззалоговый кредит
Номер договора: EKP128106895
Сумма кредита/лимита: 208 334 теңге
Просроченная задолженность: 0
Остаток долга (Итого): 210 521.51 теңге
Беззалоговый кредит
Номер договора: EKP126776707
Сумма кредита/лимита: 104 167 теңге
Просроченная задолженность: 0
Остаток долга (Итого): 97 189.25 теңге
Рассрочка
Номер договора: CPA000020194676
Сумма кредита/лимита: 99 980 теңге
Просроченная задолженность: 0
Остаток долга (Итого): 74 984.99 теңге`;

const KASPI = `АО «Kaspi Bank» по клиенту Мурзалиев Элдияр , ИИН 011208000135, сообщает:
Кредит на Покупки от 21.09.2026
Лимит кредитования 0,00 ₸
Размер просроченной задолженности 0,00 ₸
Остаток долга 40 128,00 ₸
Кредит Наличными от 25.08.2026
Лимит кредитования 0,00 ₸
Размер просроченной задолженности 0,00 ₸
Остаток долга 195 500,73 ₸
Кредит на Покупки от 06.08.2026
Лимит кредитования 0,00 ₸
Размер просроченной задолженности 0,00 ₸
Остаток долга 682 181,00 ₸
Карта для платежей от 17.10.2021
Лимит кредитования 0,00 ₸
Размер просроченной задолженности 0,00 ₸
Остаток долга 0,00 ₸
Kaspi Red от 14.12.2021
Лимит кредитования 300 000,00 ₸
Размер просроченной задолженности 0,00 ₸
Остаток долга 208 615,00 ₸
АО «Kaspi Bank»
БИК: CASPKZKA`;

const ALATAU = `АО «Alatau City Bank», БИК TSESKZKA
имеет общую задолженность в размере 378 967.49 ₸.
Договор №EM26200-000916615 от
Общая задолженность 110 991.08 ₸
Основной долг 109 085.12 ₸
начисленное вознаграждение 1 905.96 ₸
Договор №EM26200-000995204 от
Общая задолженность 110 206.28 ₸
Основной долг 109 085.12 ₸
Договор №EM26200-001800999 от
Общая задолженность 79 352.14 ₸
Основной долг 78 305.88 ₸
Договор №EM26200-001821810 от
Общая задолженность 78 417.99 ₸
Основной долг 77 705.68 ₸`;

describe('parseKzt', () => {
  it('handles space thousands with dot or comma decimals', () => {
    expect(parseKzt('19 105.43')).toBeCloseTo(19105.43, 2);
    expect(parseKzt('40 128,00')).toBeCloseTo(40128, 2);
    expect(parseKzt('682 181,00 ₸')).toBeCloseTo(682181, 2);
    expect(parseKzt('208 334 теңге')).toBeCloseTo(208334, 2);
    expect(parseKzt('0,00')).toBe(0);
  });
});

describe('detectBank', () => {
  it('recognizes each bank', () => {
    expect(detectBank(HALYK)).toBe('Halyk');
    expect(detectBank(KASPI)).toBe('Kaspi');
    expect(detectBank(ALATAU)).toBe('Alatau City Bank');
    expect(detectBank('some other document')).toBeNull();
  });
});

describe('Halyk', () => {
  it('parses four debts with correct amounts and kinds', () => {
    const { bank, debts } = parseDebtText(HALYK);
    expect(bank).toBe('Halyk');
    expect(debts.map((d) => d.debt)).toEqual([19105.43, 210521.51, 97189.25, 74984.99]);
    expect(debts.map((d) => d.contract)).toEqual(['EKP107432156', 'EKP128106895', 'EKP126776707', 'CPA000020194676']);
    expect(debts[0].kind).toBe('Беззалоговый кредит');
    expect(debts[3].kind).toBe('Рассрочка'); // last block's kind, not the first in the list
    const total = debts.reduce((s, d) => s + d.debt, 0);
    expect(total).toBeCloseTo(401801.18, 2);
  });
});

describe('Kaspi', () => {
  it('parses debts, drops zero-debt rows, keeps comma decimals', () => {
    const { bank, debts } = parseDebtText(KASPI);
    expect(bank).toBe('Kaspi');
    expect(debts.map((d) => d.debt)).toEqual([40128, 195500.73, 682181, 208615]); // 0,00 card dropped
    expect(debts[0].name).toBe('Кредит на Покупки от 21.09.2026');
    expect(debts[3].kind).toBe('Kaspi Red');
    expect(debts[1].opened).toBe('25.08.2026');
  });
});

describe('Alatau City Bank', () => {
  it('parses per-contract total debt', () => {
    const { bank, debts } = parseDebtText(ALATAU);
    expect(bank).toBe('Alatau City Bank');
    expect(debts.map((d) => d.debt)).toEqual([110991.08, 110206.28, 79352.14, 78417.99]);
    expect(debts[0].contract).toBe('EM26200-000916615');
    const total = debts.reduce((s, d) => s + d.debt, 0);
    expect(total).toBeCloseTo(378967.49, 2);
  });
});
