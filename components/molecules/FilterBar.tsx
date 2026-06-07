"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";

const STATUSES = [
  { value: "upcoming", label: "Próximos" },
  { value: "live",     label: "En vivo"  },
  { value: "finished", label: "Finalizados" },
] as const;

function Pill({
  active,
  onClick,
  children,
  pending,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  pending?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3 py-1 text-xs font-medium transition-colors",
        active
          ? "bg-primary text-primary-foreground"
          : "bg-secondary text-secondary-foreground hover:bg-accent",
        pending && "opacity-60",
      )}
    >
      {children}
    </button>
  );
}

export default function FilterBar() {
  const router    = useRouter();
  const pathname  = usePathname();
  const sp        = useSearchParams();
  const [pending, startTransition] = useTransition();

  const currentStatus = sp.get("status") ?? null;

  function toggleStatus(value: string) {
    const next = new URLSearchParams(sp.toString());
    if (next.get("status") === value) {
      next.delete("status");
    } else {
      next.set("status", value);
    }
    startTransition(() => router.push(`${pathname}?${next.toString()}`));
  }

  return (
    <div className={cn("flex flex-wrap gap-2", pending && "opacity-70")}>
      {STATUSES.map(({ value, label }) => (
        <Pill
          key={value}
          active={currentStatus === value}
          onClick={() => toggleStatus(value)}
          pending={pending}
        >
          {label}
        </Pill>
      ))}
    </div>
  );
}
