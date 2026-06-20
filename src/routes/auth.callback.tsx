import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/auth/callback")({
  head: () => ({ meta: [{ title: "Finishing sign in — Real G" }] }),
  component: AuthCallbackPage,
});

function AuthCallbackPage() {
  const navigate = useNavigate();
  const [message, setMessage] = useState("Finishing sign in...");

  useEffect(() => {
    // Ground safety check: Ensure we are in the browser context
    if (typeof window === 'undefined' || !supabase || !supabase.auth) return;

    let isRedirecting = false;

    // 1. LISTEN TO REAL-TIME AUTH CHANGES
    // This listener triggers automatically the exact millisecond Supabase validates your Google token
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (isRedirecting) return;

      if (session) {
        isRedirecting = true;
        setMessage("Welcome back — opening your dashboard...");
        
        // Clean the Google hashes out of the browser URL bar cleanly
        const cleanedUrl = new URL(window.location.href);
        cleanedUrl.hash = "";
        cleanedUrl.search = "";
        window.history.replaceState(window.history.state, "", cleanedUrl.toString());

        // Launch straight into the dashboard UI groups layout!
        navigate({ to: "/dashboard" });
      }
    });

    // 2. FALLBACK EXPLICIT CHECK
    // Just in case the listener missed the initial event packet during load mount
    async function checkCurrentSession() {
      try {
        const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ""));
        const searchParams = new URLSearchParams(window.location.search);
        
        if (hashParams.get("error") || searchParams.get("error")) {
          throw new Error(
            hashParams.get("error_description") || 
            searchParams.get("error_description") || 
            "Google sign-in was cancelled."
          );
        }

        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;

        if (session && !isRedirecting) {
          isRedirecting = true;
          setMessage("Welcome back — opening your dashboard...");
          navigate({ to: "/dashboard" });
        }
      } catch (error: any) {
        if (isRedirecting) return;
        console.error("Auth callback verification step failed:", error);
        toast.error("Could not finish sign in", {
          description: error?.message || "Please try again.",
        });
        navigate({ to: "/auth" });
      }
    }

    // Fire verification scan after UI paints
    const timer = setTimeout(() => {
      void checkCurrentSession();
    }, 150);

    // Cleanup active listener hooks on unmount
    return () => {
      clearTimeout(timer);
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 text-center shadow-2xl">
        <div className="mx-auto mb-4 h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
        <p className="text-sm font-medium text-muted-foreground">{message}</p>
      </div>
    </div>
  );
}