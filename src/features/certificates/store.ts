import { useSyncExternalStore } from "react";
import { certificates as seedCerts, currentUser } from "@/mock/data";

export interface CertRecord {
  id: string;
  title: string;
  candidate: string;
  module: "academic" | "general";
  centre: string;
  issuedOn: string; // YYYY-MM-DD
  scores: { listening: number; reading: number; writing: number; speaking: number };
  overall: number;
  cefr: string;
  comments: string;
  status: "draft" | "issued";
}

const uid = () => "cert-" + Math.random().toString(36).slice(2, 9);

export function cefrFor(overall: number): string {
  if (overall >= 8.5) return "C2";
  if (overall >= 7) return "C1";
  if (overall >= 5.5) return "B2";
  if (overall >= 4) return "B1";
  return "A2";
}

export function avgBand(s: CertRecord["scores"]): number {
  const raw = (s.listening + s.reading + s.writing + s.speaking) / 4;
  return Math.round(raw * 2) / 2; // nearest 0.5
}

export function blankCert(): CertRecord {
  const scores = { listening: 6.5, reading: 6.5, writing: 6, speaking: 6.5 };
  const overall = avgBand(scores);
  return {
    id: uid(),
    title: "Full Practice Test",
    candidate: currentUser.name,
    module: "academic",
    centre: "Online Practice",
    issuedOn: "2026-09-03",
    scores,
    overall,
    cefr: cefrFor(overall),
    comments: "This report confirms completion of a comprehensive practice examination on Fluenta. Scores are AI-generated estimates for learning purposes.",
    status: "draft",
  };
}

let records: CertRecord[] = seedCerts.map((c) => ({
  id: c.id,
  title: c.title,
  candidate: currentUser.name,
  module: c.module,
  centre: "Online Practice",
  issuedOn: c.issuedOn,
  scores: c.scores,
  overall: c.band,
  cefr: c.cefr,
  comments: "This report confirms completion of a comprehensive practice examination on Fluenta. Scores are AI-generated estimates for learning purposes.",
  status: "issued",
}));

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export const certStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: () => records,
  find: (id: string) => records.find((r) => r.id === id),
  upsert(rec: CertRecord) {
    records = records.some((r) => r.id === rec.id)
      ? records.map((r) => (r.id === rec.id ? rec : r))
      : [rec, ...records];
    emit();
  },
  remove(id: string) {
    records = records.filter((r) => r.id !== id);
    emit();
  },
};

export function useCerts(): CertRecord[] {
  return useSyncExternalStore(certStore.subscribe, certStore.get, certStore.get);
}
