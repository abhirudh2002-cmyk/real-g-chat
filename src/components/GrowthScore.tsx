import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";

const getStartOfTodayISO = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
};

const todayString = () => new Date().toISOString().slice(0, 10);

export function GrowthScore() {
  const qc = useQueryClient();

  // 1. Fetch current authenticated user context
  const { data: userId, isLoading: authLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      return (await supabase.auth.getUser()).data.user?.id ?? null;
    },
  });

  // 2. Core Score Query
  const { data, isLoading: metricsLoading } = useQuery({
    queryKey: ["growth-score", userId],
    queryFn: async () => {
      if (!userId) return { pct: 0, goalsDone: 0, goalsTotal: 0, habitsDone: 0, habitsTotal: 0 };

      const startOfToday = getStartOfTodayISO();

      // Fetch all goals for today, all base habits, and today's completions
      const [goals, habits, completions] = await Promise.all([
        supabase.from("goals").select("id, is_completed").eq("user_id", userId).gte("created_at", startOfToday),
        supabase.from("habits").select("id").eq("user_id", userId),
        supabase.from("habit_completions").select("habit_id, completed_on").eq("completed_on", todayString()).eq("user_id", userId),
      ]);

      const goalsTotal = goals.data?.length ?? 0;
      const goalsDone = (goals.data ?? []).filter((g: any) => g.is_completed === true).length;

      const habitsTotal = habits.data?.length ?? 0;
      const habitsDone = completions.data?.length ?? 0;

      const total = goalsTotal + habitsTotal;
      const done = goalsDone + habitsDone;
      const pct = total === 0 ? 0 : Math.round((done / total) * 100);

      return { pct, goalsDone, goalsTotal, habitsDone, habitsTotal };
    },
    enabled: !!userId,
  });

  // 3. Realtime Database Subscription Effect
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel("growth-score-realtime-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "goals", filter: `user_id=eq.${userId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["goals", userId] });
          qc.invalidateQueries({ queryKey: ["growth-score", userId] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "habits", filter: `user_id=eq.${userId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["habits", userId] });
          qc.invalidateQueries({ queryKey: ["growth-score", userId] });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "habit_completions", filter: `user_id=eq.${userId}` },
        () => {
          qc.invalidateQueries({ queryKey: ["habits", userId] });
          qc.invalidateQueries({ queryKey: ["growth-score", userId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, qc]);

  if (authLoading || metricsLoading || !userId) {
    return (
      <section className="rounded-2xl border border-border bg-gradient-to-br from-card to-elevated p-6 animate-pulse">
        <div className="text-xs uppercase tracking-widest text-muted-foreground font-mono">Recalculating score parameters...</div>
        <div className="mt-1 h-12 w-24 bg-zinc-800 rounded-md mt-2" />
      </section>
    );
  }

  const pct = data?.pct ?? 0;

  return (
    <section className="rounded-2xl border border-border bg-gradient-to-br from-card to-elevated p-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Growth score</div>
          <div className="mt-1 font-display text-5xl font-extrabold tracking-tight text-white">{pct}%</div>
          <div className="mt-2 text-sm text-muted-foreground">
            {data?.goalsDone ?? 0}/{data?.goalsTotal ?? 0} goals · {data?.habitsDone ?? 0}/{data?.habitsTotal ?? 0} habits
          </div>
        </div>
        <div className="hidden flex-1 sm:block">
          <div className="h-2 w-full overflow-hidden rounded-full bg-background border border-border">
            <div
              className="h-full rounded-full bg-gradient-to-r from-blue-500 via-yellow-500 to-emerald-500 transition-all duration-500 ease-out"
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