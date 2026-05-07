'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Rss, Bookmark, Bell, Zap } from 'lucide-react';
import { UserButton } from '@clerk/nextjs';
import { ThemeToggle } from '@/components/theme-toggle';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/feed', label: 'Feed', icon: Rss },
  { href: '/saved', label: 'Saved', icon: Bookmark },
  { href: '/subscriptions', label: 'Subscriptions', icon: Bell },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-56 shrink-0 flex-col border-r border-border bg-sidebar">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <Zap className="size-5 text-primary" />
        <span className="text-sm font-semibold tracking-tight text-sidebar-foreground">
          DevPulse
        </span>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-2">
        {navItems.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname === href || pathname.startsWith(href + '/')
                ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                : 'text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground',
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        ))}
      </nav>

      <div className="flex items-center justify-between border-t border-border p-3">
        <UserButton />
        <ThemeToggle />
      </div>
    </aside>
  );
}
