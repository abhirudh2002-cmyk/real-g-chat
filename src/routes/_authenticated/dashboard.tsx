import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { GoalsPanel } from "@/components/GoalsPanel";
import { HabitsPanel } from "@/components/HabitsPanel";
import { GrowthScore } from "@/components/GrowthScore";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Real G" }] }),
  component: Dashboard,
});

const COMMUNITY_HIGHLIGHTS = [
  { slug: "health", name: "Health" },
  { slug: "wealth", name: "Wealth" },
  { slug: "relationships", name: "Relationships" },
  { slug: "progress", name: "Progress" },
  { slug: "looks", name: "Looks" },
];

function Dashboard() {
  // Fetch authenticated user ID at the dashboard root level
  const { data: userId } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      return (await supabase.auth.getUser()).data.user?.id ?? null;
    },
  });

  return (
    <AppShell>
      <header className="mb-8">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">Today</div>
        <h1 className="mt-1 font-display text-3xl font-bold tracking-tight md:text-4xl">
          Show up. Again.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Tick the goals you finish. Log the habits you keep. Compound it daily.
        </p>
      </header>

      {/* FIXED: Passing key={userId} forces GrowthScore to completely reset when switching accounts */}
      <GrowthScore key={`score-${userId}`} />

      <div className="mt-8 rounded-2xl border border-border bg-card p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">Your circles</div>
            <h2 className="mt-1 font-display text-2xl font-bold tracking-tight">Communities</h2>
            <p className="mt-2 text-sm text-muted-foreground">Jump into your core spaces from here.</p>
          </div>
          <Link to="/communities" className="rounded-lg border border-border bg-elevated px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-secondary">
            Open all
          </Link>
        </div>
        
        <div className="mt-4 grid gap-3 sm:grid-cols-2 md:grid-cols-5">
          {COMMUNITY_HIGHLIGHTS.map((community) => (
            <Link key={community.slug} to="/communities/$slug" params={{ slug: community.slug }} className="rounded-xl border border-border bg-background p-4 transition hover:bg-elevated flex flex-col justify-between">
              <div>
                <div className="font-semibold">{community.name}</div>
                <div className="mt-1 text-xs text-muted-foreground leading-relaxed">Join the conversation and keep momentum.</div>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* FIXED: Passing unique keys here guarantees the panels completely wipe clean on logout/login */}
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <GoalsPanel key={`goals-${userId}`} />
        <HabitsPanel key={`habits-${userId}`} />
      </div>
    </AppShell>
  );
}