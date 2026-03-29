'use client';
// app/auth/page.tsx
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase';

export default function AuthPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null); setSuccess(null);
    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        router.push('/dashboard');
        router.refresh();
      } else {
        const { error } = await supabase.auth.signUp({
          email, password,
          options: { data: { full_name: name } }
        });
        if (error) throw error;
        setSuccess('Account erstellt! Bitte E-Mail bestätigen, dann einloggen.');
        setMode('login');
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg bg-app-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-3 mb-6">
            <div className="w-10 h-10 border border-gold flex items-center justify-center font-serif text-gold text-xl">B</div>
            <div>
              <div className="font-sans font-semibold text-lg text-text">BetongGold</div>
              <div className="font-mono text-[9px] tracking-[0.2em] uppercase text-muted">AI</div>
            </div>
          </div>
          <h1 className="font-serif text-3xl text-text mb-2">
            {mode === 'login' ? 'Willkommen zurück' : 'Account erstellen'}
          </h1>
          <p className="text-muted2 text-sm">
            {mode === 'login' ? 'Melden Sie sich an, um Ihre Analysen aufzurufen.' : 'Starten Sie mit Ihrer ersten KI-Immobilienanalyse.'}
          </p>
        </div>

        {/* Card */}
        <div className="ia-card p-8">
          {/* Mode Toggle */}
          <div className="flex gap-px mb-8 bg-border">
            {(['login', 'register'] as const).map(m => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2.5 font-mono text-[10px] tracking-[0.12em] uppercase transition-all
                  ${mode === m ? 'bg-gold text-bg' : 'bg-s2 text-muted hover:text-text'}`}>
                {m === 'login' ? 'Einloggen' : 'Registrieren'}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <label className="block font-mono text-[11px] tracking-[.05em] text-muted2 mb-1.5">Vollständiger Name</label>
                <input className="ia-input" type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Max Mustermann" required />
              </div>
            )}
            <div>
              <label className="block font-mono text-[11px] tracking-[.05em] text-muted2 mb-1.5">E-Mail</label>
              <input className="ia-input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="max@beispiel.de" required />
            </div>
            <div>
              <label className="block font-mono text-[11px] tracking-[.05em] text-muted2 mb-1.5">Passwort</label>
              <input className="ia-input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={8} />
            </div>

            {error && (
              <div className="bg-danger/5 border border-danger/20 px-4 py-3 text-danger text-sm">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-success/5 border border-success/20 px-4 py-3 text-success text-sm">
                {success}
              </div>
            )}

            <button type="submit" className="ia-btn-gold mt-2" disabled={loading}>
              {loading ? 'Bitte warten…' : mode === 'login' ? '✦ Einloggen' : '✦ Account erstellen'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
