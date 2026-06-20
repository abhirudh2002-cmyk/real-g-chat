import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo } from "react";
import { Plus, Flame, Check } from "lucide-react";
import { toast } from "sonner";

const today = () => new Date().toISOString().slice(0, 10);
const isoDay = (d: Date) => d.toISOString().slice(0, 10);

type Habit = { id: string; title: string; frequency: string; created_at: string; user_id?: string };
type Completion = { habit_id: string; completed_on: string };

function calcStreak(dates: Set<string>): number {
  let streak = 0;
  const d = new Date();
  while (dates.has(isoDay(d))) {
    streak++;
    d.setDate(d.getDate() - 1);
  }
  return streak;
}

export function HabitsPanel() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");

  // Get active user context
  const { data: userId } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      return (await supabase.auth.getUser()).data.user?.id ?? null;
    },
  });

  const { data } = useQuery({
    queryKey: ["habits", userId],
    queryFn: async () => {
      if (!userId) return { habits: [], completions: [] };
      
      const [h, c] = await Promise.all([
        supabase.from("habits").select("*").eq("user_id", userId).order("created_at"),
        supabase.from("habit_completions").select("habit_id, completed_on").eq("user_id", userId),
      ]);
      if (h.error) throw h.error;
      if (c.error) throw c.error;
      return { habits: (h.data ?? []) as Habit[], completions: (c.data ?? []) as Completion[] };
    },
    enabled: !!userId,
  });

  const habits = data?.habits ?? [];
  const byHabit = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const c of data?.completions ?? []) {
      if (!map.has(c.habit_id)) map.set(c.habit_id, new Set());
      map.get(c.habit_id)!.add(c.completed_on);
    }
    return map;
  }, [data?.completions]);

  const completionPercentage = useMemo(() => {
    if (habits.length === 0) return 0;
    const completedToday = habits.filter(h => byHabit.get(h.id)?.has(today())).length;
    return Math.round((completedToday / habits.length) * 100);
  }, [habits, byHabit]);

  const addHabit = useMutation({
    mutationFn: async () => {
      const t = title.trim();
      if (!t) throw new Error("Title required");
      if (!userId) throw new Error("Not authenticated");
      
      const { error } = await supabase.from("habits").insert({
        user_id: userId,
        title: t.slice(0, 80),
        frequency: "daily",
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setAdding(false);
      qc.invalidateQueries({ queryKey: ["habits", userId] });
      qc.invalidateQueries({ queryKey: ["growth-score", userId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Undo Restoration Mutation for Habits
  const restoreHabit = useMutation({
    mutationFn: async (habit: Habit) => {
      const { error } = await supabase.from("habits").insert({
        id: habit.id,
        user_id: userId,
        title: habit.title,
        frequency: habit.frequency,
        created_at: habit.created_at
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Habit restored");
      qc.invalidateQueries({ queryKey: ["habits", userId] });
      qc.invalidateQueries({ queryKey: ["growth-score", userId] });
    },
    onError: (e: any) => toast.error("Failed to restore habit: " + e.message)
  });

  const remove = useMutation({
    mutationFn: async (habit: Habit) => {
      if (!userId) return;
      const { error } = await supabase.from("habits").delete().eq("id", habit.id).eq("user_id", userId);
      if (error) throw error;
      return habit;
    },
    onSuccess: (deletedHabit) => {
      qc.invalidateQueries({ queryKey: ["habits", userId] });
      qc.invalidateQueries({ queryKey: ["growth-score", userId] });

      if (deletedHabit) {
        toast("Habit removed", {
          action: {
            label: "Undo",
            onClick: () => restoreHabit.mutate(deletedHabit)
          }
        });
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async ({ habit, done }: { habit: Habit; done: boolean }) => {
      if (!userId) return;
      if (done) {
        const { error } = await supabase.from("habit_completions")
          .delete()
          .eq("habit_id", habit.id)
          .eq("completed_on", today())
          .eq("user_id", userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("habit_completions")
          .insert({ habit_id: habit.id, user_id: userId, completed_on: today() });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habits", userId] });
      qc.invalidateQueries({ queryKey: ["growth-score", userId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const last7 = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return isoDay(d);
  });

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <header className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame className="size-5 text-orange-500" />
            <h2 className="font-display text-xl font-bold">Habits</h2>
          </div>
          <button
            onClick={() => setAdding((v) => !v)}
            className="inline-flex items-center gap-1 rounded-md bg-elevated px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
          >
            <Plus className="size-3.5" /> Add habit
          </button>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-border bg-background p-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-muted-foreground font-medium">Daily Growth Score</span>
              <span className="font-bold text-foreground">{completionPercentage}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-elevated overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-emerald-500 transition-all duration-500 ease-out"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {adding && (
        <form
          onSubmit={(e) => { e.preventDefault(); addHabit.mutate(); }}
          className="mb-4 flex gap-2 rounded-xl border border-border bg-background p-3"
        >
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Train 45 min"
            maxLength={80}
            className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground"
          />
          <button type="submit" disabled={addHabit.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
            Add
          </button>
        </form>
      )}

      {habits.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No habits yet. Build one ritual at a time.
        </div>
      ) : (
        <ul className="space-y-3">
          {habits.map((h) => {
            const set = byHabit.get(h.id) ?? new Set<string>();
            const done = set.has(today());
            const streak = calcStreak(set);
            return (
              <li key={h.id} className="group rounded-xl border border-border bg-background p-3 transition hover:bg-elevated">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => toggle.mutate({ habit: h, done })}
                    className={`flex size-7 shrink-0 items-center justify-center rounded-md border transition ${
                      done ? "border-emerald-500 bg-emerald-500 text-white" : "border-border bg-card hover:border-foreground"
                    }`}
                  >
                    {done && <Check className="size-4" strokeWidth={3} />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{h.title}</div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                      {streak > 0 ? <span className="text-orange-500">🔥 {streak} day streak</span> : "Start your streak"}
                    </div>
                  </div>
                  <div className="hidden gap-1 sm:flex">
                    {last7.map((d) => (
                      <div key={d} className={`size-3 rounded-sm ${set.has(d) ? "bg-emerald-500" : "bg-elevated"}`} />
                    ))}
                  </div>
                  <button
                    onClick={() => remove.mutate(h)}
                    className="text-xs text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                  >
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}