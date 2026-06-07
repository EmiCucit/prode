"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CalendarDays, Trophy, LogOut } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Sol de Mayo palette ───────────────────────────────────────────
const ICON_ACTIVE    = "#E8B84B";
const ICON_INACTIVE  = "#8B6820";
const LABEL_ACTIVE   = "#E8B84B";
const LABEL_INACTIVE = "#8AACC8";
const INDICATOR      = "#E8B84B";

// Material-style: filled stroke, slightly thicker than default
const ICON_STROKE = 2.25;
const ICON_SIZE   = 22;

export default function NavBar() {
  const pathname = usePathname();
  const router   = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const link = (href: string, label: string, Icon: LucideIcon) => {
    const isActive = pathname.startsWith(href);
    return (
      <Link
        href={href}
        className="relative flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors"
        style={{ color: isActive ? LABEL_ACTIVE : LABEL_INACTIVE }}
      >
        <Icon
          size={ICON_SIZE}
          strokeWidth={ICON_STROKE}
          color={isActive ? ICON_ACTIVE : ICON_INACTIVE}
          aria-hidden
        />
        {label}
        {isActive && (
          <span
            className="absolute top-0 left-1/2 -translate-x-1/2 h-0.5 w-8 rounded-b"
            style={{ background: INDICATOR }}
          />
        )}
      </Link>
    );
  };

  const Divider = () => (
    <span aria-hidden className="self-center h-6 w-px bg-border" />
  );

  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 flex border-t border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      {link("/partidos", "Partidos", CalendarDays)}
      <Divider />
      {link("/ranking",  "Ranking",  Trophy)}
      <Divider />
      <button
        onClick={handleLogout}
        className={cn(
          "flex flex-1 flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors",
        )}
        style={{ color: LABEL_INACTIVE }}
      >
        <LogOut
          size={ICON_SIZE}
          strokeWidth={ICON_STROKE}
          color={ICON_INACTIVE}
          aria-hidden
        />
        Salir
      </button>
    </nav>
  );
}
