// @ts-nocheck
// TODO: Full TypeScript conversion is a Phase 2 task for Claude Code
import { useState, useMemo, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Cell } from "recharts";
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
function Card({ children, className = "", style = {} }) {
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: "20px 24px", ...style }} className={className}>
      {children}
    </div>
  );
}

function MetricCard({ label, value, sub, accent = C.gold }) {
  return (
    <div style={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 16px", borderLeft: `3px solid ${accent}` }}>
      <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 4, letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: C.textPrimary, fontFeatureSettings: "'tnum'", wordBreak: "break-all" }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SliderInput({ label, value, onChange, min = 0, max = 500000, step = 100, suffix = "万円" }) {
  const displayVal = fmtOkuMan(value);
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8, flexWrap: "wrap", gap: 4 }}>
        <label style={{ fontSize: 13, color: C.textSecondary, fontWeight: 500 }}>{label}</label>
        <span style={{ fontSize: 15, fontWeight: 600, color: C.goldText, fontFeatureSettings: "'tnum'" }}>{displayVal}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: C.gold, height: 6, cursor: "pointer" }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.textMuted, marginTop: 4 }}>
        <span>{fmtOku(min)}</span><span>{fmtOku(max)}</span>
      </div>
    </div>
  );
}

function NumberInput({ label, value, onChange, placeholder = "0" }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 12, color: C.textSecondary, display: "block", marginBottom: 4 }}>{label}</label>
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
    { label: "50億", value: 500000 },
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

  const bestPct = chartData.reduce((best, d) => d.net > best.net ? d : best, chartData[0]);

  const { rA, rB, cNet, cEff, rC1, rC2 } = scenarios;

  return (
    <Card style={{ marginTop: 16, padding: isMobile ? "16px" : "20px 24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 8 }}>
        <h3 style={{ fontSize: 15, fontWeight: 600, color: C.textPrimary, margin: 0 }}>分割売却シミュレーション</h3>
        <span style={{ fontSize: 11, color: C.textSecondary, background: C.goldDim, padding: "3px 10px", borderRadius: 4 }}>
          総額 {fmtOkuMan(total)}
        </span>
      </div>

      <div style={{ marginBottom: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: C.textSecondary }}>2026年の売却割合</span>
          <span style={{ fontSize: 14, fontWeight: 600, color: C.goldText }}>{splitRatio}%</span>
        </div>
        <input type="range" min={0} max={100} step={10} value={splitRatio}
          onChange={e => setSplitRatio(Number(e.target.value))}
          style={{ width: "100%", accentColor: C.gold, height: 6, cursor: "pointer" }} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.textMuted, marginTop: 4 }}>
          <span>全量2027年</span><span>全量2026年</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        <div style={{ background: C.blueDim, borderRadius: 8, padding: "12px 14px", border: `1px solid #BFDBFE` }}>
          <div style={{ fontSize: 11, color: C.textSecondary }}>A: 2026年全量</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.blue, marginTop: 4 }}>{fmtOkuMan(rA.maNet)}</div>
          <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>税率 {fmtPct(rA.effMA)}</div>
        </div>
        <div style={{ background: C.redDim, borderRadius: 8, padding: "12px 14px", border: `1px solid #FECACA` }}>
          <div style={{ fontSize: 11, color: C.textSecondary }}>B: 2027年全量</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.redText, marginTop: 4 }}>{fmtOkuMan(rB.maNet)}</div>
          <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>税率 {fmtPct(rB.effMA)}</div>
        </div>
        <div style={{ background: C.greenDim, borderRadius: 8, padding: "12px 14px", border: `1px solid #A7F3D0` }}>
          <div style={{ fontSize: 11, color: C.textSecondary }}>C: {splitRatio}:{100-splitRatio} 分割</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#059669", marginTop: 4 }}>{fmtOkuMan(cNet)}</div>
          <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>税率 {fmtPct(cEff)}</div>
        </div>
      </div>

      {splitRatio > 0 && splitRatio < 100 && (
        <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 16, padding: "10px 14px", background: "#F8FAFC", borderRadius: 8, border: `1px solid ${C.border}` }}>
          <div style={{ marginBottom: 4 }}>
            <span style={{ color: C.textMuted }}>1年目（2026年・改正前）:</span>{" "}
            {fmtOkuMan(scenarios.y1Price)} → MT {rC1.triggered ? <span style={{color: C.redText}}>発動</span> : "なし"}
          </div>
          <div>
            <span style={{ color: C.textMuted }}>2年目（2027年・改正後）:</span>{" "}
            {fmtOkuMan(scenarios.y2Price)} → MT {rC2.triggered ? <span style={{color: C.redText}}>発動</span> : "なし"}
          </div>
        </div>
      )}

      <div style={{ fontSize: 13, fontWeight: 500, color: C.textSecondary, marginBottom: 8 }}>最適分割比率チャート</div>
      <ResponsiveContainer width="100%" height={isMobile ? 180 : 200}>
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: isMobile ? -10 : 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
          <XAxis dataKey="pct" tick={{ fontSize: isMobile ? 9 : 11, fill: C.textSecondary }} />
          <YAxis tick={{ fontSize: isMobile ? 9 : 11, fill: C.textSecondary }} tickFormatter={v => fmtOku(v)} domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ background: C.bgCard, border: `1px solid ${C.border}`, borderRadius: 6, fontSize: 12, color: C.textPrimary }}
            formatter={(v) => [fmtOkuMan(v), "2年間手取り"]}
          />
          <ReferenceLine y={rA.maNet} stroke={C.blue} strokeDasharray="4 4" strokeWidth={1} />
          <Bar dataKey="net" radius={[4, 4, 0, 0]}>
            {chartData.map((d, i) => (
              <Cell key={i} fill={d.label === bestPct.label ? C.green : "#6EE7B7"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ fontSize: 11, color: C.textSecondary, textAlign: "center", marginTop: 6 }}>
        最適: 2026年に<span style={{ color: C.goldText, fontWeight: 600 }}>{bestPct.label}%</span>売却
        （手取り {fmtOkuMan(bestPct.net)}）
        {!isMobile && <span style={{ color: C.textMuted, marginLeft: 8 }}>--- 青線: 2026年全量売却時</span>}
      </div>
    </Card>
  );
}

// ─── Input Panel (extracted for mobile accordion) ───
function InputPanel({ stockPrice, setStockPrice, stockCost, setStockCost, showDetail, setShowDetail, salaryRev, setSalaryRev, otherIncome, setOtherIncome, deductions, setDeductions, netMode, setNetMode, isMobile }) {
  return (
    <>
      <SliderInput label="株式譲渡価額（売却価格）" value={stockPrice} onChange={setStockPrice} min={0} max={500000} step={500} />
      <PresetButtons onSelect={setStockPrice} />
      <NumberInput label="株式取得価額（簿価）" value={stockCost} onChange={setStockCost} />

      <button onClick={() => setShowDetail(!showDetail)}
        style={{ width: "100%", padding: "8px 14px", fontSize: 12, color: C.textSecondary, background: "#F8FAFC", border: `1px solid ${C.border}`, borderRadius: 6, cursor: "pointer", marginTop: 8, marginBottom: showDetail ? 16 : 0, textAlign: "left", transition: "all 0.2s" }}>
        {showDetail ? "▾" : "▸"} 詳細入力（他の所得）
      </button>

      {showDetail && (
        <div style={{ animation: "fadeIn 0.2s" }}>
          <NumberInput label="給与収入（年収）" value={salaryRev} onChange={setSalaryRev} />
          <NumberInput label="その他の総合課税所得" value={otherIncome} onChange={setOtherIncome} />
          <NumberInput label="所得控除合計" value={deductions} onChange={setDeductions} placeholder="200" />
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
  const [showInputPanel, setShowInputPanel] = useState(false);

  const params = useMemo(() => ({
    stockPrice, stockCost, salaryRev, otherIncome,
    listedTransfer: 0, listedDiv: 0, deductions,
  }), [stockPrice, stockCost, salaryRev, otherIncome, deductions]);

  const before = useMemo(() => calcTaxes(params, MT_BEFORE), [params]);
  const after = useMemo(() => calcTaxes(params, MT_AFTER), [params]);

  const chartData = useMemo(() => {
    const points = [0, 5000, 10000, 15000, 20000, 25000, 30000, 33000, 35000, 40000, 50000, 60000, 80000, 100000, 150000, 200000, 300000, 500000];
    return points.map(amt => {
      const p = { ...params, stockPrice: amt };
      const b = calcTaxes(p, MT_BEFORE);
      const a = calcTaxes(p, MT_AFTER);
      return { amt, label: fmtOku(amt), before: Math.round(b.effMA * 100) / 100, after: Math.round(a.effMA * 100) / 100 };
    });
  }, [params]);

  const sensitivityData = useMemo(() => {
    return [10000, 20000, 30000, 50000, 100000, 200000, 500000].map(amt => {
      const p = { ...params, stockPrice: amt };
      const b = calcTaxes(p, MT_BEFORE);
      const a = calcTaxes(p, MT_AFTER);
      return { amt, bNet: b.maNet, aNet: a.maNet, diff: a.maNet - b.maNet, bEff: b.effMA, aEff: a.effMA };
    });
  }, [params]);

  const diff = after.maNet - before.maNet;
  const diffTax = after.stockTotalTax - before.stockTotalTax;

  const inputPanelProps = { stockPrice, setStockPrice, stockCost, setStockCost, showDetail, setShowDetail, salaryRev, setSalaryRev, otherIncome, setOtherIncome, deductions, setDeductions, netMode, setNetMode, isMobile };

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.textPrimary, fontFamily: "'Noto Sans JP', 'Helvetica Neue', sans-serif" }}>
      {/* Header */}
      <div style={{
        borderBottom: `1px solid ${C.border}`, padding: isMobile ? "12px 16px" : "16px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        background: C.white, flexWrap: isMobile ? "wrap" : "nowrap", gap: isMobile ? 8 : 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 28, height: 28, borderRadius: 6, background: C.gold, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: C.white, flexShrink: 0 }}>M</div>
          <div>
            <div style={{ fontSize: isMobile ? 13 : 15, fontWeight: 600, letterSpacing: 0.5 }}>ミニマムタックス シミュレーター</div>
            {!isMobile && <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: 0.8, textTransform: "uppercase" }}>M&A Tax Impact Analysis — 2026年度税制改正対応</div>}
          </div>
        </div>
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
              {tab === "compare" ? "改正前後比較" : "分割売却"}
            </button>
          ))}
        </div>
      </div>

      {isMobile ? (
        /* Mobile: single column layout */
        <div style={{ padding: 16 }}>
          {/* Collapsible input panel */}
          <button onClick={() => setShowInputPanel(!showInputPanel)}
            style={{
              width: "100%", padding: "10px 14px", fontSize: 13, fontWeight: 500,
              color: C.goldText, background: C.goldDim, border: `1px solid #BFDBFE`,
              borderRadius: 8, cursor: "pointer", marginBottom: 16, textAlign: "left",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
            <span>{showInputPanel ? "▾" : "▸"} 入力条件を{showInputPanel ? "閉じる" : "開く"}</span>
            <span style={{ fontSize: 12, color: C.textSecondary }}>{fmtOkuMan(stockPrice)}</span>
          </button>

          {showInputPanel && (
            <Card style={{ marginBottom: 16, padding: 16, animation: "fadeIn 0.2s" }}>
              <InputPanel {...inputPanelProps} />
            </Card>
          )}

          {activeTab === "compare" ? (
            <>
              {/* Hero Metrics - 2x2 grid on mobile */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 16 }}>
                <MetricCard label="株式譲渡所得" value={fmtOkuMan(before.stockIncome)} accent={C.gold} />
                <MetricCard
                  label="増税額"
                  value={diffTax > 0 ? `▲${fmtOkuMan(diffTax)}` : "影響なし"}
                  sub={diffTax > 0 ? `手取り ${fmtOkuMan(diff)}` : ""}
                  accent={diffTax > 0 ? C.red : C.green}
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
                <ComparisonRow label="MT追加税額" before={before.mtAdd} after={after.mtAdd} isMobile />
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
                <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary, marginBottom: 12 }}>感応度テーブル</div>
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
            <InputPanel {...inputPanelProps} />
          </div>

          {/* Main Content */}
          <div style={{ padding: 24, overflowY: "auto" }}>
            {activeTab === "compare" ? (
              <>
                {/* Hero Metrics */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12, marginBottom: 24 }}>
                  <MetricCard label="株式譲渡所得" value={fmtOkuMan(before.stockIncome)} accent={C.gold} />
                  <MetricCard label="改正前 手取り" value={fmtOkuMan(before.maNet)} sub={`実効税率 ${fmtPct(before.effMA)}`} accent={C.blue} />
                  <MetricCard label="改正後 手取り" value={fmtOkuMan(after.maNet)} sub={`実効税率 ${fmtPct(after.effMA)}`} accent={C.red} />
                  <MetricCard
                    label="増税額"
                    value={diffTax > 0 ? `▲${fmtOkuMan(diffTax)}` : "影響なし"}
                    sub={diffTax > 0 ? `手取り ${fmtOkuMan(diff)}` : ""}
                    accent={diffTax > 0 ? C.red : C.green}
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
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.textPrimary, marginBottom: 14 }}>感応度テーブル</div>
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
              </>
            ) : (
              <SplitSaleSimulation stockPrice={stockPrice} stockCost={stockCost} params={params} isMobile={false} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
