import Link from "next/link";
import { Nav } from "@/components/Nav";
import { createProject } from "./actions";

export default function NewProjectPage() {
  return (
    <div className="min-h-screen">
      <Nav
        right={
          <Link href="/dashboard" className="btn btn-ghost">
            Cancel
          </Link>
        }
      />
      <main className="mx-auto max-w-2xl px-6 pt-12 pb-20">
        <h1 className="text-3xl font-semibold tracking-tight">New research project</h1>
        <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
          Tell the agents what you're working on. They'll go find the voice of the customer
          and hand you back structured insights.
        </p>

        <form action={createProject} className="mt-8 panel p-6 space-y-5">
          <Field
            label="Project title"
            name="title"
            placeholder="e.g. Reusable water bottles for commuters"
            required
          />
          <Field
            label="Research question"
            name="research_question"
            placeholder="e.g. What keeps commuters from carrying reusable water bottles every day?"
            required
            textarea
          />
          <Field
            label="Target audience"
            name="target_audience"
            placeholder="e.g. Urban commuters who bring bags to work or school"
            required
          />
          <Field
            label="Description (optional)"
            name="description"
            placeholder="What's the business context? What would a great answer unlock?"
            textarea
          />
          <div className="flex items-center justify-between pt-2">
            <p className="text-xs text-[color:var(--color-fg-dim)]">
              We'll start scraping as soon as you create it.
            </p>
            <button type="submit" className="btn btn-primary">
              Create + start research →
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}

function Field({
  label,
  name,
  placeholder,
  required,
  textarea,
}: {
  label: string;
  name: string;
  placeholder?: string;
  required?: boolean;
  textarea?: boolean;
}) {
  return (
    <label className="block">
      <span className="block text-sm mb-1.5 text-[color:var(--color-fg-muted)]">{label}</span>
      {textarea ? (
        <textarea
          name={name}
          required={required}
          placeholder={placeholder}
          rows={3}
          className="input resize-y min-h-[80px]"
        />
      ) : (
        <input name={name} required={required} placeholder={placeholder} className="input" />
      )}
    </label>
  );
}
