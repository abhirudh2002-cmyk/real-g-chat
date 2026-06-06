import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CommunityChat } from "@/components/CommunityChat";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/communities/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — Real G` }] }),
  component: CommunityDetail,
});

function CommunityDetail() {
  const { slug } = Route.useParams();

  const { data: userId } = useQuery({
    queryKey: ["me"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });

  const { data: community, refetch } = useQuery({
    queryKey: ["community", slug, userId],
    queryFn: async () => {
      const { data, error } = await supabase.from("communities").select("*").eq("slug", slug).single();
      if (error) throw error;
      const { data: mem } = await supabase
        .from("community_members")
        .select("user_id")
        .eq("community_id", data.id);
      const joined = (mem ?? []).some((m: any) => m.user_id === userId);
      return { ...data, members: mem?.length ?? 0, joined };
    },
    enabled: !!userId,
  });

  if (!community) {
    return (
      <AppShell>
        <div className="text-muted-foreground">Loading…</div>
      </AppShell>
    );
  }

  async function join() {
    const { error } = await supabase.from("community_members").insert({ community_id: community!.id, user_id: userId! });
    if (error) toast.error(error.message);
    else refetch();
  }

  return (
    <AppShell>
      <header className="mb-4 flex items-start gap-3">
        <Link
          to="/communities"
          className="mt-1 inline-flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-elevated hover:text-foreground"
          aria-label="Back to communities"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div className="flex-1">
          <h1 className="font-display text-2xl font-bold tracking-tight">{community.name}</h1>
          {community.description && (
            <p className="text-sm text-muted-foreground">{community.description}</p>
          )}
          <div className="mt-1 text-xs text-muted-foreground">
            {community.members} member{community.members === 1 ? "" : "s"}
          </div>
        </div>
        {!community.joined && (
          <button onClick={join} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
            Join
          </button>
        )}
      </header>

      {community.joined ? (
        <CommunityChat communityId={community.id} userId={userId!} />
      ) : (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
          Join this community to start chatting.
        </div>
      )}
    </AppShell>
  );
}
