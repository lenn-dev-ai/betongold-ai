// app/api/analyze/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase-server';
import { runAnalysis } from '@/lib/claude';

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { url, text, params } = body;

    if (!url && !text) {
      return NextResponse.json({ error: 'URL oder Text erforderlich' }, { status: 400 });
    }

    // Run Claude analysis
    const result = await runAnalysis({ url, text }, params);

    // Save to Supabase
    const { data: saved, error } = await supabase
      .from('analyses')
      .insert({
        user_id: user.id,
        property_url: url || null,
        expose_text: text || null,
        params,
        property_data: result.property,
        verdict: result.verdict,
        finanzierung: result.finanzierung,
        rendite: result.rendite,
        risiken: result.risiken,
        chancen: result.chancen,
        empfehlungen: result.empfehlungen,
        verhandlung: result.verhandlung,
        markteinschaetzung: result.markteinschaetzung,
        fazit: result.fazit,
        score: result.verdict?.score,
        empfehlung: result.verdict?.empfehlung,
        kaufpreis: result.finanzierung?.kaufpreis,
        adresse: result.property?.address,
        objekt_typ: result.property?.type,
      })
      .select('id')
      .single();

    if (error) throw error;

    return NextResponse.json({ id: saved.id, result });
  } catch (error: any) {
    console.error('[analyze]', error);
    return NextResponse.json({ error: error.message || 'Analyse fehlgeschlagen' }, { status: 500 });
  }
}
