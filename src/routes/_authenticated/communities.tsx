import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Plus, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/communities")({
  head: () => ({ meta: [{ title: "Communities — Real G" }] }),
  component: CommunitiesPage,
});

type Community = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string;
  is_default: boolean;
  members?: number;
  joined?: boolean;
};

function CommunitiesPage() {
  const qc = useQueryClient();
  const [creating, setCreating] = useState(false);

  const { data: userId } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });

  const { data: communities = [] } = useQuery({
    queryKey: ["communities", userId],
    queryFn: async () => {
      const [comm, mems] = await Promise.all([
        supabase.from("communities").select("*").order("is_default", { ascending: false }).order("created_at"),
        supabase.from("community_members").select("community_id, user_id"),
      ]);
      if (comm.error) throw comm.error;
      if (mems.error) throw mems.error;
      const counts = new Map<string, number>();
      const mine = new Set<string>();
      for (const m of mems.data ?? []) {
        counts.set(m.community_id, (counts.get(m.community_id) ?? 0) + 1);
        if (m.user_id === userId) mine.add(m.community_id);
      }
      return (comm.data ?? []).map((c: any) => ({
        ...c,
        members: counts.get(c.id) ?? 0,
        joined: mine.has(c.id),
      })) as Community[];
    },
    enabled: !!userId,
  });

  const join = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("community_members").insert({ community_id: id, user_id: userId! });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["communities"] }),
    onError: (e: any) => toast.error("Couldn't join", { description: e.message }),
  });

  return (
    <AppShell>
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Find your people</div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight md:text-4xl">Communities</h1>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
        >
          <Plus className="size-4" /> Create
        </button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {communities.map((c) => (
          <div key={c.id} className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition hover:bg-elevated">
            <div className="flex items-center justify-between">
              <div className="font-display text-xl font-bold">{c.name}</div>
              {c.is_default && (
                <span className="rounded-full border border-border bg-elevated px-2 py-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">Default</span>
              )}
            </div>
            <p className="mt-2 line-clamp-3 min-h-[3em] text-sm text-muted-foreground">{c.description}</p>
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <div className="inline-flex items-center gap-1"><Users className="size-3.5" /> {c.members} member{c.members === 1 ? "" : "s"}</div>
              <span className="capitalize">{c.category}</span>
            </div>
            <div className="mt-4 flex gap-2">
              {!c.joined && (
                <button
                  onClick={() => join.mutate(c.id)}
                  disabled={join.isPending}
                  className="flex-1 rounded-lg border border-border bg-elevated px-3 py-2 text-sm font-semibold transition hover:bg-secondary disabled:opacity-50"
                >
                  {join.isPending ? "Joining…" : "Join"}
                </button>
              )}
              <Link
                to="/communities/$slug"
                params={{ slug: c.slug }}
                className="flex-1 rounded-lg bg-primary px-3 py-2 text-center text-sm font-semibold text-primary-foreground transition hover:opacity-90"
              >
                Open
              </Link>
            </div>
          </div>
        ))}
      </div>

      {creating && <CreateCommunityDialog onClose={() => setCreating(false)} userId={userId!} />}
    </AppShell>
  );
}

function CreateCommunityDialog({ onClose, userId }: { onClose: () => void; userId: string }) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40) + "-" + Math.random().toString(36).slice(2, 6);
    const { data, error } = await supabase
      .from("communities")
      .insert({ name: name.trim().slice(0, 60), description: description.trim().slice(0, 280), slug, category: "other", created_by: userId })
      .select()
      .single();
    if (error) {
      toast.error("Couldn't create", { description: error.message });
      setBusy(false);
      return;
    }
    await supabase.from("community_members").insert({ community_id: data.id, user_id: userId });
    qc.invalidateQueries({ queryKey: ["communities"] });
    toast.success("Community created");
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={onClose}>
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-2xl"
      >
        <h2 className="font-display text-2xl font-bold">New community</h2>
        <p className="mt-1 text-sm text-muted-foreground">Start a circle for your team, niche, or goal.</p>
        <label className="mt-6 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          required
          className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          placeholder="e.g. Early Risers"
        />
        <label className="mt-4 block text-xs font-medium uppercase tracking-wider text-muted-foreground">Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={280}
          rows={3}
          className="mt-2 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          placeholder="What is this community for?"
        />
        <div className="mt-6 flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-border bg-elevated px-3 py-2 text-sm font-semibold hover:bg-secondary">
            Cancel
          </button>
          <button type="submit" disabled={busy} className="flex-1 rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
            {busy ? "Creating…" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}
