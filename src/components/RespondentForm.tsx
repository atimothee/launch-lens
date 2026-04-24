"use client";

import { useState } from "react";

export interface RespondentFormValue {
  name: string | null;
  age_range: string | null;
  gender: string | null;
  location: string | null;
  occupation: string | null;
  segment_relevance: string | null;
  usage_frequency: string | null;
  notes: string | null;
}

const AGE_RANGES = ["18–24", "25–34", "35–44", "45–54", "55–64", "65+", "Prefer not to say"];
const GENDERS = ["Woman", "Man", "Non-binary", "Prefer not to say", "Self-describe"];
const USAGE_FREQ = [
  "Daily",
  "A few times a week",
  "Weekly",
  "Monthly",
  "Rarely",
  "Never (curious)",
];

export function RespondentForm({
  onSubmit,
  submitting,
}: {
  onSubmit: (value: RespondentFormValue) => void;
  submitting?: boolean;
}) {
  const [v, setV] = useState<RespondentFormValue>({
    name: "",
    age_range: "",
    gender: "",
    location: "",
    occupation: "",
    segment_relevance: "",
    usage_frequency: "",
    notes: "",
  });

  function set<K extends keyof RespondentFormValue>(key: K, value: RespondentFormValue[K]) {
    setV((p) => ({ ...p, [key]: value }));
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({
          name: blankToNull(v.name),
          age_range: blankToNull(v.age_range),
          gender: blankToNull(v.gender),
          location: blankToNull(v.location),
          occupation: blankToNull(v.occupation),
          segment_relevance: blankToNull(v.segment_relevance),
          usage_frequency: blankToNull(v.usage_frequency),
          notes: blankToNull(v.notes),
        });
      }}
      className="panel p-5 space-y-4"
    >
      <Field label="Name or nickname (optional)">
        <input
          value={v.name ?? ""}
          onChange={(e) => set("name", e.target.value)}
          className="input"
          placeholder="e.g. Jordan"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Age range">
          <select
            value={v.age_range ?? ""}
            onChange={(e) => set("age_range", e.target.value)}
            className="input"
          >
            <option value="">Select…</option>
            {AGE_RANGES.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Gender">
          <select
            value={v.gender ?? ""}
            onChange={(e) => set("gender", e.target.value)}
            className="input"
          >
            <option value="">Select…</option>
            {GENDERS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Location">
          <input
            value={v.location ?? ""}
            onChange={(e) => set("location", e.target.value)}
            className="input"
            placeholder="City, country"
          />
        </Field>
        <Field label="Occupation">
          <input
            value={v.occupation ?? ""}
            onChange={(e) => set("occupation", e.target.value)}
            className="input"
            placeholder="What do you do?"
          />
        </Field>
      </div>

      <Field label="How does this topic fit into your life?">
        <input
          value={v.segment_relevance ?? ""}
          onChange={(e) => set("segment_relevance", e.target.value)}
          className="input"
          placeholder="e.g. I drink protein shakes a few times a week"
        />
      </Field>

      <Field label="How often do you use this category?">
        <select
          value={v.usage_frequency ?? ""}
          onChange={(e) => set("usage_frequency", e.target.value)}
          className="input"
        >
          <option value="">Select…</option>
          {USAGE_FREQ.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </select>
      </Field>

      <Field label="Anything else you want us to know? (optional)">
        <textarea
          value={v.notes ?? ""}
          onChange={(e) => set("notes", e.target.value)}
          className="input min-h-[72px]"
          placeholder="Context, constraints, things we should keep in mind."
          rows={3}
        />
      </Field>

      <div className="pt-1 flex items-center justify-end">
        <button className="btn btn-primary" disabled={submitting}>
          {submitting ? "Starting…" : "Start interview →"}
        </button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-sm mb-1.5 text-[color:var(--color-fg-muted)]">{label}</span>
      {children}
    </label>
  );
}

function blankToNull(s: string | null): string | null {
  if (!s) return null;
  const trimmed = s.trim();
  return trimmed.length === 0 ? null : trimmed;
}
