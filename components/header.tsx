'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Zap } from 'lucide-react';
import { UserButton, SignInButton, SignUpButton, Show } from '@clerk/nextjs';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/feed',          label: 'Feed',          pro: false },
  { href: '/discover',      label: 'Discover',      pro: false },
  { href: '/saved',         label: 'Saved',         pro: false },
  { href: '/subscriptions', label: 'Subscriptions', pro: false },
  { href: '/projects',      label: 'Projects',      pro: true  },
];

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border/40 bg-background/10 px-6 backdrop-blur-xl">
      {/* Logo */}
      <div className="flex items-center gap-6">
        <Link href="/" className="flex items-center gap-2">
          <Zap className="size-4 text-primary" />
          <span className="text-sm font-semibold tracking-tight">DevPulse</span>
        </Link>

        {/* Nav */}
        <nav className="hidden items-center md:flex">
          {navItems.map(({ href, label, pro }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors',
                pathname === href || pathname.startsWith(href + '/')
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {label}
              {pro && (
                <span className="rounded bg-primary/15 px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide text-primary">
                  Pro
                </span>
              )}
            </Link>
          ))}
        </nav>
      </div>

      {/* Right side */}
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <Show when="signed-in">
          <UserButton />
        </Show>
        <Show when="signed-out">
          <SignInButton mode="redirect">
            <Button size="sm" variant="outline">Sign in</Button>
          </SignInButton>
          <SignUpButton mode="redirect">
            <Button size="sm">Get started</Button>
          </SignUpButton>
        </Show>
      </div>
    </header>
  );
}
