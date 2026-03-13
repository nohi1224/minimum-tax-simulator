/**
 * ミニマムタックス 計算エンジン
 * ================================
 * 令和8年度税制改正大綱に基づく計算ロジック。
 * Python検証スクリプト（verify_calc.py）で全テストケース検証済み。
 *
 * 単位: 全て「万円」で統一
 */

// ─── 定数 ───

/** 所得税 累進税率テーブル（総合課税） [上限, 税率, 控除額] */
const PROGRESSIVE_TAX_TABLE: [number, number, number][] = [
  [195, 0.05, 0],
  [330, 0.10, 9.75],
  [695, 0.20, 42.75],
  [900, 0.23, 63.6],
  [1800, 0.33, 153.6],
  [4000, 0.40, 279.6],
  [Infinity, 0.45, 479.6],
];

/** 給与所得控除テーブル（令和8年分〜） [上限, 率, 加算額] */
const SALARY_DEDUCTION_TABLE: [number, number, number][] = [
  [162.5, 0, 55],
  [180, 0.40, -10],
  [360, 0.30, 8],
  [660, 0.20, 44],
  [850, 0.10, 110],
  [Infinity, 0, 195],
];

/** 分離課税 所得税率 */
export const SEPARATE_INCOME_TAX_RATE = 0.15;
/** 分離課税 住民税率 */
export const SEPARATE_RESIDENT_TAX_RATE = 0.05;
/** 総合課税 住民税率 */
export const COMPREHENSIVE_RESIDENT_TAX_RATE = 0.10;
/** 復興特別所得税率（防衛特別所得税との合算維持を前提） */
export const RECONSTRUCTION_TAX_RATE = 0.021;

/** ミニマムタックスパラメータ */
export interface MinimumTaxParams {
  threshold: number; // 特別控除額（万円）
  rate: number;      // 税率
  label: string;     // 表示ラベル
}

export const MT_BEFORE: MinimumTaxParams = {
  threshold: 33000,
  rate: 0.225,
  label: "改正前（〜2026年）",
};

export const MT_AFTER: MinimumTaxParams = {
  threshold: 16500,
  rate: 0.30,
  label: "改正後（2027年〜）",
};

// ─── 入力型 ───

export interface TaxInput {
  /** 株式譲渡価額（万円） */
  stockPrice: number;
  /** 株式取得価額（万円） */
  stockCost: number;
  /** 給与収入（万円） */
  salaryRevenue?: number;
  /** その他の総合課税所得（万円） */
  otherComprehensiveIncome?: number;
  /** 上場株式譲渡所得（万円） */
  listedStockTransferIncome?: number;
  /** 上場株式配当所得（万円） */
  listedStockDividendIncome?: number;
  /** 所得控除合計（万円） */
  incomeDeductions?: number;
}

// ─── 出力型 ───

export interface TaxResult {
  // 所得計算
  stockTransferIncome: number;
  salaryIncome: number;
  totalComprehensive: number;
  kijunShotoku: number; // 基準所得金額

  // 通常の所得税
  comprehensiveTaxable: number;
  separateTaxable: number;
  comprehensiveTax: number;
  separateTax: number;
  kijunTax: number; // 基準所得税額

  // ミニマムタックス
  mtBenchmark: number;
  mtAdditional: number;
  mtTriggered: boolean;

  // 税額
  totalIncomeTax: number;
  reconstructionTax: number;
  residentComprehensive: number;
  residentSeparate: number;
  totalResidentTax: number;
  totalTax: number;

  // M&A手取り
  stockTotalTax: number;
  maNet: number;
  effectiveRateMA: number;

  // 年間総合
  effectiveRateTotal: number;
}

// ─── 計算関数 ───

/** 給与所得控除額を計算 */
export function calcSalaryDeduction(salaryRevenue: number): number {
  if (salaryRevenue <= 0) return 0;
  for (const [upper, rate, add] of SALARY_DEDUCTION_TABLE) {
    if (salaryRevenue <= upper) {
      return rate === 0 ? add : salaryRevenue * rate + add;
    }
  }
  return 195;
}

/** 給与収入 → 給与所得 */
export function calcSalaryIncome(salaryRevenue: number): number {
  if (salaryRevenue <= 0) return 0;
  return Math.max(0, salaryRevenue - calcSalaryDeduction(salaryRevenue));
}

/** 総合課税の所得税額（累進税率） */
export function calcProgressiveTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  for (const [upper, rate, deduction] of PROGRESSIVE_TAX_TABLE) {
    if (taxableIncome <= upper) {
      return taxableIncome * rate - deduction;
    }
  }
  return taxableIncome * 0.45 - 479.6;
}

/**
 * 全税額を一括計算する。
 * Python検証スクリプトと完全に同一のロジック。
 */
export function calcAllTaxes(input: TaxInput, mt: MinimumTaxParams): TaxResult {
  // Step 1: 各所得の計算
  const stockTransferIncome = Math.max(0, input.stockPrice - input.stockCost);
  const salaryIncome = calcSalaryIncome(input.salaryRevenue ?? 0);
  const otherIncome = input.otherComprehensiveIncome ?? 0;
  const listedTransfer = input.listedStockTransferIncome ?? 0;
  const listedDividend = input.listedStockDividendIncome ?? 0;
  const deductions = input.incomeDeductions ?? 200;

  const totalComprehensive = salaryIncome + otherIncome;

  // Step 2: 基準所得金額
  const kijunShotoku =
    totalComprehensive + stockTransferIncome + listedTransfer + listedDividend;

  // Step 3: 通常の所得税額
  const comprehensiveTaxable = Math.max(0, totalComprehensive - deductions);
  const remainingDeduction = Math.max(0, deductions - totalComprehensive);
  const comprehensiveTax = calcProgressiveTax(comprehensiveTaxable);

  const totalSeparate = stockTransferIncome + listedTransfer + listedDividend;
  const separateTaxable = Math.max(0, totalSeparate - remainingDeduction);
  const separateTax = separateTaxable * SEPARATE_INCOME_TAX_RATE;

  const kijunTax = comprehensiveTax + separateTax;

  // Step 4: ミニマムタックス
  const mtBenchmark = (kijunShotoku - mt.threshold) * mt.rate;
  const mtAdditional = Math.max(0, mtBenchmark - kijunTax);
  const mtTriggered = mtAdditional > 0;

  // Step 5: 所得税合計
  const totalIncomeTax = kijunTax + mtAdditional;

  // Step 6: 復興特別所得税
  const reconstructionTax = totalIncomeTax * RECONSTRUCTION_TAX_RATE;

  // Step 7: 住民税
  const residentComprehensive =
    Math.max(0, totalComprehensive - deductions) * COMPREHENSIVE_RESIDENT_TAX_RATE;
  const residentSeparate =
    Math.max(0, totalSeparate - remainingDeduction) * SEPARATE_RESIDENT_TAX_RATE;
  const totalResidentTax = residentComprehensive + residentSeparate;

  // Step 8: 税額合計
  const totalTax = totalIncomeTax + reconstructionTax + totalResidentTax;

  // M&A手取り計算（株式譲渡に帰属する税額の按分）
  const stockRatio =
    kijunShotoku > 0 && stockTransferIncome > 0
      ? stockTransferIncome / kijunShotoku
      : 0;

  let stockIncomeTax = stockTransferIncome * SEPARATE_INCOME_TAX_RATE;
  if (remainingDeduction > 0) {
    const deductionForStock = Math.min(remainingDeduction, stockTransferIncome);
    stockIncomeTax =
      Math.max(0, stockTransferIncome - deductionForStock) * SEPARATE_INCOME_TAX_RATE;
  }

  const stockMTAdditional = mtTriggered ? mtAdditional * stockRatio : 0;
  const stockTotalIncomeTax = stockIncomeTax + stockMTAdditional;
  const stockReconstructionTax = stockTotalIncomeTax * RECONSTRUCTION_TAX_RATE;

  let stockResidentTax = stockTransferIncome * SEPARATE_RESIDENT_TAX_RATE;
  if (remainingDeduction > 0) {
    const deductionForStock = Math.min(remainingDeduction, stockTransferIncome);
    stockResidentTax =
      Math.max(0, stockTransferIncome - deductionForStock) * SEPARATE_RESIDENT_TAX_RATE;
  }

  const stockTotalTax =
    stockTotalIncomeTax + stockReconstructionTax + stockResidentTax;
  const maNet = input.stockPrice - stockTotalTax;

  // 実効税率
  const effectiveRateMA =
    input.stockPrice > 0 ? (stockTotalTax / input.stockPrice) * 100 : 0;
  const effectiveRateTotal =
    kijunShotoku > 0 ? (totalTax / kijunShotoku) * 100 : 0;

  return {
    stockTransferIncome,
    salaryIncome,
    totalComprehensive,
    kijunShotoku,
    comprehensiveTaxable,
    separateTaxable,
    comprehensiveTax,
    separateTax,
    kijunTax,
    mtBenchmark,
    mtAdditional,
    mtTriggered,
    totalIncomeTax,
    reconstructionTax,
    residentComprehensive,
    residentSeparate,
    totalResidentTax,
    totalTax,
    stockTotalTax,
    maNet,
    effectiveRateMA,
    effectiveRateTotal,
  };
}

// ─── フォーマットユーティリティ ───

/** 金額を「○億○,○○○万円」形式で表示 */
export function formatOkuMan(value: number): string {
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 10000) {
    const oku = Math.floor(abs / 10000);
    const man = Math.round(abs % 10000);
    return `${sign}${oku}億${man.toLocaleString()}万円`;
  }
  return `${sign}${Math.round(abs).toLocaleString()}万円`;
}

/** 短縮表示（チャートラベル用） */
export function formatOku(value: number): string {
  if (Math.abs(value) >= 10000) return `${(value / 10000).toFixed(1)}億`;
  return `${Math.round(value).toLocaleString()}万`;
}

/** パーセント表示 */
export function formatPercent(value: number): string {
  return `${value.toFixed(2)}%`;
}
