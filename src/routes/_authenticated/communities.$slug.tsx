import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase, isLocalDemoSession, getLocalCommunityBySlug } from "@/integrations/supabase/client";
import { CommunityChat } from "@/components/CommunityChat";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/communities/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — Real G` }] }),
  component: CommunityDetail,
});

const DEFAULT_PILLARS: Record<string, any> = {
  health: { id: "health-circle", name: "Health", description: "Daily habits, recovery, and wellbeing routines." },
  wealth: { id: "wealth-circle", name: "Wealth", description: "Budgeting, growth, and long-term money conversations." },
  relationships: { id: "relationships-circle", name: "Relationships", description: "Support, communication, and connection with your people.", },
  progress: { id: "progress-circle", name: "Progress", description: "Daily wins, goal tracking, and real execution accountability." }
};

function CommunityDetail() {
  const { slug } = Route.useParams();
  const localMode = isLocalDemoSession();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const [chatKey, setChatKey] = useState(() => Date.now().toString());

  const { data: userId } = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const userRes = await (supabase as any).auth.getUser();
      console.log("[DEBUG] Current user context retrieved:", userRes.data.user?.id);
      return userRes.data.user?.id ?? null;
    },
  });

  const { data: community, refetch } = useQuery({
    queryKey: ["community", slug, userId],
    queryFn: async () => {
      console.log("[DEBUG] Fetching fresh community detail dataset for slug:", slug);
      if (localMode) return getLocalCommunityBySlug(slug, userId);

      try {
        const { data, error } = await (supabase as any).from("communities").select("*").eq("slug", slug).single();
        if (error) throw error;
        const base = data || DEFAULT_PILLARS[slug];
        if (!base) return null;

        const { data: mem, error: memError } = await (supabase as any).from("community_members").select("user_id").eq("community_id", base.id);
        if (memError) throw memError;
        
        const membersList = mem ?? [];
        const joined = membersList.some((m: any) => String(m.user_id) === String(userId));

        console.log(`[DEBUG] Community loaded: ${base.name}, Total Members: ${membersList.length}, Logged-In User Joined: ${joined}`);

        return { 
          ...base, 
          member_count: membersList.length, 
          joined: joined
        };
      } catch (e) {
        console.error("[ERROR] Failed to fetch layout details:", e);
        return null;
      }
    },
    enabled: !!userId,
    staleTime: 0,
    gcTime: 0,
  });

  async function handleJoinClick() {
    if (!community || !userId) return;
    setBusy(true);
    console.log(`[TRACE] Initiating join transaction sequence for community: ${community.id}`);
    try {
      if (!localMode) {
        // Clean up accidental duplicate constraints safely
        await (supabase as any).from("community_members").delete().eq("community_id", community.id).eq("user_id", userId);
        
        const { error } = await (supabase as any).from("community_members").insert({ 
          community_id: community.id, 
          user_id: userId,
          joined_at: new Date().toISOString()
        });
        if (error) throw error;
      }

      console.log("[TRACE] Join database transaction complete. Resetting state configurations.");
      setChatKey(Date.now().toString());
      
      // Sync cache keys explicitly
      qc.setQueryData(["community", slug, userId], (old: any) => old ? { ...old, joined: true, member_count: (old.member_count || 0) + 1 } : old);
      await qc.invalidateQueries({ queryKey: ["communities"] });
      await refetch();
      
      toast.success("Joined community successfully!");
    } catch (error: any) {
      console.error("[CRITICAL] Join failure:", error);
      toast.error(error.message || "Could not join");
    } finally {
      setBusy(false);
    }
  }

  async function handleLeaveClick() {
    if (!community || !userId) return;
    setBusy(true);
    console.log(`[TRACE] Initiating leave transaction sequence for community: ${community.id}`);
    try {
      if (!localMode) {
        // Await the deletion transaction completely before advancing state steps
        const { error, count } = await (supabase as any)
          .from("community_members")
          .delete()
          .eq("community_id", community.id)
          .eq("user_id", userId);
          
        if (error) throw error;
        console.log("[TRACE] Database confirmation returned. Row drop execution verified.");
      }

      setChatKey(Date.now().toString());

      // Correct optimistic updates for both localized query definitions
      qc.setQueryData(["community", slug, userId], (old: any) => {
        if (!old) return old;
        return { 
          ...old, 
          joined: false,
          member_count: Math.max(0, (old.member_count || 1) - 1)
        };
      });

      qc.setQueryData(["communities", userId, localMode ? "local" : "remote"], (old: any) => {
        if (!Array.isArray(old)) return [];
        return old.map((c: any) => c.id === community.id ? { ...c, joined: false, member_count: Math.max(0, (c.member_count || 1) - 1) } : c);
      });

      console.log("[TRACE] Local client queries recalculated. Purging React Query caches.");
      await qc.invalidateQueries({ queryKey: ["communities"] });
      await qc.invalidateQueries({ queryKey: ["community", slug, userId] });
      await refetch();
      
      toast.success("Left the community");
    } catch (error: any) {
      console.error("[CRITICAL] Leave failure:", error);
      toast.error(error.message || "Could not process membership cancellation.");
    } finally {
      setBusy(false);
    }
  }

  if (!community) return <AppShell><div className="p-6 text-sm">Loading community...</div></AppShell>;

  return (
    <AppShell>
      <header className="mb-4 flex items-start gap-3">
        <Link to="/communities" className="mt-1 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted">
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold tracking-tight">{community.name}</h1>
          <p className="text-xs text-muted-foreground font-medium">{community.member_count} member{community.member_count === 1 ? "" : "s"}</p>
        </div>
        {community.joined ? (
          <button 
            onClick={handleLeaveClick} 
            disabled={busy} 
            className="rounded-lg border border-border bg-destructive/10 text-destructive hover:bg-destructive/20 px-4 py-2 text-sm font-semibold transition"
          >
            {busy ? "Processing..." : "Leave community"}
          </button>
        ) : (
          <button 
            onClick={handleJoinClick} 
            disabled={busy} 
            className="rounded-lg bg-white text-black hover:bg-zinc-200 px-4 py-2 text-sm font-semibold shadow transition"
          >
            {busy ? "Processing..." : "Join Community"}
          </button>
        )}
      </header>

      {community.joined ? (
        <CommunityChat key={chatKey} communityId={community.id} userId={userId ?? "demo-user"} localMode={localMode} />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-muted-foreground flex flex-col items-center justify-center min-h-[300px]">
          <h3 className="font-display text-lg font-bold text-foreground mb-2">You are not a member</h3>
          <p className="text-sm max-w-sm mb-6 text-muted-foreground">Join this community to access the timeline and chat securely with other users.</p>
          <button 
            onClick={handleJoinClick} 
            disabled={busy} 
            className="rounded-xl bg-white text-black px-6 py-2.5 text-sm font-bold shadow hover:bg-zinc-200 transition"
          >
            Join Community
          </button>
        </div>
      )}
    </AppShell>
  );
}