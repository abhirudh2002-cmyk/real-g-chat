import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useMemo, useEffect } from "react";
import { Plus, Check, Trophy, Trash2 } from "lucide-react";
import { toast } from "sonner";

type Goal = { id: string; title: string; is_completed: boolean; created_at: string; user_id: string; category?: string };

export function GoalsPanel() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [currentDateStr, setCurrentDateStr] = useState(new Date().toLocaleDateString());

  const getStartOfToday = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return today.toISOString();
  };

  const { data: userId, isLoading: authLoading } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      return (await supabase.auth.getUser()).data.user?.id ?? null;
    },
  });

  const { data: goals = [], isLoading: goalsLoading } = useQuery({
    queryKey: ["goals", userId, currentDateStr],
    queryFn: async () => {
      if (!userId) return [];
      const startOfToday = getStartOfToday();

      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("user_id", userId)
        .gte("created_at", startOfToday)
        .order("created_at");
        
      if (error) throw error;
      return (data ?? []) as Goal[];
    },
    enabled: !!userId,
  });

  const pruneHistoricalGoals = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const startOfToday = getStartOfToday();
      
      await supabase
        .from("goals")
        .delete()
        .eq("user_id", userId)
        .lt("created_at", startOfToday);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals", userId, currentDateStr] });
      qc.invalidateQueries({ queryKey: ["growth-score", userId] });
    }
  });

  useEffect(() => {
    if (userId) {
      pruneHistoricalGoals.mutate();
    }

    const midnightPoller = setInterval(() => {
      const activeTodayStr = new Date().toLocaleDateString();
      if (activeTodayStr !== currentDateStr) {
        setCurrentDateStr(activeTodayStr);
        pruneHistoricalGoals.mutate();
        toast.info("A new day has started! Your objectives have refreshed.");
      }
    }, 60000);

    return () => clearInterval(midnightPoller);
  }, [userId, currentDateStr]);

  const completionPercentage = useMemo(() => {
    if (goals.length === 0) return 0;
    const completed = goals.filter((g) => g.is_completed).length;
    return Math.round((completed / goals.length) * 100);
  }, [goals]);

  const addGoal = useMutation({
    mutationFn: async () => {
      const t = title.trim();
      if (!t) throw new Error("Goal title required");
      if (!userId) throw new Error("Not authenticated");

      const { error } = await supabase.from("goals").insert({ 
        title: t, 
        is_completed: false,
        user_id: userId,
        category: "general"
      });
      if (error) throw error;
    },
    onSuccess: () => { 
      setTitle(""); 
      setAdding(false); 
      qc.invalidateQueries({ queryKey: ["goals", userId, currentDateStr] }); 
      qc.invalidateQueries({ queryKey: ["growth-score", userId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  // Undo Restoration Mutation for Goals
  const restoreGoal = useMutation({
    mutationFn: async (goal: Goal) => {
      const { error } = await supabase.from("goals").insert({
        id: goal.id,
        title: goal.title,
        is_completed: goal.is_completed,
        user_id: goal.user_id,
        category: goal.category ?? "general",
        created_at: goal.created_at
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Goal restored");
      qc.invalidateQueries({ queryKey: ["goals", userId, currentDateStr] });
      qc.invalidateQueries({ queryKey: ["growth-score", userId] });
    },
    onError: (e: any) => toast.error("Failed to restore goal: " + e.message)
  });

  const removeGoal = useMutation({
    mutationFn: async (goal: Goal) => {
      if (!userId) return;
      const { error } = await supabase
        .from("goals")
        .delete()
        .eq("id", goal.id)
        .eq("user_id", userId);
        
      if (error) throw error;
      return goal; // pass deleted payload down to success handler
    },
    onSuccess: (deletedGoal) => {
      qc.invalidateQueries({ queryKey: ["goals", userId, currentDateStr] });
      qc.invalidateQueries({ queryKey: ["growth-score", userId] });

      if (deletedGoal) {
        toast("Goal removed", {
          action: {
            label: "Undo",
            onClick: () => restoreGoal.mutate(deletedGoal)
          }
        });
      }
    },
    onError: (e: any) => toast.error(e.message),
  });

  const toggle = useMutation({
    mutationFn: async (goal: Goal) => {
      const { error } = await supabase
        .from("goals")
        .update({ is_completed: !goal.is_completed })
        .eq("id", goal.id)
        .eq("user_id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["goals", userId, currentDateStr] });
      qc.invalidateQueries({ queryKey: ["growth-score", userId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (authLoading || goalsLoading || !userId) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center text-xs text-muted-foreground font-mono animate-pulse">
        Establishing user environment workspace...
      </div>
    );
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <header className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Trophy className="size-5 text-yellow-500" />
            <h2 className="font-display text-xl font-bold">Goals</h2>
          </div>
          <button 
            onClick={() => setAdding((v) => !v)} 
            className="inline-flex items-center gap-1 rounded-md bg-elevated px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
          >
            <Plus className="size-3.5" /> Add goal
          </button>
        </div>

        <div className="flex items-center gap-4 rounded-xl border border-border bg-background p-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs mb-2">
              <span className="text-muted-foreground font-medium">Goal Completion Score</span>
              <span className="font-bold text-foreground">{completionPercentage}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-elevated overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-yellow-500 to-emerald-500 transition-all duration-500 ease-out"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </header>

      {adding && (
        <form 
          onSubmit={(e) => { e.preventDefault(); addGoal.mutate(); }} 
          className="mb-4 flex gap-2 rounded-xl border border-border bg-background p-3"
        >
          <input 
            autoFocus 
            value={title} 
            onChange={(e) => setTitle(e.target.value)} 
            placeholder="New milestone..." 
            className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground" 
          />
          <button 
            type="submit" 
            disabled={addGoal.isPending}
            className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            Add
          </button>
        </form>
      )}

      {goals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No goals set yet. Outline your milestones.
        </div>
      ) : (
        <ul className="space-y-3">
          {goals.map((g) => (
            <li key={g.id} className="group flex items-center gap-3 rounded-xl border border-border bg-background p-3 transition hover:bg-elevated">
              <button
                onClick={() => toggle.mutate(g)}
                className={`flex size-7 shrink-0 items-center justify-center rounded-md border transition-all duration-200 ${
                  g.is_completed 
                    ? "border-emerald-500 bg-emerald-500 text-white" 
                    : "border-border bg-card hover:border-foreground"
                }`}
              >
                {g.is_completed && <Check className="size-4" strokeWidth={3} />}
              </button>
              
              <span className={`flex-1 text-sm font-medium transition ${
                g.is_completed ? "line-through text-muted-foreground" : "text-foreground"
              }`}>
                {g.title}
              </span>

              <button
                onClick={() => removeGoal.mutate(g)}
                disabled={removeGoal.isPending}
                className="text-xs text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive p-1 rounded hover:bg-elevated"
                aria-label="Delete goal"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}