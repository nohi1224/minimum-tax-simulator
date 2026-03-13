import { describe, it, expect } from "vitest";
import {
  calcAllTaxes,
  calcSalaryIncome,
  calcProgressiveTax,
  MT_BEFORE,
  MT_AFTER,
  type TaxInput,
} from "./taxEngine";

/**
 * テストケースはPython検証スクリプト（verify_calc.py）の出力と完全に一致することを確認。
 * 許容誤差: 1万円（四捨五入の差異を吸収）
 */
const TOLERANCE = 1;

function approx(actual: number, expected: number) {
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(TOLERANCE);
}

describe("taxEngine", () => {
  describe("給与所得控除", () => {
    it("給与収入3,000万円 → 給与所得2,805万円", () => {
      expect(calcSalaryIncome(3000)).toBe(2805);
    });
    it("給与収入0 → 給与所得0", () => {
      expect(calcSalaryIncome(0)).toBe(0);
    });
  });

  describe("TC1: 株式譲渡のみ 5億円", () => {
    const input: TaxInput = { stockPrice: 50000, stockCost: 0 };

    it("改正前: MT発動なし, 手取り 3億9,883万円", () => {
      const r = calcAllTaxes(input, MT_BEFORE);
      expect(r.mtTriggered).toBe(false);
      approx(r.maNet, 39883);
      approx(r.effectiveRateMA, 20.23);
    });

    it("改正後: MT発動, 追加税額 2,580万円", () => {
      const r = calcAllTaxes(input, MT_AFTER);
      expect(r.mtTriggered).toBe(true);
      approx(r.mtAdditional, 2580);
      approx(r.maNet, 37249);
      approx(r.effectiveRateMA, 25.50);
    });
  });

  describe("TC2: 株式譲渡のみ 10億円", () => {
    const input: TaxInput = { stockPrice: 100000, stockCost: 0 };

    it("改正前: MT発動（僅少）, 手取り 7億9,618万円", () => {
      const r = calcAllTaxes(input, MT_BEFORE);
      expect(r.mtTriggered).toBe(true);
      approx(r.mtAdditional, 105);
      approx(r.maNet, 79618);
    });

    it("改正後: MT大幅発動, 追加税額 1億80万円, 手取り 6億9,434万円", () => {
      const r = calcAllTaxes(input, MT_AFTER);
      expect(r.mtTriggered).toBe(true);
      approx(r.mtAdditional, 10080);
      approx(r.maNet, 69434);
      approx(r.effectiveRateMA, 30.57);
    });

    it("増税額: 約1億184万円", () => {
      const before = calcAllTaxes(input, MT_BEFORE);
      const after = calcAllTaxes(input, MT_AFTER);
      const diff = after.stockTotalTax - before.stockTotalTax;
      approx(diff, 10184);
    });
  });

  describe("TC3: 株式譲渡のみ 3億円（発動閾値以下）", () => {
    const input: TaxInput = { stockPrice: 30000, stockCost: 0 };

    it("改正前・改正後ともMT発動なし", () => {
      const before = calcAllTaxes(input, MT_BEFORE);
      const after = calcAllTaxes(input, MT_AFTER);
      expect(before.mtTriggered).toBe(false);
      expect(after.mtTriggered).toBe(false);
    });

    it("改正前後で手取り同一（影響なし）", () => {
      const before = calcAllTaxes(input, MT_BEFORE);
      const after = calcAllTaxes(input, MT_AFTER);
      approx(before.maNet, after.maNet);
    });
  });

  describe("TC4: 給与3,000万円 + 株式譲渡10億円", () => {
    const input: TaxInput = {
      stockPrice: 100000,
      stockCost: 0,
      salaryRevenue: 3000,
    };

    it("改正前: MT発動なし（累進税率で基準所得税額が高い）", () => {
      const r = calcAllTaxes(input, MT_BEFORE);
      expect(r.mtTriggered).toBe(false);
    });

    it("改正後: MT発動, 追加税額 約1億129万円", () => {
      const r = calcAllTaxes(input, MT_AFTER);
      expect(r.mtTriggered).toBe(true);
      approx(r.mtAdditional, 10129);
    });
  });

  describe("TC5: 境界値テスト", () => {
    it("改正後: 3.2億円で発動なし", () => {
      const r = calcAllTaxes({ stockPrice: 32000, stockCost: 0 }, MT_AFTER);
      expect(r.mtTriggered).toBe(false);
    });

    it("改正後: 3.3億円で発動（閾値）", () => {
      const r = calcAllTaxes({ stockPrice: 33000, stockCost: 0 }, MT_AFTER);
      expect(r.mtTriggered).toBe(true);
      approx(r.mtAdditional, 30);
    });

    it("改正前: 9.8億円で発動なし", () => {
      const r = calcAllTaxes({ stockPrice: 98000, stockCost: 0 }, MT_BEFORE);
      expect(r.mtTriggered).toBe(false);
    });

    it("改正前: 9.9億円で発動", () => {
      const r = calcAllTaxes({ stockPrice: 99000, stockCost: 0 }, MT_BEFORE);
      expect(r.mtTriggered).toBe(true);
    });
  });

  describe("TC6: 分割売却（10億円 50:50）", () => {
    it("2年間合計の税額を正しく算出", () => {
      const y1 = calcAllTaxes({ stockPrice: 50000, stockCost: 0 }, MT_BEFORE);
      const y2 = calcAllTaxes({ stockPrice: 50000, stockCost: 0 }, MT_AFTER);

      expect(y1.mtTriggered).toBe(false); // 1年目: MT発動なし
      expect(y2.mtTriggered).toBe(true);  // 2年目: MT発動

      const totalNet = y1.maNet + y2.maNet;
      approx(totalNet, 77132);
    });
  });

  describe("TC7: 取得価額の影響", () => {
    it("取得価額1億円の場合、譲渡所得が減少", () => {
      const withCost = calcAllTaxes({ stockPrice: 100000, stockCost: 10000 }, MT_AFTER);
      const noCost = calcAllTaxes({ stockPrice: 100000, stockCost: 0 }, MT_AFTER);
      expect(withCost.stockTransferIncome).toBe(90000);
      expect(withCost.totalTax).toBeLessThan(noCost.totalTax);
    });
  });
});
