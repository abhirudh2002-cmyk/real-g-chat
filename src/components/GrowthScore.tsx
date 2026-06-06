import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const today = () => new Date().toISOString().slice(0, 10);

export function GrowthScore() {
  const { data } = useQuery({
    queryKey: ["growth-score"],
    queryFn: async () => {
      const [goals, habits, completions] = await Promise.all([
        supabase.from("goals").select("id, done_on").eq("status", "active"),
        supabase.from("habits").select("id"),
        supabase.from("habit_completions").select("habit_id, completed_on").eq("completed_on", today()),
      ]);
      const goalsTotal = goals.data?.length ?? 0;
      const goalsDone = (goals.data ?? []).filter((g: any) => g.done_on === today()).length;
      const habitsTotal = habits.data?.length ?? 0;
      const habitsDone = completions.data?.length ?? 0;
      const total = goalsTotal + habitsTotal;
      const done = goalsDone + habitsDone;
      const pct = total === 0 ? 0 : Math.round((done / total) * 100);
      return { pct, goalsDone, goalsTotal, habitsDone, habitsTotal };
    },
  });

  const pct = data?.pct ?? 0;

  return (
    <section className="rounded-2xl border border-border bg-gradient-to-br from-card to-elevated p-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Growth score</div>
          <div className="mt-1 font-display text-5xl font-extrabold tracking-tight">{pct}%</div>
          <div className="mt-2 text-sm text-muted-foreground">
            {data?.goalsDone ?? 0}/{data?.goalsTotal ?? 0} goals · {data?.habitsDone ?? 0}/{data?.habitsTotal ?? 0} habits
          </div>
        </div>
        <div className="hidden flex-1 sm:block">
          <div className="h-2 w-full overflow-hidden rounded-full bg-elevated">
            <div
              className="h-full rounded-full bg-gradient-to-r from-foreground to-gold transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="mt-2 text-right text-xs text-muted-foreground">
            {pct === 100 ? "Perfect day. Compound it." : pct >= 50 ? "Keep stacking wins." : "The work is the way."}
          </div>
        </div>
      </div>
    </section>
  );
}
