import { useState } from "react";
import { UploadCloud, FileText } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QUESTION_TYPE_LABEL } from "@/mock/data";
import type { QuestionType } from "@/mock/types";

export function UploadMockModal({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<string | null>(null);

  function create() {
    toast.success("Mock exam created", { description: "Your reading mock is ready to take (demo)." });
    onOpenChange(false);
    setTitle("");
    setFile(null);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Upload a reading mock</DialogTitle>
          <DialogDescription>Paste a passage or upload a file — we’ll turn it into a practice exam.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="mock-title">Exam title</Label>
            <Input id="mock-title" placeholder="e.g. The History of Tea" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>Part</Label>
              <Select defaultValue="1">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Part 1</SelectItem>
                  <SelectItem value="2">Part 2</SelectItem>
                  <SelectItem value="3">Part 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Question type</Label>
              <Select defaultValue="true-false-notgiven">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(QUESTION_TYPE_LABEL) as QuestionType[]).map((t) => (
                    <SelectItem key={t} value={t}>
                      {QUESTION_TYPE_LABEL[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <button
            onClick={() => setFile("passage.pdf")}
            className="flex w-full flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-border bg-muted/30 p-6 text-center transition-colors hover:border-primary"
          >
            {file ? (
              <>
                <FileText className="size-8 text-primary" />
                <span className="text-sm font-semibold">{file}</span>
                <span className="text-xs text-muted-foreground">Click to replace</span>
              </>
            ) : (
              <>
                <UploadCloud className="size-8 text-muted-foreground" />
                <span className="text-sm font-semibold">Drop a PDF/DOCX or click to browse</span>
                <span className="text-xs text-muted-foreground">Demo — file handling is simulated</span>
              </>
            )}
          </button>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={create} disabled={!title}>
            Create exam
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
