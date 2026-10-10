"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { cn } from "@/lib/utils";

const LINKS = [
  ["/admin/candidates", "Candidates"],
  ["/admin/questions", "Question banks"],
  ["/admin/settings", "Cutoffs"],
  ["/admin/reports", "Reports"],
  ["/admin/users", "Users"],
] as const;

function NavLinks({ path, className }: { path: string; className: string }) {
  return (
    <ul className={className}>
      {LINKS.map(([href, label]) => (
        <li key={href} className="shrink-0">
          <Link
            href={href}
            aria-current={path.startsWith(href) ? "page" : undefined}
            className={cn(
              "relative block py-1 text-sm transition-colors duration-200 hover:text-brand",
              "after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:origin-left after:bg-foreground after:transition-transform after:duration-300",
              path.startsWith(href) ? "font-medium text-foreground after:scale-x-100" : "text-muted-foreground after:scale-x-0",
            )}
          >
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Sticky and transparent at the top; blurs only once the page has scrolled. */
export function AdminHeader({
  email,
  role,
  signOut,
}: {
  email: string;
  role: string;
  signOut: () => Promise<void>;
}) {
  const path = usePathname();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 0);
    on();
    addEventListener("scroll", on, { passive: true });
    return () => removeEventListener("scroll", on);
  }, []);

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-[backdrop-filter,background] duration-300",
        scrolled ? "bg-background/60 backdrop-blur-md" : "bg-transparent",
      )}
    >
      <nav
        aria-label="Admin"
        className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-4 sm:px-12"
      >
        <div className="flex items-center gap-8">
          <Link href="/admin/candidates" className="font-onest text-xl font-medium tracking-tight">
            Hiring pipeline
          </Link>
          <NavLinks path={path} className="hidden items-center gap-6 md:flex" />
        </div>

        <div className="flex items-center gap-2">
          <ThemeSwitcher />
          <span className="hidden max-w-48 truncate text-sm text-muted-foreground sm:block" title={email}>
            {email}
          </span>
          <Chip className="hidden capitalize sm:inline-flex">{role}</Chip>
          <form action={signOut}>
            <Button variant="ghost" size="sm" type="submit">
              Sign out
            </Button>
          </form>
        </div>

        {/* the right edge fades so a cut-off link reads as "scroll for more", not as a bug */}
        <NavLinks
          path={path}
          className="flex w-full items-center gap-5 overflow-x-auto pb-1 pr-8 [mask-image:linear-gradient(to_right,#000_88%,transparent)] md:hidden"
        />
      </nav>
    </header>
  );
}
