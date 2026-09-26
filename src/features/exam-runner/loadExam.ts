// Resolve a runnable exam from the API by id, handling both stored formats:
//  - "runner": content is already the runtime ReadingExam/ListeningExam/SpeakingExam (with answers)
//  - "studio": content is the authoring shape → convert with the existing FE converters
import { api, type ExamDto } from "@/lib/api";
import { toStudioExam } from "@/features/studio/store";
import { studioReadingToExam, studioListeningToExam, studioSpeakingToExam } from "@/features/studio/convert";
import type { ReadingExam, ListeningExam, SpeakingExam } from "@/mock/types";

// Runner content carries its own id/title; the DTO's are authoritative (the stored copy can drift).
export function readingFromDto(dto: ExamDto): ReadingExam {
  return dto.format === "runner"
    ? { ...(dto.content as ReadingExam), id: dto.id, title: dto.title }
    : studioReadingToExam(toStudioExam(dto));
}

export function listeningFromDto(dto: ExamDto): ListeningExam {
  return dto.format === "runner"
    ? { ...(dto.content as ListeningExam), id: dto.id, title: dto.title }
    : studioListeningToExam(toStudioExam(dto));
}

export function speakingFromDto(dto: ExamDto): SpeakingExam {
  return dto.format === "runner"
    ? { ...(dto.content as SpeakingExam), id: dto.id, title: dto.title }
    : studioSpeakingToExam(toStudioExam(dto));
}

export async function loadReadingExam(id: string): Promise<ReadingExam> {
  return readingFromDto(await api.exams.get(id));
}

export async function loadListeningExam(id: string): Promise<ListeningExam> {
  return listeningFromDto(await api.exams.get(id));
}

export async function loadSpeakingExam(id: string): Promise<SpeakingExam> {
  return speakingFromDto(await api.exams.get(id));
}
