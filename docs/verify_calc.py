#!/usr/bin/env python3
"""
ミニマムタックス M&Aシミュレーション 計算ロジック検証スクリプト
=================================================================
令和8年度税制改正大綱に基づく計算ロジックを全テストケースで検証する。

単位: 全て「万円」で統一（内部計算・出力とも）
"""

# =============================================================
# 定数定義
# =============================================================

# 所得税 累進税率テーブル（総合課税）
PROGRESSIVE_TAX_TABLE = [
    (195,    0.05, 0),
    (330,    0.10, 9.75),
    (695,    0.20, 42.75),
    (900,    0.23, 63.6),
    (1800,   0.33, 153.6),
    (4000,   0.40, 279.6),
    (float('inf'), 0.45, 479.6),
]

# 給与所得控除テーブル（令和8年分〜）
SALARY_DEDUCTION_TABLE = [
    (162.5,  0, 55),      # 〜162.5万円: 55万円
    (180,    0.40, -10),   # 162.5超〜180万円: 収入×40%-10万円
    (360,    0.30, 8),     # 180超〜360万円: 収入×30%+8万円
    (660,    0.20, 44),    # 360超〜660万円: 収入×20%+44万円
    (850,    0.10, 110),   # 660超〜850万円: 収入×10%+110万円
    (float('inf'), 0, 195),# 850万円超: 上限195万円
]

# 分離課税税率
SEPARATE_INCOME_TAX_RATE = 0.15       # 所得税 15%
SEPARATE_RESIDENT_TAX_RATE = 0.05     # 住民税 5%
COMPREHENSIVE_RESIDENT_TAX_RATE = 0.10 # 住民税（総合課税）10%

# 復興特別所得税
RECONSTRUCTION_TAX_RATE = 0.021       # 2.1%

# ミニマムタックス パラメータ
MT_CURRENT = {"threshold": 33000, "rate": 0.225, "label": "改正前（〜2026年）"}
MT_REFORMED = {"threshold": 16500, "rate": 0.30, "label": "改正後（2027年〜）"}


# =============================================================
# 計算関数
# =============================================================

def calc_salary_deduction(salary_revenue):
    """給与所得控除額を計算"""
    if salary_revenue <= 0:
        return 0
    for upper, rate, add in SALARY_DEDUCTION_TABLE:
        if salary_revenue <= upper:
            if rate == 0:
                return add
            return salary_revenue * rate + add
    return 195  # 上限


def calc_salary_income(salary_revenue):
    """給与収入 → 給与所得"""
    if salary_revenue <= 0:
        return 0
    deduction = calc_salary_deduction(salary_revenue)
    return max(0, salary_revenue - deduction)


def calc_progressive_tax(taxable_income):
    """総合課税の所得税額（累進税率）"""
    if taxable_income <= 0:
        return 0
    for upper, rate, deduction in PROGRESSIVE_TAX_TABLE:
        if taxable_income <= upper:
            return taxable_income * rate - deduction
    # Should not reach here
    return taxable_income * 0.45 - 479.6


def calc_all_taxes(params, mt_params):
    """
    全税額を一括計算する。

    params: dict
        - stock_transfer_price: 株式譲渡価額（万円）
        - stock_acquisition_cost: 株式取得価額（万円）
        - salary_revenue: 給与収入（万円）
        - other_comprehensive_income: その他総合課税所得（万円）
        - listed_stock_transfer_income: 上場株式譲渡所得（万円）
        - listed_stock_dividend_income: 上場株式配当所得（万円）
        - income_deductions: 所得控除合計（万円）

    mt_params: dict (MT_CURRENT or MT_REFORMED)

    returns: dict with all calculation results
    """
    # --- Step 1: 各所得の計算 ---
    stock_transfer_income = max(0, params.get("stock_transfer_price", 0) 
                                  - params.get("stock_acquisition_cost", 0))
    salary_income = calc_salary_income(params.get("salary_revenue", 0))
    other_income = params.get("other_comprehensive_income", 0)
    listed_transfer = params.get("listed_stock_transfer_income", 0)
    listed_dividend = params.get("listed_stock_dividend_income", 0)
    income_deductions = params.get("income_deductions", 200)

    # 総合課税所得の合計
    total_comprehensive = salary_income + other_income

    # --- Step 2: 基準所得金額（ミニマムタックス判定用）---
    # 所得控除前の全所得合計
    kijun_shotoku = (total_comprehensive + stock_transfer_income 
                     + listed_transfer + listed_dividend)

    # --- Step 3: 通常の所得税額の計算 ---
    
    # (A) 総合課税部分
    # 所得控除は総合課税所得から優先適用
    comprehensive_taxable = max(0, total_comprehensive - income_deductions)
    remaining_deduction = max(0, income_deductions - total_comprehensive)
    
    comprehensive_tax = calc_progressive_tax(comprehensive_taxable)

    # (B) 分離課税部分
    # 総合課税で引ききれなかった所得控除を分離課税所得から控除
    total_separate = stock_transfer_income + listed_transfer + listed_dividend
    separate_taxable = max(0, total_separate - remaining_deduction)
    separate_tax = separate_taxable * SEPARATE_INCOME_TAX_RATE

    # (C) 基準所得税額
    kijun_tax = comprehensive_tax + separate_tax

    # --- Step 4: ミニマムタックスの計算 ---
    mt_benchmark = (kijun_shotoku - mt_params["threshold"]) * mt_params["rate"]
    mt_additional = max(0, mt_benchmark - kijun_tax)

    # ミニマムタックス発動フラグ
    mt_triggered = mt_additional > 0

    # --- Step 5: 所得税合計 ---
    total_income_tax = kijun_tax + mt_additional

    # --- Step 6: 復興特別所得税 ---
    reconstruction_tax = total_income_tax * RECONSTRUCTION_TAX_RATE

    # --- Step 7: 住民税 ---
    # 総合課税分
    resident_comprehensive = max(0, total_comprehensive - income_deductions) * COMPREHENSIVE_RESIDENT_TAX_RATE
    # 分離課税分（住民税は所得控除の残りを適用）
    resident_separate = max(0, total_separate - remaining_deduction) * SEPARATE_RESIDENT_TAX_RATE
    total_resident_tax = resident_comprehensive + resident_separate

    # --- Step 8: 税額合計と手取り ---
    total_tax = total_income_tax + reconstruction_tax + total_resident_tax
    
    # M&A手取りモード: 株式譲渡に帰属する税額
    if kijun_shotoku > 0 and stock_transfer_income > 0:
        stock_ratio = stock_transfer_income / kijun_shotoku
    else:
        stock_ratio = 0
    
    # 株式譲渡に帰属する税額の按分計算
    stock_income_tax = stock_transfer_income * SEPARATE_INCOME_TAX_RATE  # 通常の所得税
    # 所得控除の影響を反映（残余控除が分離課税に適用された場合）
    if remaining_deduction > 0:
        deduction_for_stock = min(remaining_deduction, stock_transfer_income)
        stock_income_tax = max(0, stock_transfer_income - deduction_for_stock) * SEPARATE_INCOME_TAX_RATE
    
    stock_mt_additional = mt_additional * stock_ratio if mt_triggered else 0
    stock_total_income_tax = stock_income_tax + stock_mt_additional
    stock_reconstruction = stock_total_income_tax * RECONSTRUCTION_TAX_RATE
    stock_resident = stock_transfer_income * SEPARATE_RESIDENT_TAX_RATE
    if remaining_deduction > 0:
        stock_resident = max(0, stock_transfer_income - min(remaining_deduction, stock_transfer_income)) * SEPARATE_RESIDENT_TAX_RATE
    stock_total_tax = stock_total_income_tax + stock_reconstruction + stock_resident
    
    stock_price = params.get("stock_transfer_price", 0)
    ma_net = stock_price - stock_total_tax  # M&A手取り
    
    # 年間総合モード
    total_income = stock_price + params.get("salary_revenue", 0) + other_income + listed_transfer + listed_dividend
    annual_net = total_income - total_tax  # 年間総合手取り

    # 実効税率
    effective_rate_ma = (stock_total_tax / stock_price * 100) if stock_price > 0 else 0
    effective_rate_total = (total_tax / kijun_shotoku * 100) if kijun_shotoku > 0 else 0

    return {
        "stock_transfer_income": stock_transfer_income,
        "salary_income": salary_income,
        "total_comprehensive": total_comprehensive,
        "kijun_shotoku": kijun_shotoku,
        "comprehensive_taxable": comprehensive_taxable,
        "separate_taxable": separate_taxable,
        "comprehensive_tax": comprehensive_tax,
        "separate_tax": separate_tax,
        "kijun_tax": kijun_tax,
        "mt_benchmark": mt_benchmark,
        "mt_additional": mt_additional,
        "mt_triggered": mt_triggered,
        "total_income_tax": total_income_tax,
        "reconstruction_tax": reconstruction_tax,
        "resident_comprehensive": resident_comprehensive,
        "resident_separate": resident_separate,
        "total_resident_tax": total_resident_tax,
        "total_tax": total_tax,
        "stock_total_tax": stock_total_tax,
        "ma_net": ma_net,
        "annual_net": annual_net,
        "effective_rate_ma": effective_rate_ma,
        "effective_rate_total": effective_rate_total,
        "remaining_deduction": remaining_deduction,
    }


def format_oku_man(value):
    """金額を「○億○,○○○万円」形式で表示"""
    abs_val = abs(value)
    sign = "-" if value < 0 else ""
    if abs_val >= 10000:
        oku = int(abs_val // 10000)
        man = abs_val % 10000
        return f"{sign}{oku}億{man:,.0f}万円"
    else:
        return f"{value:,.1f}万円"


def print_result(label, params, result, mt_params):
    """結果を見やすく表示"""
    print(f"\n{'─'*70}")
    print(f"  {label}")
    print(f"  制度: {mt_params['label']}")
    print(f"{'─'*70}")
    
    print(f"\n  【入力条件】")
    print(f"    株式譲渡価額:     {format_oku_man(params.get('stock_transfer_price', 0))}")
    print(f"    株式取得価額:     {format_oku_man(params.get('stock_acquisition_cost', 0))}")
    if params.get("salary_revenue", 0) > 0:
        print(f"    給与収入:         {format_oku_man(params.get('salary_revenue', 0))}")
    print(f"    所得控除合計:     {format_oku_man(params.get('income_deductions', 200))}")
    
    print(f"\n  【所得計算】")
    print(f"    株式譲渡所得:     {format_oku_man(result['stock_transfer_income'])}")
    if result['salary_income'] > 0:
        print(f"    給与所得:         {format_oku_man(result['salary_income'])}")
    print(f"    基準所得金額:     {format_oku_man(result['kijun_shotoku'])}")
    
    print(f"\n  【通常の所得税】")
    if result['comprehensive_tax'] > 0:
        print(f"    総合課税分:       {format_oku_man(result['comprehensive_tax'])}")
    print(f"    分離課税分:       {format_oku_man(result['separate_tax'])}")
    print(f"    基準所得税額:     {format_oku_man(result['kijun_tax'])}")
    
    print(f"\n  【ミニマムタックス判定】")
    print(f"    (基準所得金額 - {format_oku_man(mt_params['threshold'])}) × {mt_params['rate']*100}%")
    print(f"    = {format_oku_man(result['mt_benchmark'])}")
    print(f"    基準所得税額との差額: {format_oku_man(result['mt_benchmark'] - result['kijun_tax'])}")
    status = "★ 発動 → 追加税額 " + format_oku_man(result['mt_additional']) if result['mt_triggered'] else "発動なし"
    print(f"    判定: {status}")
    
    print(f"\n  【税額合計】")
    print(f"    所得税合計:       {format_oku_man(result['total_income_tax'])}")
    print(f"    復興特別所得税:   {format_oku_man(result['reconstruction_tax'])}")
    print(f"    住民税:           {format_oku_man(result['total_resident_tax'])}")
    print(f"    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(f"    税額合計:         {format_oku_man(result['total_tax'])}")
    
    print(f"\n  【手取り額】")
    print(f"    M&A手取り:        {format_oku_man(result['ma_net'])}  （実効税率 {result['effective_rate_ma']:.2f}%）")
    if result['salary_income'] > 0:
        print(f"    年間総合手取り:   {format_oku_man(result['annual_net'])}")
    
    return result


def run_comparison(label, params, show_diff=True):
    """改正前・改正後を比較表示"""
    print(f"\n{'═'*70}")
    print(f"  📊 {label}")
    print(f"{'═'*70}")
    
    r_before = print_result(label + "（改正前）", params, 
                            calc_all_taxes(params, MT_CURRENT), MT_CURRENT)
    r_after = print_result(label + "（改正後）", params, 
                           calc_all_taxes(params, MT_REFORMED), MT_REFORMED)
    
    if show_diff:
        print(f"\n{'─'*70}")
        print(f"  📈 差額サマリー（改正後 − 改正前）")
        print(f"{'─'*70}")
        diff_mt = r_after['mt_additional'] - r_before['mt_additional']
        diff_tax = r_after['total_tax'] - r_before['total_tax']
        diff_net = r_after['ma_net'] - r_before['ma_net']
        diff_rate = r_after['effective_rate_ma'] - r_before['effective_rate_ma']
        
        print(f"    追加税額の増加:     +{format_oku_man(diff_mt)}")
        print(f"    税額合計の増加:     +{format_oku_man(diff_tax)}")
        print(f"    M&A手取りの減少:    {format_oku_man(diff_net)}")
        print(f"    実効税率の上昇:     +{diff_rate:.2f}ポイント")
    
    return r_before, r_after


# =============================================================
# テストケース実行
# =============================================================

print("=" * 70)
print("  ミニマムタックス M&Aシミュレーション 計算ロジック検証")
print("  令和8年度税制改正大綱に基づく")
print("=" * 70)

# --- テストケース1: 株式譲渡のみ・5億円 ---
tc1 = {"stock_transfer_price": 50000, "stock_acquisition_cost": 0, "income_deductions": 200}
run_comparison("テストケース1: 株式譲渡のみ 5億円", tc1)

# --- テストケース2: 株式譲渡のみ・10億円 ---
tc2 = {"stock_transfer_price": 100000, "stock_acquisition_cost": 0, "income_deductions": 200}
run_comparison("テストケース2: 株式譲渡のみ 10億円", tc2)

# --- テストケース3: 株式譲渡のみ・3億円 ---
tc3 = {"stock_transfer_price": 30000, "stock_acquisition_cost": 0, "income_deductions": 200}
run_comparison("テストケース3: 株式譲渡のみ 3億円", tc3)

# --- テストケース4: 複合所得（給与3,000万円 + 株式譲渡10億円）---
tc4 = {"stock_transfer_price": 100000, "stock_acquisition_cost": 0, 
       "salary_revenue": 3000, "income_deductions": 200}
run_comparison("テストケース4: 給与3,000万円 + 株式譲渡10億円", tc4)

# --- テストケース5: 境界値テスト ---
print(f"\n{'═'*70}")
print(f"  📊 テストケース5: 境界値テスト（ミニマムタックス発動閾値の検証）")
print(f"{'═'*70}")

print(f"\n  改正後の発動閾値を探索（株式譲渡のみ、所得控除200万円）:")
for amount in [32000, 32500, 33000, 33500, 34000, 35000]:
    params = {"stock_transfer_price": amount, "stock_acquisition_cost": 0, "income_deductions": 200}
    r = calc_all_taxes(params, MT_REFORMED)
    trigger = "★発動" if r['mt_triggered'] else "  ─  "
    print(f"    譲渡所得 {format_oku_man(amount):>14}  → 追加税額 {r['mt_additional']:>10.1f}万円  {trigger}  実効税率 {r['effective_rate_ma']:.2f}%")

print(f"\n  改正前の発動閾値を探索（同条件）:")
for amount in [95000, 98000, 99000, 100000, 105000]:
    params = {"stock_transfer_price": amount, "stock_acquisition_cost": 0, "income_deductions": 200}
    r = calc_all_taxes(params, MT_CURRENT)
    trigger = "★発動" if r['mt_triggered'] else "  ─  "
    print(f"    譲渡所得 {format_oku_man(amount):>14}  → 追加税額 {r['mt_additional']:>10.1f}万円  {trigger}  実効税率 {r['effective_rate_ma']:.2f}%")


# --- テストケース6: 分割売却 ---
print(f"\n{'═'*70}")
print(f"  📊 テストケース6: 分割売却シミュレーション（10億円、50:50分割）")
print(f"{'═'*70}")

total_price = 100000
split_ratio = 0.50

# シナリオA: 2026年に全量売却（改正前）
scA = {"stock_transfer_price": total_price, "stock_acquisition_cost": 0, "income_deductions": 200}
rA = calc_all_taxes(scA, MT_CURRENT)
print(f"\n  シナリオA: 2026年に全量売却（改正前適用）")
print(f"    税額合計: {format_oku_man(rA['total_tax'])}")
print(f"    手取り:   {format_oku_man(rA['ma_net'])}  （実効税率 {rA['effective_rate_ma']:.2f}%）")

# シナリオB: 2027年に全量売却（改正後）
rB = calc_all_taxes(scA, MT_REFORMED)
print(f"\n  シナリオB: 2027年に全量売却（改正後適用）")
print(f"    税額合計: {format_oku_man(rB['total_tax'])}")
print(f"    手取り:   {format_oku_man(rB['ma_net'])}  （実効税率 {rB['effective_rate_ma']:.2f}%）")

# シナリオC: 分割（2026年にX%、2027年に残り）
y1_price = total_price * split_ratio
y2_price = total_price * (1 - split_ratio)
scC1 = {"stock_transfer_price": y1_price, "stock_acquisition_cost": 0, "income_deductions": 200}
scC2 = {"stock_transfer_price": y2_price, "stock_acquisition_cost": 0, "income_deductions": 200}
rC1 = calc_all_taxes(scC1, MT_CURRENT)
rC2 = calc_all_taxes(scC2, MT_REFORMED)
total_tax_C = rC1['total_tax'] + rC2['total_tax']
total_net_C = rC1['ma_net'] + rC2['ma_net']
effective_C = total_tax_C / total_price * 100

print(f"\n  シナリオC: 分割売却（2026年に50%、2027年に50%）")
print(f"    1年目（2026年、改正前）:")
print(f"      譲渡額: {format_oku_man(y1_price)}  税額: {format_oku_man(rC1['total_tax'])}  MT発動: {'あり' if rC1['mt_triggered'] else 'なし'}")
print(f"    2年目（2027年、改正後）:")
print(f"      譲渡額: {format_oku_man(y2_price)}  税額: {format_oku_man(rC2['total_tax'])}  MT発動: {'あり' if rC2['mt_triggered'] else 'なし'}")
print(f"    ────────────────────────────────────")
print(f"    2年間合計税額: {format_oku_man(total_tax_C)}")
print(f"    2年間合計手取り: {format_oku_man(total_net_C)}  （実効税率 {effective_C:.2f}%）")

print(f"\n  【3シナリオ比較サマリー】")
print(f"  {'':>30} {'税額合計':>14} {'手取り合計':>14} {'実効税率':>8}")
print(f"  {'─'*70}")
print(f"  {'A: 2026年全量売却':>30} {format_oku_man(rA['total_tax']):>14} {format_oku_man(rA['ma_net']):>14} {rA['effective_rate_ma']:>7.2f}%")
print(f"  {'B: 2027年全量売却':>30} {format_oku_man(rB['total_tax']):>14} {format_oku_man(rB['ma_net']):>14} {rB['effective_rate_ma']:>7.2f}%")
print(f"  {'C: 50:50分割':>30} {format_oku_man(total_tax_C):>14} {format_oku_man(total_net_C):>14} {effective_C:>7.2f}%")
print(f"  {'─'*70}")
print(f"  {'Aとの差額（B）':>30} {format_oku_man(rB['total_tax'] - rA['total_tax']):>14} {format_oku_man(rB['ma_net'] - rA['ma_net']):>14}")
print(f"  {'Aとの差額（C）':>30} {format_oku_man(total_tax_C - rA['total_tax']):>14} {format_oku_man(total_net_C - rA['ma_net']):>14}")


# --- 最適分割比率チャートデータ ---
print(f"\n  【分割比率 vs 2年間合計税額】（10億円の場合）")
print(f"  {'2026年比率':>10} {'2026年税額':>12} {'2027年税額':>12} {'合計税額':>12} {'合計手取り':>12} {'実効税率':>8}")
print(f"  {'─'*70}")

best_ratio = 0
best_net = 0
for pct in range(0, 101, 10):
    r = pct / 100
    p1 = {"stock_transfer_price": total_price * r, "stock_acquisition_cost": 0, "income_deductions": 200}
    p2 = {"stock_transfer_price": total_price * (1-r), "stock_acquisition_cost": 0, "income_deductions": 200}
    r1 = calc_all_taxes(p1, MT_CURRENT)
    r2 = calc_all_taxes(p2, MT_REFORMED)
    ttax = r1['total_tax'] + r2['total_tax']
    tnet = r1['ma_net'] + r2['ma_net']
    erate = ttax / total_price * 100 if total_price > 0 else 0
    print(f"  {pct:>8}%  {r1['total_tax']:>11.1f}  {r2['total_tax']:>11.1f}  {ttax:>11.1f}  {tnet:>11.1f}  {erate:>7.2f}%")
    if tnet > best_net:
        best_net = tnet
        best_ratio = pct

print(f"\n  → 最適分割比率: 2026年に{best_ratio}%売却（手取り最大: {format_oku_man(best_net)}）")


# --- テストケース7: 手取り額モード切替 ---
print(f"\n{'═'*70}")
print(f"  📊 テストケース7: 手取り額モード切替の検証")
print(f"{'═'*70}")

tc7 = {"stock_transfer_price": 100000, "stock_acquisition_cost": 0, 
       "salary_revenue": 3000, "income_deductions": 200}
r7 = calc_all_taxes(tc7, MT_REFORMED)

print(f"\n  入力: 給与3,000万円 + 株式譲渡10億円（改正後）")
print(f"\n  【M&A手取りモード】")
print(f"    株式譲渡価額:      {format_oku_man(100000)}")
print(f"    株式譲渡帰属税額:  {format_oku_man(r7['stock_total_tax'])}")
print(f"    M&A手取り:         {format_oku_man(r7['ma_net'])}")
print(f"    実効税率:          {r7['effective_rate_ma']:.2f}%")

total_revenue = 100000 + 3000
print(f"\n  【年間総合モード】")
print(f"    年間総収入:        {format_oku_man(total_revenue)}")
print(f"    年間税額合計:      {format_oku_man(r7['total_tax'])}")
print(f"    年間手取り:        {format_oku_man(r7['annual_net'])}")
print(f"    総合実効税率:      {r7['effective_rate_total']:.2f}%")


# --- 感応度テーブル ---
print(f"\n{'═'*70}")
print(f"  📊 感応度テーブル（株式譲渡のみ、取得価額0、所得控除200万円）")
print(f"{'═'*70}")

amounts = [10000, 20000, 30000, 50000, 100000, 200000, 500000]
print(f"\n  {'譲渡額':>10} │ {'改正前税額':>11} {'改正前手取':>12} {'改正前税率':>8} │ {'改正後税額':>11} {'改正後手取':>12} {'改正後税率':>8} │ {'税額増加':>10}")
print(f"  {'─'*110}")

for amt in amounts:
    p = {"stock_transfer_price": amt, "stock_acquisition_cost": 0, "income_deductions": 200}
    rb = calc_all_taxes(p, MT_CURRENT)
    ra = calc_all_taxes(p, MT_REFORMED)
    diff = ra['total_tax'] - rb['total_tax']
    print(f"  {format_oku_man(amt):>10} │ {rb['total_tax']:>10.1f} {rb['ma_net']:>11.1f} {rb['effective_rate_ma']:>7.2f}% │ {ra['total_tax']:>10.1f} {ra['ma_net']:>11.1f} {ra['effective_rate_ma']:>7.2f}% │ {diff:>9.1f}")


print(f"\n{'═'*70}")
print(f"  検証完了")
print(f"{'═'*70}")
