// lib/claude.ts — Claude API Integration
import Anthropic from '@anthropic-ai/sdk';
import { FinanzierungsParams } from '@/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// ── ANALYSIS PROMPT ────────────────────────────────────────────
export const ANALYSIS_SYSTEM_PROMPT = `Du bist ein erstklassiger Immobilienberater, Finanzierungsexperte und Asset Manager für den deutschen Markt mit 20 Jahren Erfahrung.
Antworte AUSSCHLIESSLICH mit einem JSON-Objekt (kein Markdown, keine Backticks, kein erklärender Text).

Exakte JSON-Struktur:
{
  "property": {
    "address": "string|null","type": "string|null","size_m2": Zahl|null,"rooms": Zahl|null,
    "kaufpreis": Zahl|null,"kaltmiete_monat": Zahl|null,"baujahr": Zahl|null,
    "zustand": "string|null","etage": "string|null","stellplatz": bool,"aufzug": bool,
    "energieausweis": "string|null","besonderheiten": ["string"]
  },
  "verdict": {
    "empfehlung": "KAUFEN"|"ABWARTEN"|"NICHT_KAUFEN",
    "titel": "max 8 Wörter prägnant","begruendung": "2-3 Sätze sachlich, keine Marketing-Sprache","score": 0-100
  },
  "finanzierung": {
    "kaufpreis": Zahl,"kaufnebenkosten_pct": Zahl,"kaufnebenkosten_eur": Zahl,
    "gesamtinvestition": Zahl,"eigenkapital": Zahl,"darlehensbetrag": Zahl,
    "zinssatz_pct": Zahl,"tilgung_pct": Zahl,"monatliche_rate": Zahl,
    "annuitaet_jahr": Zahl,"restschuld_10j": Zahl,"ltv_pct": Zahl
  },
  "rendite": {
    "jahreskaltmiete": Zahl|null,"bruttomietrendite_pct": Zahl|null,
    "nettomietrendite_pct": Zahl|null,"cashflow_monat": Zahl|null,
    "cashflow_jahr": Zahl|null,"cash_on_cash_pct": Zahl|null,"break_even_jahre": Zahl|null,
    "cap_rate_pct": Zahl|null,"dscr": Zahl|null,"grm": Zahl|null
  },
  "risiken": [{"titel":"string","beschreibung":"string","schwere":"HOCH"|"MITTEL"|"NIEDRIG"}],
  "chancen": [{"titel":"string","beschreibung":"string"}],
  "empfehlungen": ["string"],
  "verhandlung": {"spielraum_pct": Zahl|null,"zielpreis": Zahl|null,"argumente": ["string"]},
  "markteinschaetzung": "string",
  "fazit": "string"
}
Regeln: Erfinde keine Daten. Null wenn nicht ermittelbar. Alle Berechnungen exakt mit Nutzer-Finanzierungsparametern.
Bewirtschaftungskosten pauschal 25% der Bruttomiete. Jahreskaltmiete × 0.75 = NOI. Sei kritisch und sachlich.`;

// ── BUSINESS PLAN PROMPT ───────────────────────────────────────
export const BUSINESS_PLAN_SYSTEM_PROMPT = `Du bist ein Senior Investment Analyst und Immobilien-Business-Plan-Experte.
Antworte NUR mit JSON (keine Backticks, kein Markdown):
{
  "executive_summary": "3-4 Sätze",
  "investment_thesis": "2-3 Sätze Kernthese",
  "investment_highlights": ["string"],
  "strategy": "HALTEN"|"WERTSTEIGERUNG"|"ENTWICKLUNG",
  "target_horizon_jahre": Zahl,
  "marktanalyse": {"markt": "string","lage": "string","wettbewerb": "string","nachfrage": "string"},
  "financial_projections": [
    {"jahr":1,"mieteinnahmen":Zahl,"kosten_bewirtschaftung":Zahl,"noi":Zahl,
     "zinszahlung":Zahl,"tilgung":Zahl,"cashflow":Zahl,"kumulativer_cashflow":Zahl,
     "geschaetzter_immobilienwert":Zahl,"eigenkapitalzuwachs":Zahl}
  ],
  "exit_strategies": [
    {"name":"string","horizont_jahre":Zahl,"geschaetzter_erlos":Zahl,
     "gesamtrendite_pct":Zahl,"equity_multiple":Zahl,"beschreibung":"string"}
  ],
  "wertschoepfung": ["string"],
  "risiko_matrix": [{"risiko":"string","wahrscheinlichkeit":"HOCH"|"MITTEL"|"NIEDRIG","auswirkung":"HOCH"|"MITTEL"|"NIEDRIG","massnahme":"string"}],
  "kpis_ziel": {"ziel_rendite_pct":Zahl,"max_ltv_pct":Zahl,"min_dscr":Zahl,"ziel_cashflow_monat":Zahl},
  "naechste_schritte": ["string"],
  "fazit": "3-4 Sätze"
}
Erstelle financial_projections für 10 Jahre mit 2% Mietsteigerung p.a. und 2% Wertsteigerung p.a.`;

// ── BUILD USER MESSAGE FOR ANALYSIS ───────────────────────────
export function buildAnalysisMessage(
  input: { url?: string; text?: string },
  params: FinanzierungsParams
): string {
  const nebenkosten = params.grunderwerbsteuer + params.notar + params.makler;
  return `FINANZIERUNGSPARAMETER:
- Eigenkapital: ${params.eigenkapital} EUR
- Zinssatz: ${params.zinssatz}% p.a. | Tilgung: ${params.tilgung}% p.a.
- Laufzeit: ${params.laufzeit} Jahre
- Kaufnebenkosten: GrESt ${params.grunderwerbsteuer}% + Notar ${params.notar}% + Makler ${params.makler}% = ${nebenkosten.toFixed(2)}% gesamt (${params.bundesland})

${input.url ? `LINK: ${input.url}` : `EXPOSÉ:\n${input.text}`}

Analysiere diese Immobilie vollständig als professioneller Immobilienberater.`;
}

// ── RUN ANALYSIS ───────────────────────────────────────────────
export async function runAnalysis(
  input: { url?: string; text?: string },
  params: FinanzierungsParams
) {
  const useWebSearch = !!input.url;
  const body: any = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    system: ANALYSIS_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: buildAnalysisMessage(input, params) }],
  };
  if (useWebSearch) {
    body.tools = [{ type: 'web_search_20250305', name: 'web_search' }];
  }

  const response = await client.messages.create(body);
  const text = response.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}

// ── RUN BUSINESS PLAN ──────────────────────────────────────────
export async function runBusinessPlan(analysisData: any) {
  const response = await client.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 3000,
    system: BUSINESS_PLAN_SYSTEM_PROMPT,
    messages: [{
      role: 'user',
      content: `IMMOBILIEN-ANALYSE-DATEN:\n${JSON.stringify(analysisData, null, 2)}\n\nErstelle vollständigen 10-Jahres-Business-Plan.`
    }],
  });
  const text = response.content
    .filter((b: any) => b.type === 'text')
    .map((b: any) => b.text)
    .join('');
  return JSON.parse(text.replace(/```json|```/g, '').trim());
}
