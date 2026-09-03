import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** simulate a network/AI delay for the mock layer */
export function delay(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export function formatBand(n: number | null | undefined): string {
  if (n === null || n === undefined) return "–";
  return Number.isInteger(n) ? `${n}.0` : `${n}`;
}

/** color class for an IELTS band score */
export function bandTone(n: number | null | undefined): string {
  if (n === null || n === undefined) return "text-muted-foreground";
  if (n >= 8) return "text-success";
  if (n >= 6.5) return "text-info";
  if (n >= 5) return "text-secondary";
  return "text-primary";
}

export function pad2(n: number): string {
  return n.toString().padStart(2, "0");
}
