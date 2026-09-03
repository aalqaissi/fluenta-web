import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      position="bottom-right"
      toastOptions={{
        classNames: {
          toast:
            "!rounded-2xl !border !border-border !bg-surface !text-foreground !shadow-soft-md !font-sans",
          title: "!font-semibold",
          description: "!text-muted-foreground",
          actionButton: "!bg-primary !text-primary-foreground !rounded-lg",
        },
      }}
    />
  );
}
