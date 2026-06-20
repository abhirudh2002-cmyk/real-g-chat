import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { User, Calendar, Check, Edit2 } from "lucide-react";
import { toast } from "sonner";

const todayStr = () => new Date().toISOString().slice(0, 10);

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  login_dates: string[];
};

export function ProfilePanel() {
  const qc = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [bioText, setBioText] = useState("");

  const { data: session } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data } = await (supabase as any).auth.getUser();
      return data.user;
    },
  });

  const userId = session?.id ?? null;
  const googleAvatar = session?.user_metadata?.picture ?? null;
  const displayName = session?.user_metadata?.full_name ?? session?.email ?? "User Profile";

  const { data: profile } = useQuery({
    queryKey: ["profile", userId],
    queryFn: async () => {
      if (!userId || typeof (supabase as any).from !== "function") return null;

      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("*")
        .eq("id", userId)
        .maybeSingle();

      if (error) throw error;

      let currentProfile = data as Profile;

      if (!data) {
        const freshProfile = {
          id: userId,
          full_name: displayName,
          avatar_url: googleAvatar,
          bio: "",
          login_dates: [todayStr()],
        };
        const { error: insErr } = await (supabase as any).from("profiles").insert(freshProfile);
        if (insErr) throw insErr;
        currentProfile = freshProfile;
      } else {
        if (!currentProfile.login_dates.includes(todayStr())) {
          const updatedDates = [...currentProfile.login_dates, todayStr()];
          await (supabase as any)
            .from("profiles")
            .update({ login_dates: updatedDates })
            .eq("id", userId);
          currentProfile.login_dates = updatedDates;
        }
      }

      return currentProfile;
    },
    enabled: !!userId,
  });

  useEffect(() => {
    if (profile) {
      setBioText(profile.bio ?? "");
    }
  }, [profile]);

  const saveBio = useMutation({
    mutationFn: async () => {
      if (!userId) return;
      const { error } = await (supabase as any)
        .from("profiles")
        .update({ bio: bioText })
        .eq("id", userId);
      if (error) throw error;
    },
    onSuccess: () => {
      setIsEditing(false);
      qc.invalidateQueries({ queryKey: ["profile", userId] });
      toast.success("Bio updated successfully!");
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (!session) return null;

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm max-w-4xl mx-auto mt-10">
      <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-5 border-b border-border pb-5">
        <div className="relative size-20 overflow-hidden rounded-full border-2 border-primary/20 bg-muted">
          {profile?.avatar_url || googleAvatar ? (
            <img src={profile?.avatar_url ?? googleAvatar} alt="Avatar" className="size-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground"><User className="size-8" /></div>
          )}
        </div>
        <div className="flex-1 space-y-2 w-full">
          <div>
            <h2 className="font-display text-xl font-bold tracking-tight text-foreground">{displayName}</h2>
            <p className="text-xs text-muted-foreground">{session.email}</p>
          </div>
          <div className="pt-1">
            {isEditing ? (
              <div className="flex gap-2 max-w-md mx-auto sm:mx-0">
                <input
                  type="text"
                  value={bioText}
                  maxLength={160}
                  onChange={(e) => setBioText(e.target.value)}
                  className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-foreground"
                />
                <button onClick={() => saveBio.mutate()} className="inline-flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground"><Check className="size-4" /></button>
              </div>
            ) : (
              <div className="group flex items-center justify-center sm:justify-start gap-2 rounded-md py-1">
                <p className="text-sm italic text-muted-foreground">{profile?.bio || "No bio set yet."}</p>
                <button onClick={() => setIsEditing(true)} className="text-muted-foreground hover:text-foreground opacity-60"><Edit2 className="size-3.5" /></button>
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="mt-5 space-y-3 text-left">
        <h3 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground"><Calendar className="size-3.5" /> Login History</h3>
        <div className="flex flex-wrap gap-2">
          {profile?.login_dates?.map((dateStr) => (
            <span key={dateStr} className={`rounded-md border px-2.5 py-1 text-xs font-mono ${dateStr === todayStr() ? "border-emerald-500 bg-emerald-500/10 text-emerald-400" : "border-border bg-background"}`}>{dateStr}</span>
          ))}
        </div>
      </div>
    </div>
  );
}