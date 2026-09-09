import type { Verdict } from "@/lib/types";

interface VerdictStyle {
  label: string;
  emoji: string;
  bg: string;
  border: string;
  text: string;
  bar: string;
}

export const VERDICT_STYLES: Record<Verdict, VerdictStyle> = {
  recycle: {
    label: "Recycle",
    emoji: "♻️",
    bg: "bg-emerald-50 dark:bg-emerald-950",
    border: "border-emerald-500",
    text: "text-emerald-700 dark:text-emerald-300",
    bar: "bg-emerald-500",
  },
  compost: {
    label: "Compost",
    emoji: "🌱",
    bg: "bg-amber-50 dark:bg-amber-950",
    border: "border-amber-600",
    text: "text-amber-800 dark:text-amber-300",
    bar: "bg-amber-600",
  },
  trash: {
    label: "Trash",
    emoji: "🗑️",
    bg: "bg-gray-100 dark:bg-gray-800",
    border: "border-gray-500",
    text: "text-gray-700 dark:text-gray-300",
    bar: "bg-gray-500",
  },
  special_dropoff: {
    label: "Special Drop-off",
    emoji: "⚠️",
    bg: "bg-orange-50 dark:bg-orange-950",
    border: "border-orange-500",
    text: "text-orange-700 dark:text-orange-300",
    bar: "bg-orange-500",
  },
};
