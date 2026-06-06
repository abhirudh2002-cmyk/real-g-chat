import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Target, Flame, Users, Trophy, CheckCircle2, Zap } from "lucide-react";

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

function Wordmark() {
  return (
    <span className="font-display text-xl font-extrabold tracking-tight">
      REAL <span className="text-gold">G</span>
    </span>
  );
}

function Landing() {
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
            to="/auth"
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(255,255,255,0.08),_transparent_60%)]" />
        <div className="mx-auto max-w-5xl px-6 pt-24 pb-20 text-center md:pt-32 md:pb-28">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-xs text-muted-foreground">
            <span className="size-1.5 rounded-full bg-success" />
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
            <Link to="/auth" className="inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:opacity-90">
              Start your journey <ArrowRight className="size-4" />
            </Link>
            <a href="#community" className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-6 py-3 font-semibold transition hover:bg-elevated">
              Explore community
            </a>
          </div>
        </div>
      </section>

      {/* Why */}
      <section className="border-y border-border/60 bg-surface py-16">
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
              <div key={t} className="rounded-2xl border border-border bg-card p-6 transition hover:bg-elevated">
                <div className="mb-4 inline-flex size-10 items-center justify-center rounded-lg bg-elevated">
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
      <section id="how" className="border-y border-border/60 bg-surface py-24">
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
      <section id="faq" className="border-t border-border/60 bg-surface py-24">
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
          <Link to="/auth" className="mt-8 inline-flex items-center gap-2 rounded-lg bg-primary px-6 py-3 font-semibold text-primary-foreground transition hover:opacity-90">
            Become a Real G <ArrowRight className="size-4" />
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
