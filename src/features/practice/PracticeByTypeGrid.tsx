import { Link } from "react-router-dom";
import { ArrowRight, GraduationCap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { QUESTION_TYPE_LABEL } from "@/mock/data";
import { getReadingPracticeGroups, countQuestions } from "@/mock/strategies";
import type { QuestionType, SkillKey } from "@/mock/types";

export function PracticeByTypeGrid({ skill, types }: { skill: SkillKey; types: QuestionType[] }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {types.map((t) => {
        const count = skill === "reading" ? countQuestions(getReadingPracticeGroups(t)) : 0;
        return (
          <Link
            key={t}
            to={`/practice/${skill}/${t}`}
            className="group flex flex-col rounded-2xl border border-border bg-card p-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-soft-md"
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary">
                <GraduationCap className="size-5" />
              </span>
              <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-primary" />
            </div>
            <h4 className="font-bold leading-snug">{QUESTION_TYPE_LABEL[t]}</h4>
            <p className="mt-0.5 text-xs text-muted-foreground">Strategy · Quick tips · Practice</p>
            {count > 0 && (
              <Badge variant="muted" className="mt-2 self-start">
                {count} questions
              </Badge>
            )}
          </Link>
        );
      })}
    </div>
  );
}
