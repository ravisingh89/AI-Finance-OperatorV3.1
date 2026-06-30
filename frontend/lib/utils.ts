import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number, currency: string): string {
  const symbol = currency === "INR" ? "₹" : "AED";
  return `${symbol} ${(amount || 0).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function scoreColor(score: number): string {
  if (score >= 75) return "#10B981";
  if (score >= 50) return "#3B82F6";
  if (score >= 25) return "#F59E0B";
  return "#F43F5E";
}
