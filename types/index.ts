// types/index.ts

export type Empfehlung = 'KAUFEN' | 'ABWARTEN' | 'NICHT_KAUFEN';

export interface FinanzierungsParams {
  eigenkapital: number;
  zinssatz: number;
  tilgung: number;
  laufzeit: number;
  grunderwerbsteuer: number;
  notar: number;
  makler: number;
  bundesland: string;
}

export interface Property {
  address: string | null;
  type: string | null;
  size_m2: number | null;
  rooms: number | null;
  kaufpreis: number | null;
  kaltmiete_monat: number | null;
  baujahr: number | null;
  zustand: string | null;
  etage: string | null;
  stellplatz: boolean;
  aufzug: boolean;
  energieausweis: string | null;
  besonderheiten: string[];
}

export interface Verdict {
  empfehlung: Empfehlung;
  titel: string;
  begruendung: string;
  score: number;
}

export interface Finanzierung {
  kaufpreis: number;
  kaufnebenkosten_pct: number;
  kaufnebenkosten_eur: number;
  gesamtinvestition: number;
  eigenkapital: number;
  darlehensbetrag: number;
  zinssatz_pct: number;
  tilgung_pct: number;
  monatliche_rate: number;
  annuitaet_jahr: number;
  restschuld_10j: number;
  ltv_pct: number;
}

export interface Rendite {
  jahreskaltmiete: number | null;
  bruttomietrendite_pct: number | null;
  nettomietrendite_pct: number | null;
  cashflow_monat: number | null;
  cashflow_jahr: number | null;
  cash_on_cash_pct: number | null;
  break_even_jahre: number | null;
  cap_rate_pct: number | null;
  dscr: number | null;
  grm: number | null;
}

export interface Risiko {
  titel: string;
  beschreibung: string;
  schwere: 'HOCH' | 'MITTEL' | 'NIEDRIG';
}

export interface Chance {
  titel: string;
  beschreibung: string;
}

export interface Verhandlung {
  spielraum_pct: number | null;
  zielpreis: number | null;
  argumente: string[];
}

export interface AnalysisResult {
  property: Property;
  verdict: Verdict;
  finanzierung: Finanzierung;
  rendite: Rendite;
  risiken: Risiko[];
  chancen: Chance[];
  empfehlungen: string[];
  verhandlung: Verhandlung;
  markteinschaetzung: string;
  fazit: string;
}

export interface FinancialProjectionRow {
  jahr: number;
  mieteinnahmen: number;
  kosten_bewirtschaftung: number;
  noi: number;
  zinszahlung: number;
  tilgung: number;
  cashflow: number;
  kumulativer_cashflow: number;
  geschaetzter_immobilienwert: number;
  eigenkapitalzuwachs: number;
}

export interface ExitStrategy {
  name: string;
  horizont_jahre: number;
  geschaetzter_erlos: number;
  gesamtrendite_pct: number;
  equity_multiple: number;
  beschreibung: string;
}

export interface RisikoMatrixItem {
  risiko: string;
  wahrscheinlichkeit: 'HOCH' | 'MITTEL' | 'NIEDRIG';
  auswirkung: 'HOCH' | 'MITTEL' | 'NIEDRIG';
  massnahme: string;
}

export interface BusinessPlan {
  executive_summary: string;
  investment_thesis: string;
  investment_highlights: string[];
  strategy: string;
  target_horizon_jahre: number;
  marktanalyse: {
    markt: string;
    lage: string;
    wettbewerb: string;
    nachfrage: string;
  };
  financial_projections: FinancialProjectionRow[];
  exit_strategies: ExitStrategy[];
  wertschoepfung: string[];
  risiko_matrix: RisikoMatrixItem[];
  kpis_ziel: {
    ziel_rendite_pct: number;
    max_ltv_pct: number;
    min_dscr: number;
    ziel_cashflow_monat: number;
  };
  naechste_schritte: string[];
  fazit: string;
}

export interface KPIItem {
  name: string;
  val: number | null;
  unit: string;
  d: number;
  good_min: number;
  bad_max: number;
  invert?: boolean;
  label: string;
  bench: string;
}

// Database types (Supabase)
export interface DBAnalysis {
  id: string;
  user_id: string;
  created_at: string;
  property_url: string | null;
  expose_text: string | null;
  property_data: Property;
  verdict: Verdict;
  finanzierung: Finanzierung;
  rendite: Rendite;
  risiken: Risiko[];
  chancen: Chance[];
  empfehlungen: string[];
  verhandlung: Verhandlung;
  markteinschaetzung: string;
  fazit: string;
  params: FinanzierungsParams;
  score: number;
  empfehlung: Empfehlung;
  portfolio_status: 'watching' | 'bought' | 'rejected' | null;
  notes: string | null;
  kaufpreis: number | null;
  adresse: string | null;
  objekt_typ: string | null;
}

export interface DBBusinessPlan {
  id: string;
  analysis_id: string;
  user_id: string;
  created_at: string;
  data: BusinessPlan;
}
