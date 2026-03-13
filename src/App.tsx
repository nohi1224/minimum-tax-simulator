// @ts-nocheck
// TODO: Full TypeScript conversion is a Phase 2 task for Claude Code
import { useState, useMemo } from "react";
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

// ─── Color Tokens ───
const C = {
  bg: "#0B1426", bgCard: "#111D35", bgCardHover: "#162544",
  border: "rgba(255,255,255,0.08)", borderLight: "rgba(255,255,255,0.15)",
  gold: "#C9A84C", goldDim: "rgba(201,168,76,0.15)", goldText: "#E8D48B",
  blue: "#4A90D9", blueDim: "rgba(74,144,217,0.12)",
  red: "#E05252", redDim: "rgba(224,82,82,0.12)", redText: "#F4A0A0",
  green: "#3DB88C", greenDim: "rgba(61,184,140,0.12)",
  textPrimary: "#E8E6E1", textSecondary: "#8B8D94", textMuted: "#5A5D66",
  white: "#FFFFFF",
};

// ─── Components ───
function Card({ children, className = "", style = {} }) {
  return (
    <div style={{ background: C.bgCard, border: `0.5px solid ${C.border}`, borderRadius: 12, padding: "20px 24px", ...style }} className={className}>
      {children}
    </div>
  );
}

function MetricCard({ label, value, sub, accent = C.gold }) {
  return (
    <div style={{ background: `linear-gradient(135deg, ${C.bgCard}, ${C.bgCardHover})`, border: `0.5px solid ${C.border}`, borderRadius: 10, padding: "16px 20px", borderLeft: `3px solid ${accent}` }}>
      <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 4, letterSpacing: 0.5 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 600, color: C.textPrimary, fontFeatureSettings: "'tnum'" }}>{value}</div>
      {sub && <div style={{ fontSize: 12, color: C.textSecondary, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function SliderInput({ label, value, onChange, min = 0, max = 500000, step = 100, suffix = "万円" }) {
  const displayVal = fmtOkuMan(value);
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
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
      <div style={{ display: "flex", alignItems: "center", background: "rgba(255,255,255,0.04)", border: `0.5px solid ${C.border}`, borderRadius: 8, padding: "8px 12px" }}>
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
          style={{ padding: "5px 12px", fontSize: 12, fontWeight: 500, background: C.goldDim, color: C.goldText, border: `0.5px solid rgba(201,168,76,0.3)`, borderRadius: 6, cursor: "pointer", transition: "all 0.15s" }}
          onMouseOver={e => { e.target.style.background = "rgba(201,168,76,0.3)"; }}
          onMouseOut={e => { e.target.style.background = C.goldDim; }}>
          {p.label}
        </button>
      ))}
    </div>
  );
}

function ComparisonRow({ label, before, after, isBold, isDiff, isRate }) {
  const style = {
    display: "grid", gridTemplateColumns: "1fr 1fr 1fr",
    padding: isBold ? "10px 0" : "6px 0",
    borderTop: isBold ? `0.5px solid ${C.borderLight}` : "none",
    fontSize: isBold ? 14 : 13,
    fontWeight: isBold ? 600 : 400,
  };
  const diff = isDiff ? after : (isRate ? after - before : after - before);
  return (
    <div style={style}>
      <div style={{ color: isBold ? C.textPrimary : C.textSecondary }}>{label}</div>
      <div style={{ textAlign: "right", color: C.textPrimary, fontFeatureSettings: "'tnum'" }}>
        {isRate ? fmtPct(before) : fmtOkuMan(before)}
      </div>
      <div style={{ textAlign: "right", fontFeatureSettings: "'tnum'", color: isDiff ? (diff > 0 ? C.redText : diff < 0 ? "#7FD4B0" : C.textSecondary) : C.textPrimary }}>
        {isDiff ? (
          isRate ? `${diff > 0 ? "+" : ""}${fmtPct(diff)}` :
          diff > 0 ? `▲${fmtOkuMan(diff)}` : diff < 0 ? `▼${fmtOkuMan(Math.abs(diff))}` : "—"
        ) : (isRate ? fmtPct(after) : fmtOkuMan(after))}
      </div>
    </div>
  );
}

function SplitSaleSimulation({ stockPrice, stockCost, params }) {
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
    <Card style={{ marginTop: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
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

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
        <div style={{ background: C.blueDim, borderRadius: 8, padding: "12px 14px", border: `0.5px solid rgba(74,144,217,0.2)` }}>
          <div style={{ fontSize: 11, color: C.textSecondary }}>A: 2026年全量</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#7BB8F0", marginTop: 4 }}>{fmtOkuMan(rA.maNet)}</div>
          <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>税率 {fmtPct(rA.effMA)}</div>
        </div>
        <div style={{ background: C.redDim, borderRadius: 8, padding: "12px 14px", border: `0.5px solid rgba(224,82,82,0.2)` }}>
          <div style={{ fontSize: 11, color: C.textSecondary }}>B: 2027年全量</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: C.redText, marginTop: 4 }}>{fmtOkuMan(rB.maNet)}</div>
          <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>税率 {fmtPct(rB.effMA)}</div>
        </div>
        <div style={{ background: C.greenDim, borderRadius: 8, padding: "12px 14px", border: `0.5px solid rgba(61,184,140,0.2)` }}>
          <div style={{ fontSize: 11, color: C.textSecondary }}>C: {splitRatio}:{100-splitRatio} 分割</div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "#7FD4B0", marginTop: 4 }}>{fmtOkuMan(cNet)}</div>
          <div style={{ fontSize: 11, color: C.textSecondary, marginTop: 2 }}>税率 {fmtPct(cEff)}</div>
        </div>
      </div>

      {splitRatio > 0 && splitRatio < 100 && (
        <div style={{ fontSize: 12, color: C.textSecondary, marginBottom: 16, padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8 }}>
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
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={chartData} margin={{ top: 5, right: 5, left: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis dataKey="pct" tick={{ fontSize: 11, fill: C.textMuted }} />
          <YAxis tick={{ fontSize: 11, fill: C.textMuted }} tickFormatter={v => fmtOku(v)} domain={['auto', 'auto']} />
          <Tooltip
            contentStyle={{ background: C.bgCard, border: `0.5px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.textPrimary }}
            formatter={(v) => [fmtOkuMan(v), "2年間手取り"]}
          />
          <ReferenceLine y={rA.maNet} stroke={C.blue} strokeDasharray="4 4" strokeWidth={1} />
          <Bar dataKey="net" radius={[4, 4, 0, 0]}>
            {chartData.map((d, i) => (
              <Cell key={i} fill={d.label === bestPct.label ? C.green : "rgba(61,184,140,0.4)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div style={{ fontSize: 11, color: C.textSecondary, textAlign: "center", marginTop: 6 }}>
        最適: 2026年に<span style={{ color: C.goldText, fontWeight: 600 }}>{bestPct.label}%</span>売却
        （手取り {fmtOkuMan(bestPct.net)}）
        <span style={{ color: C.textMuted, marginLeft: 8 }}>--- 青線: 2026年全量売却時</span>
      </div>
    </Card>
  );
}

// ─── Main App ───
export default function App() {
  const [stockPrice, setStockPrice] = useState(100000);
  const [stockCost, setStockCost] = useState(0);
  const [showDetail, setShowDetail] = useState(false);
  const [salaryRev, setSalaryRev] = useState(0);
  const [otherIncome, setOtherIncome] = useState(0);
  const [deductions, setDeductions] = useState(200);
  const [netMode, setNetMode] = useState("ma");
  const [activeTab, setActiveTab] = useState("compare");

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

  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.textPrimary, fontFamily: "'Noto Sans JP', 'Helvetica Neue', sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: `0.5px solid ${C.border}`, padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 32, height: 32, borderRadius: 6, background: `linear-gradient(135deg, ${C.gold}, #A08030)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, color: C.bg }}>M</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, letterSpacing: 0.5 }}>ミニマムタックス シミュレーター</div>
            <div style={{ fontSize: 10, color: C.textMuted, letterSpacing: 0.8, textTransform: "uppercase" }}>M&A Tax Impact Analysis — 2026年度税制改正対応</div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {["compare", "split"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{
                padding: "6px 16px", fontSize: 12, fontWeight: 500, borderRadius: 6, cursor: "pointer",
                background: activeTab === tab ? C.goldDim : "transparent",
                color: activeTab === tab ? C.goldText : C.textSecondary,
                border: `0.5px solid ${activeTab === tab ? "rgba(201,168,76,0.3)" : C.border}`,
                transition: "all 0.2s",
              }}>
              {tab === "compare" ? "改正前後比較" : "分割売却"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px minmax(0, 1fr)", minHeight: "calc(100vh - 65px)" }}>
        {/* Sidebar */}
        <div style={{ borderRight: `0.5px solid ${C.border}`, padding: 24, overflowY: "auto" }}>
          <SliderInput label="株式譲渡価額（売却価格）" value={stockPrice} onChange={setStockPrice} min={0} max={500000} step={500} />
          <PresetButtons onSelect={setStockPrice} />
          <NumberInput label="株式取得価額（簿価）" value={stockCost} onChange={setStockCost} />

          <button onClick={() => setShowDetail(!showDetail)}
            style={{ width: "100%", padding: "8px 14px", fontSize: 12, color: C.textSecondary, background: "rgba(255,255,255,0.03)", border: `0.5px solid ${C.border}`, borderRadius: 8, cursor: "pointer", marginTop: 8, marginBottom: showDetail ? 16 : 0, textAlign: "left", transition: "all 0.2s" }}>
            {showDetail ? "▾" : "▸"} 詳細入力（他の所得）
          </button>

          {showDetail && (
            <div style={{ animation: "fadeIn 0.2s" }}>
              <NumberInput label="給与収入（年収）" value={salaryRev} onChange={setSalaryRev} />
              <NumberInput label="その他の総合課税所得" value={otherIncome} onChange={setOtherIncome} />
              <NumberInput label="所得控除合計" value={deductions} onChange={setDeductions} placeholder="200" />
            </div>
          )}

          <div style={{ marginTop: 20, padding: "12px 14px", background: "rgba(255,255,255,0.02)", borderRadius: 8, border: `0.5px solid ${C.border}` }}>
            <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 6 }}>手取り表示モード</div>
            <div style={{ display: "flex", gap: 4 }}>
              {[{ k: "ma", l: "M&A手取り" }, { k: "total", l: "年間総合" }].map(m => (
                <button key={m.k} onClick={() => setNetMode(m.k)}
                  style={{
                    flex: 1, padding: "6px 10px", fontSize: 11, borderRadius: 6, cursor: "pointer",
                    background: netMode === m.k ? C.goldDim : "transparent",
                    color: netMode === m.k ? C.goldText : C.textMuted,
                    border: `0.5px solid ${netMode === m.k ? "rgba(201,168,76,0.3)" : C.border}`,
                  }}>
                  {m.l}
                </button>
              ))}
            </div>
          </div>

          <div style={{ marginTop: 24, padding: 14, background: "rgba(224,82,82,0.06)", borderRadius: 8, border: `0.5px solid rgba(224,82,82,0.15)` }}>
            <div style={{ fontSize: 11, fontWeight: 500, color: C.redText, marginBottom: 4 }}>免責事項</div>
            <div style={{ fontSize: 10, color: C.textMuted, lineHeight: 1.6 }}>
              本シミュレーションは令和8年度税制改正大綱に基づく概算です。正確な税額は税理士にご確認ください。法案成立・施行細則により変更の可能性があります。
            </div>
          </div>
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
                  <div style={{ fontSize: 13, fontWeight: 600, color: "#7BB8F0", textAlign: "right" }}>改正前（〜2026年）</div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.redText, textAlign: "right" }}>改正後（2027年〜）</div>
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
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: C.textMuted }} interval="preserveStartEnd" />
                    <YAxis domain={[18, 38]} tick={{ fontSize: 10, fill: C.textMuted }} tickFormatter={v => `${v}%`} />
                    <Tooltip
                      contentStyle={{ background: C.bgCard, border: `0.5px solid ${C.border}`, borderRadius: 8, fontSize: 12, color: C.textPrimary }}
                      formatter={(v, name) => [`${v}%`, name === "before" ? "改正前" : "改正後"]}
                      labelFormatter={l => `譲渡所得: ${l}`}
                    />
                    <ReferenceLine y={20.315} stroke={C.textMuted} strokeDasharray="4 4" strokeWidth={0.8} label={{ value: "通常税率 20.3%", position: "insideBottomRight", fontSize: 10, fill: C.textMuted }} />
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
                      <tr style={{ borderBottom: `0.5px solid ${C.borderLight}` }}>
                        <th style={{ textAlign: "left", padding: "8px 10px", color: C.textSecondary, fontWeight: 400 }}>譲渡額</th>
                        <th style={{ textAlign: "right", padding: "8px 10px", color: "#7BB8F0", fontWeight: 500 }}>改正前 手取り</th>
                        <th style={{ textAlign: "right", padding: "8px 10px", color: "#7BB8F0", fontWeight: 500 }}>税率</th>
                        <th style={{ textAlign: "right", padding: "8px 10px", color: C.redText, fontWeight: 500 }}>改正後 手取り</th>
                        <th style={{ textAlign: "right", padding: "8px 10px", color: C.redText, fontWeight: 500 }}>税率</th>
                        <th style={{ textAlign: "right", padding: "8px 10px", color: C.textSecondary, fontWeight: 400 }}>差額</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sensitivityData.map((d, i) => (
                        <tr key={i} style={{
                          borderBottom: `0.5px solid ${C.border}`,
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
            <SplitSaleSimulation stockPrice={stockPrice} stockCost={stockCost} params={params} />
          )}
        </div>
      </div>
    </div>
  );
}
