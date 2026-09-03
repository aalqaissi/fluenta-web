import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Trash2, ShieldAlert, Info } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/common/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/modals/ConfirmDialog";
import { useApp } from "@/store/app-context";

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z" />
    </svg>
  );
}

export function SettingsAccountPage() {
  const { user, updateUser } = useApp();
  const navigate = useNavigate();
  const [deleteOpen, setDeleteOpen] = useState(false);

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Account settings" subtitle="Manage your profile, sign-in, and privacy." />

      <div className="space-y-5">
        {/* email */}
        <Card className="p-5">
          <h3 className="flex items-center gap-2 font-bold">
            <Mail className="size-4 text-muted-foreground" /> Email
          </h3>
          <Input value={user.email} readOnly className="mt-3 bg-muted/50" />
          <p className="mt-1.5 text-xs text-muted-foreground">Email can’t be changed. Contact support if you need to update your email.</p>
        </Card>

        {/* login method */}
        <Card className="p-5">
          <h3 className="font-bold">Login method</h3>
          <p className="text-sm text-muted-foreground">Your authentication provider.</p>
          <div className="mt-3 flex items-center gap-3 rounded-xl border border-border p-3.5">
            <GoogleGlyph />
            <span className="font-semibold">Google</span>
          </div>
        </Card>

        {/* privacy */}
        <Card className="p-5">
          <h3 className="font-bold">Privacy</h3>
          <p className="text-sm text-muted-foreground">Control your data and privacy settings.</p>
          <div className="mt-3 flex items-start justify-between gap-4 rounded-xl border border-border p-3.5">
            <div>
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                Save history <Info className="size-3.5 text-muted-foreground" />
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                When enabled, your exam history and progress are saved to provide personalized insights and track your improvement over time.
              </p>
            </div>
            <Switch
              checked={user.saveHistory}
              onCheckedChange={(v) => {
                updateUser({ saveHistory: v });
                toast(v ? "History saving on" : "History saving off");
              }}
            />
          </div>
        </Card>

        {/* danger zone */}
        <Card className="border-destructive/30 p-5">
          <h3 className="flex items-center gap-2 font-bold text-destructive">
            <ShieldAlert className="size-4" /> Danger zone
          </h3>
          <p className="text-sm text-muted-foreground">Irreversible actions that will permanently affect your account.</p>
          <Button variant="destructive-outline" className="mt-3" onClick={() => setDeleteOpen(true)}>
            <Trash2 className="size-4" /> Delete account
          </Button>
          <p className="mt-2 text-xs text-muted-foreground">
            Once you delete your account, all your data will be permanently removed. This action cannot be undone.
          </p>
        </Card>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Are you absolutely sure?"
        description="This will permanently delete your account and remove all of your data, including your exam history and progress. This action cannot be undone."
        confirmLabel="Delete account"
        onConfirm={() => {
          toast.success("Account deleted (demo)");
          navigate("/login");
        }}
      />
    </div>
  );
}
