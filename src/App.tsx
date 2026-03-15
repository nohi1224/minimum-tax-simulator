// @ts-nocheck
// TODO: Full TypeScript conversion is a Phase 2 task for Claude Code
import { useState, useMemo, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import {
  calcAllTaxes,
  formatOkuMan as fmtOkuMan,
  formatOku as fmtOku,
  formatPercent as fmtPct,
  MT_BEFORE,
  MT_AFTER,
  type TaxInput,
  type TaxResult,
  type MinimumTaxParams,
} from "./lib/taxEngine";

// ─── Collapsible Tax Explainer components ───
function SplitSaleExplainer() {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ marginTop: 16 }}>
      <button onClick={() => setOpen(!open)}
        style={{ width: "100%", padding: "8px 14px", fontSize: 12, color: C.textSecondary, background: "#F8FAFC", border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer", textAlign: "left", transition: "all 0.2s" }}>
        {open ? "▾" : "▸"} なぜ年度をまたぐと税負担が変わるのか？
      </button>
      {open && (
        <div style={{ padding: "12px 14px", fontSize: 12, lineHeight: 1.8, color: C.textSecondary, background: "#F8FAFC", borderRadius: "0 0 6px 6px", borderTop: "none", border: `1px solid ${C.border}`, borderTopWidth: 0, animation: "fadeIn 0.2s" }}>
          <p style={{ margin: "0 0 8px" }}>ミニマムタックスの追加税額は、以下のステップで計算されます：</p>
          <div style={{ background: C.white, padding: "10px 12px", borderRadius: 4, fontSize: 11, marginBottom: 8, lineHeight: 1.9 }}>
            <div>① 全所得の合計（基準所得金額）から特別控除額を差し引く</div>
            <div>② ①の金額に税率をかけて「最低限納めるべき税額」を算出</div>
            <div>③ 通常の税額（基準所得税額）と比較し、②が上回る分だけ追加課税</div>
          </div>
          <p style={{ margin: "0 0 8px" }}>売却代金を2年間に分けると、各年度にそれぞれ特別控除額が適用されるため、控除を2回使える分だけ課税ベースが小さくなり、税負担が軽減される場合があります。</p>
          <ul style={{ margin: "0 0 8px", paddingLeft: 20 }}>
            <li>改正前（2026年）: 特別控除 3億3,000万円 / 税率 22.5%</li>
            <li>改正後（2027年〜）: 特別控除 1億6,500万円 / 税率 30%</li>
          </ul>
          <p style={{ margin: 0 }}>ただし、2027年以降の分には改正後の厳しい条件が適用されるため、分割比率によっては一括売却より不利になるケースもあります。上のスライダーで最適な比率をご確認ください。</p>
        </div>
      )}
    </div>
  );
}

function TaxExplainer() {
  return (
    <Card style={{ marginTop: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: C.textPrimary, marginBottom: 10 }}>ミニマムタックスとは</div>
      <div style={{ fontSize: 12, lineHeight: 1.8, color: C.textSecondary }}>
        <p style={{ margin: "0 0 8px" }}>
          株式譲渡所得には通常 約20.315% の税率が適用されますが、
          <strong style={{ color: C.goldText }}>譲渡所得が約3.3億円を超える</strong>と、
          「ミニマムタックス（最低税率確保措置）」により追加の税負担が発生します。
        </p>

        <div style={{ background: "#F8FAFC", padding: "10px 12px", borderRadius: 6, border: `1px solid ${C.border}`, marginBottom: 10, fontSize: 11, lineHeight: 1.9 }}>
          <div>① 全所得の合計（所得控除前）から特別控除額を差し引く</div>
          <div>② ①の金額に税率をかけて「最低限納めるべき税額」を算出</div>
          <div>③ 通常の税額と比較し、②が上回る分だけ追加課税される</div>
          <div style={{ color: C.textMuted, marginTop: 4 }}>※ 通常の税額以下であれば追加課税は発生しません</div>
        </div>

        <div style={{ fontWeight: 600, marginBottom: 4, color: C.textPrimary }}>改正前後の違い</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
          <div style={{ background: "#F0F7FF", padding: "8px 10px", borderRadius: 6, fontSize: 11 }}>
            <div style={{ fontWeight: 600, color: C.blue, marginBottom: 2 }}>改正前（〜2026年）</div>
            <div>特別控除: 3億3,000万円</div>
            <div>税率: 22.5%</div>
          </div>
          <div style={{ background: "#FFF5F5", padding: "8px 10px", borderRadius: 6, fontSize: 11 }}>
            <div style={{ fontWeight: 600, color: C.red, marginBottom: 2 }}>改正後（2027年〜）</div>
            <div>特別控除: 1億6,500万円</div>
            <div>税率: 30%</div>
          </div>
        </div>

        <p style={{ margin: 0, fontSize: 12 }}>
          改正後は特別控除額が半減し税率も上がるため、<strong style={{ color: C.goldText }}>約3.3億円超の譲渡所得</strong>から追加課税の影響が出始めます。
          譲渡価額が大きいほど影響額も拡大するため、売却タイミングの検討が重要です。
        </p>
      </div>
    </Card>
  );
}

// Adapter: convert component state to TaxInput
function toTaxInput(p: {
  stockPrice: number; stockCost: number; salaryRev: number;
  otherIncome: number; listedTransfer: number; listedDiv: number; deductions: number;
}): TaxInput {
  return {
    stockPrice: p.stockPrice,
    stockCost: p.stockCost,
    salaryRevenue: p.salaryRev,
    otherComprehensiveIncome: p.otherIncome,
    listedStockTransferIncome: p.listedTransfer,
    listedStockDividendIncome: p.listedDiv,
    incomeDeductions: p.deductions,
  };
}

// Result adapter: map TaxResult fields to the names used in the UI
function adaptResult(r: TaxResult) {
  return {
    stockIncome: r.stockTransferIncome,
    kijun: r.kijunShotoku,
    compTax: r.comprehensiveTax,
    sepTax: r.separateTax,
    kijunTax: r.kijunTax,
    mtBench: r.mtBenchmark,
    mtAdd: r.mtAdditional,
    triggered: r.mtTriggered,
    totalIT: r.totalIncomeTax,
    recon: r.reconstructionTax,
    totalRes: r.totalResidentTax,
    totalTax: r.totalTax,
    stockTotalTax: r.stockTotalTax,
    maNet: r.maNet,
    effMA: r.effectiveRateMA,
    effTotal: r.effectiveRateTotal,
  };
}

function calcTaxes(p: any, mt: MinimumTaxParams) {
  return adaptResult(calcAllTaxes(toTaxInput(p), mt));
}

// ─── Responsive Hook ───
function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < breakpoint : false
  );
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [breakpoint]);
  return isMobile;
}

// ─── Color Tokens ───
const C = {
  bg: "#F5F7FA", bgCard: "#FFFFFF", bgCardHover: "#F0F2F5",
  border: "#E2E8F0", borderLight: "#CBD5E1",
  gold: "#2563EB", goldDim: "#EFF6FF", goldText: "#1D4ED8",
  blue: "#3B82F6", blueDim: "#EFF6FF",
  red: "#EF4444", redDim: "#FEF2F2", redText: "#DC2626",
  green: "#10B981", greenDim: "#ECFDF5",
  textPrimary: "#1E293B", textSecondary: "#64748B", textMuted: "#94A3B8",
  white: "#FFFFFF",
};

// ─── Components ───
function HelpTip({ text }) {
  const [show, setShow] = useState(false);
  return (
    <span style={{ position: "relative", display: "inline-flex", marginLeft: 4, verticalAlign: "middle" }}>
      <span
        onClick={() => setShow(!show)}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        style={{
          display: "inline-flex", alignItems: "center", justifyContent: "center",
          width: 16, height: 16, borderRadius: "50%", fontSize: 10, fontWeight: 600,
          background: C.border, color: C.textSecondary, cursor: "pointer", userSelect: "none",
          lineHeight: 1,
        }}>?</span>
      {show && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: "50%", transform: "translateX(-50%)",
          background: C.textPrimary, color: C.white, fontSize: 11, lineHeight: 1.6,
          padding: "8px 12px", borderRadius: 6, width: 220, zIndex: 100,
          pointerEvents: "none",
        }}>
          <div style={{
            position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)",
            width: 0, height: 0, borderLeft: "5px solid transparent", borderRight: "5px solid transparent",
            borderBottom: `5px solid ${C.textPrimary}`,
          }} />
          {text}
        </div>
      )}
    </span>
  );
}

function LabelWithHelp({ label, help }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center" }}>
      {label}
      {help && <HelpTip text={help} />}
    </span>
  );
}

function Card({ children, className = "", style = {} }) {
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: "20px 24px", ...style }} className={className}>
      {children}
    </div>
  );
}

function MetricCard({ label, value, sub, accent = C.gold, valueColor }) {
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 16px", borderLeft: `3px solid ${accent}` }}>
      <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 4, letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: valueColor || C.textPrimary, fontFeatureSettings: "'tnum'", wordBreak: "break-all" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SliderInput({ label, value, onChange, min = 0, max = 200000, step = 100, help = "" }) {
  const displayVal = fmtOkuMan(value);
  const sliderValue = Math.min(value, max);
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, flexWrap: "wrap", gap: 4 }}>
        <label style={{ fontSize: 13, color: C.textSecondary, fontWeight: 500 }}><LabelWithHelp label={label} help={help} /></label>
        <span style={{ fontSize: 15, fontWeight: 600, color: C.goldText, fontFeatureSettings: "'tnum'" }}>{displayVal}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={sliderValue}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: C.gold, height: 6, cursor: "pointer" }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.textMuted, marginTop: 4 }}>
        <span>{fmtOku(min)}</span><span>{fmtOku(max)}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 6, padding: "6px 12px", marginTop: 8 }}>
        <input type="number" value={value || ""} onChange={e => { const v = Number(e.target.value); if (v >= 0) onChange(v); }}
          placeholder="0"
          style={{ background: "transparent", border: "none", outline: "none", color: C.textPrimary, fontSize: 14, width: "100%", fontFeatureSettings: "'tnum'" }} />
        <span style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap", marginLeft: 8 }}>万円</span>
      </div>
    </div>
  );
}

function NumberInput({ label, value, onChange, placeholder = "0", help = "" }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, color: C.textSecondary, display: "block", marginBottom: 4 }}><LabelWithHelp label={label} help={help} /></label>
      <div style={{ display: "flex", alignItems: "center", background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px" }}>
        <input type="number" value={value || ""} onChange={e => onChange(Number(e.target.value) || 0)}
          placeholder={placeholder}
          style={{ background: "transparent", border: "none", outline: "none", color: C.textPrimary, fontSize: 14, width: "100%", fontFeatureSettings: "'tnum'" }} />
        <span style={{ fontSize: 12, color: C.textMuted, whiteSpace: "nowrap", marginLeft: 8 }}>万円</span>
      </div>
    </div>
  );
}

function PresetButtons({ onSelect }) {
  const presets = [
    { label: "3億", value: 30000 }, { label: "5億", value: 50000 },
    { label: "10億", value: 100000 }, { label: "20億", value: 200000 },
  ];
  return (
    <div style={{ display: "flex", gap: 6, marginBottom: 16, flexWrap: "wrap" }}>
      {presets.map(p => (
        <button key={p.value} onClick={() => onSelect(p.value)}
          style={{ padding: "5px 12px", fontSize: 12, fontWeight: 500, background: C.goldDim, color: C.goldText, border: `1px solid #BFDBFE`, borderRadius: 6, cursor: "pointer", transition: "all 0.15s" }}
          onMouseOver={e => { e.target.style.background = "#DBEAFE"; }}
          onMouseOut={e => { e.target.style.background = C.goldDim; }}>
          {p.label}
        </button>
      ))}
    </div>
  );
}

function ComparisonRow({ label, before, after, isBold, isDiff, isRate, isMobile }) {
  const diff = isDiff ? after : (isRate ? after - before : after - before);
  return (
    <div style={{
      display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "1fr 1fr 1fr",
      padding: isBold ? "10px 0" : "6px 0",
      borderTop: isBold ? `1px solid ${C.borderLight}` : "none",
      fontSize: isBold ? (isMobile ? 12 : 14) : (isMobile ? 11 : 13),
      fontWeight: isBold ? 600 : 400,
      gap: isMobile ? 2 : 0,
    }}>
      <div style={{ color: isBold ? C.textPrimary : C.textSecondary, gridColumn: isMobile ? "1 / -1" : "auto", marginBottom: isMobile ? 2 : 0 }}>{label}</div>
      <div style={{ textAlign: "right", color: C.textPrimary, fontFeatureSettings: "'tnum'" }}>
        {isRate ? fmtPct(before) : fmtOkuMan(before)}
      </div>
      <div style={{ textAlign: "right", fontFeatureSettings: "'tnum'", color: isDiff ? (diff > 0 ? C.redText : diff < 0 ? "#059669" : C.textSecondary) : C.textPrimary }}>
        {isDiff ? (
          isRate ? `${diff > 0 ? "+" : ""}${fmtPct(diff)}` :
          diff > 0 ? `▲${fmtOkuMan(diff)}` : diff < 0 ? `▼${fmtOkuMan(Math.abs(diff))}` : "—"
        ) : (isRate ? fmtPct(after) : fmtOkuMan(after))}
      </div>
    </div>
  );
}

function SplitSaleSimulation({ stockPrice, stockCost, params, isMobile }) {
  const [splitRatio, setSplitRatio] = useState(50);
  const total = stockPrice;

  const scenarios = useMemo(() => {
    const base = { ...params, stockPrice: total, stockCost };
    const rA = calcTaxes(base, MT_BEFORE);
    const rB = calcTaxes(base, MT_AFTER);

    const y1Price = Math.round(total * splitRatio / 100);
    const y2Price = total - y1Price;
    const y1Cost = Math.round(stockCost * splitRatio / 100);
    const y2Cost = stockCost - y1Cost;

    const rC1 = calcTaxes({ ...params, stockPrice: y1Price, stockCost: y1Cost }, MT_BEFORE);
    const rC2 = calcTaxes({ ...params, stockPrice: y2Price, stockCost: y2Cost }, MT_AFTER);
    const cTax = rC1.stockTotalTax + rC2.stockTotalTax;
    const cNet = (y1Price - rC1.stockTotalTax) + (y2Price - rC2.stockTotalTax);
    const cEff = total > 0 ? (cTax / total) * 100 : 0;

    return { rA, rB, rC1, rC2, cTax, cNet, cEff, y1Price, y2Price };
  }, [total, stockCost, splitRatio, params]);

  const chartData = useMemo(() => {
    return Array.from({ length: 11 }, (_, i) => {
      const pct = i * 10;
      const y1P = Math.round(total * pct / 100);
      const y2P = total - y1P;
      const y1C = Math.round(stockCost * pct / 100);
      const y2C = stockCost - y1C;
      const r1 = calcTaxes({ ...params, stockPrice: y1P, stockCost: y1C }, MT_BEFORE);
      const r2 = calcTaxes({ ...params, stockPrice: y2P, stockCost: y2C }, MT_AFTER);
      const net = (y1P - r1.stockTotalTax) + (y2P - r2.stockTotalTax);
      return { pct: `${pct}%`, net: Math.round(net), label: pct };
    });
  }, [total, stockCost, params]);

  const { rA, rB, cNet, cEff, rC1, rC2 } = scenarios;

  // 一括売却（全額2026年）との差額
  const diff = cNet - rA.maNet;

  return (
    <Card style={{ marginTop: 16, padding: isMobile ? "16px" : "20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: C.textPrimary, margin: 0 }}>年度またぎの売却シミュレーション</h3>
        <span style={{ fontSize: 11, color: C.textSecondary, background: C.goldDim, padding: "3px 10px", borderRadius: 4 }}>
          総額 {fmtOkuMan(total)}
        </span>
      </div>

      {/* 1. 導入セクション */}
      <div style={{ fontSize: 12, color: C.textSecondary, lineHeight: 1.7, marginBottom: 20, padding: "10px 14px", background: "#F8FAFC", borderRadius: 8, border: `1px solid ${C.border}` }}>
        アーンアウトや2段階譲渡、分割払い等により、売却代金の受取りが2026年と2027年以降に分かれる場合の税負担をシミュレーションします。
      </div>

      {/* 6. スライダー（金額表示付き） */}
      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: C.textSecondary }}>2026年中の受取割合</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.goldText }}>{splitRatio}%</span>
        </div>
        <input type="range" min={0} max={100} step={10} value={splitRatio}
          onChange={e => setSplitRatio(Number(e.target.value))}
          style={{ width: "100%", accentColor: C.gold, height: 6, cursor: "pointer" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.textMuted, marginTop: 4 }}>
          <span>全量2027年以降</span><span>全量2026年</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: C.textPrimary, marginTop: 8, padding: "8px 12px", background: C.goldDim, borderRadius: 6, border: `1px solid #BFDBFE` }}>
          <span>2026年に <strong style={{ color: C.goldText }}>{fmtOkuMan(scenarios.y1Price)}</strong> 売却</span>
          <span>2027年以降に <strong style={{ color: C.goldText }}>{fmtOkuMan(scenarios.y2Price)}</strong> 売却</span>
        </div>
      </div>

      {/* 2. メイン結果 + 参考カード */}
      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "2fr 1fr", gap: 10, marginBottom: 20 }}>
        <div style={{ background: C.greenDim, borderRadius: 8, padding: "14px 16px", border: `1px solid #A7F3D0` }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: "#059669" }}>
            {splitRatio === 0 ? "2027年以降に一括売却した場合" : splitRatio === 100 ? "2026年に一括売却した場合" : "年度またぎの売却結果"}
          </div>
          <div style={{ fontSize: 10, color: C.textMuted, marginTop: 2 }}>
            {splitRatio === 0 ? `全額（${fmtOkuMan(total)}）を2027年以降に売却` : splitRatio === 100 ? `全額（${fmtOkuMan(total)}）を2026年に売却` : `2026年に${fmtOkuMan(scenarios.y1Price)} + 2027年以降に${fmtOkuMan(scenarios.y2Price)}`}
          </div>
          <div style={{ fontSize: 20, fontWeight: 600, color: "#059669", marginTop: 8 }}>{fmtOkuMan(cNet)}</div>
          <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>実効税率 {fmtPct(cEff)}</div>
        </div>
        <div style={{ background: "#F8FAFC", borderRadius: 8, padding: "12px 14px", border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 11, fontWeight: 500, color: C.textSecondary }}>全額を2026年に一括売却した場合（参考）</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.blue, marginTop: 6 }}>{fmtOkuMan(rA.maNet)}</div>
          <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>実効税率 {fmtPct(rA.effMA)}</div>
          {diff !== 0 && (
            <div style={{ fontSize: 11, marginTop: 6, color: diff > 0 ? "#059669" : C.redText, fontWeight: 500 }}>
              差額: {diff > 0 ? "+" : ""}{fmtOkuMan(diff)}
            </div>
          )}
        </div>
      </div>

      {/* 3. 分割詳細セクション（表形式） */}
      {splitRatio > 0 && splitRatio < 100 && (
        <div style={{ marginBottom: 16, borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: isMobile ? 11 : 12 }}>
            <thead>
              <tr style={{ background: "#F8FAFC" }}>
                <th style={{ padding: "8px 12px", textAlign: "left", color: C.textSecondary, fontWeight: 500, borderBottom: `1px solid ${C.border}` }}></th>
                <th style={{ padding: "8px 12px", textAlign: "right", color: C.textSecondary, fontWeight: 500, borderBottom: `1px solid ${C.border}` }}>売却額</th>
                <th style={{ padding: "8px 12px", textAlign: "right", color: C.textSecondary, fontWeight: 500, borderBottom: `1px solid ${C.border}` }}>税額</th>
                <th style={{ padding: "8px 12px", textAlign: "right", color: C.textSecondary, fontWeight: 500, borderBottom: `1px solid ${C.border}` }}>追加課税</th>
                <th style={{ padding: "8px 12px", textAlign: "right", color: C.textSecondary, fontWeight: 500, borderBottom: `1px solid ${C.border}` }}>手取り</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={{ padding: "8px 12px", color: C.textPrimary, fontWeight: 500, borderBottom: `1px solid ${C.border}` }}>1年目（2026年）</td>
                <td style={{ padding: "8px 12px", textAlign: "right", color: C.textPrimary, fontFeatureSettings: "'tnum'", borderBottom: `1px solid ${C.border}` }}>{fmtOkuMan(scenarios.y1Price)}</td>
                <td style={{ padding: "8px 12px", textAlign: "right", color: C.textPrimary, fontFeatureSettings: "'tnum'", borderBottom: `1px solid ${C.border}` }}>{fmtOkuMan(rC1.stockTotalTax)}</td>
                <td style={{ padding: "8px 12px", textAlign: "right", fontFeatureSettings: "'tnum'", borderBottom: `1px solid ${C.border}`, color: rC1.triggered ? C.redText : C.textMuted }}>{rC1.triggered ? fmtOkuMan(rC1.mtAdd) : "なし"}</td>
                <td style={{ padding: "8px 12px", textAlign: "right", color: C.textPrimary, fontWeight: 500, fontFeatureSettings: "'tnum'", borderBottom: `1px solid ${C.border}` }}>{fmtOkuMan(scenarios.y1Price - rC1.stockTotalTax)}</td>
              </tr>
              <tr>
                <td style={{ padding: "8px 12px", color: C.textPrimary, fontWeight: 500, borderBottom: `1px solid ${C.border}` }}>2年目（2027年以降）</td>
                <td style={{ padding: "8px 12px", textAlign: "right", color: C.textPrimary, fontFeatureSettings: "'tnum'", borderBottom: `1px solid ${C.border}` }}>{fmtOkuMan(scenarios.y2Price)}</td>
                <td style={{ padding: "8px 12px", textAlign: "right", color: C.textPrimary, fontFeatureSettings: "'tnum'", borderBottom: `1px solid ${C.border}` }}>{fmtOkuMan(rC2.stockTotalTax)}</td>
                <td style={{ padding: "8px 12px", textAlign: "right", fontFeatureSettings: "'tnum'", borderBottom: `1px solid ${C.border}`, color: rC2.triggered ? C.redText : C.textMuted }}>{rC2.triggered ? fmtOkuMan(rC2.mtAdd) : "なし"}</td>
                <td style={{ padding: "8px 12px", textAlign: "right", color: C.textPrimary, fontWeight: 500, fontFeatureSettings: "'tnum'", borderBottom: `1px solid ${C.border}` }}>{fmtOkuMan(scenarios.y2Price - rC2.stockTotalTax)}</td>
              </tr>
              <tr style={{ background: "#F8FAFC" }}>
                <td style={{ padding: "8px 12px", color: C.textPrimary, fontWeight: 600 }}>2年間合計</td>
                <td style={{ padding: "8px 12px", textAlign: "right", color: C.textPrimary, fontWeight: 600, fontFeatureSettings: "'tnum'" }}>{fmtOkuMan(total)}</td>
                <td style={{ padding: "8px 12px", textAlign: "right", color: C.textPrimary, fontWeight: 600, fontFeatureSettings: "'tnum'" }}>{fmtOkuMan(scenarios.cTax)}</td>
                <td style={{ padding: "8px 12px", textAlign: "right", fontFeatureSettings: "'tnum'", color: C.textMuted }}></td>
                <td style={{ padding: "8px 12px", textAlign: "right", color: "#059669", fontWeight: 700, fontSize: isMobile ? 13 : 14, fontFeatureSettings: "'tnum'" }}>{fmtOkuMan(cNet)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* 4. 差額情報 */}
      {diff !== 0 && (
        <div style={{ marginBottom: 20, padding: "12px 16px", background: diff > 0 ? C.greenDim : C.redDim, borderRadius: 8, border: `1px solid ${diff > 0 ? "#A7F3D0" : "#FECACA"}` }}>
          <div style={{ fontSize: 13, color: C.textPrimary, lineHeight: 1.6 }}>
            {diff > 0
              ? <>年度をまたぐことで、一括売却より<strong style={{ color: "#059669" }}>{fmtOkuMan(diff)}</strong>手取りが増えます</>
              : <>年度をまたぐことで、一括売却より<strong style={{ color: C.redText }}>{fmtOkuMan(Math.abs(diff))}</strong>手取りが減ります</>}
          </div>
        </div>
      )}

      {/* 5. チャート（タイトル・ラベル改善） */}
      <div style={{ fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 8 }}>2026年中の受取割合と手取り額の関係</div>
      <ResponsiveContainer width="100%" height={isMobile ? 180 : 200}>
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: isMobile ? -10 : 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="pct" tick={{ fontSize: isMobile ? 9 : 11, fill: C.textSecondary }} label={isMobile ? undefined : { value: "2026年中の受取割合", position: "insideBottom", offset: -2, fontSize: 10, fill: C.textMuted }} />
          <YAxis tick={{ fontSize: isMobile ? 9 : 11, fill: C.textSecondary }} tickFormatter={v => fmtOku(v)} domain={['auto', 'auto']} label={isMobile ? undefined : { value: "2年間の手取り額", angle: -90, position: "insideLeft", offset: 10, fontSize: 10, fill: C.textMuted }} />
          <Tooltip
            contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, color: C.textPrimary }}
            formatter={(v) => [fmtOkuMan(v), "2年間手取り"]}
          />
          <ReferenceLine y={rA.maNet} stroke={C.blue} strokeDasharray="4 4" strokeWidth={1} />
          <Bar dataKey="net" radius={[4, 4, 0, 0]} fill="#6EE7B7" />
        </BarChart>
      </ResponsiveContainer>
      <div style={{ fontSize: 11, color: C.textSecondary, textAlign: "center", marginTop: 6 }}>
        {!isMobile && <span style={{ color: C.textMuted }}>--- 青線: 全額を2026年に売却した場合</span>}
      </div>
      <SplitSaleExplainer />
    </Card>
  );
}

// ─── Input Panel (extracted for mobile accordion) ───
function InputPanel({ stockPrice, setStockPrice, stockCost, setStockCost, showDetail, setShowDetail, salaryRev, setSalaryRev, otherIncome, setOtherIncome, deductions, setDeductions, netMode, setNetMode, isMobile }) {
  return (
    <>
      <SliderInput label="株式譲渡価額（売却価格）" value={stockPrice} onChange={setStockPrice} min={0} max={200000} step={500}
        help="会社の株式を売却する際の売買価格です。M&Aで提示されている金額を入力してください。" />
      <PresetButtons onSelect={setStockPrice} />
      <NumberInput label="株式取得価額（簿価）" value={stockCost} onChange={setStockCost}
        help="株式を最初に取得した際の金額です。創業者の場合は設立時の出資額（資本金）になります。不明な場合は0円のままで概算できます。" />

      <button onClick={() => setShowDetail(!showDetail)}
        style={{ width: "100%", padding: "8px 14px", fontSize: 12, color: C.textSecondary, background: "#F8FAFC", border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer", marginTop: 8, marginBottom: showDetail ? 16 : 0, textAlign: "left", transition: "all 0.2s" }}>
        {showDetail ? "▾" : "▸"} 詳細入力（他の所得）
      </button>

      {showDetail && (
        <div style={{ animation: "fadeIn 0.2s" }}>
          <NumberInput label="給与収入（年収）" value={salaryRev} onChange={setSalaryRev}
            help="会社からの役員報酬や給与の年収額面です。手取りではなく、額面（税引前）の金額を入力してください。" />
          <NumberInput label="その他の総合課税所得" value={otherIncome} onChange={setOtherIncome}
            help="不動産収入や事業所得など、給与・株式譲渡以外の所得がある場合に入力します。特になければ0円のままで構いません。" />
          <NumberInput label="所得控除合計" value={deductions} onChange={setDeductions} placeholder="200"
            help="基礎控除（48万円）や社会保険料控除などの合計です。一般的な会社役員の場合、200万円前後が目安です。" />
        </div>
      )}

      <div style={{ marginTop: 20, padding: "12px 14px", background: "#F8FAFC", borderRadius: 6, border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>手取り表示モード</div>
        <div style={{ display: "flex", gap: 4 }}>
          {[{ k: "ma", l: "M&A手取り" }, { k: "total", l: "年間総合" }].map(m => (
            <button key={m.k} onClick={() => setNetMode(m.k)}
              style={{
                flex: 1, padding: "6px 10px", fontSize: 11, borderRadius: 6, cursor: "pointer",
                background: netMode === m.k ? C.goldDim : "transparent",
                color: netMode === m.k ? C.goldText : C.textMuted,
                border: `1px solid ${netMode === m.k ? "#BFDBFE" : C.border}`,
              }}>
              {m.l}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 10, color: C.textMuted, marginTop: 6, lineHeight: 1.6 }}>
          {netMode === "ma"
            ? "株式売却による手取り額のみを表示します"
            : "給与・その他の所得も含めた年間の手取り総額を表示します"}
        </div>
      </div>

      <div style={{ marginTop: 24, padding: 14, background: C.redDim, borderRadius: 6, border: `1px solid #FECACA` }}>
        <div style={{ fontSize: 11, fontWeight: 500, color: C.redText, marginBottom: 4 }}>免責事項</div>
        <div style={{ fontSize: 10, color: C.textSecondary, lineHeight: 1.6 }}>
          本シミュレーションは令和8年度税制改正大綱に基づく概算です。正確な税額は税理士にご確認ください。法案成立・施行細則により変更の可能性があります。
        </div>
      </div>
    </>
  );
}

// ─── Main App ───
export default function App() {
  const isMobile = useIsMobile();
  const [stockPrice, setStockPrice] = useState(100000);
  const [stockCost, setStockCost] = useState(0);
  const [showDetail, setShowDetail] = useState(false);
  const [salaryRev, setSalaryRev] = useState(0);
  const [otherIncome, setOtherIncome] = useState(0);
  const [deductions, setDeductions] = useState(200);
  const [netMode, setNetMode] = useState("ma");
  const [activeTab, setActiveTab] = useState("compare");
  const [showAbout, setShowAbout] = useState(false);
  const [showInputPanel, setShowInputPanel] = useState(false);
  const [showGuide, setShowGuide] = useState(() => {
    try { return !localStorage.getItem("mt-guide-dismissed"); } catch { return true; }
  });
  const dismissGuide = () => {
    setShowGuide(false);
    try { localStorage.setItem("mt-guide-dismissed", "1"); } catch {}
  };

  const params = useMemo(() => ({
    stockPrice, stockCost, salaryRev, otherIncome,
    listedTransfer: 0, listedDiv: 0, deductions,
  }), [stockPrice, stockCost, salaryRev, otherIncome, deductions]);

  const before = useMemo(() => calcTaxes(params, MT_BEFORE), [params]);
  const after = useMemo(() => calcTaxes(params, MT_AFTER), [params]);

  const chartData = useMemo(() => {
    const points = [0, 5000, 10000, 15000, 20000, 25000, 30000, 33000, 35000, 40000, 50000, 60000, 80000, 100000, 150000, 200000];
    return points.map(amt => {
      const p = { ...params, stockPrice: amt };
      const b = calcTaxes(p, MT_BEFORE);
      const a = calcTaxes(p, MT_AFTER);
      return { amt, label: fmtOku(amt), before: Math.round(b.effMA * 100) / 100, after: Math.round(a.effMA * 100) / 100 };
    });
  }, [params]);

  const sensitivityData = useMemo(() => {
    return [10000, 20000, 30000, 50000, 100000, 150000, 200000].map(amt => {
      const p = { ...params, stockPrice: amt };
      const b = calcTaxes(p, MT_BEFORE);
      const a = calcTaxes(p, MT_AFTER);
      return { amt, bNet: b.maNet, aNet: a.maNet, diff: a.maNet - b.maNet, bEff: b.effMA, aEff: a.effMA };
    });
  }, [params]);

  const diff = after.maNet - before.maNet;
  const diffTax = after.stockTotalTax - before.stockTotalTax;
  const hasImpact = diffTax > 0;

  const inputPanelProps = { stockPrice, setStockPrice, stockCost, setStockCost, showDetail, setShowDetail, salaryRev, setSalaryRev, otherIncome, setOtherIncome, deductions, setDeductions, netMode, setNetMode, isMobile };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.textPrimary, fontFamily: "'Noto Sans JP', 'Helvetica Neue', sans-serif" }}>
      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${C.border}`,
        background: C.white,
        ...(isMobile
          ? { display: "flex", flexDirection: "column" }
          : { display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 24px" }),
      }}>
        {/* Row 1: Logo + Title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: isMobile ? "10px 16px" : 0 }}>
          <img src="/willgate-ma-logo.png" alt="ウィルゲートM&A" style={{ height: isMobile ? 24 : 30, flexShrink: 0 }} />
          <div style={{ borderLeft: `1px solid ${C.border}`, paddingLeft: 12 }}>
            <div style={{ fontSize: isMobile ? 13 : 15, fontWeight: 600, letterSpacing: 0.5, ...(isMobile ? { wordBreak: "keep-all", overflowWrap: "break-word" } : {}) }}>ミニマムタックス{isMobile ? " " : " "}シミュレーター</div>
            {!isMobile && <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: 0.8 }}>2026年度税制改正対応</div>}
          </div>
        </div>
        {/* Row 2 (mobile) / inline (desktop): Tabs + About */}
        <div style={{
          display: "flex", gap: 6, alignItems: "center",
          ...(isMobile
            ? { padding: "8px 16px", borderTop: `1px solid ${C.border}`, background: "#FAFBFC", justifyContent: "space-between" }
            : {}),
        }}>
          <div style={{ display: "flex", gap: 6 }}>
            {["compare", "split"].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                style={{
                  padding: isMobile ? "5px 12px" : "6px 16px", fontSize: 12, fontWeight: 500, borderRadius: 6, cursor: "pointer",
                  background: activeTab === tab ? C.goldDim : "transparent",
                  color: activeTab === tab ? C.goldText : C.textSecondary,
                  border: `1px solid ${activeTab === tab ? "#BFDBFE" : C.border}`,
                  transition: "all 0.2s",
                }}>
                {tab === "compare" ? "改正前後比較" : "年度またぎの売却"}
              </button>
            ))}
          </div>
          {isMobile ? (
            <button onClick={() => setShowAbout(true)}
              style={{
                width: 28, height: 28, fontSize: 14, fontWeight: 600, borderRadius: "50%", cursor: "pointer",
                background: "transparent", color: C.textMuted, border: `1px solid ${C.border}`,
                display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}
              title="このツールについて">
              ?
            </button>
          ) : (
            <button onClick={() => setShowAbout(true)}
              style={{
                padding: "6px 12px", fontSize: 11, fontWeight: 400, borderRadius: 6, cursor: "pointer",
                background: "transparent", color: C.textMuted, border: "none",
                textDecoration: "underline", textUnderlineOffset: 2,
              }}>
              このツールについて
            </button>
          )}
        </div>
      </div>

      {isMobile ? (
        /* Mobile: single column layout */
        <div style={{ padding: 16 }}>
          {/* Collapsible input panel */}
          <div style={{ position: "relative" }}>
            <button onClick={() => { setShowInputPanel(!showInputPanel); if (showGuide) dismissGuide(); }}
              style={{
                width: "100%", padding: "10px 14px", fontSize: 13, fontWeight: 500,
                color: C.goldText, background: C.goldDim, border: `1px solid #BFDBFE`,
                borderRadius: 8, cursor: "pointer", marginBottom: showGuide && !showInputPanel ? 0 : 16, textAlign: "left",
                display: "flex", justifyContent: "space-between", alignItems: "center",
              }}>
              <span>{showInputPanel ? "▾" : "▸"} 入力条件を{showInputPanel ? "閉じる" : "開く"}</span>
              <span style={{ fontSize: 12, color: C.textSecondary }}>{fmtOkuMan(stockPrice)}</span>
            </button>
            {showGuide && !showInputPanel && (
              <div onClick={dismissGuide} style={{
                margin: "0 0 16px", padding: "10px 14px", borderRadius: 8,
                background: C.textPrimary, color: C.white, fontSize: 12, lineHeight: 1.6,
                animation: "fadeIn 0.3s", cursor: "pointer", position: "relative",
              }}>
                <div style={{
                  position: "absolute", top: -6, left: 24,
                  width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent",
                  borderBottom: `6px solid ${C.textPrimary}`,
                }} />
                まず上のボタンを押して、<strong>株式の売却価格</strong>を入力してください。
                <span style={{ fontSize: 10, color: "#94A3B8", marginLeft: 8 }}>タップで閉じる</span>
              </div>
            )}
          </div>

          {showInputPanel && (
            <Card style={{ marginBottom: 16, padding: 16, animation: "fadeIn 0.2s" }}>
              <InputPanel {...inputPanelProps} />
            </Card>
          )}

          {activeTab === "compare" ? (
            <>
              {/* MT threshold banner（増税額に連動） */}
              <div style={{
                padding: "8px 12px", borderRadius: 6, marginBottom: 12, fontSize: 12, lineHeight: 1.6,
                background: hasImpact ? "#FEF2F2" : "#F0FDF4",
                border: `1px solid ${hasImpact ? "#FECACA" : "#BBF7D0"}`,
                color: hasImpact ? C.redText : "#166534",
              }}>
                {hasImpact
                  ? <>ミニマムタックスにより<strong>追加課税が発生</strong>します（譲渡所得が約3.3億円を超えると影響あり）</>
                  : <>現在の条件ではミニマムタックスの<strong>影響はありません</strong></>}
              </div>
              {/* Hero Metrics - 2x2 grid on mobile */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                <MetricCard label="株式譲渡所得" value={fmtOkuMan(before.stockIncome)} accent={C.gold} />
                <MetricCard
                  label="増税額"
                  value={hasImpact ? `▲${fmtOkuMan(diffTax)}` : "影響なし"}
                  sub={hasImpact ? `手取り ${fmtOkuMan(diff)}` : ""}
                  accent={hasImpact ? C.red : C.green}
                  valueColor={hasImpact ? C.redText : undefined}
                />
                <MetricCard label="改正前 手取り" value={fmtOkuMan(before.maNet)} sub={`税率 ${fmtPct(before.effMA)}`} accent={C.blue} />
                <MetricCard label="改正後 手取り" value={fmtOkuMan(after.maNet)} sub={`税率 ${fmtPct(after.effMA)}`} accent={C.red} />
              </div>

              {/* Comparison Table */}
              <Card style={{ marginBottom: 16, padding: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", marginBottom: 12 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.blue, textAlign: "right" }}>改正前</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: C.red, textAlign: "right" }}>改正後</div>
                </div>
                <ComparisonRow label="通常の所得税" before={before.kijunTax} after={after.kijunTax} isMobile />
                <ComparisonRow label="ミニマムタックス追加税額" before={before.mtAdd} after={after.mtAdd} isMobile />
                <ComparisonRow label="復興特別所得税" before={before.recon} after={after.recon} isMobile />
                <ComparisonRow label="住民税" before={before.totalRes} after={after.totalRes} isMobile />
                <ComparisonRow label="税額合計" before={before.totalTax} after={after.totalTax} isBold isMobile />
                <ComparisonRow label={netMode === "ma" ? "M&A手取り" : "年間手取り"}
                  before={netMode === "ma" ? before.maNet : before.maNet + (salaryRev || 0) + otherIncome - before.totalTax + before.stockTotalTax}
                  after={netMode === "ma" ? after.maNet : after.maNet + (salaryRev || 0) + otherIncome - after.totalTax + after.stockTotalTax}
                  isBold isMobile />
                <ComparisonRow label="実効税率" before={before.effMA} after={after.effMA} isRate isBold isMobile />
                <ComparisonRow label="差額（増税額）" before={0} after={diffTax} isDiff isBold isMobile />
              </Card>

              {/* Effective Tax Rate Chart */}
              <Card style={{ marginBottom: 16, padding: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary, marginBottom: 4 }}>実効税率チャート</div>
                <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 12 }}>
                  税負担率の推移（縦線: 現在の入力値）
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                    <XAxis dataKey="label" tick={{ fontSize: 9, fill: C.textSecondary }} interval="preserveStartEnd" />
                    <YAxis domain={[18, 38]} tick={{ fontSize: 9, fill: C.textSecondary }} tickFormatter={v => `${v}%`} />
                    <Tooltip
                      contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 11, color: C.textPrimary }}
                      formatter={(v, name) => [`${v}%`, name === "before" ? "改正前" : "改正後"]}
                      labelFormatter={l => `譲渡所得: ${l}`}
                    />
                    <ReferenceLine y={20.315} stroke={C.textMuted} strokeDasharray="4 4" strokeWidth={0.8} />
                    <ReferenceLine x={fmtOku(stockPrice)} stroke={C.gold} strokeDasharray="2 2" strokeWidth={0.8} />
                    <Line type="monotone" dataKey="before" stroke={C.blue} strokeWidth={2} dot={false} name="before" />
                    <Line type="monotone" dataKey="after" stroke={C.red} strokeWidth={2} dot={false} name="after" />
                  </LineChart>
                </ResponsiveContainer>
                <div style={{ display: "flex", gap: 16, justifyContent: "center", marginTop: 6 }}>
                  <span style={{ fontSize: 11, color: C.textSecondary, display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 12, height: 3, background: C.blue, display: "inline-block" }} /> 改正前
                  </span>
                  <span style={{ fontSize: 11, color: C.textSecondary, display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 12, height: 3, background: C.red, display: "inline-block" }} /> 改正後
                  </span>
                </div>
              </Card>

              {/* Sensitivity Table - card-based on mobile */}
              <Card style={{ padding: 16 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary, marginBottom: 12 }}>売却価額別の税額比較</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {sensitivityData.map((d, i) => (
                    <div key={i} style={{
                      padding: "10px 12px", borderRadius: 6,
                      background: d.amt === stockPrice ? C.goldDim : "#F8FAFC",
                      border: `1px solid ${d.amt === stockPrice ? "#BFDBFE" : C.border}`,
                    }}>
                      <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6, color: C.textPrimary }}>{fmtOku(d.amt)}</div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4, fontSize: 12 }}>
                        <div>
                          <span style={{ color: C.blue, fontSize: 11 }}>改正前 </span>
                          <span style={{ fontFeatureSettings: "'tnum'" }}>{fmtOkuMan(d.bNet)}</span>
                          <span style={{ color: C.textMuted, fontSize: 10, marginLeft: 4 }}>{fmtPct(d.bEff)}</span>
                        </div>
                        <div>
                          <span style={{ color: C.red, fontSize: 11 }}>改正後 </span>
                          <span style={{ fontFeatureSettings: "'tnum'" }}>{fmtOkuMan(d.aNet)}</span>
                          <span style={{ color: C.textMuted, fontSize: 10, marginLeft: 4 }}>{fmtPct(d.aEff)}</span>
                        </div>
                      </div>
                      {d.diff < 0 && (
                        <div style={{ fontSize: 11, color: C.redText, marginTop: 4, fontWeight: 500 }}>
                          差額: ▲{fmtOkuMan(Math.abs(d.diff))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
              <TaxExplainer />
            </>
          ) : (
            <SplitSaleSimulation stockPrice={stockPrice} stockCost={stockCost} params={params} isMobile />
          )}
        </div>
      ) : (
        /* Desktop: sidebar + main content */
        <div style={{ display: "grid", gridTemplateColumns: "320px minmax(0, 1fr)", minHeight: "calc(100vh - 65px)" }}>
          {/* Sidebar */}
          <div style={{ borderRight: `1px solid ${C.border}`, padding: 24, overflowY: "auto", background: C.white }}>
            {showGuide && (
              <div onClick={dismissGuide} style={{
                marginBottom: 16, padding: "10px 14px", borderRadius: 8,
                background: C.textPrimary, color: C.white, fontSize: 12, lineHeight: 1.6,
                animation: "fadeIn 0.3s", cursor: "pointer",
              }}>
                まず下の入力欄で、<strong>株式の売却価格</strong>を入力してください。
                <span style={{ fontSize: 10, color: "#94A3B8", marginLeft: 8 }}>クリックで閉じる</span>
              </div>
            )}
            <InputPanel {...inputPanelProps} />
          </div>

          {/* Main Content */}
          <div style={{ padding: 24, overflowY: "auto" }}>
            {activeTab === "compare" ? (
              <>
                {/* MT threshold banner（増税額に連動） */}
                <div style={{
                  padding: "10px 14px", borderRadius: 6, marginBottom: 16, fontSize: 13, lineHeight: 1.6,
                  background: hasImpact ? "#FEF2F2" : "#F0FDF4",
                  border: `1px solid ${hasImpact ? "#FECACA" : "#BBF7D0"}`,
                  color: hasImpact ? C.redText : "#166534",
                }}>
                  {hasImpact
                    ? <>ミニマムタックスにより<strong>追加課税が発生</strong>します（譲渡所得が約3.3億円を超えると影響あり）</>
                    : <>現在の条件ではミニマムタックスの<strong>影響はありません</strong></>}
                </div>
                {/* Hero Metrics */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
                  <MetricCard label="株式譲渡所得" value={fmtOkuMan(before.stockIncome)} accent={C.gold} />
                  <MetricCard label="改正前 手取り" value={fmtOkuMan(before.maNet)} sub={`実効税率 ${fmtPct(before.effMA)}`} accent={C.blue} />
                  <MetricCard label="改正後 手取り" value={fmtOkuMan(after.maNet)} sub={`実効税率 ${fmtPct(after.effMA)}`} accent={C.red} />
                  <MetricCard
                    label="増税額"
                    value={hasImpact ? `▲${fmtOkuMan(diffTax)}` : "影響なし"}
                    sub={hasImpact ? `手取り ${fmtOkuMan(diff)}` : ""}
                    accent={hasImpact ? C.red : C.green}
                  />
                </div>

                {/* Comparison Table */}
                <Card style={{ marginBottom: 20 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.textSecondary }}>項目</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.blue, textAlign: "right" }}>改正前（〜2026年）</div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.red, textAlign: "right" }}>改正後（2027年〜）</div>
                  </div>
                  <ComparisonRow label="通常の所得税" before={before.kijunTax} after={after.kijunTax} />
                  <ComparisonRow label="ミニマムタックス追加税額" before={before.mtAdd} after={after.mtAdd} />
                  <ComparisonRow label="復興特別所得税" before={before.recon} after={after.recon} />
                  <ComparisonRow label="住民税" before={before.totalRes} after={after.totalRes} />
                  <ComparisonRow label="税額合計" before={before.totalTax} after={after.totalTax} isBold />
                  <ComparisonRow label={netMode === "ma" ? "M&A手取り" : "年間手取り"}
                    before={netMode === "ma" ? before.maNet : before.maNet + (salaryRev || 0) + otherIncome - before.totalTax + before.stockTotalTax}
                    after={netMode === "ma" ? after.maNet : after.maNet + (salaryRev || 0) + otherIncome - after.totalTax + after.stockTotalTax}
                    isBold />
                  <ComparisonRow label="実効税率" before={before.effMA} after={after.effMA} isRate isBold />
                  <ComparisonRow label="差額（増税額）" before={0} after={diffTax} isDiff isBold />
                </Card>

                {/* Effective Tax Rate Chart */}
                <Card style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary, marginBottom: 4 }}>実効税率チャート</div>
                  <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 16 }}>
                    株式譲渡所得に対する総合的な税負担率の推移（縦線: 現在の入力値）
                  </div>
                  <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={chartData} margin={{ top: 5, right: 20, left: 5, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.textSecondary }} interval="preserveStartEnd" />
                      <YAxis domain={[18, 38]} tick={{ fontSize: 10, fill: C.textSecondary }} tickFormatter={v => `${v}%`} />
                      <Tooltip
                        contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, color: C.textPrimary }}
                        formatter={(v, name) => [`${v}%`, name === "before" ? "改正前" : "改正後"]}
                        labelFormatter={l => `譲渡所得: ${l}`}
                      />
                      <ReferenceLine y={20.315} stroke={C.textMuted} strokeDasharray="4 4" strokeWidth={0.8} label={{ value: "通常税率 20.3%", position: "insideBottomRight", fontSize: 10, fill: C.textSecondary }} />
                      <ReferenceLine x={fmtOku(stockPrice)} stroke={C.gold} strokeDasharray="2 2" strokeWidth={0.8} />
                      <Line type="monotone" dataKey="before" stroke={C.blue} strokeWidth={2} dot={false} name="before" />
                      <Line type="monotone" dataKey="after" stroke={C.red} strokeWidth={2.5} dot={false} name="after" />
                    </LineChart>
                  </ResponsiveContainer>
                  <div style={{ display: "flex", gap: 20, justifyContent: "center", marginTop: 8 }}>
                    <span style={{ fontSize: 11, color: C.textSecondary, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 16, height: 3, background: C.blue, borderRadius: 1, display: "inline-block" }} /> 改正前
                    </span>
                    <span style={{ fontSize: 11, color: C.textSecondary, display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ width: 16, height: 3, background: C.red, borderRadius: 1, display: "inline-block" }} /> 改正後
                    </span>
                  </div>
                </Card>

                {/* Sensitivity Table */}
                <Card>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary, marginBottom: 14 }}>売却価額別の税額比較</div>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${C.borderLight}` }}>
                          <th style={{ textAlign: "left", padding: "8px 10px", color: C.textSecondary, fontWeight: 400 }}>譲渡額</th>
                          <th style={{ textAlign: "right", padding: "8px 10px", color: C.blue, fontWeight: 500 }}>改正前 手取り</th>
                          <th style={{ textAlign: "right", padding: "8px 10px", color: C.blue, fontWeight: 500 }}>税率</th>
                          <th style={{ textAlign: "right", padding: "8px 10px", color: C.red, fontWeight: 500 }}>改正後 手取り</th>
                          <th style={{ textAlign: "right", padding: "8px 10px", color: C.red, fontWeight: 500 }}>税率</th>
                          <th style={{ textAlign: "right", padding: "8px 10px", color: C.textSecondary, fontWeight: 400 }}>差額</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sensitivityData.map((d, i) => (
                          <tr key={i} style={{
                            borderBottom: `1px solid ${C.border}`,
                            background: d.amt === stockPrice ? C.goldDim : "transparent",
                          }}>
                            <td style={{ padding: "8px 10px", fontWeight: 500 }}>{fmtOku(d.amt)}</td>
                            <td style={{ textAlign: "right", padding: "8px 10px", fontFeatureSettings: "'tnum'" }}>{fmtOkuMan(d.bNet)}</td>
                            <td style={{ textAlign: "right", padding: "8px 10px", color: C.textSecondary }}>{fmtPct(d.bEff)}</td>
                            <td style={{ textAlign: "right", padding: "8px 10px", fontFeatureSettings: "'tnum'" }}>{fmtOkuMan(d.aNet)}</td>
                            <td style={{ textAlign: "right", padding: "8px 10px", color: C.textSecondary }}>{fmtPct(d.aEff)}</td>
                            <td style={{ textAlign: "right", padding: "8px 10px", color: d.diff < 0 ? C.redText : C.textSecondary }}>
                              {d.diff < 0 ? `▲${fmtOkuMan(Math.abs(d.diff))}` : "—"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
                <TaxExplainer />
              </>
            ) : (
              <SplitSaleSimulation stockPrice={stockPrice} stockCost={stockCost} params={params} isMobile={false} />
            )}
          </div>
        </div>
      )}

      {/* このツールについて モーダル */}
      {showAbout && (
        <div onClick={() => setShowAbout(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: C.white, borderRadius: 12, maxWidth: 600, width: "100%",
            maxHeight: "80vh", overflowY: "auto", padding: isMobile ? "20px 16px" : "28px 32px",
            boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
              <h2 style={{ fontSize: 17, fontWeight: 600, color: C.textPrimary, margin: 0 }}>このツールについて</h2>
              <button onClick={() => setShowAbout(false)} style={{
                background: "none", border: "none", fontSize: 20, color: C.textMuted, cursor: "pointer", padding: "0 4px", lineHeight: 1,
              }}>&times;</button>
            </div>

            <section style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: C.goldText, marginBottom: 6 }}>税制改正の概要</h3>
              <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.8, margin: 0 }}>
                2026年度（令和8年度）税制改正により、高額所得者への追加課税（ミニマムタックス）が強化されます。
                改正前は基準所得3.3億円超・税率22.5%ですが、改正後（2027年分〜）は基準所得1.65億円超・税率30%に引き下げ・引き上げとなり、
                課税対象が大幅に拡大します。
              </p>
            </section>

            <section style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: C.goldText, marginBottom: 6 }}>株式売却オーナーへの影響</h3>
              <p style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.8, margin: 0 }}>
                M&Aで非上場株式を売却するオーナー社長にとって、売却時期が手取り額に大きく影響します。
                株式譲渡所得は通常15%（住民税5%を加え約20%）の分離課税ですが、
                ミニマムタックスの対象となると実効税率が上昇し、数千万円〜数億円規模で手取り額が変わる可能性があります。
                改正後は約3.3億円超の譲渡所得から追加課税が発生するため、影響を受ける方が大幅に増えます。
              </p>
            </section>

            <section style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 14, fontWeight: 600, color: C.goldText, marginBottom: 6 }}>2つの機能について</h3>
              <div style={{ fontSize: 13, color: C.textSecondary, lineHeight: 1.8 }}>
                <p style={{ margin: "0 0 8px 0" }}>
                  <strong style={{ color: C.textPrimary }}>改正前後比較</strong>：同じ売却額を改正前（2026年中）と改正後（2027年以降）に売却した場合の手取り額を比較します。改正による増税額を一目で確認できます。
                </p>
                <p style={{ margin: 0 }}>
                  <strong style={{ color: C.textPrimary }}>年度またぎの売却</strong>：アーンアウトや2段階譲渡等により、売却代金が2026年と2027年以降に分かれる場合の手取り額をシミュレーションします。受取割合を変えながら税負担の変化を確認できます。
                </p>
              </div>
            </section>

            <div style={{ fontSize: 11, color: C.textMuted, lineHeight: 1.6, padding: "10px 12px", background: "#F8FAFC", borderRadius: 6 }}>
              ※ 本シミュレーションは令和8年度税制改正大綱に基づく概算です。法案成立後の最終的な条文により結果が異なる場合があります。実際のお取引に際しては税理士等の専門家にご相談ください。
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
