import { useEffect, useSyncExternalStore } from "react";
import { currentUser } from "@/mock/data";
import { api, type CertificateDto } from "@/lib/api";

export interface CertRecord {
  id: string;
  title: string;
  candidate: string;
  module: "academic" | "general";
  centre: string;
  issuedOn: string; // YYYY-MM-DD
  // candidate details (TRF)
  dateOfBirth: string; // YYYY-MM-DD or ""
  sex: "male" | "female" | "";
  countryOfOrigin: string;
  nationality: string;
  firstLanguage: string;
  schemeCode: string;
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
    dateOfBirth: "",
    sex: "",
    countryOfOrigin: "",
    nationality: "",
    firstLanguage: "",
    schemeCode: "Online Practice Test",
    scores,
    overall,
    cefr: cefrFor(overall),
    comments: "This report confirms completion of a comprehensive practice examination on Fluenta. Scores are AI-generated estimates for learning purposes.",
    status: "draft",
  };
}

// API-backed reactive store. CertificateDto mirrors CertRecord field-for-field.
let records: CertRecord[] = [];
let loaded = false;
let loading = false;
let error: string | null = null;
let snapshot: CertRecord[] = records;

const listeners = new Set<() => void>();
function emit() {
  snapshot = records;
  listeners.forEach((l) => l());
}

function ensureLoaded() {
  if (loaded || loading) return;
  loading = true;
  api.certificates
    .list()
    .then((list) => {
      records = list as unknown as CertRecord[];
      loaded = true;
    })
    .catch((e) => {
      error = String((e as any)?.message ?? e);
    })
    .finally(() => {
      loading = false;
      emit();
    });
}

export const certStore = {
  subscribe(l: () => void) {
    listeners.add(l);
    return () => listeners.delete(l);
  },
  get: () => records,
  find: (id: string) => records.find((r) => r.id === id),
  error: () => error,
  ensureLoaded,
  upsert(rec: CertRecord) {
    const exists = records.some((r) => r.id === rec.id);
    records = exists ? records.map((r) => (r.id === rec.id ? rec : r)) : [rec, ...records];
    emit();
    const dto = rec as unknown as CertificateDto;
    (exists ? api.certificates.update(rec.id, dto) : api.certificates.create(dto)).catch(() => {
      /* optimistic; reload resyncs */
    });
  },
  remove(id: string) {
    records = records.filter((r) => r.id !== id);
    emit();
    api.certificates.remove(id).catch(() => { /* optimistic */ });
  },
};

export function useCerts(): CertRecord[] {
  useEffect(() => {
    ensureLoaded();
  }, []);
  return useSyncExternalStore(certStore.subscribe, () => snapshot, () => snapshot);
}
