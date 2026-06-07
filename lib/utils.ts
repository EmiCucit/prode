import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const TZ = "America/Argentina/Buenos_Aires";

export function formatMatchDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: TZ,
  });
}

export function formatMatchTime(isoString: string): string {
  return new Date(isoString).toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TZ,
  });
}

/** YYYY-MM-DD in Argentina TZ — used as grouping key. */
export function dateKey(isoString: string): string {
  return new Date(isoString).toLocaleDateString("sv-SE", { timeZone: TZ });
}
