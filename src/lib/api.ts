// Typed HTTP client for the Fluenta backend API.
//
// Base URL comes from VITE_API_URL (see .env). All calls attach the bearer token stored by
// src/lib/auth.ts. Errors throw ApiError with the HTTP status so callers can react (e.g. 401).

import type {
  FluentaUser,
  Lesson,
  Achievement,
  Plan,
  SectionSummary,
  RecentExam,
} from "@/mock/types";

export const API_BASE: string =
  (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://localhost:8080/api";

const TOKEN_KEY = "fluenta.token";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (e) {
    // Network / CORS / server-down: surface a consistent offline error.
    throw new ApiError(0, `Cannot reach the Fluenta API at ${API_BASE}. Is the backend running?`);
  }

  if (res.status === 401) {
    setToken(null);
    throw new ApiError(401, "Your session has expired. Please sign in again.");
  }
  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const data = await res.json();
      if (data?.error) msg = data.error;
    } catch {
      /* ignore */
    }
    throw new ApiError(res.status, msg);
  }
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

// ---- shared DTO shapes (mirror the backend records) ----------------

/** An exam as stored/served by the API. `content` is the nested authoring/runtime payload. */
export interface ExamDto {
  id: string;
  skill: "reading" | "writing" | "listening" | "speaking" | "full";
  title: string;
  module: "academic" | "general" | "both";
  status: "draft" | "published";
  scope: "global" | "user";
  timeLimit: number;
  updatedAt: string;
  format: "studio" | "runner";
  content: any;
}

export interface AttemptDto {
  id: string;
  examId: string;
  examTitle: string;
  skill: string;
  answers: Record<string, string>;
  correct: number;
  total: number;
  band: number;
  durationUsedSec: number;
  createdAt: string;
}

export interface AttemptRequest {
  examId: string;
  skill: string;
  answers: Record<string, string>;
  durationUsedSec: number;
}

export interface CertificateDto {
  id: string;
  title: string;
  candidate: string;
  module: "academic" | "general";
  centre: string;
  issuedOn: string;
  dateOfBirth: string;
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

export interface ProgressDto {
  sectionSummaries: SectionSummary[];
  recentExams: RecentExam[];
}
export interface PlansDto {
  plans: Plan[];
  planIncludes: string[];
}

// ---- endpoint groups ----------------------------------------------

export const api = {
  auth: {
    login: (email?: string) =>
      request<{ token: string; user: FluentaUser }>("POST", "/auth/login", { email }),
    logout: () => request<{ ok: boolean }>("POST", "/auth/logout"),
  },
  me: {
    get: () => request<FluentaUser>("GET", "/me"),
    patch: (patch: Partial<FluentaUser>) => request<FluentaUser>("PATCH", "/me", patch),
  },
  exams: {
    list: (params: { skill?: string; status?: string; scope?: string } = {}) => {
      const q = new URLSearchParams();
      if (params.skill) q.set("skill", params.skill);
      if (params.status) q.set("status", params.status);
      if (params.scope) q.set("scope", params.scope);
      const qs = q.toString();
      return request<ExamDto[]>("GET", `/exams${qs ? `?${qs}` : ""}`);
    },
    get: (id: string) => request<ExamDto>("GET", `/exams/${id}`),
    create: (dto: ExamDto) => request<ExamDto>("POST", "/exams", dto),
    update: (id: string, dto: ExamDto) => request<ExamDto>("PUT", `/exams/${id}`, dto),
    remove: (id: string) => request<{ ok: boolean }>("DELETE", `/exams/${id}`),
    duplicate: (id: string) => request<ExamDto>("POST", `/exams/${id}/duplicate`),
    setStatus: (id: string, status: "draft" | "published") =>
      request<ExamDto>("POST", `/exams/${id}/status`, { status }),
  },
  attempts: {
    submit: (req: AttemptRequest) => request<AttemptDto>("POST", "/attempts", req),
    get: (id: string) => request<AttemptDto>("GET", `/attempts/${id}`),
    latestForExam: (examId: string) =>
      request<AttemptDto>("GET", `/attempts?examId=${encodeURIComponent(examId)}`),
    list: () => request<AttemptDto[]>("GET", "/attempts"),
  },
  certificates: {
    list: () => request<CertificateDto[]>("GET", "/certificates"),
    get: (id: string) => request<CertificateDto>("GET", `/certificates/${id}`),
    create: (dto: CertificateDto) => request<CertificateDto>("POST", "/certificates", dto),
    update: (id: string, dto: CertificateDto) =>
      request<CertificateDto>("PUT", `/certificates/${id}`, dto),
    remove: (id: string) => request<{ ok: boolean }>("DELETE", `/certificates/${id}`),
  },
  content: {
    lessons: () => request<Lesson[]>("GET", "/lessons"),
    achievements: () => request<Achievement[]>("GET", "/achievements"),
    plans: () => request<PlansDto>("GET", "/plans"),
    progress: () => request<ProgressDto>("GET", "/progress"),
  },
};
