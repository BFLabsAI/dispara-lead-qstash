import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = hash % 360;
  return `hsl(${h}, 70%, 50%)`;
}

export function getTagColor(tagName: string) {
  let hash = 0;
  for (let i = 0; i < tagName.length; i++) {
    hash = tagName.charCodeAt(i) + ((hash << 5) - hash);
  }
  // Soft pastel colors for badges (High lightness, moderate saturation)
  const h = Math.abs(hash % 360);
  return {
    bg: `hsla(${h}, 85%, 90%, 1)`, // Background
    text: `hsla(${h}, 70%, 30%, 1)`, // Text
    border: `hsla(${h}, 70%, 75%, 1)` // Border
  };
}
