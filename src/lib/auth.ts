import type { FluentaUser } from "@/mock/types";

export const isAdmin = (u?: FluentaUser | null): boolean => u?.role === "admin";
