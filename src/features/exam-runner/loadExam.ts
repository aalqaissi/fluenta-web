// Resolve a runnable exam from the API by id, handling both stored formats:
//  - "runner": content is already the runtime ReadingExam/ListeningExam/SpeakingExam (with answers)
//  - "studio": content is the authoring shape → convert with the existing FE converters
import { api, type ExamDto } from "@/lib/api";
import { toStudioExam } from "@/features/studio/store";
import { studioReadingToExam, studioListeningToExam, studioSpeakingToExam } from "@/features/studio/convert";
import type { ReadingExam, ListeningExam, SpeakingExam } from "@/mock/types";

export async function loadReadingExam(id: string): Promise<ReadingExam> {
  const dto: ExamDto = await api.exams.get(id);
  return dto.format === "runner" ? (dto.content as ReadingExam) : studioReadingToExam(toStudioExam(dto));
}

export async function loadListeningExam(id: string): Promise<ListeningExam> {
  const dto: ExamDto = await api.exams.get(id);
  return dto.format === "runner" ? (dto.content as ListeningExam) : studioListeningToExam(toStudioExam(dto));
}

export async function loadSpeakingExam(id: string): Promise<SpeakingExam> {
  const dto: ExamDto = await api.exams.get(id);
  return dto.format === "runner" ? (dto.content as SpeakingExam) : studioSpeakingToExam(toStudioExam(dto));
}
