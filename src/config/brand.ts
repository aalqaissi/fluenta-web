/**
 * Single source of truth for product branding.
 * Rebranding the whole app = editing this file.
 */
export const brand = {
  name: "Fluenta",
  tagline: "Your AI coach to your target band.",
  shortPitch: "AI-powered IELTS practice, feedback, and coaching — all in one warm, encouraging place.",
  domain: "fluenta.app",
  supportWhatsApp: "https://wa.me/10000000000",
  coachName: "Fluenta Coach",
  currency: "$",
} as const;

export type Brand = typeof brand;
