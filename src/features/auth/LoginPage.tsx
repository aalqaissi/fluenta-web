import { useNavigate } from "react-router-dom";
import { BookOpen, PenLine, Headphones, Mic, Sparkles, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { brand } from "@/config/brand";

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

const perks = [
  { icon: BookOpen, text: "Academic Reading with all 11 question types" },
  { icon: PenLine, text: "AI feedback on Writing across 4 criteria" },
  { icon: Headphones, text: "Listening practice, played once like the real test" },
  { icon: Mic, text: "Speaking recordings with pronunciation coaching" },
];

export function LoginPage() {
  const navigate = useNavigate();
  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* brand panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-warm-gradient p-10 text-white lg:flex">
        <div className="pointer-events-none absolute -right-16 -top-10 size-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 left-10 size-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-white/20 text-lg font-extrabold">F</span>
          <span className="text-xl font-extrabold">{brand.name}</span>
        </div>
        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
            <Sparkles className="size-4" /> AI-powered IELTS prep
          </div>
          <h1 className="max-w-md text-4xl font-extrabold leading-tight text-balance">{brand.tagline}</h1>
          <p className="mt-3 max-w-md text-white/85">{brand.shortPitch}</p>
          <ul className="mt-6 space-y-3">
            {perks.map((p) => (
              <li key={p.text} className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-white/15">
                  <p.icon className="size-4" />
                </span>
                <span className="text-sm text-white/90">{p.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/70">Trusted by thousands of learners worldwide.</p>
      </div>

      {/* sign-in panel */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <span className="grid size-10 place-items-center rounded-xl bg-warm-gradient text-lg font-extrabold text-white">F</span>
            <span className="text-xl font-extrabold">{brand.name}</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">Welcome back</h2>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to continue your IELTS journey.</p>

          <Button variant="outline" className="mt-6 h-12 w-full" onClick={() => navigate("/")}>
            <GoogleGlyph /> Continue with Google
          </Button>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" /> We only use Google to sign you in securely.
          </p>

          <div className="mt-8 rounded-xl border border-dashed border-border bg-muted/40 p-3 text-center text-xs text-muted-foreground">
            Prototype — “Continue with Google” drops you straight into the demo dashboard.
          </div>
        </div>
      </div>
    </div>
  );
}
