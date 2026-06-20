import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    // 1. SSR ENVIRONMENT BREAK OUT: 
    // If executing server-side during initial boot, bypass the redirect 
    // and allow the native browser engine to evaluate auth state.
    if (typeof window === "undefined") {
      return { user: null };
    }

    try {
      if (!supabase || !supabase.auth) {
        throw new Error("Supabase context uninitialized");
      }

      // Read current browser token state
      const { data, error } = await supabase.auth.getUser();
      
      if (error || !data?.user) {
        // Backup safety check: check for a local storage session to prevent OAuth race condition freezes
        const localSessionRaw = window.localStorage.getItem("realg-local-auth-session");
        if (localSessionRaw) {
          const parsed = JSON.parse(localSessionRaw);
          if (parsed?.user) return { user: parsed.user };
        }
        
        // Unauthenticated? Direct back to sign in safely
        throw redirect({ to: "/auth" });
      }

      return { user: data.user };
    } catch (err: any) {
      // Re-throw framework navigation redirections cleanly
      if (err?.isRedirect || err?.statusCode) throw err;
      
      console.warn("Auth check deferred safely:", err);
      throw redirect({ to: "/auth" });
    }
  },
  component: () => <Outlet />,
});