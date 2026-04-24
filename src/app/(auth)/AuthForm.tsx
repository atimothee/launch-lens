import { login, signup } from "./actions";

export async function AuthForm({
  mode,
  searchParams,
}: {
  mode: "login" | "signup";
  searchParams: Promise<{ next?: string; error?: string; ok?: string }>;
}) {
  const sp = await searchParams;
  const action = mode === "login" ? login : signup;
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="next" value={sp.next ?? "/dashboard"} />
      <div>
        <label className="block text-sm mb-1.5 text-[color:var(--color-fg-muted)]">Email</label>
        <input name="email" type="email" required autoComplete="email" className="input" />
      </div>
      <div>
        <label className="block text-sm mb-1.5 text-[color:var(--color-fg-muted)]">Password</label>
        <input
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className="input"
        />
      </div>
      {sp.error && (
        <p className="text-sm text-red-400">{decodeURIComponent(sp.error)}</p>
      )}
      {sp.ok === "check-email" && (
        <p className="text-sm text-[color:var(--color-goal)]">
          Check your email to confirm your account, then log in.
        </p>
      )}
      <button type="submit" className="btn btn-primary w-full justify-center">
        {mode === "login" ? "Log in" : "Create account"}
      </button>
    </form>
  );
}
