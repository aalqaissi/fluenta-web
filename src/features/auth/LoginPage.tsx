import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { BookOpen, PenLine, Headphones, Mic, Sparkles, ShieldCheck, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { brand } from "@/config/brand";
import { useAuth } from "@/store/auth-context";
import { DEMO_EMAIL, DEMO_PASSWORD, ApiError } from "@/lib/api";

const perks = [
  { icon: BookOpen, text: "Academic Reading with all 11 question types" },
  { icon: PenLine, text: "AI feedback on Writing across 4 criteria" },
  { icon: Headphones, text: "Listening practice, played once like the real test" },
  { icon: Mic, text: "Speaking recordings with pronunciation coaching" },
];

export function LoginPage() {
  const navigate = useNavigate();
  const { status, user, login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "authed" && user) {
    return <Navigate to={user.onboarded ? "/" : "/onboarding"} replace />;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (mode === "register") {
      if (name.trim().length < 1) return setError("Please enter your name.");
      if (password.length < 8) return setError("Password must be at least 8 characters.");
      if (password !== confirm) return setError("Passwords don't match.");
    }
    setBusy(true);
    try {
      const u = mode === "login"
        ? await login(email.trim(), password)
        : await register({ email: email.trim(), password, name: name.trim() });
      navigate(u.onboarded ? "/" : "/onboarding", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Is the backend running?");
      setBusy(false);
    }
  }

  function fillDemo() {
    setMode("login");
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setError(null);
  }

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-warm-gradient p-10 text-white lg:flex">
        <div className="pointer-events-none absolute -right-16 -top-10 size-72 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-24 left-10 size-72 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-2.5">
          <span className="grid size-10 place-items-center rounded-xl bg-white/20 text-lg font-extrabold">{brand.shortName?.[0] ?? "Y"}</span>
          <span className="text-xl font-extrabold">{brand.name}</span>
        </div>
        <div className="relative">
          <div className="mb-3 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-sm font-semibold">
            <Sparkles className="size-4" /> AI-powered English & IELTS prep
          </div>
          <h1 className="max-w-md text-4xl font-extrabold leading-tight text-balance">{brand.tagline}</h1>
          <p className="mt-3 max-w-md text-white/85">{brand.shortPitch}</p>
          <ul className="mt-6 space-y-3">
            {perks.map((p) => (
              <li key={p.text} className="flex items-center gap-3">
                <span className="grid size-9 place-items-center rounded-xl bg-white/15"><p.icon className="size-4" /></span>
                <span className="text-sm text-white/90">{p.text}</span>
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-sm text-white/70">Trusted by thousands of learners worldwide.</p>
      </div>

      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-6 flex items-center gap-2.5 lg:hidden">
            <span className="grid size-10 place-items-center rounded-xl bg-warm-gradient text-lg font-extrabold text-white">{brand.shortName?.[0] ?? "Y"}</span>
            <span className="text-xl font-extrabold">{brand.name}</span>
          </div>
          <h2 className="text-2xl font-extrabold tracking-tight">
            {mode === "login" ? `Welcome to ${brand.name}` : "Create your account"}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" ? "Sign in to continue your journey." : "Start learning in under a minute."}
          </p>

          <form onSubmit={submit} className="mt-6 space-y-3">
            {mode === "register" && (
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" className="h-12" disabled={busy} />
            )}
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="h-12" disabled={busy} required />
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="h-12" disabled={busy} required />
            {mode === "register" && (
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Confirm password" className="h-12" disabled={busy} required />
            )}
            <Button type="submit" className="h-12 w-full" disabled={busy || !email.trim() || !password}>
              {busy ? <Loader2 className="size-5 animate-spin" /> : mode === "register" ? <UserPlus className="size-4" /> : null}
              {mode === "login" ? "Sign in" : "Create account"}
            </Button>
          </form>

          {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

          <div className="mt-4 flex items-center justify-between text-sm">
            <button type="button" className="font-semibold text-primary hover:underline" onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(null); }}>
              {mode === "login" ? "Create an account" : "I already have an account"}
            </button>
            <button type="button" className="text-muted-foreground hover:underline" onClick={fillDemo} disabled={busy}>
              Fill demo credentials
            </button>
          </div>

          <p className="mt-5 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" /> Your password is stored hashed. Demo account available above.
          </p>
        </div>
      </div>
    </div>
  );
}
