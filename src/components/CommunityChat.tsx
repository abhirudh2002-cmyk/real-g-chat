import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, Image, Mic, Square, Play, Pause, Trash2, Check, CheckCheck, Sparkles, X } from "lucide-react";
import { toast } from "sonner";

type Message = {
  id: string;
  community_id: string;
  user_id: string;
  content: string;
  created_at: string;
  image_url?: string;
  audio_url?: string;
};

type CommunityChatProps = {
  communityId: string;
  userId: string;
  localMode?: boolean;
};

function CustomAudioPlayer({ id, src }: { id: string; src: string }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.readyState >= 1) {
      setDuration(audio.duration);
    }

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => {
      if (audio.duration && !isNaN(audio.duration)) {
        setDuration(audio.duration);
      }
    };
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("durationchange", updateDuration);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnded);

    const handleGlobalPlay = (e: Event) => {
      const customEvent = e as CustomEvent;
      if (customEvent.detail.playerId !== id) {
        audio.pause();
        setIsPlaying(false);
      }
    };

    window.addEventListener("app-audio-play", handleGlobalPlay);

    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("durationchange", updateDuration);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnded);
      window.removeEventListener("app-audio-play", handleGlobalPlay);
    };
  }, [src, id]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      window.dispatchEvent(new CustomEvent("app-audio-play", { detail: { playerId: id } }));
      audioRef.current.play().catch(() => {
        toast.error("Audio failed to play.");
      });
      setIsPlaying(true);
    }
  };

  const formatTrackTime = (secs: number) => {
    if (isNaN(secs) || secs === Infinity || secs === 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  const getWaveStyle = (baseHeight: number, durationStr: string, delay: string) => {
    return {
      transformOrigin: "center",
      animation: isPlaying ? `bounceWave ${durationStr} ease-in-out infinite alternate` : "none",
      animationDelay: delay,
      height: `${baseHeight}px`,
      transition: "transform 0.2s ease, height 0.2s ease",
    };
  };

  return (
    <div className="flex items-center gap-3 bg-zinc-900 border border-zinc-800 rounded-full px-4 py-2 w-[280px] text-white select-none my-1 shadow-inner">
      <style>{`
        @keyframes bounceWave {
          0% { transform: scaleY(0.3); }
          100% { transform: scaleY(1.1); }
        }
      `}</style>

      <audio ref={audioRef} src={src} preload="metadata" className="hidden" />
      
      <button 
        type="button" 
        onClick={togglePlay} 
        className="flex size-8 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-500 transition shrink-0 focus:outline-none"
      >
        {isPlaying ? <Pause className="size-3.5 fill-white text-white" /> : <Play className="size-3.5 fill-white text-white ml-0.5" />}
      </button>

      <div className="flex-1 flex items-center justify-center opacity-60 h-5 overflow-hidden text-zinc-400">
        <svg viewBox="0 0 80 24" className="w-full h-full" fill="currentColor">
          <rect x="0" y="10" width="1.2" rx="0.6" style={getWaveStyle(4, "0.4s", "-0.1s")} />
          <rect x="4" y="9" width="1.2" rx="0.6" style={getWaveStyle(6, "0.3s", "-0.2s")} />
          <rect x="8" y="8" width="1.2" rx="0.6" style={getWaveStyle(8, "0.5s", "-0.3s")} />
          <rect x="12" y="6" width="1.2" rx="0.6" style={getWaveStyle(12, "0.35s", "-0.4s")} />
          <rect x="16" y="4" width="1.2" rx="0.6" style={getWaveStyle(16, "0.45s", "-0.15s")} />
          <rect x="20" y="7" width="1.2" rx="0.6" style={getWaveStyle(10, "0.55s", "-0.25s")} />
          <rect x="24" y="2" width="1.2" rx="0.6" style={getWaveStyle(20, "0.48s", "-0.35s")} />
          <rect x="28" y="6" width="1.2" rx="0.6" style={getWaveStyle(12, "0.42s", "-0.12s")} />
          <rect x="32" y="4" width="1.2" rx="0.6" style={getWaveStyle(16, "0.52s", "-0.22s")} />
          <rect x="36" y="8" width="1.2" rx="0.6" style={getWaveStyle(8, "0.32s", "-0.02s")} />
          <rect x="40" y="3" width="1.2" rx="0.6" style={getWaveStyle(18, "0.44s", "-0.18s")} />
          <rect x="44" y="5" width="1.2" rx="0.6" style={getWaveStyle(14, "0.36s", "-0.28s")} />
          <rect x="48" y="2" width="1.2" rx="0.6" style={getWaveStyle(20, "0.5s", "-0.08s")} />
          <rect x="52" y="6" width="1.2" rx="0.6" style={getWaveStyle(12, "0.4s", "-0.38s")} />
          <rect x="56" y="4" width="1.2" rx="0.6" style={getWaveStyle(16, "0.34s", "-0.14s")} />
          <rect x="60" y="7" width="1.2" rx="0.6" style={getWaveStyle(10, "0.54s", "-0.24s")} />
          <rect x="64" y="3" width="1.2" rx="0.6" style={getWaveStyle(18, "0.38s", "-0.32s")} />
          <rect x="68" y="8" width="1.2" rx="0.6" style={getWaveStyle(8, "0.48s", "-0.12s")} />
          <rect x="72" y="9" width="1.2" rx="0.6" style={getWaveStyle(6, "0.35s", "-0.05s")} />
          <rect x="76" y="11" width="1.2" rx="0.6" style={getWaveStyle(2, "0.45s", "-0.15s")} />
        </svg>
      </div>

      <span className="text-[11px] font-mono text-zinc-400 tracking-tight shrink-0 px-1">
        {isPlaying ? formatTrackTime(currentTime) : formatTrackTime(duration)}
      </span>
    </div>
  );
}

export function CommunityChat({ communityId, userId, localMode }: CommunityChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  
  const [partnerLastRead, setPartnerLastRead] = useState<string>(new Date(0).toISOString());
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);
  
  // State to track which message is currently opening the prompt options modal
  const [activeDeleteTarget, setActiveDeleteTarget] = useState<Message | null>(null);
  
  const clearedAtRef = useRef<string>(new Date(0).toISOString());
  const hiddenMessageIdsRef = useRef<Set<string>>(new Set());
  const [, forceRender] = useState({});

  const scrollRef = useRef<HTMLDivElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  async function markChatAsRead() {
    if (localMode) return;
    try {
      await (supabase as any)
        .from("community_members")
        .update({ last_read_at: new Date().toISOString() })
        .eq("community_id", communityId)
        .eq("user_id", userId);
    } catch (err) {
      console.error("Failed to update read timestamp:", err);
    }
  }

  async function fetchPartnerReadStatus() {
    if (localMode) return;
    try {
      const { data, error } = await (supabase as any)
        .from("community_members")
        .select("last_read_at")
        .eq("community_id", communityId)
        .not("user_id", "eq", userId);

      if (!error && data && data.length > 0) {
        const timestamps = data.map((d: any) => d.last_read_at).filter(Boolean);
        if (timestamps.length > 0) {
          const oldestRead = new Date(Math.min(...timestamps.map((t: string) => new Date(t).getTime())));
          setPartnerLastRead(oldestRead.toISOString());
        }
      }
    } catch (err) {
      console.error("Error fetching read status:", err);
    }
  }

  useEffect(() => {
    let active = true;
    let messagesChannel: any;
    let membersChannel: any;
    let hiddenChannel: any;

    async function syncChatSystem() {
      setMessages([]);
      setIsConfirmingClear(false);
      if (localMode) {
        if (active) setLoading(false);
        return;
      }

      try {
        const { data: memberData } = await (supabase as any)
          .from("community_members")
          .select("*")
          .eq("community_id", communityId)
          .eq("user_id", userId)
          .maybeSingle();

        if (!active) return;

        const joinTime = memberData?.joined_at || memberData?.created_at || new Date(0).toISOString();
        const clearTimeBookmark = memberData?.cleared_at || new Date(0).toISOString();
        clearedAtRef.current = clearTimeBookmark;

        const { data: hiddenData } = await (supabase as any)
          .from("hidden_messages")
          .select("message_id")
          .eq("user_id", userId);

        if (hiddenData) {
          hiddenMessageIdsRef.current = new Set(hiddenData.map((h: any) => h.message_id));
        }

        const { data: msgData, error } = await (supabase as any)
          .from("community_messages")
          .select("*")
          .eq("community_id", communityId)
          .gt("created_at", clearTimeBookmark)
          .order("created_at", { ascending: true });

        if (error) throw error;
        if (!active) return;
        
        const validFeed = (msgData || []).filter(
          (m: Message) => m.created_at >= joinTime && !hiddenMessageIdsRef.current.has(m.id)
        );
        setMessages(validFeed);
        
        markChatAsRead();
        fetchPartnerReadStatus();

        const channelId = `room_${communityId}_${Date.now()}`;
        messagesChannel = (supabase as any)
          .channel(channelId)
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "community_messages", filter: `community_id=eq.${communityId}` },
            (payload: any) => {
              if (!active) return;
              const freshMsg = payload.new as Message;
              
              if (
                freshMsg.created_at >= joinTime && 
                freshMsg.created_at > clearedAtRef.current &&
                !hiddenMessageIdsRef.current.has(freshMsg.id)
              ) {
                setMessages((prev) => {
                  if (prev.some((m) => m.id === freshMsg.id)) return prev;
                  return [...prev, freshMsg];
                });
                if (freshMsg.user_id !== userId) {
                  markChatAsRead();
                }
              }
            }
          )
          .on(
            "postgres_changes",
            { event: "DELETE", schema: "public", table: "community_messages", filter: `community_id=eq.${communityId}` },
            (payload: any) => {
              if (!active) return;
              setMessages((prev) => prev.filter((m) => m.id !== payload.old.id));
            }
          )
          .subscribe();

        membersChannel = (supabase as any)
          .channel(`members_${communityId}_${Date.now()}`)
          .on(
            "postgres_changes",
            { event: "UPDATE", schema: "public", table: "community_members", filter: `community_id=eq.${communityId}` },
            (payload: any) => {
              if (!active) return;
              if (String(payload.new.user_id) === String(userId)) {
                const updatedClearTime = payload.new.cleared_at || new Date(0).toISOString();
                clearedAtRef.current = updatedClearTime;
                setMessages((prev) => prev.filter((m) => m.created_at > updatedClearTime));
                forceRender({});
              }
              fetchPartnerReadStatus();
            }
          )
          .subscribe();

        hiddenChannel = (supabase as any)
          .channel(`hidden_${communityId}_${Date.now()}`)
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "hidden_messages", filter: `user_id=eq.${userId}` },
            (payload: any) => {
              if (!active) return;
              hiddenMessageIdsRef.current.add(payload.new.message_id);
              setMessages((prev) => prev.filter((m) => m.id !== payload.new.message_id));
              forceRender({});
            }
          )
          .subscribe();

      } catch (err) {
        console.error("Pipeline failure:", err);
      } finally {
        if (active) setLoading(false);
      }
    }

    syncChatSystem();

    return () => {
      active = false;
      if (messagesChannel) (supabase as any).removeChannel(messagesChannel);
      if (membersChannel) (supabase as any).removeChannel(membersChannel);
      if (hiddenChannel) (supabase as any).removeChannel(hiddenChannel);
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [communityId, userId, localMode]);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (recording) {
      setRecordingSeconds(0);
      timerIntervalRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [recording]);

  async function clearEntireChat() {
    const rightNow = new Date().toISOString();
    setMessages([]);
    clearedAtRef.current = rightNow;
    setIsConfirmingClear(false);
    forceRender({});

    if (localMode) return;

    try {
      await (supabase as any)
        .from("community_members")
        .update({ cleared_at: rightNow })
        .eq("community_id", communityId)
        .eq("user_id", userId);
      toast.success("Chat history cleared.");
    } catch (err) {
      console.error(err);
    }
  }

  // DELETE FOR ME LOGIC (Hides from your feed locally + table entry)
  async function executeDeleteForMe(messageId: string) {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    hiddenMessageIdsRef.current.add(messageId);
    setActiveDeleteTarget(null);
    forceRender({});

    if (localMode) return;

    try {
      await (supabase as any)
        .from("hidden_messages")
        .insert({ user_id: userId, message_id: messageId });
    } catch (err) {
      console.error(err);
    }
  }

  // DELETE FOR EVERYONE LOGIC (Hard deletes root row completely)
  async function executeDeleteForEveryone(messageId: string) {
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    setActiveDeleteTarget(null);

    if (localMode) return;

    try {
      const { error } = await (supabase as any)
        .from("community_messages")
        .delete()
        .eq("id", messageId);

      if (error) throw error;
      toast.success("Message deleted for everyone.");
    } catch (err) {
      console.error("Hard delete dropped:", err);
      toast.error("Failed to delete for everyone.");
    }
  }

  // Intercept trigger when trash button is clicked
  function initiateDeleteFlow(message: Message) {
    const isMe = String(message.user_id) === String(userId);
    if (isMe) {
      // Show confirmation dialog options modal for personal items
      setActiveDeleteTarget(message);
    } else {
      // Others' posts immediately run hide operation directly without options
      executeDeleteForMe(message.id);
    }
  }

  async function handleSend(e: React.FormEvent, customFields?: Partial<Message>) {
    if (e) e.preventDefault();
    if (!text.trim() && !customFields) return;

    const currentContent = text;
    setText("");

    const clientGeneratedId = crypto.randomUUID();

    const payload = {
      id: clientGeneratedId,
      community_id: communityId,
      user_id: userId,
      content: currentContent || (customFields?.image_url ? "📷 Image Attached" : customFields?.audio_url ? "🎙️ Voice Message" : ""),
      ...customFields
    };

    const optimisticMsg: Message = {
      created_at: new Date().toISOString(),
      ...payload
    } as Message;

    setMessages((prev) => [...prev, optimisticMsg]);
    markChatAsRead();

    if (localMode) return;

    try {
      const { error } = await (supabase as any).from("community_messages").insert(payload);
      if (error) throw error;
    } catch (err) {
      toast.error("Message sync dropped.");
      setMessages((prev) => prev.filter(m => m.id !== clientGeneratedId));
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      if (localMode) {
        const localUrl = URL.createObjectURL(file);
        handleSend(null as any, { image_url: localUrl });
        return;
      }

      const fileExt = file.name.split('.').pop();
      const filePath = `${communityId}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await (supabase as any).storage
        .from("community_attachments")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = (supabase as any).storage.from("community_attachments").getPublicUrl(filePath);
      handleSend(null as any, { image_url: data.publicUrl });
    } catch (err) {
      toast.error("Failed to upload image.");
    } finally {
      setUploading(false);
    }
  }

  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        if (localMode) {
          const localAudio = URL.createObjectURL(audioBlob);
          handleSend(null as any, { audio_url: localAudio });
          return;
        }

        try {
          const filePath = `${communityId}/${Math.random()}.webm`;
          const { error: uploadError } = await (supabase as any).storage
            .from("community_attachments")
            .upload(filePath, audioBlob);

          if (uploadError) throw uploadError;

          const { data } = (supabase as any).storage.from("community_attachments").getPublicUrl(filePath);
          handleSend(null as any, { audio_url: data.publicUrl });
        } catch (err) {
          toast.error("Audio conversion dropped.");
        }
      };

      mediaRecorder.start();
      setRecording(true);
    } catch (err) {
      toast.error("Microphone hardware access denied.");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      setRecording(false);
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (loading) return <div className="p-4 text-xs text-zinc-500 animate-pulse tracking-wide">Connecting real-time feed lines...</div>;

  return (
    <div className="flex h-[550px] flex-col rounded-2xl border border-zinc-800 bg-black overflow-hidden relative font-sans text-zinc-100">
      
      {/* SELECTION MODAL LAYER OVERLAY */}
      {activeDeleteTarget && (
        <div className="absolute inset-0 bg-black/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 max-w-sm w-full shadow-2xl relative text-center">
            <button 
              type="button"
              onClick={() => setActiveDeleteTarget(null)}
              className="absolute top-3 right-3 text-zinc-500 hover:text-zinc-200 transition"
            >
              <X className="size-4" />
            </button>
            <h3 className="text-sm font-semibold mb-1 text-zinc-200">Delete Message</h3>
            <p className="text-xs text-zinc-500 mb-5 leading-relaxed">Choose how you want to remove this message entry.</p>
            
            <div className="flex flex-col gap-2">
              <button
                type="button"
                onClick={() => executeDeleteForEveryone(activeDeleteTarget.id)}
                className="w-full text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white py-2.5 rounded-xl transition"
              >
                Delete for Everyone
              </button>
              <button
                type="button"
                onClick={() => executeDeleteForMe(activeDeleteTarget.id)}
                className="w-full text-xs font-medium bg-zinc-900 hover:bg-zinc-850 text-zinc-300 py-2.5 rounded-xl border border-zinc-800 transition"
              >
                Delete for Me Only
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="px-4 py-3 border-b border-zinc-900 bg-zinc-950/60 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">Secure Feed</span>
        </div>

        {isConfirmingClear ? (
          <div className="flex items-center gap-1.5 animate-in fade-in slide-in-from-right-2 duration-200">
            <button
              type="button"
              onClick={clearEntireChat}
              className="text-[11px] font-bold bg-rose-600 hover:bg-rose-500 text-white px-3 py-1.5 rounded-lg transition shadow-sm"
            >
              Clear for Me
            </button>
            <button
              type="button"
              onClick={() => setIsConfirmingClear(false)}
              className="text-[11px] font-medium text-zinc-400 hover:text-white px-2 py-1.5 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        ) : (
          messages.length > 0 && (
            <button
              type="button"
              onClick={() => setIsConfirmingClear(true)}
              className="text-[11px] font-medium text-zinc-500 hover:text-rose-400 border border-zinc-800 hover:border-rose-950/50 px-3 py-1.5 rounded-xl bg-transparent transition shadow-sm"
            >
              Clear Chat
            </button>
          )
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-xs text-zinc-500 my-8 flex flex-col items-center justify-center gap-2">
            <Sparkles className="size-4 text-zinc-700" />
            <span>Welcome! This chat feed is clean and live.</span>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = String(m.user_id) === String(userId);
            const isReadByPartner = new Date(m.created_at).toISOString() <= partnerLastRead;

            return (
              <div 
                key={m.id} 
                className={`flex flex-col max-w-[85%] ${isMe ? "ml-auto items-end" : "mr-auto items-start"} group/msg`}
              >
                <div className="flex items-center gap-2 max-w-full relative">
                  
                  {isMe && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        initiateDeleteFlow(m);
                      }}
                      className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-2 hover:bg-zinc-900 text-zinc-500 hover:text-rose-500 rounded-xl shrink-0"
                      title="Delete options"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}

                  <div className="rounded-2xl p-0.5 text-sm bg-transparent cursor-pointer select-none transition">
                    {m.image_url && <img src={m.image_url} alt="Attached" className="rounded-xl max-w-full max-h-[200px] object-cover mb-1 border border-zinc-800 shadow-md" />}
                    
                    {m.audio_url && <CustomAudioPlayer id={m.id} src={m.audio_url} />}
                    
                    {m.content && (!m.image_url && !m.audio_url || m.content !== "📷 Image Attached" && m.content !== "🎙️ Voice Message") && (
                      <p className={`px-4 py-2.5 rounded-2xl break-words shadow-md tracking-wide leading-relaxed ${isMe ? "bg-white text-black font-medium" : "bg-zinc-900 text-zinc-100 border border-zinc-800"}`}>
                        {m.content}
                      </p>
                    )}
                  </div>

                  {!isMe && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        initiateDeleteFlow(m);
                      }}
                      className="opacity-0 group-hover/msg:opacity-100 transition-opacity p-2 hover:bg-zinc-900 text-zinc-500 hover:text-rose-500 rounded-xl shrink-0"
                      title="Delete for me"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}

                </div>
                
                <div className="flex items-center gap-1.5 mt-1 px-2 text-zinc-500">
                  <span className="text-[10px] font-medium tracking-tight">
                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  
                  {isMe && !m.id.startsWith("optimistic.") && (
                    <div className="flex items-center">
                      {isReadByPartner ? (
                        <CheckCheck className="size-3.5 text-blue-500" title="Seen by members" />
                      ) : (
                        <Check className="size-3.5 text-zinc-600" title="Sent successfully" />
                      )}
                    </div>
                  )}
                </div>

              </div>
            );
          })
        )}
        <div ref={scrollRef} />
      </div>

      <form onSubmit={handleSend} className="border-t border-zinc-900 p-3 bg-zinc-950 flex items-center gap-2">
        <label className="cursor-pointer p-2 hover:bg-zinc-900 rounded-xl transition text-zinc-400">
          <Image className="size-4" />
          <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" disabled={uploading} />
        </label>

        {recording ? (
          <div className="flex items-center gap-2 bg-rose-950/40 px-2 py-1 rounded-xl border border-rose-900/50 animate-pulse">
            <button type="button" onClick={stopRecording} className="p-1 bg-rose-600 text-white rounded-md">
              <Square className="size-3" />
            </button>
            <span className="text-xs font-mono text-rose-400 font-bold">{formatTime(recordingSeconds)}</span>
          </div>
        ) : (
          <button type="button" onClick={startRecording} className="p-2 hover:bg-zinc-900 text-zinc-400 rounded-xl transition">
            <Mic className="size-4" />
          </button>
        )}

        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={uploading ? "Uploading asset..." : recording ? "Recording capture live..." : "Send a message..."}
          disabled={uploading || recording}
          className="flex-1 bg-zinc-900 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-zinc-800 text-zinc-100 placeholder:text-zinc-500 disabled:opacity-60 border border-zinc-800/50"
        />
        
        <button type="submit" disabled={uploading || recording || !text.trim()} className="rounded-xl bg-white text-black p-2 hover:bg-zinc-200 transition shadow disabled:opacity-50">
          <Send className="size-4" />
        </button>
      </form>
    </div>
  );
}