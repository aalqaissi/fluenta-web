import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Check, MessageCircle, Tag, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { plans, planIncludes } from "@/mock/data";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";

export function CheckoutPage() {
  const navigate = useNavigate();
  const [selected, setSelected] = useState("trial");
  const [promo, setPromo] = useState("");
  const plan = plans.find((p) => p.id === selected)!;

  return (
    <div className="mx-auto max-w-5xl">
      <Button variant="ghost" size="sm" className="mb-4" onClick={() => navigate(-1)}>
        <ArrowLeft className="size-4" /> Back
      </Button>

      <div className="mb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">Complete your subscription</h1>
        <p className="mt-1 text-muted-foreground">Join thousands of students achieving their IELTS goals.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_1fr]">
        {/* plans */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-bold">Select your plan</h2>
            </div>
            <div className="space-y-2.5">
              {plans.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setSelected(p.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all",
                    selected === p.id ? "border-primary bg-primary/[0.05] ring-1 ring-primary" : "border-border hover:bg-muted"
                  )}
                >
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full border-2",
                      selected === p.id ? "border-primary bg-primary text-white" : "border-border"
                    )}
                  >
                    {selected === p.id && <Check className="size-3" strokeWidth={3} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{p.name}</span>
                      {p.badge && <Badge variant={p.highlight ? "default" : "muted"}>{p.badge}</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">{p.detail}</p>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold">{p.price}</div>
                    <div className="text-xs text-muted-foreground">{p.cadence}</div>
                  </div>
                </button>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-3 font-bold">What you’ll get</h3>
            <ul className="space-y-2">
              {planIncludes.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm">
                  <Check className="size-4 shrink-0 text-success" /> {f}
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* summary */}
        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-bold">{plan.name}</h2>
              <Badge variant="muted">{plan.cadence || "Plan"}</Badge>
            </div>
            <div className="flex items-baseline justify-between">
              <span className="text-sm text-muted-foreground">Pay today</span>
              <span className="text-3xl font-extrabold">{plan.id === "starter" ? "$0.00" : plan.price}</span>
            </div>
            <div className="mt-3 rounded-xl bg-secondary/10 p-3 text-sm">
              <p className="font-semibold">{plan.detail}</p>
            </div>

            <div className="mt-4 space-y-1.5">
              <p className="flex items-center gap-1.5 text-sm font-semibold">
                <Tag className="size-4 text-muted-foreground" /> Have a promo code?
              </p>
              <div className="flex gap-2">
                <Input placeholder="ENTER CODE" value={promo} onChange={(e) => setPromo(e.target.value.toUpperCase())} />
                <Button variant="outline" onClick={() => toast(promo ? "Code applied" : "Enter a code first")}>
                  Apply
                </Button>
              </div>
            </div>

            <Button
              className="mt-4 h-12 w-full text-base"
              onClick={() => toast.success("Subscription started (demo)", { description: `${plan.name} — no real charge in this prototype.` })}
            >
              {plan.id === "trial" ? "Start trial – Pay $4.99 today" : `Subscribe – ${plan.price}`}
            </Button>
            <p className="mt-2 flex items-center justify-center gap-1 text-xs text-muted-foreground">
              <ShieldCheck className="size-3.5" /> Cancel anytime. No charge in this prototype.
            </p>
          </Card>

          <Card className="bg-success/[0.06] p-5">
            <h3 className="flex items-center gap-2 font-bold">
              <MessageCircle className="size-4 text-success" /> Support team
            </h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Need help? Our support team handles all payment issues through one channel only: WhatsApp.
            </p>
            <Button variant="success" className="mt-3 w-full" onClick={() => toast("Opening WhatsApp…", { description: brand.supportWhatsApp })}>
              <MessageCircle className="size-4" /> Chat on WhatsApp
            </Button>
            <p className="mt-2 text-xs text-muted-foreground">
              For faster support, include your account email and a screenshot of your payment issue.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
