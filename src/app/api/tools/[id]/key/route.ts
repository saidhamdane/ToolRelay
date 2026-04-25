import { NextResponse, type NextRequest } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { generateApiKey } from '@/lib/api-keys';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// POST /api/tools/[id]/key — generate or regenerate the tool's API key.
// Returns the plaintext key exactly once; only the hash and prefix are
// persisted.
export async function POST(_request: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Verify the caller owns the tool. RLS already enforces this, but checking
  // explicitly gives us a clean 404 vs 403 distinction.
  const { data: tool, error: toolErr } = await supabase
    .from('tools')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (toolErr) return NextResponse.json({ error: toolErr.message }, { status: 500 });
  if (!tool) return NextResponse.json({ error: 'Tool not found' }, { status: 404 });

  const generated = generateApiKey();
  const admin = createAdminClient();

  const { error } = await admin.from('tool_api_keys').upsert(
    {
      tool_id: tool.id,
      key_prefix: generated.prefix,
      key_hash: generated.hash,
      created_at: new Date().toISOString(),
    },
    { onConflict: 'tool_id' }
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ api_key: generated.fullKey, key_prefix: generated.prefix });
}
