'use client';
// app/analyze/page.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const BUNDESLAENDER = {
  'Berlin': 6.0, 'Bayern': 3.5, 'Hamburg': 5.5, 'NRW': 6.5,
  'Brandenburg': 6.5, 'Sachsen': 5.5, 'Baden-Württemberg': 5.0,
  'Hessen': 6.0, 'Rheinland-Pfalz': 5.0, 'Sachsen-Anhalt': 5.0,
  'Niedersachsen': 5.0, 'Thüringen': 6.5, 'Mecklenburg-Vorpommern': 6.0,
};

const STEPS = [
  'Exposé wird geladen und analysiert…',
  'Objektdaten werden extrahiert…',
  'Finanzierungsstruktur wird berechnet…',
  'Renditekennzahlen werden ermittelt…',
  'Risikoprofil wird erstellt…',
  'Verhandlungsstrategie wird formuliert…',
  'Gesamtbewertung wird abgeschlossen…',
];

export default function AnalyzePage() {
  const router = useRouter();
  const [tab, setTab] = useState<'link' | 'text'>('link');
  const [url, setUrl] = useState('');
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [params, setParams] = useState({
    eigenkapital: 100000, zinssatz: 3.8, tilgung: 2.0, laufzeit: 30,
    grunderwerbsteuer: 6.0, notar: 2.0, makler: 3.57, bundesland: 'Berlin',
  });

  const sp = (k: string, v: any) => setParams(p => ({ ...p, [k]: v }));

  async function run() {
    const input = tab === 'link' ? url : text;
    if (!input.trim()) { setError('Bitte Link oder Exposé-Text eingeben.'); return; }
    setError(null); setLoading(true); setStep(0);

    let s = 0;
    const timer = setInterval(() => { s++; if (s < STEPS.length) setStep(s); else clearInterval(timer); }, 1400);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: tab === 'link' ? url : undefined, text: tab === 'text' ? text : undefined, params }),
      });
      clearInterval(timer);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      router.push(`/analysis/${data.id}`);
    } catch (e: any) {
      clearInterval(timer);
      setError(e.message);
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-bg flex items-center justify-center">
        <div className="text-center max-w-sm px-4">
          <div className="w-10 h-10 border-2 border-border2 border-t-gold rounded-full mx-auto mb-6 animate-spin" />
          <div className="font-mono text-[11px] tracking-[.1em] uppercase text-muted mb-4">KI-Analyse läuft</div>
          <div className="space-y-2">
            {STEPS.slice(0, step + 1).map((s, i) => (
              <div key={i} className="text-sm animate-fadeIn" style={{ color: i < step ? 'var(--muted)' : 'var(--muted2)' }}>
                {i < step ? '✓' : '›'} {s}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg bg-app-gradient">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-border bg-s1/90 backdrop-blur-md">
        <div className="max-w-4xl mx-auto px-6 flex items-center gap-4 h-14">
          <Link href="/dashboard" className="text-muted hover:text-text transition-colors text-sm">← Dashboard</Link>
          <span className="text-border">|</span>
          <span className="font-mono text-[10px] tracking-widest uppercase text-gold">Neue Analyse</span>
        </div>
      </nav>

      <main className="max-w-2xl mx-auto px-6 py-12">
        {/* Hero */}
        <div className="text-center mb-12">
          <div className="font-mono text-[10px] tracking-[.22em] uppercase text-gold mb-3">KI-Immobilienberater</div>
          <h1 className="font-serif text-4xl text-text mb-3">Neue Analyse starten</h1>
          <p className="text-muted2 text-sm leading-relaxed">Link oder Exposé einfügen — vollständige Finanzierungs-, Rendite- und Risikoanalyse in 30 Sekunden.</p>
        </div>

        {error && <div className="bg-danger/5 border border-danger/20 px-4 py-3 text-danger text-sm mb-4">{error}</div>}

        {/* Input Card */}
        <div className="ia-card p-7 mb-4">
          <div className="ia-label">Immobilie</div>
          {/* Tabs */}
          <div className="flex gap-px mb-5 bg-border">
            {(['link', 'text'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-2.5 font-mono text-[10px] tracking-[.1em] uppercase transition-all
                  ${tab === t ? 'bg-gold text-bg' : 'bg-s2 text-muted hover:text-text'}`}>
                {t === 'link' ? '🔗 Link / URL' : '📄 Exposé-Text'}
              </button>
            ))}
          </div>
          {tab === 'link' ? (
            <div>
              <label className="block font-mono text-[11px] tracking-[.05em] text-muted2 mb-1.5">Immobilien-URL</label>
              <input className="ia-input" type="url" value={url} onChange={e => setUrl(e.target.value)}
                placeholder="https://www.immobilienscout24.de/expose/..." />
              <p className="text-muted text-xs mt-2">ImmoScout24, Immowelt, Immonet und weitere Portale werden unterstützt.</p>
            </div>
          ) : (
            <div>
              <label className="block font-mono text-[11px] tracking-[.05em] text-muted2 mb-1.5">Exposé-Text</label>
              <textarea className="ia-input min-h-[150px] leading-relaxed" value={text} onChange={e => setText(e.target.value)}
                placeholder="Kopieren Sie Beschreibung, Eckdaten, Ausstattung und Lage hier rein…" />
            </div>
          )}
        </div>

        {/* Financing Params */}
        <div className="ia-card p-7 mb-4">
          <div className="ia-label">Finanzierungsparameter</div>
          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Eigenkapital (EUR)', key: 'eigenkapital', type: 'number', step: 1000 },
              { label: 'Zinssatz (% p.a.)', key: 'zinssatz', type: 'number', step: 0.1 },
              { label: 'Tilgungsrate (% p.a.)', key: 'tilgung', type: 'number', step: 0.1 },
              { label: 'Laufzeit (Jahre)', key: 'laufzeit', type: 'number', step: 1 },
            ].map(f => (
              <div key={f.key}>
                <label className="block font-mono text-[11px] tracking-[.05em] text-muted2 mb-1.5">{f.label}</label>
                <input className="ia-input" type={f.type} step={f.step}
                  value={(params as any)[f.key]}
                  onChange={e => sp(f.key, parseFloat(e.target.value))} />
              </div>
            ))}
          </div>

          <div className="ia-label mt-6">Kaufnebenkosten</div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-mono text-[11px] tracking-[.05em] text-muted2 mb-1.5">Bundesland</label>
              <select className="ia-input" value={params.bundesland}
                onChange={e => { sp('bundesland', e.target.value); sp('grunderwerbsteuer', (BUNDESLAENDER as any)[e.target.value] || 6.0); }}>
                {Object.keys(BUNDESLAENDER).map(bl => <option key={bl}>{bl}</option>)}
              </select>
            </div>
            {[
              { label: 'Grunderwerbsteuer (%)', key: 'grunderwerbsteuer', step: 0.1 },
              { label: 'Notar & Grundbuch (%)', key: 'notar', step: 0.1 },
              { label: 'Maklercourtage (%)', key: 'makler', step: 0.01 },
            ].map(f => (
              <div key={f.key}>
                <label className="block font-mono text-[11px] tracking-[.05em] text-muted2 mb-1.5">{f.label}</label>
                <input className="ia-input" type="number" step={f.step}
                  value={(params as any)[f.key]}
                  onChange={e => sp(f.key, parseFloat(e.target.value))} />
              </div>
            ))}
          </div>

          {/* Nebenkosten Summary */}
          <div className="mt-5 p-3.5 bg-s3 border-l-2 border-gold/40">
            <div className="flex justify-between text-sm">
              <span className="text-muted2">Gesamte Kaufnebenkosten</span>
              <span className="font-mono text-gold">{(params.grunderwerbsteuer + params.notar + params.makler).toFixed(2)}%</span>
            </div>
          </div>
        </div>

        <button onClick={run} className="ia-btn-gold py-4 text-[12px]">✦ Analyse starten</button>
      </main>
    </div>
  );
}
