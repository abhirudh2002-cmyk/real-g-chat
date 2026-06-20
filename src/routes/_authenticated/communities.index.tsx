import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase, isLocalDemoSession, getLocalCommunities, joinLocalCommunity } from "@/integrations/supabase/client";
import { Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/communities/")({
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
  member_count: number;
  joined?: boolean;
};

const DEFAULT_PILLARS: Community[] = [
  { id: "health-circle", slug: "health", name: "Health", description: "Daily habits, recovery, and wellbeing routines.", category: "wellness", is_default: true, member_count: 1, joined: false },
  { id: "wealth-circle", slug: "wealth", name: "Wealth", description: "Budgeting, growth, and long-term money conversations.", category: "finance", is_default: true, member_count: 1, joined: false },
  { id: "relationships-circle", slug: "relationships", name: "Relationships", description: "Support, communication, and connection with your people.", category: "social", is_default: true, member_count: 1, joined: false },
  { id: "progress-circle", slug: "progress", name: "Progress", description: "Daily wins, goal tracking, and real execution accountability.", category: "growth", is_default: true, member_count: 1, joined: false }
];

function CommunitiesPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const localMode = isLocalDemoSession();

  const { data: userId } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await (supabase as any).auth.getUser()).data.user?.id ?? null,
  });

  const { data: communities = [] } = useQuery({
    queryKey: ["communities", userId, localMode ? "local" : "remote"],
    queryFn: async () => {
      if (localMode) return getLocalCommunities(userId);

      try {
        const [comm, mems] = await Promise.all([
          (supabase as any).from("communities").select("*").order("is_default", { ascending: false }),
          (supabase as any).from("community_members").select("community_id, user_id"),
        ]);

        const totalMembersByCommunity = new Map<string, number>();
        const mine = new Set<string>();

        for (const m of mems.data ?? []) {
          totalMembersByCommunity.set(m.community_id, (totalMembersByCommunity.get(m.community_id) ?? 0) + 1);
          if (String(m.user_id) === String(userId)) mine.add(m.community_id);
        }

        if (!comm.data || comm.data.length === 0) {
          return DEFAULT_PILLARS.map(p => ({
            ...p,
            joined: mine.has(p.id),
            member_count: totalMembersByCommunity.get(p.id) ?? 1
          }));
        }

        return comm.data.map((c: any) => ({
          ...c,
          joined: mine.has(c.id),
          member_count: totalMembersByCommunity.get(c.id) ?? (c.member_count || 0),
        })) as Community[];
      } catch (e) {
        return DEFAULT_PILLARS.map(p => ({ ...p, joined: false }));
      }
    },
    enabled: !!userId || localMode,
    staleTime: 0,
    gcTime: 0,
  });

  const join = useMutation({
    mutationFn: async (targetCommunity: Community) => {
      if (localMode) {
        joinLocalCommunity(targetCommunity.id, userId ?? undefined);
        return targetCommunity.slug;
      }
      
      await (supabase as any).from("community_members").delete().eq("community_id", targetCommunity.id).eq("user_id", userId!);
      
      const { error } = await (supabase as any)
        .from("community_members")
        .insert({ 
          community_id: targetCommunity.id, 
          user_id: userId!,
          joined_at: new Date().toISOString()
        });
        
      if (error && !error.message.includes("unique_user_community")) throw error;
      return targetCommunity.slug;
    },
    onSuccess: async (slug) => {
      await qc.resetQueries({ queryKey: ["communities"], exact: false });
      await qc.resetQueries({ queryKey: ["community", slug], exact: false });
      toast.success("Joined community successfully!");
      navigate({ to: "/communities/$slug", params: { slug } });
    },
    onError: (e: any) => toast.error("Couldn't join", { description: e.message }),
  });

  return (
    <AppShell>
      <header className="mb-8 flex items-end justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">Find your people</div>
          <h1 className="mt-1 font-display text-3xl font-bold tracking-tight md:text-4xl">Communities</h1>
        </div>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {communities.map((c) => (
          <div key={c.id} className="group flex flex-col rounded-2xl border border-border bg-card p-6 transition hover:bg-muted/40">
            <div className="flex items-center justify-between">
              <div className="font-display text-xl font-bold">{c.name}</div>
            </div>
            <p className="mt-2 line-clamp-3 min-h-[3em] text-sm text-muted-foreground">{c.description}</p>
            <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
              <div className="inline-flex items-center gap-1">
                <Users className="size-3.5" /> {c.member_count} member{c.member_count === 1 ? "" : "s"}
              </div>
            </div>
            <div className="mt-4 flex gap-2">
              {!c.joined ? (
                <button
                  onClick={() => join.mutate(c)}
                  disabled={join.isPending}
                  className="flex-1 rounded-lg bg-white text-black px-3 py-2 text-sm font-semibold transition disabled:opacity-50 hover:bg-zinc-200 shadow"
                >
                  {join.isPending ? "Joining…" : "Join Community"}
                </button>
              ) : (
                <Link
                  to="/communities/$slug"
                  params={{ slug: c.slug }}
                  className="flex-1 rounded-lg border border-border bg-muted px-3 py-2 text-center text-sm font-semibold text-foreground transition hover:bg-secondary"
                >
                  Open Chat
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </AppShell>
  );
}