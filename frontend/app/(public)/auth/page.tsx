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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [fieldError, setFieldError] = useState<"username" | "password" | null>(null);
  const [loading, setLoading] = useState(false);

  const usernameValue = isSignUp ? name : email;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldError(null);

    const uErr = validateUsername(usernameValue);
    if (uErr) {
      setFieldError("username");
      setError(uErr);
      return;
    }

    if (isSignUp && password !== confirmPassword) {
      setError("passwords do not match");
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const res = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_URL}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: name, password }),
        });
        if (!res.ok) {
          const d = await res.json();
          throw new Error(d.message || d.errors || "registration failed");
        }
        const data = await res.json();
        const result = await signIn("credentials", {
          username: data.data.user.name,
          password,
          redirect: false,
        });
        if (result?.error) throw new Error("sign in failed after registration");
        window.location.href = "/explore";
      } else {
        const result = await signIn("credentials", {
          username: email,
          password,
          redirect: false,
        });
        if (result?.error) {
          setError("Invalid username or password");
        } else {
          window.location.href = "/explore";
        }
      }
    } catch (err: any) {
      setError(err.message);
    }
    setLoading(false);
  };

  const inputClass = (field: "username" | "password") =>
    `w-full bg-transparent font-['Inter'] text-sm text-[#1a1a1a] pb-2 placeholder:text-[#1a1a1a]/25 focus:outline-none transition-colors ${
      fieldError === field ? "placeholder:text-[#8B2020]/40" : ""
    }`;

  return (
    <div className="min-h-screen bg-[#FDFBF7] grid grid-cols-1 lg:grid-cols-[3fr_2fr]">
      <div className="hidden lg:block relative bg-[#e8e6e0] overflow-hidden">
        <img src="https://images.unsplash.com/photo-1765660996991-31f345c40247?w=1200&h=1600&fit=crop&auto=format" alt="" className="w-full h-full object-cover absolute inset-0" />
        <div className="absolute inset-0 bg-[#1a1a1a]/18" />
        <div className="absolute top-10 left-10"><p className="font-['Playfair_Display'] text-[#FDFBF7] text-2xl tracking-tight">Travel Canvas</p></div>
        <div className="absolute bottom-10 left-10 right-10" style={{ borderTop: "0.5px solid rgba(253,251,247,0.25)", paddingTop: "1rem" }}>
          <p className="font-['JetBrains_Mono'] text-[9px] text-[#FDFBF7]/60 tracking-widest uppercase mb-1">31.0601° N, 7.9150° W — Toubkal, Morocco</p>
          <p className="font-['JetBrains_Mono'] text-[9px] text-[#FDFBF7]/35 tracking-widest">2024-01-31T11:05:00+01:00</p>
        </div>
      </div>

      <div className="flex flex-col px-10 lg:px-14 py-16 min-h-screen" style={{ borderLeft: "0.5px solid #dbdad6" }}>
        <p className="lg:hidden font-['Playfair_Display'] text-2xl text-[#1a1a1a] mb-12">Travel Canvas</p>
        <div className="flex mb-10" style={{ borderBottom: "0.5px solid #dbdad6" }}>
          {(["Sign In", "Create Account"] as const).map((label, i) => {
            const active = isSignUp === (i === 1);
            return (
              <button key={label} type="button" onClick={() => { setIsSignUp(i === 1); setError(""); setFieldError(null); }}
                className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase pb-4 pr-8 transition-colors"
                style={{ color: active ? "#1a1a1a" : "rgba(26,26,26,0.35)", borderBottom: active ? "1px solid #1a1a1a" : "1px solid transparent", marginBottom: "-0.5px" }}>{label}</button>
            );
          })}
        </div>

        <h1 className="font-['Playfair_Display'] text-4xl text-[#1a1a1a] mb-2 leading-tight">{isSignUp ? "Begin Your Archive." : "Welcome Back."}</h1>
        <p className="font-['Inter'] text-sm mb-10" style={{ color: "rgba(26,26,26,0.5)" }}>{isSignUp ? "Create an account to start designing your first travel journal." : "Sign in to continue building your journal."}</p>

        <form onSubmit={handleSubmit} className="space-y-7">
          {isSignUp ? (
            <>
              <div>
                  <label 
                    className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase block mb-2" 
                    style={{ color: "rgba(26,26,26,0.45)" }}
                  >
                    Username
                  </label>
                  <input 
                    type="text" 
                    value={name} 
                    onChange={(e) => { 
                      setName(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, "")); 
                      setFieldError(null); 
                    }}
                    onFocus={() => setFieldError(null)} // Reset lỗi khi user focus lại vào input
                    onBlur={() => {
                      // GỘP CHUNG LOGIC VALIDATE VÀO ĐÂY
                      const e = validateUsername(name); 
                      if (e) { 
                        setFieldError("username"); 
                        setError(e); 
                      } else { 
                        setError(""); 
                      }
                    }}
                    placeholder="amara.osei"
                    className={`${inputClass("username")} transition-colors duration-200`}
                    style={{ 
                      borderBottom: `0.5px solid ${
                        fieldError === "username" 
                          ? "#8B2020" // Màu đỏ khi có lỗi
                          : "rgba(26,26,26,0.15)" // Thay cho #dbdad6 bằng rgba nhìn sẽ mịn hơn theo tone chung
                      }` 
                    }}
                  />
                </div>
              <div>
                <label className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase block mb-2" style={{ color: "rgba(26,26,26,0.45)" }}>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  className={inputClass("password")}
                  style={{ borderBottom: "0.5px solid #dbdad6" }}
                  onFocus={(e) => e.target.style.borderBottomColor = "#1a1a1a"}
                  onBlur={(e) => e.target.style.borderBottomColor = "#dbdad6"} />
              </div>
              <div>
                <label className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase block mb-2" style={{ color: "rgba(26,26,26,0.45)" }}>Re-enter Password</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••"
                  className="w-full bg-transparent font-['Inter'] text-sm text-[#1a1a1a] pb-2 placeholder:text-[#1a1a1a]/25 focus:outline-none"
                  style={{ borderBottom: "0.5px solid #dbdad6" }}
                  onFocus={(e) => e.target.style.borderBottomColor = "#1a1a1a"}
                  onBlur={(e) => e.target.style.borderBottomColor = "#dbdad6"} />
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase block mb-2" style={{ color: "rgba(26,26,26,0.45)" }}>Username</label>
                <input type="text" value={email} onChange={(e) => { setEmail(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, "")); setFieldError(null); }}
                  placeholder="amara.osei"
                  className={inputClass("username")}
                  style={{ borderBottom: `0.5px solid ${fieldError === "username" ? "#8B2020" : "#dbdad6"}` }}
                  onFocus={(e) => { e.currentTarget.style.borderBottomColor = "#1a1a1a"; }}
                  onBlur={(e) => { if (fieldError !== "username") e.currentTarget.style.borderBottomColor = "#dbdad6"; }} />
              </div>
              <div>
                <label className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase block mb-2" style={{ color: "rgba(26,26,26,0.45)" }}>Password</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••"
                  className="w-full bg-transparent font-['Inter'] text-sm text-[#1a1a1a] pb-2 placeholder:text-[#1a1a1a]/25 focus:outline-none"
                  style={{ borderBottom: "0.5px solid #dbdad6" }}
                  onFocus={(e) => e.target.style.borderBottomColor = "#1a1a1a"}
                  onBlur={(e) => e.target.style.borderBottomColor = "#dbdad6"} />
              </div>
            </>
          )}
          {error && <p className="font-['JetBrains_Mono'] text-[10px] tracking-wide" style={{ color: "#8B2020" }}>{error}</p>}
          <button type="submit" disabled={loading}
            className="w-full bg-[#1a1a1a] text-[#FDFBF7] font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase py-4 hover:bg-[#0D1F1A] transition-colors disabled:opacity-50">
            {loading ? "Please wait…" : isSignUp ? "Create Account" : "Sign In"}
          </button>
        </form>

        <div className="flex items-center gap-4 my-6">
          <div className="flex-1 h-px" style={{ background: "#dbdad6" }} />
          <span className="font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase" style={{ color: "rgba(26,26,26,0.35)" }}>or</span>
          <div className="flex-1 h-px" style={{ background: "#dbdad6" }} />
        </div>
        
        {isSignUp ? (
          <button onClick={() => { setIsSignUp(false); setError(""); setFieldError(null); }} type="button"
            className="w-full flex items-center justify-center gap-2.5 font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase py-4 transition-colors duration-150 leading-none"
            style={{ border: "0.5px solid #dbdad6", color: "#1a1a1a" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#1a1a1a"; e.currentTarget.style.color = "#FDFBF7"; e.currentTarget.style.borderColor = "#1a1a1a"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#1a1a1a"; e.currentTarget.style.borderColor = "#dbdad6"; }}
          >
            <span style={{ lineHeight: "16px" }}>Sign In</span>
          </button>
        ) : (
          <button onClick={() => signIn("google", { callbackUrl: "/explore" })} type="button"
            className="w-full flex items-center justify-center gap-2.5 font-['JetBrains_Mono'] text-[10px] tracking-widest uppercase py-4 transition-colors duration-150 leading-none"
            style={{ border: "0.5px solid #dbdad6", color: "#1a1a1a" }}
            onMouseEnter={(e) => { e.currentTarget.style.background = "#1a1a1a"; e.currentTarget.style.color = "#FDFBF7"; e.currentTarget.style.borderColor = "#1a1a1a"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#1a1a1a"; e.currentTarget.style.borderColor = "#dbdad6"; }}
          >
            <svg className="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            <span style={{ lineHeight: "16px" }}>Continue with Google</span>
          </button>
        )}
      </div>
    </div>
  );
}
