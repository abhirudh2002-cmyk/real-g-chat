import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ImagePlus, Mic, Send, Square, X } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

type Message = {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  created_at: string;
};

type Profile = { id: string; name: string | null; avatar_url: string | null };

export function CommunityChat({ communityId, userId }: { communityId: string; userId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [profiles, setProfiles] = useState<Map<string, Profile>>(new Map());
  const [signed, setSigned] = useState<Map<string, string>>(new Map());
  const [content, setContent] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordSecs, setRecordSecs] = useState(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordChunks = useRef<Blob[]>([]);
  const recordTimer = useRef<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  // Load messages + subscribe
  useEffect(() => {
    let active = true;
    (async () => {
      const { data, error } = await supabase
        .from("community_messages")
        .select("*")
        .eq("community_id", communityId)
        .order("created_at", { ascending: true })
        .limit(200);
      if (error) { toast.error(error.message); return; }
      if (!active) return;
      setMessages((data ?? []) as Message[]);
    })();

    const channel = supabase
      .channel(`community-${communityId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "community_messages", filter: `community_id=eq.${communityId}` },
        (payload) => setMessages((m) => [...m, payload.new as Message]),
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "community_messages", filter: `community_id=eq.${communityId}` },
        (payload) => setMessages((m) => m.filter((x) => x.id !== (payload.old as any).id)),
      )
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, [communityId]);

  // Load profiles + signed urls for messages
  useEffect(() => {
    const missingProfiles = [...new Set(messages.map((m) => m.user_id))].filter((id) => !profiles.has(id));
    if (missingProfiles.length) {
      supabase.from("profiles").select("id, name, avatar_url").in("id", missingProfiles).then(({ data }) => {
        if (!data) return;
        setProfiles((p) => {
          const n = new Map(p);
          for (const r of data as Profile[]) n.set(r.id, r);
          return n;
        });
      });
    }
    const missingMedia = messages.filter((m) => m.media_url && !signed.has(m.media_url)).map((m) => m.media_url!);
    if (missingMedia.length) {
      supabase.storage.from("community-media").createSignedUrls(missingMedia, 3600).then(({ data }) => {
        if (!data) return;
        setSigned((s) => {
          const n = new Map(s);
          data.forEach((d, i) => { if (d.signedUrl) n.set(missingMedia[i], d.signedUrl); });
          return n;
        });
      });
    }
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!content.trim() && !file) return;
    setBusy(true);
    try {
      let mediaPath: string | null = null;
      if (file) {
        const path = `${userId}/${communityId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const { error } = await supabase.storage.from("community-media").upload(path, file);
        if (error) throw error;
        mediaPath = path;
      }
      const { error } = await supabase.from("community_messages").insert({
        community_id: communityId,
        user_id: userId,
        content: content.trim().slice(0, 1000) || null,
        media_url: mediaPath,
      });
      if (error) throw error;
      setContent("");
      setFile(null);
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-[calc(100vh-280px)] min-h-[480px] flex-col rounded-2xl border border-border bg-card">
      <div className="flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0 && (
          <div className="py-16 text-center text-sm text-muted-foreground">No messages yet. Say something.</div>
        )}
        {messages.map((m) => {
          const author = profiles.get(m.user_id);
          const isMe = m.user_id === userId;
          const mediaUrl = m.media_url ? signed.get(m.media_url) : null;
          const isVideo = m.media_url && /\.(mp4|webm|mov|m4v)$/i.test(m.media_url);
          return (
            <div key={m.id} className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
              {author?.avatar_url ? (
                <img src={author.avatar_url} alt="" className="size-7 rounded-full object-cover" />
              ) : (
                <div className="size-7 rounded-full bg-elevated" />
              )}
              <div className={`max-w-[75%] ${isMe ? "items-end" : "items-start"} flex flex-col`}>
                <div className="px-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  {author?.name ?? "Member"} · {formatDistanceToNow(new Date(m.created_at), { addSuffix: true })}
                </div>
                <div className={`mt-1 rounded-2xl px-4 py-2 text-sm ${isMe ? "bg-primary text-primary-foreground" : "bg-elevated text-foreground"}`}>
                  {m.content}
                  {mediaUrl && (
                    <div className="mt-2 overflow-hidden rounded-lg">
                      {isVideo ? (
                        <video src={mediaUrl} controls className="max-h-64 w-full bg-black" />
                      ) : (
                        <img src={mediaUrl} alt="" className="max-h-64 w-full object-cover" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <form onSubmit={send} className="border-t border-border p-3">
        {file && (
          <div className="mb-2 flex items-center gap-1 rounded-md bg-elevated px-2 py-1 text-xs">
            {file.name.slice(0, 40)}
            <button type="button" onClick={() => setFile(null)}><X className="size-3" /></button>
          </div>
        )}
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => fileInput.current?.click()} className="rounded-md bg-elevated p-2 hover:bg-secondary">
            <ImagePlus className="size-4" />
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => { setFile(e.target.files?.[0] ?? null); e.target.value = ""; }}
          />
          <input
            value={content}
            onChange={(e) => setContent(e.target.value)}
            maxLength={1000}
            placeholder="Message…"
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-foreground"
          />
          <button type="submit" disabled={busy} className="rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
            <Send className="size-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
