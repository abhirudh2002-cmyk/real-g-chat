import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useRef } from "react";
import { Heart, MessageCircle, ImagePlus, X, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type Post = {
  id: string;
  user_id: string;
  content: string | null;
  media_urls: string[] | null;
  created_at: string;
  author?: { name: string | null; avatar_url: string | null };
  likes?: number;
  liked?: boolean;
  comments?: number;
};

async function getSignedUrls(paths: string[]): Promise<string[]> {
  if (!paths.length) return [];
  const { data } = await supabase.storage.from("community-media").createSignedUrls(paths, 60 * 60);
  return (data ?? []).map((d) => d.signedUrl).filter((u): u is string => !!u);
}

export function CommunityPosts({ communityId, userId }: { communityId: string; userId: string }) {
  const qc = useQueryClient();
  const [content, setContent] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const { data: posts = [] } = useQuery({
    queryKey: ["posts", communityId, userId],
    queryFn: async () => {
      const { data: rows, error } = await supabase
        .from("posts")
        .select("*")
        .eq("community_id", communityId)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      if (!rows?.length) return [] as Post[];
      const ids = rows.map((r: any) => r.id);
      const userIds = [...new Set(rows.map((r: any) => r.user_id))];
      const [authors, likes, comments] = await Promise.all([
        supabase.from("profiles").select("id, name, avatar_url").in("id", userIds),
        supabase.from("post_likes").select("post_id, user_id").in("post_id", ids),
        supabase.from("post_comments").select("post_id").in("post_id", ids),
      ]);
      const authorMap = new Map((authors.data ?? []).map((a: any) => [a.id, a]));
      const likeCount = new Map<string, number>();
      const liked = new Set<string>();
      for (const l of likes.data ?? []) {
        likeCount.set(l.post_id, (likeCount.get(l.post_id) ?? 0) + 1);
        if (l.user_id === userId) liked.add(l.post_id);
      }
      const commentCount = new Map<string, number>();
      for (const c of comments.data ?? []) commentCount.set(c.post_id, (commentCount.get(c.post_id) ?? 0) + 1);

      const out: Post[] = [];
      for (const r of rows as any[]) {
        const signed = await getSignedUrls(r.media_urls ?? []);
        out.push({
          ...r,
          media_urls: signed,
          author: authorMap.get(r.user_id) as any,
          likes: likeCount.get(r.id) ?? 0,
          liked: liked.has(r.id),
          comments: commentCount.get(r.id) ?? 0,
        });
      }
      return out;
    },
  });

  async function createPost(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() && files.length === 0) return;
    setBusy(true);
    try {
      const uploadedPaths: string[] = [];
      for (const f of files) {
        const path = `${userId}/${communityId}/${Date.now()}-${f.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const { error } = await supabase.storage.from("community-media").upload(path, f);
        if (error) throw error;
        uploadedPaths.push(path);
      }
      const { error } = await supabase.from("posts").insert({
        community_id: communityId,
        user_id: userId,
        content: content.trim().slice(0, 2000) || null,
        media_urls: uploadedPaths,
      });
      if (error) throw error;
      setContent("");
      setFiles([]);
      qc.invalidateQueries({ queryKey: ["posts", communityId] });
    } catch (e: any) {
      toast.error("Couldn't post", { description: e.message });
    } finally {
      setBusy(false);
    }
  }

  const toggleLike = useMutation({
    mutationFn: async (p: Post) => {
      if (p.liked) {
        await supabase.from("post_likes").delete().eq("post_id", p.id).eq("user_id", userId);
      } else {
        await supabase.from("post_likes").insert({ post_id: p.id, user_id: userId });
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts", communityId] }),
  });

  const removePost = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("posts").delete().eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["posts", communityId] }),
  });

  return (
    <div className="space-y-6">
      <form onSubmit={createPost} className="rounded-2xl border border-border bg-card p-4">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Share progress, a lesson, or a question…"
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
        />
        {files.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-1 rounded-md bg-elevated px-2 py-1 text-xs">
                {f.name.slice(0, 30)}
                <button type="button" onClick={() => setFiles(files.filter((_, j) => j !== i))}>
                  <X className="size-3" />
                </button>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="inline-flex items-center gap-2 rounded-md bg-elevated px-3 py-1.5 text-xs font-semibold hover:bg-secondary"
          >
            <ImagePlus className="size-4" /> Add photos / video
          </button>
          <input
            ref={fileInput}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => {
              const list = Array.from(e.target.files ?? []).slice(0, 4);
              setFiles(list);
              e.target.value = "";
            }}
          />
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            <Send className="size-3.5" /> {busy ? "Posting…" : "Post"}
          </button>
        </div>
      </form>

      {posts.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center text-muted-foreground">
          Be the first to share something here.
        </div>
      ) : (
        posts.map((p) => (
          <article key={p.id} className="rounded-2xl border border-border bg-card p-5">
            <header className="mb-3 flex items-center gap-3">
              {p.author?.avatar_url ? (
                <img src={p.author.avatar_url} alt="" className="size-9 rounded-full object-cover" />
              ) : (
                <div className="size-9 rounded-full bg-elevated" />
              )}
              <div className="flex-1">
                <div className="text-sm font-semibold">{p.author?.name ?? "Member"}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                </div>
              </div>
              {p.user_id === userId && (
                <button onClick={() => removePost.mutate(p.id)} className="text-muted-foreground hover:text-destructive">
                  <Trash2 className="size-4" />
                </button>
              )}
            </header>
            {p.content && <p className="whitespace-pre-wrap text-sm leading-relaxed">{p.content}</p>}
            {p.media_urls && p.media_urls.length > 0 && (
              <div className={`mt-3 grid gap-2 ${p.media_urls.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
                {p.media_urls.map((u) => (
                  <MediaTile key={u} url={u} />
                ))}
              </div>
            )}
            <footer className="mt-4 flex items-center gap-4 text-xs text-muted-foreground">
              <button
                onClick={() => toggleLike.mutate(p)}
                className={`inline-flex items-center gap-1.5 transition ${p.liked ? "text-destructive" : "hover:text-foreground"}`}
              >
                <Heart className={`size-4 ${p.liked ? "fill-current" : ""}`} /> {p.likes}
              </button>
              <span className="inline-flex items-center gap-1.5">
                <MessageCircle className="size-4" /> {p.comments}
              </span>
            </footer>
          </article>
        ))
      )}
    </div>
  );
}

function MediaTile({ url }: { url: string }) {
  const isVideo = /\.(mp4|webm|mov|m4v)(\?|$)/i.test(url);
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-elevated">
      {isVideo ? (
        <video src={url} controls className="aspect-video w-full bg-black object-contain" />
      ) : (
        <img src={url} alt="" className="aspect-square w-full object-cover" />
      )}
    </div>
  );
}
