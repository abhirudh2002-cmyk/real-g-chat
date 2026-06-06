import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { lovable } from "@/integrations/lovable";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({ meta: [{ title: "Sign in — Real G" }] }),
  component: AuthPage,
});

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5">
      <path fill="#fff" d="M21.6 12.2c0-.7-.06-1.4-.18-2H12v3.78h5.4a4.62 4.62 0 0 1-2 3.03v2.51h3.22c1.88-1.73 2.98-4.29 2.98-7.32z"/>
      <path fill="#fff" d="M12 22c2.7 0 4.96-.9 6.62-2.43l-3.22-2.5c-.9.6-2.04.96-3.4.96-2.61 0-4.82-1.76-5.6-4.13H3.07v2.6A10 10 0 0 0 12 22z" opacity=".85"/>
      <path fill="#fff" d="M6.4 13.9a6 6 0 0 1 0-3.8V7.5H3.07a10 10 0 0 0 0 9l3.33-2.6z" opacity=".7"/>
      <path fill="#fff" d="M12 5.96c1.47 0 2.78.5 3.82 1.5l2.86-2.86A10 10 0 0 0 12 2 10 10 0 0 0 3.07 7.5L6.4 10.1c.78-2.37 2.99-4.14 5.6-4.14z" opacity=".55"/>
    </svg>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/dashboard" });
    });
  }, [navigate]);

  async function signIn() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin + "/dashboard",
    });
    if (result.error) {
      toast.error("Sign in failed", { description: result.error.message });
      setBusy(false);
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl">
        <Link to="/" className="font-display text-xl font-extrabold tracking-tight">
          REAL <span className="text-gold">G</span>
        </Link>
        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">Welcome.</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to start tracking goals, habits, and progress.
        </p>

        <button
          onClick={signIn}
          disabled={busy}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
        >
          <span className="rounded-sm bg-black/0 p-0.5"><GoogleIcon /></span>
          {busy ? "Redirecting…" : "Continue with Google"}
        </button>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          By continuing you agree to act with discipline, honesty, and respect.
        </p>
      </div>
    </div>
  );
}
