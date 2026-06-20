import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Target, Flame, Users, Trophy, CheckCircle2, Zap, User, Calendar, Check, Edit2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Real G — Become Better Every Day" },
      { name: "description", content: "Join a private community of ambitious people building discipline, habits, and real-world progress." },
      { property: "og:title", content: "Real G — Become Better Every Day" },
      { property: "og:description", content: "Join a private community of ambitious people building discipline, habits, and real-world progress." },
    ],
  }),
  component: Landing,
});

const todayStr = () => new Date().toISOString().slice(0, 10);

type Profile = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  login_dates: string[];
};

function Wordmark() {
  return (
    <span className="font-display text-xl font-extrabold tracking-tight">
      REAL <span className="text-gold">G</span>
    </span>
  );
}

/* ==========================================================================
   PROFILE PANEL COMPONENT
   ========================================================================== */
function ProfilePanel({ session }: { session: any }) {
  const qc = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [bioText, setBioText] = useState("");

  const userId = session?.id ?? null;
  const googleAvatar = session?.user_metadata?.picture ?? null;
  const displayName = session?.user_metadata?.full_name ?? session?.email ?? "User Profile";

  // Fetch or initialize profile with type assertions to resolve compiler errors
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

  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-sm max-w-4xl mx-auto mt-10">
      <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:text-left gap-5 border-b border-border pb-5">
        {/* Google Profile Avatar Box */}
        <div className="relative size-20 overflow-hidden rounded-full border-2 border-primary/20 bg-muted">
          {profile?.avatar_url || googleAvatar ? (
            <img 
              src={profile?.avatar_url ?? googleAvatar} 
              alt="Avatar" 
              className="size-full object-cover"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-muted-foreground">
              <User className="size-8" />
            </div>
          )}
        </div>

        {/* Name and Bio Editing Fields */}
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
                  placeholder="Add your custom bio..."
                  className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-foreground"
                />
                <button
                  onClick={() => saveBio.mutate()}
                  disabled={saveBio.isPending}
                  className="inline-flex size-8 items-center justify-center rounded-md bg-primary text-primary-foreground hover:opacity-90"
                >
                  <Check className="size-4" />
                </button>
              </div>
            ) : (
              <div className="group flex items-center justify-center sm:justify-start gap-2 rounded-md py-1">
                <p className="text-sm italic text-muted-foreground">
                  {profile?.bio || "No bio set yet. Click the edit icon to add one!"}
                </p>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 transition"
                  title="Edit bio"
                >
                  <Edit2 className="size-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Historical Login Audit Logs */}
      <div className="mt-5 space-y-3 text-left">
        <h3 className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted-foreground">
          <Calendar className="size-3.5" /> Login History Logs
        </h3>
        
        {profile?.login_dates && profile.login_dates.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {profile.login_dates.map((dateStr) => (
              <span
                key={dateStr}
                className={`rounded-md border px-2.5 py-1 text-xs font-mono font-semibold ${
                  dateStr === todayStr()
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                    : "border-border bg-background text-foreground"
                }`}
              >
                {dateStr}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No login logs tracked yet.</p>
        )}
      </div>
    </div>
  );
}

/* ==========================================================================
   MAIN LANDING COMPONENT VIEW
   ========================================================================== */
function Landing() {
  // Query to dynamically adapt view based on Google Authentication status
  const { data: session } = useQuery({
    queryKey: ["auth-session"],
    queryFn: async () => {
      const { data } = await (supabase as any).auth.getUser();
      return data.user;
    },
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link to="/"><Wordmark /></Link>
          <nav className="hidden gap-8 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#community" className="hover:text-foreground">Community</a>
            <a href="#faq" className="hover:text-foreground">FAQ</a>
          </nav>
          <Link
            to={session ? "/dashboard" : "/auth"}
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            {session ? "Go to Dashboard" : "Sign in"}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.08),_transparent_60%)]" />
        <div className="mx-auto max-w-5xl px-6 pt-24 pb-20 text-center md:pt-32 md:pb-28">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-emerald-500" />
            Built for serious self-improvement
          </div>
          <h1 className="font-display text-balance text-5xl font-extrabold leading-[1.05] tracking-tight md:text-7xl">
            Become Better<br />Every Day.
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-balance text-lg text-muted-foreground md:text-xl">
            Join a community built for accountability, growth, discipline, and meaningful progress.
            No vanity metrics. Just consistent action.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to={session ? "/dashboard" : "/auth"} className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:opacity-90">
              {session ? "View your Dashboard" : "Start your journey"} <ArrowRight className="size-4" />
            </Link>
            <a href="#community" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 font-semibold transition hover:bg-muted">
              Explore community
            </a>
          </div>

          {/* DYNAMIC PROFILE SUBSECTION CONTAINER */}
          {session && <ProfilePanel session={session} />}
        </div>
      </section>

      {/* Why */}
      <section className="border-y border-border/60 bg-card/30 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-8 md:grid-cols-4">
            {[
              { k: "Daily", v: "Discipline" },
              { k: "Real", v: "Accountability" },
              { k: "True", v: "Community" },
              { k: "Lasting", v: "Progress" },
            ].map((s) => (
              <div key={s.k} className="text-center">
                <div className="font-display text-3xl font-bold">{s.k}</div>
                <div className="mt-1 text-sm uppercase tracking-widest text-muted-foreground">{s.v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">Everything you need to grow.</h2>
            <p className="mt-4 text-muted-foreground">Tools that turn intention into consistent, measurable action.</p>
          </div>
          <div className="mt-16 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[
              { i: Target, t: "Goal Tracking", d: "Set daily goals. Tick them off. Watch consistency compound." },
              { i: Flame, t: "Habit Streaks", d: "Build the rituals of the person you're becoming." },
              { i: Users, t: "Communities", d: "Health. Wealth. Relationships. Progress. Find your people." },
              { i: Trophy, t: "Achievements", d: "Earn recognition for the discipline only you can see." },
              { i: Zap, t: "Daily Action", d: "A dashboard built for momentum, not infinite scroll." },
              { i: CheckCircle2, t: "Real Accountability", d: "Share progress. Get feedback. Stay on track." },
            ].map(({ i: Icon, t, d }) => (
              <div key={t} className="rounded-2xl border border-border bg-card p-6 transition hover:bg-muted/50">
                <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg bg-muted">
                  <Icon className="size-5" />
                </div>
                <h3 className="font-display text-lg font-semibold">{t}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y border-border/60 bg-card/30 py-24">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">How it works</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {[
              { n: "01", t: "Sign in", d: "Use Google. One click. No friction." },
              { n: "02", t: "Set goals & habits", d: "Define what better looks like — for you." },
              { n: "03", t: "Show up daily", d: "Tick goals, log habits, share progress." },
            ].map((s) => (
              <div key={s.n} className="rounded-2xl border border-border bg-card p-6">
                <div className="font-display text-gold text-sm font-bold">{s.n}</div>
                <div className="mt-3 font-display text-xl font-semibold">{s.t}</div>
                <div className="mt-2 text-sm text-muted-foreground">{s.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Community */}
      <section id="community" className="py-24">
        <div className="mx-auto max-w-5xl px-6">
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">Four pillars. One community.</h2>
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { t: "Health", d: "Body, mind, sleep, recovery." },
              { t: "Wealth", d: "Money, business, discipline." },
              { t: "Relationships", d: "Family, friendship, partnership." },
              { t: "Progress", d: "Daily wins. Real accountability." },
            ].map((c) => (
              <div key={c.t} className="rounded-2xl border border-border bg-card p-6">
                <div className="font-display text-2xl font-bold">{c.t}</div>
                <div className="mt-2 text-sm text-muted-foreground">{c.d}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t border-border/60 bg-card/30 py-24">
        <div className="mx-auto max-w-3xl px-6">
          <h2 className="font-display text-4xl font-bold tracking-tight md:text-5xl">Questions.</h2>
          <div className="mt-10 divide-y divide-border rounded-2xl border border-border bg-card">
            {[
              { q: "Is Real G free?", a: "Yes. v1 has no payments, no subscriptions, no premium tiers." },
              { q: "Do I need an account?", a: "Yes — sign in with Google in one click." },
              { q: "What's different from social media?", a: "There is no algorithm pulling you in. Every feature points at real-world action." },
              { q: "Can I create my own community?", a: "Yes. Start one for your team, your circle, or your niche." },
            ].map((f) => (
              <div key={f.q} className="p-6">
                <div className="font-display font-semibold">{f.q}</div>
                <div className="mt-2 text-sm text-muted-foreground">{f.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24">
        <div className="mx-auto max-w-3xl px-6 text-center">
          <h2 className="font-display text-4xl font-extrabold tracking-tight md:text-6xl">
            The work is the way.
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">Start showing up — today.</p>
          <Link to={session ? "/dashboard" : "/auth"} className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:opacity-90">
            {session ? "Go to Dashboard" : "Become a Real G"} <ArrowRight className="size-4" />
          </Link>
        </div>
      </section>

      <footer className="border-t border-border/60 py-10">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-6 text-sm text-muted-foreground md:flex-row">
          <Wordmark />
          <div>© {new Date().getFullYear()} Real G. Built for serious people.</div>
        </div>
      </footer>
    </div>
  );
}