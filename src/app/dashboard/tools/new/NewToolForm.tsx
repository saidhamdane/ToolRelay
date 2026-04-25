'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { slugify } from '@/lib/validate-url';
import type { PlanLimits } from '@/lib/plans';

export function NewToolForm({ plan }: { plan: PlanLimits }) {
  const router = useRouter();
  const [form, setForm] = useState({
    name: '',
    slug: '',
    description: '',
    endpoint_url: '',
    method: 'POST' as 'GET' | 'POST',
    auth_header_name: '',
    auth_header_value: '',
    input_schema: '',
    output_example: '',
    is_public: true,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    let inputSchemaParsed: unknown = null;
    let outputExampleParsed: unknown = null;
    if (form.input_schema.trim()) {
      try {
        inputSchemaParsed = JSON.parse(form.input_schema);
      } catch {
        setError('input_schema is not valid JSON');
        setLoading(false);
        return;
      }
    }
    if (form.output_example.trim()) {
      try {
        outputExampleParsed = JSON.parse(form.output_example);
      } catch {
        setError('output_example is not valid JSON');
        setLoading(false);
        return;
      }
    }

    const body = {
      name: form.name,
      slug: form.slug || slugify(form.name),
      description: form.description || null,
      endpoint_url: form.endpoint_url,
      method: form.method,
      auth_header_name: form.auth_header_name || null,
      auth_header_value: form.auth_header_value || null,
      input_schema: inputSchemaParsed,
      output_example: outputExampleParsed,
      is_public: form.is_public,
    };

    const res = await fetch('/api/tools', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || 'Failed to create tool');
      setLoading(false);
      return;
    }
    router.push(`/dashboard/tools/${data.tool.id}`);
    router.refresh();
  }

  const customHeaderDisabled = !plan.allowsCustomAuthHeaders;
  const privateDisabled = !plan.allowsPrivateTools;

  return (
    <form onSubmit={submit} className="mt-8 card p-6 space-y-5">
      <Field label="Name" hint="Human-readable name shown on the tool page.">
        <input
          required
          className="input"
          value={form.name}
          onChange={(e) => {
            const v = e.target.value;
            update('name', v);
            if (!form.slug) update('slug', slugify(v));
          }}
        />
      </Field>

      <Field label="Slug" hint="Used in URLs: /tool/<slug> and /api/run/<slug>.">
        <input
          required
          className="input font-mono"
          value={form.slug}
          onChange={(e) => update('slug', slugify(e.target.value))}
          pattern="[a-z0-9](?:[a-z0-9-]{1,62}[a-z0-9])?"
        />
      </Field>

      <Field label="Description" optional>
        <textarea
          rows={3}
          className="input"
          value={form.description}
          onChange={(e) => update('description', e.target.value)}
        />
      </Field>

      <div className="grid gap-5 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <Field label="Endpoint URL" hint="Public https URL of your API.">
            <input
              required
              type="url"
              className="input"
              placeholder="https://api.example.com/v1/widgets"
              value={form.endpoint_url}
              onChange={(e) => update('endpoint_url', e.target.value)}
            />
          </Field>
        </div>
        <Field label="Method">
          <select
            className="input"
            value={form.method}
            onChange={(e) => update('method', e.target.value as 'GET' | 'POST')}
          >
            <option value="POST">POST</option>
            <option value="GET">GET</option>
          </select>
        </Field>
      </div>

      <fieldset
        className={`rounded-lg border p-4 ${customHeaderDisabled ? 'border-slate-200 bg-slate-50' : 'border-slate-200'}`}
      >
        <legend className="px-1 text-sm font-medium">
          Auth header{' '}
          {customHeaderDisabled && (
            <span className="text-xs text-slate-500 font-normal">
              (Pro plan required)
            </span>
          )}
        </legend>
        <div className="grid gap-4 sm:grid-cols-2 mt-2">
          <Field label="Header name" optional>
            <input
              className="input font-mono"
              placeholder="Authorization"
              disabled={customHeaderDisabled}
              value={form.auth_header_name}
              onChange={(e) => update('auth_header_name', e.target.value)}
            />
          </Field>
          <Field label="Header value" optional hint="Stored encrypted; never shown after save.">
            <input
              className="input font-mono"
              placeholder="Bearer sk-live-…"
              disabled={customHeaderDisabled}
              value={form.auth_header_value}
              onChange={(e) => update('auth_header_value', e.target.value)}
            />
          </Field>
        </div>
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Input schema (JSON)" optional hint="Describe the JSON body your endpoint expects.">
          <textarea
            rows={6}
            className="input font-mono text-xs"
            placeholder={`{\n  "type": "object",\n  "properties": { "query": { "type": "string" } }\n}`}
            value={form.input_schema}
            onChange={(e) => update('input_schema', e.target.value)}
          />
        </Field>
        <Field label="Output example (JSON)" optional hint="An example of what the endpoint returns.">
          <textarea
            rows={6}
            className="input font-mono text-xs"
            placeholder={`{\n  "results": [{ "id": "1", "name": "example" }]\n}`}
            value={form.output_example}
            onChange={(e) => update('output_example', e.target.value)}
          />
        </Field>
      </div>

      <div>
        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={form.is_public}
            disabled={privateDisabled && !form.is_public}
            onChange={(e) => {
              if (!plan.allowsPrivateTools && !e.target.checked) return;
              update('is_public', e.target.checked);
            }}
          />
          <span className="text-sm">
            Public tool — visible at <code className="font-mono">/tool/{form.slug || 'your-slug'}</code>
          </span>
        </label>
        {privateDisabled && (
          <p className="help">Private tools require Pro. Public tools are visible to anyone with the slug.</p>
        )}
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-2">{error}</p>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Creating…' : 'Create tool'}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  hint,
  optional,
  children,
}: {
  label: string;
  hint?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="label flex items-center justify-between">
        <span>{label}</span>
        {optional && <span className="text-xs text-slate-400 font-normal">Optional</span>}
      </div>
      {children}
      {hint && <p className="help">{hint}</p>}
    </div>
  );
}
