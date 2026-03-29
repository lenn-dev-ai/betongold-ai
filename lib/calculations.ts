// lib/calculations.ts — KPI & Skalierungs-Berechnungen
import { AnalysisResult, KPIItem } from '@/types';

export const SCALE_POINTS = [1, 2, 3, 5, 10, 15, 20];
export const APPRECIATION_RATE = 0.02; // 2% p.a.
export const RENT_GROWTH_RATE = 0.02;  // 2% p.a.

// ── KPI CALCULATIONS ───────────────────────────────────────────
export function calcKPIs(analysis: AnalysisResult): KPIItem[] {
  const { rendite: r, finanzierung: f } = analysis;
  if (!f) return [];

  const noi = r?.jahreskaltmiete ? r.jahreskaltmiete * 0.75 : null;
  const dscr = noi && f.annuitaet_jahr ? noi / f.annuitaet_jahr : r?.dscr ?? null;
  const capRate = noi && f.kaufpreis ? (noi / f.kaufpreis) * 100 : r?.cap_rate_pct ?? null;
  const grm = f.kaufpreis && r?.jahreskaltmiete ? f.kaufpreis / r.jahreskaltmiete : r?.grm ?? null;
  const beo = f.annuitaet_jahr && r?.jahreskaltmiete ? (f.annuitaet_jahr / r.jahreskaltmiete) * 100 : null;
  const coc = r?.cash_on_cash_pct ?? (r?.cashflow_jahr && f.eigenkapital ? (r.cashflow_jahr / f.eigenkapital) * 100 : null);

  const equityGrowth10 = f.kaufpreis ? f.kaufpreis * Math.pow(1.02, 10) - f.kaufpreis : null;
  const debtPaydown = f.darlehensbetrag && f.restschuld_10j ? f.darlehensbetrag - f.restschuld_10j : null;
  const totalReturn10 = ((r?.cashflow_jahr ?? 0) * 10) + (equityGrowth10 ?? 0) + (debtPaydown ?? 0);
  const equityMultiple = f.eigenkapital && totalReturn10 ? 1 + totalReturn10 / f.eigenkapital : null;
  const irr_est = equityMultiple ? (Math.pow(equityMultiple, 1 / 10) - 1) * 100 : null;

  return [
    { name: 'Cap Rate', val: capRate, unit: '%', d: 2, good_min: 4, bad_max: 2.5, label: 'Nettoanfangsrendite', bench: 'Benchmark: ≥4% gut' },
    { name: 'DSCR', val: dscr, unit: 'x', d: 2, good_min: 1.25, bad_max: 1.0, label: 'Debt Service Coverage', bench: 'Benchmark: ≥1.25x gut' },
    { name: 'Bruttomietrendite', val: r?.bruttomietrendite_pct ?? null, unit: '%', d: 2, good_min: 4, bad_max: 3, label: 'Gross Yield', bench: 'Benchmark: ≥4% gut' },
    { name: 'Cash-on-Cash', val: coc, unit: '%', d: 2, good_min: 5, bad_max: 2, label: 'EK-Rendite', bench: 'Benchmark: ≥5% gut' },
    { name: 'LTV', val: f.ltv_pct, unit: '%', d: 1, good_min: 0, bad_max: 85, invert: true, label: 'Loan-to-Value', bench: 'Benchmark: <80% konservativ' },
    { name: 'GRM', val: grm, unit: 'x', d: 1, good_min: 0, bad_max: 30, invert: true, label: 'Gross Rent Multiplier', bench: 'Benchmark: <20x gut' },
    { name: 'Break-even Auslastung', val: beo, unit: '%', d: 1, good_min: 0, bad_max: 90, invert: true, label: 'Mindest-Vermietungsquote', bench: 'Benchmark: <80% gut' },
    { name: 'Equity Multiple (10J)', val: equityMultiple, unit: 'x', d: 2, good_min: 2, bad_max: 1.2, label: 'Kapitalmultiplikator', bench: 'Benchmark: ≥2x gut' },
    { name: 'IRR (est. 10J)', val: irr_est, unit: '%', d: 1, good_min: 8, bad_max: 4, label: 'Interne Rendite (Schätzung)', bench: 'Benchmark: ≥8% gut' },
  ];
}

export type KPIStatus = 'good' | 'ok' | 'bad' | 'neutral';

export function kpiStatus(kpi: KPIItem): KPIStatus {
  if (kpi.val == null) return 'neutral';
  if (kpi.invert) {
    if (kpi.val < kpi.bad_max - 5) return 'good';
    if (kpi.val > kpi.bad_max) return 'bad';
    return 'ok';
  }
  if (kpi.val >= kpi.good_min) return 'good';
  if (kpi.val < kpi.bad_max) return 'bad';
  return 'ok';
}

// ── SCALING CALCULATIONS ───────────────────────────────────────
export interface ScaleRow {
  n: number;
  ek: number;
  darlehen: number;
  rate: number;
  cashflow: number;
  portfolioValue: number;
  portfolioValue10: number;
  totalMiete: number;
}

export function calcScale(analysis: AnalysisResult, n: number): ScaleRow {
  const f = analysis.finanzierung;
  const r = analysis.rendite;
  return {
    n,
    ek: (f?.eigenkapital ?? 0) * n,
    darlehen: (f?.darlehensbetrag ?? 0) * n,
    rate: (f?.monatliche_rate ?? 0) * n,
    cashflow: (r?.cashflow_monat ?? 0) * n,
    portfolioValue: (f?.kaufpreis ?? 0) * n,
    portfolioValue10: (f?.kaufpreis ?? 0) * n * Math.pow(1 + APPRECIATION_RATE, 10),
    totalMiete: (r?.jahreskaltmiete ?? 0) * n,
  };
}

export function fiCalc(analysis: AnalysisResult, targetMonthly: number): { n: number | null; ek: number | null; darlehen: number | null; portfolioValue: number | null } {
  const cfPerUnit = analysis.rendite?.cashflow_monat ?? 0;
  if (cfPerUnit <= 0) return { n: null, ek: null, darlehen: null, portfolioValue: null };
  const n = Math.ceil(targetMonthly / cfPerUnit);
  return {
    n,
    ek: (analysis.finanzierung?.eigenkapital ?? 0) * n,
    darlehen: (analysis.finanzierung?.darlehensbetrag ?? 0) * n,
    portfolioValue: (analysis.finanzierung?.kaufpreis ?? 0) * n,
  };
}

// ── FORMATTERS ─────────────────────────────────────────────────
export const eur = (n: number | null | undefined, d = 0): string =>
  n == null ? '—' : new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: d }).format(n);

export const pct = (n: number | null | undefined, d = 2): string =>
  n == null ? '—' : `${(+n).toFixed(d)}%`;

export const num = (n: number | null | undefined, d = 0): string =>
  n == null ? '—' : new Intl.NumberFormat('de-DE', { maximumFractionDigits: d }).format(n);
