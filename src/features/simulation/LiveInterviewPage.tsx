import { useNavigate } from "react-router-dom";
import { ArrowLeft, Radio, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { brand } from "@/config/brand";

/**
 * Live Interview (real-time AI examiner) is an AI feature held for a later stage.
 * This screen keeps the route working and explains what's coming.
 */
export function LiveInterviewPage() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-2xl py-10">
      <Button variant="ghost" size="sm" className="mb-6" onClick={() => navigate("/simulation/speaking")}>
        <ArrowLeft className="size-4" /> Back to Speaking
      </Button>

      <Card className="overflow-hidden p-8 text-center">
        <div className="mx-auto mb-4 grid size-16 place-items-center rounded-2xl bg-warm-gradient text-white shadow-glow">
          <Radio className="size-7" />
        </div>
        <Badge variant="secondary" className="mb-3">
          <Sparkles className="size-3" /> Coming soon
        </Badge>
        <h1 className="text-2xl font-extrabold tracking-tight">Live Interview is on the way</h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
          A real-time conversation with the {brand.name} AI examiner — adaptive follow-up questions and
          instant feedback, just like the real Speaking test. AI features are being built in the next
          stage; this mode will light up then.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button variant="outline" onClick={() => navigate("/simulation/speaking")}>
            Back to Speaking
          </Button>
          <Button onClick={() => navigate("/simulation/speaking/standard")}>
            Try Standard Practice
          </Button>
        </div>
      </Card>
    </div>
  );
}
