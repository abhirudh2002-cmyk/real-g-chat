import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { CommunityPosts } from "@/components/CommunityPosts";
import { CommunityChat } from "@/components/CommunityChat";
import { ArrowLeft, MessageSquare, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/communities/$slug")({
  head: ({ params }) => ({ meta: [{ title: `${params.slug} — Real G` }] }),
  component: CommunityDetail,
});

function CommunityDetail() {
  const { slug } = Route.useParams();
  const [tab, setTab] = useState<"posts" | "chat">("posts");

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
      <Link to="/communities" className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All communities
      </Link>
      <header className="mb-6 rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight md:text-4xl">{community.name}</h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{community.description}</p>
            <div className="mt-3 text-xs text-muted-foreground">{community.members} member{community.members === 1 ? "" : "s"}</div>
          </div>
          {!community.joined && (
            <button onClick={join} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90">
              Join
            </button>
          )}
        </div>
      </header>

      {community.joined ? (
        <>
          <div className="mb-4 inline-flex rounded-lg border border-border bg-card p-1">
            <button
              onClick={() => setTab("posts")}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition ${
                tab === "posts" ? "bg-elevated text-foreground" : "text-muted-foreground"
              }`}
            >
              <FileText className="size-4" /> Posts
            </button>
            <button
              onClick={() => setTab("chat")}
              className={`inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition ${
                tab === "chat" ? "bg-elevated text-foreground" : "text-muted-foreground"
              }`}
            >
              <MessageSquare className="size-4" /> Chat
            </button>
          </div>
          {tab === "posts" ? (
            <CommunityPosts communityId={community.id} userId={userId!} />
          ) : (
            <CommunityChat communityId={community.id} userId={userId!} />
          )}
        </>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
          Join this community to see posts and chat.
        </div>
      )}
    </AppShell>
  );
}
