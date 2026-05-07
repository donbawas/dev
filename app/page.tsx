import Link from 'next/link';
import { SignInButton, SignUpButton, Show } from '@clerk/nextjs';
import { Zap, Rss, Bookmark, Bell, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: Rss,
    title: 'Discover',
    description:
      'Curated feed of the latest releases, framework updates, and AI model announcements — all in one place.',
  },
  {
    icon: Bookmark,
    title: 'Save',
    description:
      'Bookmark anything interesting to revisit later. Your saved items are always synced across devices.',
  },
  {
    icon: Bell,
    title: 'Subscribe',
    description:
      'Follow the topics that matter to you — React, Rust, LLMs, cloud infra — and never miss a beat.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col bg-background text-foreground">
      {/* Navbar */}
      <header className="sticky top-0 z-10 flex h-14 items-center justify-between border-b border-border bg-background/80 px-6 backdrop-blur">
        <div className="flex items-center gap-2">
          <Zap className="size-5 text-primary" />
          <span className="text-sm font-semibold tracking-tight">DevPulse</span>
        </div>
        <div className="flex items-center gap-2">
          <Show when="signed-out">
            <SignInButton mode="redirect">
              <Button variant="ghost" size="sm">
                Sign in
              </Button>
            </SignInButton>
            <SignUpButton mode="redirect">
              <Button size="sm">Get started</Button>
            </SignUpButton>
          </Show>
          <Show when="signed-in">
            <Button asChild size="sm">
              <Link href="/feed">Go to app</Link>
            </Button>
          </Show>
        </div>
      </header>

      {/* Hero */}
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
        <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-green-500" />
          Real-time updates
        </div>
        <h1 className="mb-4 max-w-2xl text-4xl font-bold tracking-tight sm:text-5xl">
          Stay ahead of the dev world
        </h1>
        <p className="mb-8 max-w-md text-base text-muted-foreground">
          New frameworks, library releases, AI model drops — discover what shipped today, save what
          matters, and subscribe to the topics you care about.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Show when="signed-out">
            <SignUpButton mode="redirect">
              <Button size="lg" className="gap-2">
                Get started free <ArrowRight className="size-4" />
              </Button>
            </SignUpButton>
            <SignInButton mode="redirect">
              <Button variant="outline" size="lg">
                Sign in
              </Button>
            </SignInButton>
          </Show>
          <Show when="signed-in">
            <Button asChild size="lg" className="gap-2">
              <Link href="/feed">
                Open DevPulse <ArrowRight className="size-4" />
              </Link>
            </Button>
          </Show>
        </div>
      </main>

      {/* Features */}
      <section className="border-t border-border bg-muted/30 px-6 py-16">
        <div className="mx-auto grid max-w-4xl gap-6 sm:grid-cols-3">
          {features.map(({ icon: Icon, title, description }) => (
            <div key={title} className="rounded-xl border border-border bg-card p-5">
              <div className="mb-3 inline-flex size-9 items-center justify-center rounded-lg bg-primary/10">
                <Icon className="size-4 text-primary" />
              </div>
              <h3 className="mb-1 text-sm font-semibold text-card-foreground">{title}</h3>
              <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t border-border px-6 py-4 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} DevPulse
      </footer>
    </div>
  );
}
