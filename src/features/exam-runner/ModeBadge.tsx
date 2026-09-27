import { Badge } from "@/components/ui/badge";
import type { ExamMode } from "./examMode";

/** Makes the active mode obvious in every runner's top bar. */
export function ModeBadge({ mode }: { mode: ExamMode }) {
  return mode === "exam" ? (
    <Badge variant="destructive" className="hidden shrink-0 sm:inline-flex">Exam conditions</Badge>
  ) : (
    <Badge variant="info" className="hidden shrink-0 sm:inline-flex">Practice</Badge>
  );
}
