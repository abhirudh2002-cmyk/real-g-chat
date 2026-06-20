import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { persistLocalAuthSession, supabase } from "@/integrations/supabase/client";
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
  
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isSignUp, setIsSignUp] = useState(false);

  useEffect(() => {
    if (!supabase || typeof window === 'undefined' || !supabase.auth) return;
    
    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) navigate({ to: "/dashboard" });
    }).catch(() => null);
  }, [navigate]);

  async function handleEmailAuth(e: React.FormEvent) {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (!supabase || !supabase.auth) {
      toast.error("Database connection initialization error. Please reload.");
      return;
    }

    setBusy(true);

    try {
      if (isSignUp) {
        const expirationDate = new Date();
        expirationDate.setDate(expirationDate.getDate() + 4);

        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              media_expires_at: expirationDate.toISOString(),
              auto_delete_days: 4
            }
          }
        });
        
        if (error) throw error;

        if (data?.session) {
          toast.success("Account created successfully!");
          navigate({ to: "/dashboard" });
        } else {
          toast.success("Account created! Flipping to sign in.");
          setIsSignUp(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        toast.success("Welcome back!");
        navigate({ to: "/dashboard" });
      }
    } catch (error: any) {
      console.error("Email auth failed", error);
      toast.error(isSignUp ? "Could not sign up" : "Could not sign in", {
        description: error?.message || "Please check your credentials or network connection.",
      });
    } finally {
      setBusy(false);
    }
  }

  async function signIn() {
    if (!supabase || !supabase.auth) return;
    setBusy(true);

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: "offline",
            // Changed back to seamless: signs in or signs up with 1-click if already authenticated in browser
            prompt: "select_account", 
          },
        },
      });

      if (error) throw error;

      if (data?.url) {
        window.location.assign(data.url);
        return;
      }

      throw new Error("Google sign-in could not be started.");
    } catch (error: any) {
      console.error("Google sign-in failed", error);
      toast.error("Could not start Google sign-in", {
        description: error?.message || "Please try again.",
      });
      setBusy(false);
    }
  }

  async function signInLocally() {
    setBusy(true);
    persistLocalAuthSession("demo-user@example.com", "Local user");
    toast.success("Signed in locally");
    navigate({ to: "/dashboard" });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl">
        <Link to="/" className="font-display text-xl font-extrabold tracking-tight">
          REAL <span className="text-gold">G</span>
        </Link>
        <h1 className="mt-6 font-display text-3xl font-bold tracking-tight">
          {isSignUp ? "Create an account." : "Welcome."}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {isSignUp 
            ? "Sign up to start tracking goals, habits, and progress." 
            : "Sign in to start tracking goals, habits, and progress."
          }
        </p>

        <form onSubmit={handleEmailAuth} className="mt-6 space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy}
              className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={busy}
              className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary"
              required
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Processing..." : isSignUp ? "Sign Up with Email" : "Sign In with Email"}
          </button>
        </form>

        <div className="mt-4 text-center text-sm">
          <button 
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-primary hover:underline bg-transparent border-none p-0 cursor-pointer"
          >
            {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
          </button>
        </div>

        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={signIn}
            disabled={busy}
            className="flex w-full items-center justify-center gap-3 rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-elevated disabled:opacity-50"
          >
            <span className="rounded-sm bg-black/0 p-0.5 invert dark:invert-0"><GoogleIcon /></span>
            {busy ? "Redirecting…" : "Google"}
          </button>

          <button
            onClick={signInLocally}
            disabled={busy}
            className="flex w-full items-center justify-center rounded-lg border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-elevated disabled:opacity-50"
          >
            {busy ? "Signing in…" : "Continue locally"}
          </button>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          By continuing you agree to act with discipline, honesty, and respect.
        </p>
      </div>
    </div>
  );
}