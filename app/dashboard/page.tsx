'use client';
// app/dashboard/page.tsx
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';
import { eur, pct } from '@/lib/calculations';
import { DBAnalysis, Empfehlung } from '@/types';
import { Toaster } from '@/components/ui/toaster';
import { successToast } from '@/components/ui/toast';

const VERDICT_CONFIG = {
  KAUFEN:       { cls: 'text-success border-success/30 bg-success/5', label: 'Kaufen',       dot: 'bg-success' },
  ABWARTEN:     { cls: 'text-warning border-warning/30 bg-warning/5', label: 'Abwarten',     dot: 'bg-warning' },
  NICHT_KAUFEN: { cls: 'text-danger  border-danger/30  bg-danger/5',  label: 'Nicht kaufen', dot: 'bg-danger' },
};

const FILTER_OPTIONS: { value: Empfehlung | 'ALL'; label: string; cls: string }[] = [
  { value: 'ALL',          label: 'Alle',          cls: 'text-text' },
  { value: 'KAUFEN',       label: 'Kaufen',        cls: 'text-success' },
  { value: 'ABWARTEN',     label: 'Abwarten',      cls: 'text-warning' },
  { value: 'NICHT_KAUFEN', label: 'Nicht kaufen',  cls: 'text-danger' },
];

export default function DashboardPage() {
  const router = useRouter();
  const supabase = createClient();
  const [analyses, setAnalyses] = useState<DBAnalysis[]>([]);
  const [profile, setProfile] = useState<{ full_name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Empfehlung | 'ALL'>('ALL');

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/auth'); return; }

      const [analysesRes, profileRes] = await Promise.all([
        supabase.from('analyses').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
        supabase.from('profiles').select('full_name').eq('id', user.id).single(),
      ]);

      setAnalyses((analysesRes.data || []) as DBAnalysis[]);
      setProfile(profileRes.data);
      setLoading(false);
    }
    load();
  }, []);

  async function updatePortfolioStatus(id: string, newStatus: string) {
    await supabase.from('analyses').update({ portfolio_status: newStatus }).eq('id', id);
    setAnalyses(prev => prev.map(a => a.id === id ? { ...a, portfolio_status: newStatus as DBAnalysis['portfolio_status'] } : a));
    const labels: Record<string, string> = { watching: 'Beobachtet', bought: 'Gekauft', rejected: 'Abgelehnt' };
    successToast(`Status: ${labels[newStatus] || newStatus}`);
  }

  const list = filter === 'ALL' ? analyses : analyses.filter(a => a.empfehlung === filter);

  // Summary stats (always from full list)
  const bought     = analyses.filter(a => a.portfolio_status === 'bought');
  const watching   = analyses.filter(a => a.empfehlung === 'KAUFEN');
  const avgScore   = analyses.length ? Math.round(analyses.reduce((s, a) => s + (a.score || 0), 0) / analyses.length) : 0;
  const totalPortfoliowert = bought.reduce((s, a) => s + (a.kaufpreis || 0), 0);

  if (loading) return (
    <div className="min-h-screen bg-bg flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-border2 border-t-gold rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen bg-bg bg-app-gradient">
      <Toaster />

      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-s1/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 border border-gold flex items-center justify-center font-serif text-gold text-sm">B</div>
            <span className="font-sans font-semibold text-sm">BetongGold <span className="font-mono text-[9px] tracking-widest uppercase text-gold bg-gold/10 px-1.5 py-0.5">AI</span></span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/analyze" className="ia-btn-gold py-2 px-6 text-[10px] no-underline">+ Neue Analyse</Link>
            <form action="/api/auth/signout" method="POST">
              <button className="ia-btn-outline py-1.5 px-3 text-[10px]">Abmelden</button>
            </form>
          </div>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <div className="font-mono text-[10px] tracking-[.2em] uppercase text-gold mb-2">Dashboard</div>
          <h1 className="font-serif text-3xl text-text">Guten Tag{profile?.full_name ? `, ${profile.full_name.split(' ')[0]}` : ''}</h1>
          <p className="text-muted2 text-sm mt-1">{analyses.length} Analyse{analyses.length !== 1 ? 'n' : ''} gespeichert</p>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-4 gap-px bg-border border border-border mb-8">
          {[
            { label: 'Gesamt Analysen', val: analyses.length, cls: '' },
            { label: 'Kaufempfehlungen', val: watching.length, cls: 'text-success' },
            { label: '\u00d8 Score', val: avgScore, cls: avgScore >= 70 ? 'text-success' : avgScore >= 45 ? 'text-warning' : 'text-danger' },
            { label: 'Portfolio-Wert', val: totalPortfoliowert ? eur(totalPortfoliowert) : '\u2014', cls: 'text-gold' },
          ].map((s, i) => (
            <div key={i} className="bg-s1 px-5 py-4 text-center">
              <div className={`font-mono text-2xl font-light mb-1 ${s.cls}`}>{s.val}</div>
              <div className="text-muted text-[11px]">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filter Buttons */}
        <div className="flex gap-px bg-border border border-border mb-6">
          {FILTER_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setFilter(opt.value)}
              className={`flex-1 py-2.5 font-mono text-[10px] tracking-[.1em] uppercase transition-all
                ${filter === opt.value ? 'bg-gold text-bg' : 'bg-s2 text-muted hover:text-text'}`}>
              {opt.label}
              {opt.value !== 'ALL' && (
                <span className="ml-1.5 opacity-60">
                  ({analyses.filter(a => a.empfehlung === opt.value).length})
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Analyses List */}
        {list.length === 0 ? (
          <div className="border border-dashed border-border2 p-16 text-center">
            <div className="font-serif text-2xl text-muted2 mb-3">
              {analyses.length === 0 ? 'Noch keine Analysen' : 'Keine Analysen f\u00fcr diesen Filter'}
            </div>
            <p className="text-muted text-sm mb-8">
              {analyses.length === 0 ? 'Starten Sie Ihre erste KI-Immobilienanalyse' : 'W\u00e4hlen Sie einen anderen Filter'}
            </p>
            {analyses.length === 0 && (
              <Link href="/analyze" className="ia-btn-gold inline-block py-3 px-8 text-[11px] no-underline" style={{ width: 'auto' }}>
                ✦ Erste Analyse starten
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {list.map((analysis) => {
              const vc = VERDICT_CONFIG[analysis.empfehlung as keyof typeof VERDICT_CONFIG] || VERDICT_CONFIG.ABWARTEN;
              const prop = analysis.property_data;
              const fin = analysis.finanzierung;
              const rend = analysis.rendite;
              return (
                <div key={analysis.id} className="ia-card p-5 hover:border-border2 transition-colors group">
                  <div className="flex items-center gap-5">
                    {/* Score */}
                    <Link href={`/analysis/${analysis.id}`} className="flex-shrink-0 no-underline">
                      <div className={`w-12 h-12 flex items-center justify-center border font-mono text-xl font-light ${vc.cls}`}>
                        {analysis.score ?? '\u2014'}
                      </div>
                    </Link>
                    {/* Info */}
                    <Link href={`/analysis/${analysis.id}`} className="flex-1 min-w-0 no-underline">
                      <div className="font-sans font-medium text-text truncate group-hover:text-gold transition-colors">
                        {prop?.address || analysis.property_url || 'Adresse unbekannt'}
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-muted text-xs font-mono">{prop?.type || '\u2014'}</span>
                        {prop?.size_m2 && <span className="text-muted text-xs">{prop.size_m2} m\u00b2</span>}
                        {prop?.rooms && <span className="text-muted text-xs">{prop.rooms} Zi.</span>}
                        <span className="text-muted text-xs">{new Date(analysis.created_at).toLocaleDateString('de-DE')}</span>
                      </div>
                    </Link>
                    {/* KPIs */}
                    <div className="hidden md:flex items-center gap-6 flex-shrink-0">
                      <div className="text-right">
                        <div className="font-mono text-sm text-text">{eur(fin?.kaufpreis)}</div>
                        <div className="text-muted text-[11px]">Kaufpreis</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-mono text-sm ${(rend?.bruttomietrendite_pct ?? 0) >= 4 ? 'text-success' : 'text-warning'}`}>
                          {pct(rend?.bruttomietrendite_pct)}
                        </div>
                        <div className="text-muted text-[11px]">Bruttorendite</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-mono text-sm ${(rend?.cashflow_monat ?? 0) >= 0 ? 'text-success' : 'text-danger'}`}>
                          {eur(rend?.cashflow_monat)}
                        </div>
                        <div className="text-muted text-[11px]">Cashflow/Mo</div>
                      </div>
                    </div>
                    {/* Portfolio Status Dropdown */}
                    <select
                      value={analysis.portfolio_status || 'watching'}
                      onClick={e => e.stopPropagation()}
                      onChange={e => updatePortfolioStatus(analysis.id, e.target.value)}
                      className="bg-s2 border border-border text-muted2 font-mono text-[9px] tracking-[.08em] uppercase px-2 py-1.5 outline-none cursor-pointer rounded-none flex-shrink-0"
                    >
                      <option value="watching">\uD83D\uDC41 Beobachtet</option>
                      <option value="bought">\u2713 Gekauft</option>
                      <option value="rejected">\u2715 Abgelehnt</option>
                    </select>
                    {/* Verdict Badge */}
                    <Link href={`/analysis/${analysis.id}`} className="no-underline flex-shrink-0">
                      <div className={`px-3 py-1.5 border font-mono text-[9px] tracking-[.1em] uppercase ${vc.cls}`}>
                        {vc.label}
                      </div>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
