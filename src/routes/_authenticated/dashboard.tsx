import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { GoalsPanel } from "@/components/GoalsPanel";
import { HabitsPanel } from "@/components/HabitsPanel";
import { GrowthScore } from "@/components/GrowthScore";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — Real G" }] }),
  component: Dashboard,
});

function Dashboard() {
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

      <GrowthScore />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <GoalsPanel />
        <HabitsPanel />
      </div>
    </AppShell>
  );
}
