import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Plus, Target, Check } from "lucide-react";
import { toast } from "sonner";

const today = () => new Date().toISOString().slice(0, 10);

type Goal = {
  id: string;
  title: string;
  category: string;
  is_daily: boolean;
  done_on: string | null;
  status: string;
};

const CATEGORIES = ["fitness","wealth","relationships","productivity","education","entrepreneurship","mindset","other"] as const;

export function GoalsPanel() {
  const qc = useQueryClient();
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<typeof CATEGORIES[number]>("other");

  const { data: userId } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });

  const { data: goals = [] } = useQuery({
    queryKey: ["goals", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("goals")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as Goal[];
    },
    enabled: !!userId,
  });

  const toggle = useMutation({
    mutationFn: async (g: Goal) => {
      const done = g.done_on === today();
      const { error } = await supabase
        .from("goals")
        .update({ done_on: done ? null : today() })
        .eq("id", g.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });

  const addGoal = useMutation({
    mutationFn: async () => {
      const t = title.trim();
      if (!t) throw new Error("Title required");
      const { error } = await supabase.from("goals").insert({
        user_id: userId!,
        title: t.slice(0, 140),
        category,
        is_daily: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setTitle("");
      setAdding(false);
      qc.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("goals").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }),
  });

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="size-5" />
          <h2 className="font-display text-xl font-bold">Goals</h2>
          <span className="text-xs text-muted-foreground">today</span>
        </div>
        <button
          onClick={() => setAdding((v) => !v)}
          className="inline-flex items-center gap-1 rounded-md bg-elevated px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
        >
          <Plus className="size-3.5" /> Add
        </button>
      </header>

      {adding && (
        <form
          onSubmit={(e) => { e.preventDefault(); addGoal.mutate(); }}
          className="mb-4 space-y-2 rounded-xl border border-border bg-background p-3"
        >
          <input
            autoFocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What's the goal for today?"
            maxLength={140}
            className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm outline-none focus:border-foreground"
          />
          <div className="flex gap-2">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as any)}
              className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm capitalize outline-none"
            >
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button type="submit" disabled={addGoal.isPending} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
              Add
            </button>
          </div>
        </form>
      )}

      {goals.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No goals yet. Add one and start.
        </div>
      ) : (
        <ul className="space-y-2">
          {goals.map((g) => {
            const done = g.done_on === today();
            return (
              <li
                key={g.id}
                className="group flex items-center gap-3 rounded-xl border border-border bg-background p-3 transition hover:bg-elevated"
              >
                <button
                  onClick={() => toggle.mutate(g)}
                  className={`flex size-7 shrink-0 items-center justify-center rounded-md border transition ${
                    done ? "border-success bg-success text-background" : "border-border bg-card hover:border-foreground"
                  }`}
                  aria-label={done ? "Mark not done" : "Mark done"}
                >
                  {done && <Check className="size-4" strokeWidth={3} />}
                </button>
                <div className="flex-1 min-w-0">
                  <div className={`text-sm font-medium ${done ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {g.title}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{g.category}</div>
                </div>
                <button
                  onClick={() => remove.mutate(g.id)}
                  className="text-xs text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:text-destructive"
                >
                  Delete
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
