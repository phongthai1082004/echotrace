"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";

function validateUsername(u: string): string | null {
  if (u.length < 3 || u.length > 30) return "username must be 3–30 characters";
  if (!/^[a-z0-9._]+$/.test(u)) return "only lowercase letters, numbers, dots, underscores";
  if (/^[._]|[._]$/.test(u)) return "cannot start or end with dot or underscore";
  if (/[._]{2,}/.test(u)) return "no consecutive dots or underscores";
  return null;
}

export default function AuthPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [credential, setCredential] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState<"username" | "password" | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldError(null);

    if (isSignUp) {
      const uErr = validateUsername(username);
      if (uErr) { setFieldError("username"); setError(uErr); return; }
      if (password !== confirmPassword) { setError("passwords do not match"); return; }
    } else {
      const uErr = validateUsername(credential);
      if (uErr) { setFieldError("username"); setError(uErr); return; }
    }

    setLoading(true);
    try {
      if (isSignUp) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, password }),
        });
        if (!res.ok) { const d = await res.json(); throw new Error(d.message || d.errors || "registration failed"); }
      }

      const result = await signIn("credentials", {
        username: isSignUp ? username : credential,
        password,
        redirect: false,
      });
      if (result?.error) throw new Error(result.error);

      window.location.href = "/explore";
    } catch (err: any) { setError(err.message); }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="hidden lg:block lg:w-[55%] relative bg-[#e8e6e0] overflow-hidden min-h-screen">
        <img src="https://images.unsplash.com/photo-1765660996991-31f345c40247?w=1200&h=1600&fit=crop&auto=format" alt="" className="w-full h-full object-cover absolute inset-0" />
        <div className="absolute top-10 left-10"><p className="text-white text-2xl font-bold tracking-tight">Travel Canvas</p></div>
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-[#222] border-t-[3px] border-white/20">
          <p className="font-mono text-[10px] font-bold text-white/70 tracking-wider uppercase">31.06° N, 7.92° W — Toubkal, Morocco</p>
        </div>
      </div>

      <div className="flex flex-col px-8 lg:px-14 py-12 lg:w-[45%] bg-[#F8F2E5]">
        <p className="lg:hidden text-2xl font-bold mb-10">Travel Canvas</p>

        <div className="flex gap-0 mb-8">
          {(["Sign In", "Create Account"] as const).map((label, i) => {
            const active = isSignUp === (i === 1);
            return (
              <button key={label} type="button" onClick={() => { setIsSignUp(i === 1); setError(""); setFieldError(null); }}
                className={`font-mono text-[10px] font-bold tracking-widest uppercase pb-3 pr-8 transition-all relative ${
                  active ? "text-[#222]" : "text-[#999] hover:text-[#666]"
                }`}>
                {label}
                {active && <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-[#222] rounded-full" />}
              </button>
            );
          })}
        </div>

        <h1 className="text-3xl lg:text-4xl font-bold mb-1 leading-tight">{isSignUp ? "Begin Your Archive." : "Welcome Back."}</h1>
        <p className="text-sm mb-8 text-[#666]">{isSignUp ? "Create an account to start designing your first travel journal." : "Sign in to continue building your journal."}</p>

        <form onSubmit={handleSubmit} className="space-y-5 max-w-sm">
          {isSignUp ? (
            <>
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-1.5 text-[#666]">Username</label>
                <input type="text" value={username}
                  onChange={(e) => { setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, "")); setFieldError(null); }}
                  onFocus={() => setFieldError(null)}
                  onBlur={() => { const e = validateUsername(username); if (e) { setFieldError("username"); setError(e); } else { setError(""); } }}
                  placeholder="amara.osei"
                  className={`w-full bg-[#FFF7D6] text-sm font-bold rounded-[8px] px-3 py-2.5 border-[2px] border-[#222] shadow-[2px_2px_0_#222] placeholder:text-[#999] focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0_#222] transition-all ${fieldError === "username" ? "!border-[#B54843] !shadow-[#B54843]" : ""}`} />
              </div>
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-1.5 text-[#666]">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full bg-[#FFF7D6] text-sm font-bold rounded-[8px] px-3 py-2.5 border-[2px] border-[#222] shadow-[2px_2px_0_#222] placeholder:text-[#999] focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0_#222] transition-all" />
              </div>
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-1.5 text-[#666]">Re-enter Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••"
                  className="w-full bg-[#FFF7D6] text-sm font-bold rounded-[8px] px-3 py-2.5 border-[2px] border-[#222] shadow-[2px_2px_0_#222] placeholder:text-[#999] focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0_#222] transition-all" />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-1.5 text-[#666]">Username</label>
                <input type="text" value={credential} onChange={(e) => { setCredential(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, "")); setFieldError(null); }}
                  placeholder="amara.osei"
                  className={`w-full bg-[#FFF7D6] text-sm font-bold rounded-[8px] px-3 py-2.5 border-[2px] border-[#222] shadow-[2px_2px_0_#222] placeholder:text-[#999] focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0_#222] transition-all ${fieldError === "username" ? "!border-[#B54843] !shadow-[#B54843]" : ""}`} />
              </div>
              <div>
                <label className="font-mono text-[10px] font-bold tracking-widest uppercase block mb-1.5 text-[#666]">Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full bg-[#FFF7D6] text-sm font-bold rounded-[8px] px-3 py-2.5 border-[2px] border-[#222] shadow-[2px_2px_0_#222] placeholder:text-[#999] focus:outline-none focus:translate-x-[1px] focus:translate-y-[1px] focus:shadow-[1px_1px_0_#222] transition-all" />
              </div>
            </>
          )}
          {error && <p className="font-mono text-[10px] font-bold" style={{ color: "#B54843" }}>{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-[#222] text-white font-mono text-[10px] font-bold tracking-widest uppercase py-3.5 rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-all disabled:opacity-50">
            {loading ? "Please wait…" : isSignUp ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div className="flex items-center gap-4 my-5 max-w-sm">
          <div className="flex-1 h-[3px] bg-[#222]" />
          <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-[#999]">or</span>
          <div className="flex-1 h-[3px] bg-[#222]" />
        </div>

        <div className="max-w-sm">
          {isSignUp ? (
            <button onClick={() => { setIsSignUp(false); setError(""); setFieldError(null); }} type="button"
              className="w-full flex items-center justify-center gap-2 font-mono text-[10px] font-bold tracking-widest uppercase py-3.5 rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] bg-[#FFF7D6] text-[#222] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-all">
              Sign In
            </button>
          ) : (
            <button onClick={() => signIn("google", { callbackUrl: "/explore" })} type="button"
              className="w-full flex items-center justify-center gap-2 font-mono text-[10px] font-bold tracking-widest uppercase py-3.5 rounded-[10px] border-[3px] border-[#222] shadow-[4px_4px_0_#222] bg-[#FFF7D6] text-[#222] hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-[2px_2px_0_#222] transition-all">
              <svg className="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
