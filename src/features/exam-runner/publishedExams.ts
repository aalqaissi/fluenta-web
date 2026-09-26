// Student-facing exam pools: every exam an admin has PUBLISHED for a skill (built-in "runner"
// exams and Content Studio "studio" exams alike), fetched fresh on each visit so a newly
// published exam shows up without a full page reload.
import { useCallback, useMemo, useState } from "react";
import { api, type ExamDto } from "@/lib/api";
import { useAsync } from "@/lib/useAsync";

export type PoolSkill = "reading" | "listening" | "speaking";

export function fetchPublished(skill: PoolSkill): Promise<ExamDto[]> {
  return api.exams.list({ skill, status: "published" });
}

/** Pick a random item, avoiding `avoidId` when there is any other choice. */
export function pickRandom<T extends { id: string }>(items: T[], avoidId?: string): T | undefined {
  const pool = items.length > 1 && avoidId ? items.filter((i) => i.id !== avoidId) : items;
  return pool.length ? pool[Math.floor(Math.random() * pool.length)] : undefined;
}

export interface ExamPool<T> {
  featured: T | undefined;
  others: T[];
  all: T[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  /** Feature a different random exam (no-op with fewer than two). */
  shuffle: () => void;
}

/**
 * Published exams for a skill, converted for display, with one chosen at random as the
 * featured exam. The pick is stable for the visit and re-rolled by `shuffle`.
 */
export function useExamPool<T extends { id: string }>(
  skill: PoolSkill,
  convert: (dto: ExamDto) => T,
  /** Optional narrowing (e.g. by the student's module); `filterKey` must change whenever it does. */
  filter?: { key: string; keep: (dto: ExamDto) => boolean },
): ExamPool<T> {
  const { data, loading, error, reload } = useAsync(() => fetchPublished(skill), [skill]);
  const all = useMemo(() => (data ?? []).filter((d) => !filter || filter.keep(d)).map(convert), [data, filter?.key]); // eslint-disable-line react-hooks/exhaustive-deps
  // The pick lives in state (re-rolled only when a new list loads or on shuffle) so it stays
  // stable across re-renders; picking during render keeps the first paint from flashing.
  const [pick, setPick] = useState<{ from: T[]; id?: string }>({ from: [] });
  if (pick.from !== all) setPick({ from: all, id: pickRandom(all, pick.id)?.id });

  const featured = all.find((e) => e.id === pick.id);
  const shuffle = useCallback(() => setPick((p) => ({ from: all, id: pickRandom(all, p.id)?.id })), [all]);

  return { featured, others: all.filter((e) => e !== featured), all, loading, error, reload, shuffle };
}
