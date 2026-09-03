import { useState } from "react";
import { Star, Send } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { FeedbackType } from "@/mock/types";

const types: FeedbackType[] = ["Suggestion", "Bug", "Praise", "Question"];

export function FeedbackModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("");

  function submit() {
    toast.success("Thanks for your feedback!", { description: "We read every note — this helps us shape Fluenta." });
    onOpenChange(false);
    setRating(0);
    setMessage("");
    setSubject("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Share your feedback</DialogTitle>
          <DialogDescription>We value your input! Let us know how we can improve your experience.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Feedback type</Label>
            <Select defaultValue="Suggestion">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>
              Overall rating <span className="text-primary">*</span>
            </Label>
            <div className="flex gap-1.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setRating(n)}
                  className="transition-transform hover:scale-110"
                  aria-label={`${n} star${n > 1 ? "s" : ""}`}
                >
                  <Star
                    className={cn(
                      "size-8 transition-colors",
                      (hover || rating) >= n ? "fill-secondary text-secondary" : "text-border"
                    )}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fb-subject">
              Subject <span className="text-primary">*</span>
            </Label>
            <Input
              id="fb-subject"
              placeholder="Brief summary of your feedback"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="fb-message">
              Message <span className="text-primary">*</span>
            </Label>
            <Textarea
              id="fb-message"
              rows={4}
              maxLength={5000}
              placeholder="Tell us more about your experience, suggestions, or issues…"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-right text-xs text-muted-foreground">{message.length}/5000 characters</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!subject || !message || !rating}>
            <Send className="size-4" /> Submit feedback
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
