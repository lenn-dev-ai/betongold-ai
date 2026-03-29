// app/api/businessplan/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { runBusinessPlan } from '@/lib/claude';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { analysisId, analysisData } = await req.json();

    // Check if business plan already exists
    const { data: existing } = await supabase
      .from('business_plans')
      .select('id, data')
      .eq('analysis_id', analysisId)
      .single();

    if (existing) {
      return NextResponse.json({ id: existing.id, result: existing.data });
    }

    // Generate business plan
    const result = await runBusinessPlan(analysisData);

    // Save
    const { data: saved, error } = await supabase
      .from('business_plans')
      .insert({
        analysis_id: analysisId,
        user_id: user.id,
        data: result,
      })
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json({ id: saved.id, result });
  } catch (error: any) {
    console.error('[businessplan]', error);
    return NextResponse.json({ error: error.message || 'Business Plan fehlgeschlagen' }, { status: 500 });
  }
}
