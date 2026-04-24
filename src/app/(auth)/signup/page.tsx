import Link from "next/link";
import { Nav } from "@/components/Nav";
import { AuthForm } from "../AuthForm";

export default function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string; ok?: string }>;
}) {
  return (
    <div className="min-h-screen">
      <Nav
        right={
          <Link href="/login" className="btn btn-ghost">
            Log in
          </Link>
        }
      />
      <main className="mx-auto max-w-md px-6 pt-16">
        <h1 className="text-3xl font-semibold tracking-tight">Create your account</h1>
        <p className="mt-2 text-sm text-[color:var(--color-fg-muted)]">
          Start your first research project in under a minute.
        </p>
        <div className="mt-8 panel p-6">
          <AuthForm mode="signup" searchParams={searchParams} />
        </div>
      </main>
    </div>
  );
}
