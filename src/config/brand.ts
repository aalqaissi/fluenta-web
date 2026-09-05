/**
 * Single source of truth for product branding.
 * Rebranding the whole app = editing this file.
 */
export const brand = {
  name: "Yalla English Hub",
  shortName: "Yalla",
  tagline: "Your AI coach to your target band.",
  shortPitch: "AI-powered English & IELTS practice, feedback, and coaching — all in one warm, encouraging place.",
  domain: "yallaenglishhub.com",
  supportWhatsApp: "https://wa.me/10000000000",
  coachName: "Yalla Coach",
  currency: "$",
} as const;

export type Brand = typeof brand;
