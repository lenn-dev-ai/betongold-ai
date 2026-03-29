-- BetongGold AI — Supabase Schema
-- Ausführen in: Supabase Dashboard → SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ────────────────────────────────────────────────────────────
-- ANALYSES TABLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS analyses (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Input
  property_url        TEXT,
  expose_text         TEXT,
  params              JSONB NOT NULL DEFAULT '{}',

  -- Analysis Results (stored as JSONB for flexibility)
  property_data       JSONB NOT NULL DEFAULT '{}',
  verdict             JSONB NOT NULL DEFAULT '{}',
  finanzierung        JSONB NOT NULL DEFAULT '{}',
  rendite             JSONB NOT NULL DEFAULT '{}',
  risiken             JSONB NOT NULL DEFAULT '[]',
  chancen             JSONB NOT NULL DEFAULT '[]',
  empfehlungen        JSONB NOT NULL DEFAULT '[]',
  verhandlung         JSONB NOT NULL DEFAULT '{}',
  markteinschaetzung  TEXT,
  fazit               TEXT,

  -- Quick-access fields (denormalized for filtering/sorting)
  score               INTEGER,
  empfehlung          TEXT CHECK (empfehlung IN ('KAUFEN', 'ABWARTEN', 'NICHT_KAUFEN')),
  kaufpreis           BIGINT,
  adresse             TEXT,
  objekt_typ          TEXT,

  -- Portfolio management
  portfolio_status    TEXT DEFAULT 'watching' CHECK (portfolio_status IN ('watching', 'bought', 'rejected')),
  notes               TEXT,
  is_favorite         BOOLEAN DEFAULT FALSE
);

-- ────────────────────────────────────────────────────────────
-- BUSINESS PLANS TABLE
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS business_plans (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  analysis_id   UUID NOT NULL REFERENCES analyses(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  data          JSONB NOT NULL
);

-- ────────────────────────────────────────────────────────────
-- USER PROFILES (extends auth.users)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  full_name       TEXT,
  default_params  JSONB DEFAULT '{
    "eigenkapital": 100000,
    "zinssatz": 3.8,
    "tilgung": 2.0,
    "laufzeit": 30,
    "grunderwerbsteuer": 6.0,
    "notar": 2.0,
    "makler": 3.57,
    "bundesland": "Berlin"
  }'::jsonb
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (new.id, new.raw_user_meta_data->>'full_name');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_analyses_updated_at
  BEFORE UPDATE ON analyses
  FOR EACH ROW EXECUTE PROCEDURE update_updated_at_column();

-- ────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ────────────────────────────────────────────────────────────
ALTER TABLE analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE business_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Analyses: users can only see/edit their own
CREATE POLICY "Users can view own analyses" ON analyses
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own analyses" ON analyses
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own analyses" ON analyses
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own analyses" ON analyses
  FOR DELETE USING (auth.uid() = user_id);

-- Business Plans
CREATE POLICY "Users can view own business plans" ON business_plans
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own business plans" ON business_plans
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own business plans" ON business_plans
  FOR DELETE USING (auth.uid() = user_id);

-- Profiles
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- ────────────────────────────────────────────────────────────
-- INDEXES
-- ────────────────────────────────────────────────────────────
CREATE INDEX idx_analyses_user_id ON analyses(user_id);
CREATE INDEX idx_analyses_created_at ON analyses(created_at DESC);
CREATE INDEX idx_analyses_empfehlung ON analyses(empfehlung);
CREATE INDEX idx_analyses_portfolio_status ON analyses(portfolio_status);
CREATE INDEX idx_business_plans_analysis_id ON business_plans(analysis_id);
CREATE INDEX idx_business_plans_user_id ON business_plans(user_id);

-- ────────────────────────────────────────────────────────────
-- VIEWS
-- ────────────────────────────────────────────────────────────

-- Portfolio summary view
CREATE OR REPLACE VIEW portfolio_summary AS
SELECT
  a.user_id,
  COUNT(*) AS total_analyses,
  COUNT(*) FILTER (WHERE a.empfehlung = 'KAUFEN') AS kaufen_count,
  COUNT(*) FILTER (WHERE a.empfehlung = 'ABWARTEN') AS abwarten_count,
  COUNT(*) FILTER (WHERE a.empfehlung = 'NICHT_KAUFEN') AS nicht_kaufen_count,
  COUNT(*) FILTER (WHERE a.portfolio_status = 'bought') AS gekauft_count,
  AVG(a.score) AS avg_score,
  SUM(a.kaufpreis) FILTER (WHERE a.portfolio_status = 'bought') AS portfolio_kaufpreis_gesamt
FROM analyses a
GROUP BY a.user_id;
