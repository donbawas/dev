import Link from 'next/link';
import { Zap } from 'lucide-react';

const links = [
  { label: 'Feed',          href: '/feed' },
  { label: 'Discover',      href: '/discover' },
  { label: 'Subscriptions', href: '/subscriptions' },
];

const legal = [
  { label: 'Privacy',  href: '/privacy' },
  { label: 'Terms',    href: '/terms' },
  { label: 'About',    href: '/about' },
];

export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-background px-6 py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          {/* Brand */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <Zap className="size-4 text-primary" />
              <span className="text-sm font-semibold tracking-tight text-foreground">DevPulse</span>
            </div>
            <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
              Stay ahead of the dev world. Frameworks, AI models, language releases — all in one feed.
            </p>
          </div>

          <div className="flex gap-12">
            {/* App links */}
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">App</p>
              {links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {l.label}
                </Link>
              ))}
            </div>

            {/* Legal links */}
            <div className="flex flex-col gap-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Company</p>
              {legal.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {l.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-1.5 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[11px] text-muted-foreground">
            © {new Date().getFullYear()} DevPulse. All rights reserved.
          </p>
          <p className="text-[11px] text-muted-foreground">
            Built with Next.js · Neon · Clerk
          </p>
        </div>
      </div>
    </footer>
  );
}
