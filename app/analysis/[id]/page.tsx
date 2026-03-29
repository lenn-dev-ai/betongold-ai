'use client';
// app/analysis/[id]/page.tsx
import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { DBAnalysis } from '@/types';
import { eur, pct, calcKPIs, kpiStatus, calcScale, SCALE_POINTS } from '@/lib/calculations';
import { Toaster } from '@/components/ui/toaster';
import { successToast, errorToast } from '@/components/ui/toast';

const VERDICT_CONFIG = {
  KAUFEN:       { icon: '✦', color: '#3ecf8e', bg: 'rgba(62,207,142,.05)', border: 'rgba(62,207,142,.2)' },
  ABWARTEN:     { icon: '◈', color: '#f0b429', bg: 'rgba(240,180,41,.05)', border: 'rgba(240,180,41,.2)' },
  NICHT_KAUFEN: { icon: '✕', color: '#f76b6b', bg: 'rgba(247,107,107,.05)', border: 'rgba(247,107,107,.2)' },
};

const TABS = ['Analyse', 'Business Plan', 'Skalierung', 'KPI Dashboard'];

export default function AnalysisPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [analysis, setAnalysis] = useState<DBAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [bp, setBp] = useState<any>(null);
  const [bpLoading, setBpLoading] = useState(false);
  const [scaleN, setScaleN] = useState(10);
  const [status, setStatus] = useState<string>('watching');
  const [saving, setSaving] = useState(false);
  const [notes, setNotes] = useState('');
  const [notesSaving, setNotesSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.from('analyses').select('*').eq('id', params.id).single()
      .then(({ data }) => {
        if (data) {
          setAnalysis(data as DBAnalysis);
          setStatus(data.portfolio_status || 'watching');
          setNotes(data.notes || '');
        }
      });
  }, [params.id]);

  async function generateBP() {
    if (!analysis) return;
    setBpLoading(true);
    try {
      const res = await fetch('/api/businessplan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ analysisId: analysis.id, analysisData: analysis }),
      });
      const data = await res.json();
      if (data.result) setBp(data.result);
    } finally { setBpLoading(false); }
  }

  async function updateStatus(newStatus: string) {
    setSaving(true);
    await supabase.from('analyses').update({ portfolio_status: newStatus }).eq('id', params.id);
    setStatus(newStatus);
    setSaving(false);
  }

  const saveNotes = useCallback(async () => {
    if (!analysis) return;
    setNotesSaving(true);
    const { error } = await supabase
      .from('analyses')
      .update({ notes })
      .eq('id', params.id);
    setNotesSaving(false);
    if (error) {
      errorToast('Notizen konnten nicht gespeichert werden');
    } else {
      successToast('Notizen gespeichert');
    }
  }, [analysis, notes, params.id, supabase]);

  async function handleDelete() {
    setDeleting(true);
    const { error } = await supabase.from('analyses').delete().eq('id', params.id);
    if (error) {
      errorToast('Analyse konnte nicht gel\u00f6scht werden');
      setDeleting(false);
      setShowDeleteConfirm(false);
    } else {
      router.push('/dashboard');
    }
  }

  async function exportPDF() {
    setExporting(true);
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');
      const element = document.getElementById('analysis-content');
      if (!element) return;
      const canvas = await html2canvas(element, { backgroundColor: '#08090d', scale: 2 });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 0;
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= 297;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= 297;
      }
      pdf.save(`ImmoAnalyse-${params.id.slice(0, 8)}.pdf`);
      successToast('PDF exportiert');
    } catch {
      errorToast('PDF-Export fehlgeschlagen');
    } finally {
      setExporting(false);
    }
  }

  if (!analysis) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-border2 border-t-gold rounded-full animate-spin" />
    </div>
  );

  const v = analysis.verdict;
  const f = analysis.finanzierung;
  const r = analysis.rendite;
  const p = analysis.property_data;
  const vc = VERDICT_CONFIG[v?.empfehlung as keyof typeof VERDICT_CONFIG] || VERDICT_CONFIG.ABWARTEN;
  const kpis = calcKPIs({ property: p, verdict: v, finanzierung: f, rendite: r, risiken: analysis.risiken || [], chancen: analysis.chancen || [], empfehlungen: analysis.empfehlungen || [], verhandlung: analysis.verhandlung, markteinschaetzung: analysis.markteinschaetzung || '', fazit: analysis.fazit || '' });

  return (
    <div className="min-h-screen bg-bg bg-app-gradient">
      <Toaster />

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="ia-card p-8 max-w-sm mx-4">
            <div className="ia-label">Analyse l\u00f6schen</div>
            <p className="text-sm text-muted2 mb-6">
              Sind Sie sicher, dass Sie diese Analyse unwiderruflich l\u00f6schen m\u00f6chten? Dieser Vorgang kann nicht r\u00fcckg\u00e4ngig gemacht werden.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setShowDeleteConfirm(false)} className="ia-btn-outline flex-1 py-2.5" disabled={deleting}>
                Abbrechen
              </button>
              <button onClick={handleDelete} className="flex-1 py-2.5 bg-danger text-white font-mono text-[10px] tracking-[.1em] uppercase cursor-pointer border-none rounded-none" disabled={deleting}>
                {deleting ? 'L\u00f6sche\u2026' : 'Endg\u00fcltig l\u00f6schen'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-s1/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="text-muted hover:text-text transition-colors text-sm">\u2190 Dashboard</Link>
            <span className="text-border hidden sm:block">|</span>
            <span className="font-mono text-[10px] tracking-widest uppercase text-gold hidden sm:block">Analyse</span>
          </div>
          {/* Tab Bar (desktop) */}
          <div className="hidden md:flex">
            {TABS.map((t, i) => (
              <button key={t} onClick={() => { setActiveTab(i); if (i === 1 && !bp) generateBP(); }}
                className={`px-5 py-4 font-mono text-[10px] tracking-[.12em] uppercase border-b-2 transition-all
                  ${activeTab === i ? 'text-gold border-gold' : 'text-muted border-transparent hover:text-text'}`}>
                {t}
              </button>
            ))}
          </div>
          {/* Actions */}
          <div className="flex items-center gap-2">
            <button onClick={exportPDF} disabled={exporting}
              className="ia-btn-outline py-1.5 px-3 text-[9px]">
              {exporting ? 'Exportiere\u2026' : '\u2193 PDF'}
            </button>
            <select value={status} onChange={e => updateStatus(e.target.value)}
              className="bg-s2 border border-border text-muted2 font-mono text-[10px] tracking-[.08em] uppercase px-2 py-1.5 outline-none cursor-pointer rounded-none">
              <option value="watching">\uD83D\uDC41 Beobachtet</option>
              <option value="bought">\u2713 Gekauft</option>
              <option value="rejected">\u2715 Abgelehnt</option>
            </select>
            <button onClick={() => setShowDeleteConfirm(true)}
              className="ia-btn-outline py-1.5 px-3 text-[9px] text-danger border-danger/30 hover:border-danger/60 hover:text-danger">
              L\u00f6schen
            </button>
          </div>
        </div>
        {/* Mobile Tab Bar */}
        <div className="md:hidden flex border-t border-border overflow-x-auto">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => { setActiveTab(i); if (i === 1 && !bp) generateBP(); }}
              className={`flex-shrink-0 px-4 py-3 font-mono text-[9px] tracking-[.1em] uppercase border-b-2 transition-all
                ${activeTab === i ? 'text-gold border-gold' : 'text-muted border-transparent'}`}>
              {t}
            </button>
          ))}
        </div>
      </nav>

      <main id="analysis-content" className="max-w-6xl mx-auto px-4 sm:px-6 py-8 animate-slideIn">

        {/* \u2500\u2500 TAB 0: ANALYSE \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
        {activeTab === 0 && (
          <>
            {/* Property header */}
            <div className="mb-6">
              <div className="font-mono text-[10px] tracking-[.2em] uppercase text-gold mb-1.5">{p?.type || 'Immobilie'}</div>
              <h1 className="font-serif text-2xl sm:text-3xl text-text mb-1">{p?.address || 'Adresse nicht ermittelt'}</h1>
              {p?.size_m2 && <div className="font-mono text-xs text-muted2">{p.size_m2} m\u00b2 \u00b7 {p.rooms} Zi.{p.baujahr ? ` \u00b7 Bj. ${p.baujahr}` : ''}</div>}
            </div>

            {/* Verdict */}
            <div className="border rounded-none p-6 mb-4 flex items-center gap-6 flex-wrap"
              style={{ background: vc.bg, borderColor: vc.border }}>
              <div className="text-4xl" style={{ color: vc.color }}>{vc.icon}</div>
              <div className="flex-1">
                <div className="font-mono text-[9px] tracking-[.2em] uppercase mb-1" style={{ color: vc.color }}>
                  {v?.empfehlung?.replace('_', ' ')}
                </div>
                <div className="font-serif text-xl text-text mb-1">{v?.titel}</div>
                <div className="text-sm text-muted2 leading-relaxed">{v?.begruendung}</div>
              </div>
              <div className="text-center">
                <div className="font-mono text-5xl font-light" style={{ color: (v?.score ?? 0) >= 70 ? '#3ecf8e' : (v?.score ?? 0) >= 45 ? '#f0b429' : '#f76b6b' }}>{v?.score}</div>
                <div className="text-muted text-[10px] mt-1">von 100</div>
              </div>
            </div>

            {/* Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border mb-4">
              {[
                { l: 'Kaufpreis', v: eur(f?.kaufpreis), c: 'text-gold' },
                { l: 'Rate/Monat', v: eur(f?.monatliche_rate), c: '' },
                { l: 'Bruttomietrendite', v: pct(r?.bruttomietrendite_pct), c: (r?.bruttomietrendite_pct ?? 0) >= 4 ? 'text-success' : 'text-warning' },
                { l: 'Cashflow/Monat', v: eur(r?.cashflow_monat), c: (r?.cashflow_monat ?? 0) >= 0 ? 'text-success' : 'text-danger' },
              ].map((m, i) => (
                <div key={i} className="bg-s1 px-4 py-4 text-center">
                  <div className={`font-mono text-base mb-0.5 ${m.c}`}>{m.v}</div>
                  <div className="text-muted text-[11px]">{m.l}</div>
                </div>
              ))}
            </div>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Finanzierung */}
              <div className="ia-card p-6">
                <div className="ia-label">Finanzierungsstruktur</div>
                <table className="ia-table">
                  <tbody>
                    {[
                      ['Kaufpreis', eur(f?.kaufpreis), ''],
                      [`Nebenkosten (${pct(f?.kaufnebenkosten_pct, 1)})`, eur(f?.kaufnebenkosten_eur), ''],
                      ['Gesamtinvestition', eur(f?.gesamtinvestition), 'total'],
                      ['Eigenkapital', `\u2212${eur(f?.eigenkapital)}`, 'text-success'],
                      ['Darlehen', eur(f?.darlehensbetrag), ''],
                      ['LTV', pct(f?.ltv_pct, 1), (f?.ltv_pct ?? 0) > 80 ? 'text-warning' : ''],
                      ['Monatliche Rate', eur(f?.monatliche_rate), 'total'],
                      ['Restschuld 10J', eur(f?.restschuld_10j), 'text-muted2'],
                    ].map(([l, v, cls], i) => (
                      <tr key={i} className={cls === 'total' ? 'total' : ''}>
                        <td style={{ color: cls === 'total' ? undefined : 'var(--muted2)' }}>{l}</td>
                        <td style={{ color: cls && cls !== 'total' ? `var(--${cls.replace('text-', '')})` : undefined }}>{v}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Rendite */}
              <div className="ia-card p-6">
                <div className="ia-label">Renditekennzahlen</div>
                <table className="ia-table">
                  <tbody>
                    {[
                      ['Jahreskaltmiete', eur(r?.jahreskaltmiete)],
                      ['Bruttomietrendite', pct(r?.bruttomietrendite_pct)],
                      ['Nettomietrendite', pct(r?.nettomietrendite_pct)],
                      ['Cap Rate (NOI/Preis)', pct(r?.cap_rate_pct)],
                      ['DSCR', r?.dscr ? `${(+r.dscr).toFixed(2)}x` : '\u2014'],
                      ['Cash-on-Cash', pct(r?.cash_on_cash_pct)],
                      ['GRM', r?.grm ? `${(+r.grm).toFixed(1)}x` : '\u2014'],
                      ['Cashflow/Monat', eur(r?.cashflow_monat)],
                      ['Break-Even', r?.break_even_jahre ? `${r.break_even_jahre} J.` : '\u2014'],
                    ].map(([l, v], i) => (
                      <tr key={i}><td style={{ color: 'var(--muted2)' }}>{l}</td><td>{v}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Verhandlung */}
            {analysis.verhandlung?.zielpreis && (
              <div className="ia-card p-6 mt-4">
                <div className="ia-label">Verhandlungsstrategie</div>
                <div className="flex gap-3 mb-4 flex-wrap">
                  {analysis.verhandlung.zielpreis && <span className="border border-success/30 bg-success/5 text-success font-mono text-[10px] tracking-[.1em] uppercase px-3 py-1.5">Zielpreis: {eur(analysis.verhandlung.zielpreis)}</span>}
                  {analysis.verhandlung.spielraum_pct && <span className="border border-warning/30 bg-warning/5 text-warning font-mono text-[10px] tracking-[.1em] uppercase px-3 py-1.5">Spielraum: \u2248{pct(analysis.verhandlung.spielraum_pct, 1)}</span>}
                </div>
                <ul className="space-y-2">
                  {(analysis.verhandlung.argumente || []).map((arg: string, i: number) => (
                    <li key={i} className="flex gap-3 text-sm text-text/90">
                      <span className="w-1.5 h-1.5 rounded-full bg-gold flex-shrink-0 mt-2" />
                      {arg}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risiken & Chancen */}
            <div className="grid md:grid-cols-2 gap-4 mt-4">
              {analysis.risiken?.length > 0 && (
                <div className="ia-card p-6">
                  <div className="ia-label">Risiken</div>
                  <ul className="space-y-3">
                    {analysis.risiken.map((risk: any, i: number) => (
                      <li key={i} className="flex gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-2"
                          style={{ background: risk.schwere === 'HOCH' ? '#f76b6b' : risk.schwere === 'MITTEL' ? '#f0b429' : '#3ecf8e' }} />
                        <div>
                          <div className="text-sm font-medium mb-0.5">{risk.titel}
                            <span className="ml-2 font-mono text-[9px] tracking-[.08em] uppercase px-1.5 py-0.5 rounded-none"
                              style={{ background: risk.schwere === 'HOCH' ? 'rgba(247,107,107,.1)' : risk.schwere === 'MITTEL' ? 'rgba(240,180,41,.1)' : 'rgba(62,207,142,.1)', color: risk.schwere === 'HOCH' ? '#f76b6b' : risk.schwere === 'MITTEL' ? '#f0b429' : '#3ecf8e' }}>
                              {risk.schwere}
                            </span>
                          </div>
                          <div className="text-xs text-muted2 leading-relaxed">{risk.beschreibung}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {analysis.chancen?.length > 0 && (
                <div className="ia-card p-6">
                  <div className="ia-label">Chancen</div>
                  <ul className="space-y-3">
                    {analysis.chancen.map((c: any, i: number) => (
                      <li key={i} className="flex gap-3 pb-3 border-b border-border last:border-0 last:pb-0">
                        <span className="w-1.5 h-1.5 rounded-full bg-success flex-shrink-0 mt-2" />
                        <div>
                          <div className="text-sm font-medium mb-0.5">{c.titel}</div>
                          <div className="text-xs text-muted2">{c.beschreibung}</div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Fazit */}
            {analysis.fazit && (
              <div className="ia-card p-6 mt-4">
                <div className="ia-label">Professionelles Fazit</div>
                <div className="ia-highlight">{analysis.fazit}</div>
              </div>
            )}

            {/* Notizen */}
            <div className="ia-card p-6 mt-4">
              <div className="ia-label">Pers\u00f6nliche Notizen</div>
              <textarea
                className="ia-input min-h-[100px] leading-relaxed mb-3"
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Eigene Anmerkungen zu dieser Immobilie\u2026"
              />
              <button onClick={saveNotes} disabled={notesSaving}
                className="ia-btn-outline py-2 px-5 text-[10px]">
                {notesSaving ? 'Speichere\u2026' : 'Notizen speichern'}
              </button>
            </div>
          </>
        )}

        {/* \u2500\u2500 TAB 1: BUSINESS PLAN \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
        {activeTab === 1 && (
          <>
            {bpLoading && (
              <div className="text-center py-20">
                <div className="w-10 h-10 border-2 border-border2 border-t-gold rounded-full mx-auto mb-4 animate-spin" />
                <div className="font-mono text-[11px] tracking-widest uppercase text-muted">Business Plan wird generiert\u2026</div>
              </div>
            )}
            {!bpLoading && !bp && (
              <div className="text-center py-20">
                <div className="font-serif text-2xl mb-3">Business Plan</div>
                <p className="text-muted2 text-sm mb-8 max-w-md mx-auto">10-Jahres-Investitionsplan mit Finanzprojektionen, Exit-Strategien und Risikomatrix.</p>
                <button onClick={generateBP} className="ia-btn-gold max-w-xs mx-auto py-3">\uD83D\uDCCB Business Plan generieren</button>
              </div>
            )}
            {bp && (
              <div className="space-y-4">
                <div className="ia-card p-7">
                  <div className="ia-label">Executive Summary</div>
                  <div className="ia-highlight mb-5">{bp.executive_summary}</div>
                  <div className="ia-label">Investitionsthese</div>
                  <p className="text-sm text-muted2 leading-relaxed">{bp.investment_thesis}</p>
                </div>
                {bp.financial_projections && (
                  <div className="ia-card p-6">
                    <div className="ia-label">10-Jahres-Finanzplanung</div>
                    <div className="overflow-x-auto">
                      <table className="ia-table min-w-[700px]">
                        <thead>
                          <tr>{['Jahr','Mieteinnahmen','Bewirt.','NOI','Zinsen','Tilgung','Cashflow','Kum. CF','Immowert','EK-Zuwachs'].map((h,i) => <th key={i}>{h}</th>)}</tr>
                        </thead>
                        <tbody>
                          {bp.financial_projections.map((row: any) => (
                            <tr key={row.jahr}>
                              <td className="text-gold font-mono">J{row.jahr}</td>
                              <td>{eur(row.mieteinnahmen)}</td>
                              <td className="text-danger">{eur(row.kosten_bewirtschaftung)}</td>
                              <td className="text-success">{eur(row.noi)}</td>
                              <td className="text-muted2">{eur(row.zinszahlung)}</td>
                              <td>{eur(row.tilgung)}</td>
                              <td style={{ color: row.cashflow >= 0 ? '#3ecf8e' : '#f76b6b' }}>{eur(row.cashflow)}</td>
                              <td style={{ color: row.kumulativer_cashflow >= 0 ? '#3ecf8e' : '#f76b6b' }}>{eur(row.kumulativer_cashflow)}</td>
                              <td>{eur(row.geschaetzter_immobilienwert)}</td>
                              <td className="text-success">{eur(row.eigenkapitalzuwachs)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {bp.exit_strategies && (
                  <div className="ia-card p-6">
                    <div className="ia-label">Exit-Strategien</div>
                    <div className="grid sm:grid-cols-3 gap-4">
                      {bp.exit_strategies.map((ex: any, i: number) => (
                        <div key={i} className="bg-s2 border border-border p-5">
                          <div className="font-mono text-[9px] tracking-[.15em] uppercase text-gold mb-2">Exit {i+1}</div>
                          <div className="font-serif text-base mb-4">{ex.name}</div>
                          <table className="ia-table text-xs"><tbody>
                            <tr><td className="text-muted2">Horizont</td><td>{ex.horizont_jahre} Jahre</td></tr>
                            <tr><td className="text-muted2">Erl\u00f6s</td><td className="text-success">{eur(ex.geschaetzter_erlos)}</td></tr>
                            <tr><td className="text-muted2">Rendite</td><td>{pct(ex.gesamtrendite_pct, 1)}</td></tr>
                            <tr><td className="text-muted2">Multiple</td><td>{ex.equity_multiple?.toFixed(2)}x</td></tr>
                          </tbody></table>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {bp.risiko_matrix && (
                  <div className="ia-card p-6">
                    <div className="ia-label">Risikomatrix</div>
                    <table className="ia-table">
                      <thead><tr><th>Risiko</th><th>Wahrsch.</th><th>Auswirkung</th><th className="text-left">Ma\u00dfnahme</th></tr></thead>
                      <tbody>
                        {bp.risiko_matrix.map((r: any, i: number) => (
                          <tr key={i}>
                            <td>{r.risiko}</td>
                            <td><span style={{ color: r.wahrscheinlichkeit === 'HOCH' ? '#f76b6b' : r.wahrscheinlichkeit === 'MITTEL' ? '#f0b429' : '#3ecf8e' }}>{r.wahrscheinlichkeit}</span></td>
                            <td><span style={{ color: r.auswirkung === 'HOCH' ? '#f76b6b' : r.auswirkung === 'MITTEL' ? '#f0b429' : '#3ecf8e' }}>{r.auswirkung}</span></td>
                            <td className="text-left text-muted2 text-xs">{r.massnahme}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {bp.fazit && <div className="ia-card p-6"><div className="ia-label">Fazit</div><div className="ia-highlight">{bp.fazit}</div></div>}
              </div>
            )}
          </>
        )}

        {/* \u2500\u2500 TAB 2: SKALIERUNG \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
        {activeTab === 2 && (
          <div className="space-y-4">
            <div className="mb-6">
              <div className="font-mono text-[10px] tracking-[.2em] uppercase text-gold mb-1.5">Portfolio-Skalierung</div>
              <h2 className="font-serif text-2xl">Was passiert, wenn Sie skalieren?</h2>
            </div>
            <div className="ia-card p-6">
              <div className="ia-label">Eigenes Szenario</div>
              <label className="block font-mono text-[11px] tracking-[.05em] text-muted2 mb-2">Anzahl Objekte: <strong className="text-gold">{scaleN}</strong></label>
              <input type="range" min="1" max="50" value={scaleN} onChange={e => setScaleN(+e.target.value)}
                className="w-full mb-5" style={{ accentColor: '#c9a84c' }} />
              {(() => {
                const row = calcScale({ property: p, verdict: v, finanzierung: f, rendite: r, risiken: [], chancen: [], empfehlungen: [], verhandlung: analysis.verhandlung, markteinschaetzung: '', fazit: '' }, scaleN);
                return (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-px bg-border border border-border">
                    {[
                      ['EK gesamt', eur(row.ek), ''],
                      ['Gesamtdarlehen', eur(row.darlehen), 'text-danger'],
                      ['Cashflow/Mo', eur(row.cashflow), row.cashflow >= 0 ? 'text-success' : 'text-danger'],
                      ['Portfoliowert 10J', eur(row.portfolioValue10), 'text-gold'],
                    ].map(([l, v, c], i) => (
                      <div key={i} className="bg-s1 px-4 py-4 text-center">
                        <div className={`font-mono text-sm mb-0.5 ${c}`}>{v}</div>
                        <div className="text-muted text-[11px]">{l}</div>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
            <div className="ia-card p-6">
              <div className="ia-label">Skalierungsszenarien</div>
              <div className="overflow-x-auto">
                <table className="ia-table min-w-[600px]">
                  <thead><tr><th>Objekte</th><th>EK-Bedarf</th><th>Darlehen</th><th>Rate/Mo</th><th>Cashflow/Mo</th><th>Portfoliowert</th><th>Portfoliowert 10J</th></tr></thead>
                  <tbody>
                    {SCALE_POINTS.map(n => {
                      const row = calcScale({ property: p, verdict: v, finanzierung: f, rendite: r, risiken: [], chancen: [], empfehlungen: [], verhandlung: analysis.verhandlung, markteinschaetzung: '', fazit: '' }, n);
                      return (
                        <tr key={n}>
                          <td className="text-gold font-mono">{n}</td>
                          <td>{eur(row.ek)}</td>
                          <td className="text-muted2">{eur(row.darlehen)}</td>
                          <td>{eur(row.rate)}</td>
                          <td style={{ color: row.cashflow >= 0 ? '#3ecf8e' : '#f76b6b' }}>{eur(row.cashflow)}</td>
                          <td>{eur(row.portfolioValue)}</td>
                          <td className="text-success">{eur(row.portfolioValue10)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="ia-card p-6">
              <div className="ia-label">Financial Independence Rechner</div>
              <table className="ia-table">
                <thead><tr><th>Ziel/Monat</th><th>Objekte ben\u00f6tigt</th><th>EK-Bedarf</th><th>Gesamtdarlehen</th><th>Portfoliowert</th></tr></thead>
                <tbody>
                  {[1000, 2000, 3000, 5000, 10000].map(target => {
                    const cf = r?.cashflow_monat ?? 0;
                    const n = cf > 0 ? Math.ceil(target / cf) : null;
                    return (
                      <tr key={target}>
                        <td className="text-gold">{eur(target, 0)}/Mo</td>
                        <td>{n ?? <span className="text-danger">\u221E</span>}</td>
                        <td>{n ? eur((f?.eigenkapital ?? 0) * n) : '\u2014'}</td>
                        <td>{n ? eur((f?.darlehensbetrag ?? 0) * n) : '\u2014'}</td>
                        <td>{n ? eur((f?.kaufpreis ?? 0) * n) : '\u2014'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* \u2500\u2500 TAB 3: KPI DASHBOARD \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500 */}
        {activeTab === 3 && (
          <div className="space-y-4">
            <div className="mb-6">
              <div className="font-mono text-[10px] tracking-[.2em] uppercase text-gold mb-1.5">KPI Dashboard</div>
              <h2 className="font-serif text-2xl">Vollst\u00e4ndige Kennzahlenanalyse</h2>
            </div>
            <div className="grid sm:grid-cols-3 gap-4">
              {kpis.map((kpi, i) => {
                const st = kpiStatus(kpi);
                const color = st === 'good' ? '#3ecf8e' : st === 'bad' ? '#f76b6b' : st === 'ok' ? '#f0b429' : '#5a6478';
                const label = st === 'good' ? 'GUT' : st === 'bad' ? 'KRITISCH' : st === 'ok' ? 'AUSREICHEND' : 'K.A.';
                const barW = kpi.val == null ? 0 : kpi.invert ? Math.min(100, kpi.val) : Math.min(100, (kpi.val / 12) * 100);
                return (
                  <div key={i} className="bg-s2 border border-border p-5 text-center">
                    <div className="font-mono text-[9px] tracking-[.15em] uppercase text-muted mb-3">{kpi.name}</div>
                    <div className="font-mono text-2xl font-light mb-1" style={{ color }}>{kpi.val != null ? `${kpi.val.toFixed(kpi.d)}${kpi.unit}` : '\u2014'}</div>
                    <div className="text-muted text-[10px] mb-3">{kpi.bench}</div>
                    <div className="h-1 bg-border2 rounded-full overflow-hidden mb-2">
                      <div className="h-full rounded-full transition-all" style={{ width: `${barW}%`, background: color }} />
                    </div>
                    <div className="font-mono text-[9px] tracking-[.1em] uppercase" style={{ color }}>{label}</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
