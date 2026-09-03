import { Bell, MessageSquarePlus } from "lucide-react";
import { useState } from "react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { FeedbackModal } from "@/components/modals/FeedbackModal";
import { MobileNav } from "./MobileNav";

export function Topbar() {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur-md md:px-8">
      <div className="md:hidden">
        <MobileNav />
      </div>
      <div className="md:hidden">
        <Logo />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <Button variant="outline" size="sm" className="hidden sm:inline-flex" onClick={() => setFeedbackOpen(true)}>
          <MessageSquarePlus className="size-4" /> Give feedback
        </Button>
        <button
          aria-label="Notifications"
          className="relative grid size-10 place-items-center rounded-xl border border-border bg-surface text-muted-foreground transition-colors hover:text-foreground"
        >
          <Bell className="size-[18px]" />
          <span className="absolute right-2.5 top-2.5 size-2 rounded-full bg-primary ring-2 ring-surface" />
        </button>
      </div>
      <FeedbackModal open={feedbackOpen} onOpenChange={setFeedbackOpen} />
    </header>
  );
}
