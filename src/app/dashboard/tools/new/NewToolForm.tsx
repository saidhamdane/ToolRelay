'use client';

import Link from 'next/link';
import { useState } from 'react';
import { slugify } from '@/lib/validate-url';
import type { PlanLimits } from '@/lib/plans';
import { ApiKeyReveal } from '@/components/ApiKeyReveal';

interface CreatedToolReveal {
  toolId: string;
  toolName: string;
  isPublic: boolean;
  apiKey: string | null;
  warning?: string | null;
}

export function NewToolForm({ plan }: { plan: PlanLimits }) {
  const allowsPrivate = plan.allowsPrivateTools;
  const allowsCustomHeaders = plan.allowsCustomAuthHeaders;

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
  const [created, setCreated] = useState<CreatedToolReveal | null>(null);

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    // Client-side gate — server enforces too, but no point round-tripping
    // when the plan obviously can't do this.
    if (!form.is_public && !allowsPrivate) {
      setError('Private tools require the Pro plan.');
      setLoading(false);
      return;
    }
    if ((form.auth_header_name || form.auth_header_value) && !allowsCustomHeaders) {
      setError('Custom auth headers require the Pro plan.');
      setLoading(false);
      return;
    }

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
      auth_header_name: allowsCustomHeaders ? form.auth_header_name || null : null,
      auth_header_value: allowsCustomHeaders ? form.auth_header_value || null : null,
      input_schema: inputSchemaParsed,
      output_example: outputExampleParsed,
      is_public: allowsPrivate ? form.is_public : true,
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
    setCreated({
      toolId: data.tool.id,
      toolName: form.name,
      isPublic: data.tool.is_public,
      apiKey: data.api_key ?? null,
      warning: data.warning ?? null,
    });
    setLoading(false);
  }

  if (created) {
    return (
      <div className="mt-8 card p-6 space-y-5">
        <div>
          <h2 className="text-xl font-semibold">"{created.toolName}" created</h2>
          <p className="mt-1 text-sm text-slate-600">
            {created.isPublic
              ? 'Public tools are open by default — no API key required to call them.'
              : 'Private tools require this API key on every call.'}
          </p>
        </div>

        {created.apiKey ? (
          <ApiKeyReveal apiKey={created.apiKey} />
        ) : created.warning ? (
          <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
            {created.warning}
          </div>
        ) : null}

        <div className="flex flex-col sm:flex-row gap-3">
          <Link href={`/dashboard/tools/${created.toolId}`} className="btn-primary">
            Continue to tool
          </Link>
          <Link href="/dashboard" className="btn-secondary">
            Back to dashboard
          </Link>
        </div>
      </div>
    );
  }

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

      <fieldset className="rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-sm font-medium flex items-center gap-2">
          Visibility
          {!allowsPrivate && <ProRequiredPill />}
        </legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <VisibilityRadio
            label="Public"
            description="Anyone with the slug can call the proxy. Listed at /tool/<slug>."
            checked={form.is_public}
            onChange={() => update('is_public', true)}
          />
          <VisibilityRadio
            label="Private"
            description={
              allowsPrivate
                ? 'Requires x-toolrelay-key on every call. Not listed publicly.'
                : 'Requires Pro. Includes per-tool API keys.'
            }
            checked={!form.is_public}
            disabled={!allowsPrivate}
            onChange={() => allowsPrivate && update('is_public', false)}
          />
        </div>
        {!allowsPrivate && (
          <p className="help mt-3">
            Private tools and per-tool API keys are part of Pro.{' '}
            <Link href="/dashboard/plan" className="text-brand-700 hover:underline">
              Upgrade to Pro →
            </Link>
          </p>
        )}
      </fieldset>

      <fieldset className="rounded-lg border border-slate-200 p-4">
        <legend className="px-1 text-sm font-medium flex items-center gap-2">
          Auth header
          <span className="text-xs text-slate-400 font-normal">Optional</span>
          {!allowsCustomHeaders && <ProRequiredPill />}
        </legend>
        <p className="text-xs text-slate-500 mt-1">
          ToolRelay forwards this header to your endpoint on every proxy call. Use it to attach the
          owner-side API key your upstream needs.
        </p>
        <div className="grid gap-4 sm:grid-cols-2 mt-3">
          <Field label="Header name" optional>
            <input
              className="input font-mono"
              placeholder="Authorization"
              disabled={!allowsCustomHeaders}
              value={form.auth_header_name}
              onChange={(e) => update('auth_header_name', e.target.value)}
            />
          </Field>
          <Field label="Header value" optional hint="Stored server-side; never shown after save.">
            <input
              className="input font-mono"
              placeholder="Bearer sk-live-…"
              disabled={!allowsCustomHeaders}
              value={form.auth_header_value}
              onChange={(e) => update('auth_header_value', e.target.value)}
            />
          </Field>
        </div>
        {!allowsCustomHeaders && (
          <p className="help mt-3">
            Forwarding upstream auth headers is a Pro feature.{' '}
            <Link href="/dashboard/plan" className="text-brand-700 hover:underline">
              Upgrade to Pro →
            </Link>
          </p>
        )}
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

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md p-3">
          {error}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Creating…' : 'Create tool'}
        </button>
        <Link href="/dashboard" className="btn-ghost">
          Cancel
        </Link>
      </div>
    </form>
  );
}

function ProRequiredPill() {
  return (
    <span className="badge bg-brand-100 text-brand-700 font-normal">Pro required</span>
  );
}

function VisibilityRadio({
  label,
  description,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  disabled?: boolean;
  onChange: () => void;
}) {
  return (
    <label
      className={`flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition ${
        disabled
          ? 'border-slate-200 bg-slate-50 cursor-not-allowed opacity-70'
          : checked
          ? 'border-brand-600 bg-brand-50/50'
          : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <input
        type="radio"
        className="mt-1"
        checked={checked}
        disabled={disabled}
        onChange={onChange}
      />
      <div>
        <div className="text-sm font-medium">{label}</div>
        <div className="text-xs text-slate-600 mt-0.5">{description}</div>
      </div>
    </label>
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
