import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { getUserUsageContext } from '@/lib/usage';
import { isValidSlug, validateEndpointUrl } from '@/lib/validate-url';

const ToolInput = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().min(2).max(64),
  description: z.string().trim().max(2000).nullable().optional(),
  endpoint_url: z.string().url(),
  method: z.enum(['GET', 'POST']),
  auth_header_name: z.string().trim().max(120).nullable().optional(),
  auth_header_value: z.string().max(2000).nullable().optional(),
  input_schema: z.unknown().nullable().optional(),
  output_example: z.unknown().nullable().optional(),
  is_public: z.boolean(),
});

export async function POST(request: NextRequest) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = ToolInput.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Invalid input' },
      { status: 400 }
    );
  }
  const input = parsed.data;

  if (!isValidSlug(input.slug)) {
    return NextResponse.json(
      { error: 'Slug must be lowercase letters, digits, or hyphens (3-64 chars)' },
      { status: 400 }
    );
  }

  const urlCheck = validateEndpointUrl(input.endpoint_url);
  if (!urlCheck.ok) {
    return NextResponse.json({ error: urlCheck.error }, { status: 400 });
  }

  const usage = await getUserUsageContext(user.id);

  if (usage.toolCount >= usage.plan.maxTools) {
    return NextResponse.json(
      { error: `Plan limit reached: max ${usage.plan.maxTools} tools on ${usage.plan.name}` },
      { status: 402 }
    );
  }
  if (!input.is_public && !usage.plan.allowsPrivateTools) {
    return NextResponse.json(
      { error: 'Private tools require the Pro plan' },
      { status: 402 }
    );
  }
  if (
    (input.auth_header_name || input.auth_header_value) &&
    !usage.plan.allowsCustomAuthHeaders
  ) {
    return NextResponse.json(
      { error: 'Custom auth headers require the Pro plan' },
      { status: 402 }
    );
  }

  const { data: tool, error } = await supabase
    .from('tools')
    .insert({
      user_id: user.id,
      name: input.name,
      slug: input.slug,
      description: input.description ?? null,
      endpoint_url: input.endpoint_url,
      method: input.method,
      auth_header_name: input.auth_header_name || null,
      auth_header_value: input.auth_header_value || null,
      input_schema: input.input_schema ?? null,
      output_example: input.output_example ?? null,
      is_public: input.is_public,
    })
    .select('id, slug')
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Slug already taken' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ tool });
}
