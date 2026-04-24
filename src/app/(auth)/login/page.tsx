import Link from "next/link";
import { Nav } from "@/components/Nav";
import { AuthForm } from "../AuthForm";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  return (
    <div className="min-h-screen">
      <Nav
        right={
          <Link href="/signup" className="btn btn-ghost">
            Create account
          </Link>
        }
      />
      <main className="mx-auto max-w-md px-6 pt-16">
        <h1 className="text-3xl font-semibold tracking-tight">Log in</h1>
        <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
          Continue your research projects.
        </p>
        <div className="mt-8 panel p-6">
          <AuthForm mode="login" searchParams={searchParams} />
        </div>
        <p className="mt-4 text-sm text-[color:var(--color-fg-muted)]">
          New here?{" "}
          <Link href="/signup" className="text-[color:var(--color-accent)]">
            Create an account
          </Link>
          .
        </p>
      </main>
    </div>
  );
}
