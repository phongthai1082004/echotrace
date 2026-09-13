"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { signIn, useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api.fetch";
import { roleHome } from "@/lib/routing";
import { useToast } from "@/components/toast";
import { labelSm, neoBtnPrimary, neoBtn, input } from "@/lib/styles";
import logoImg from "@/assets/images/Logo.png";

function validateEmail(e: string): string | null {
  if (!e) return "Email is required";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return "Invalid email format";
  return null;
}

export default function AuthPage() {
  const { showToast } = useToast();
  const { data: session, status } = useSession();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);

  const otpValue = otp.join("");

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "expired") {
      showToast("errorCodes.AUTH_TOKEN_EXPIRED", "error");
      window.history.replaceState(null, "", window.location.pathname);
    }
  }, [showToast]);

  useEffect(() => {
    if (status === "authenticated") {
      window.location.href = roleHome((session?.user as { role?: string } | undefined)?.role);
    }
  }, [status, session]);

  const handleSendOtp = async () => {
    const eErr = validateEmail(email);
    if (eErr) {
      setError(eErr);
      showToast(eErr, "error");
      return;
    }
    if (password !== confirmPassword) {
      const msg = "Passwords do not match";
      setError(msg);
      showToast(msg, "error");
      return;
    }
    if (password.length < 6) {
      const msg = "Password must be at least 6 characters";
      setError(msg);
      showToast(msg, "error");
      return;
    }

    setLoading(true);
    setError("");
    try {
      await apiFetch("/api/auth/send-otp", "", { method: "POST", body: JSON.stringify({ email }) });
      setShowOtp(true);
      showToast("OTP sent to your email", "success");
    } catch (err: any) {
      const msg = err.message || "Failed to send OTP";
      setError(msg);
      showToast(msg, "error");
    }
    setLoading(false);
  };

  const handleVerifyOtp = async () => {
    if (otpValue.length !== 6) {
      const msg = "Enter the 6-digit OTP";
      setError(msg);
      showToast(msg, "error");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<any>("/api/auth/verify-otp", "", {
        method: "POST",
        body: JSON.stringify({ email, otp: otpValue, password }),
      });

      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) throw new Error("Login failed, please try signing in");
      window.location.href = roleHome(data?.user?.role);
    } catch (err: any) {
      const msg = err.message || "Verification failed";
      setError(msg);
      showToast(msg, "error");
    }
    setLoading(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const eErr = validateEmail(email);
    if (eErr) {
      setError(eErr);
      showToast(eErr, "error");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await apiFetch<any>("/api/auth/login", "", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) throw new Error(result.error);
      window.location.href = roleHome(data?.user?.role);
    } catch (err: any) {
      const msg = err.message || "Account not found or invalid password";
      setError(msg);
      showToast(msg, "error");
    }
    setLoading(false);
  };

  const handleOtpInput = (i: number, val: string) => {
    if (val && !/^\d$/.test(val)) return;
    const next = [...otp];
    next[i] = val;
    setOtp(next);
    if (val && i < 5) {
      const nextInput = document.getElementById(`otp-${i + 1}`);
      nextInput?.focus();
    }
  };

  const handleOtpKey = (i: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !otp[i] && i > 0) {
      const prev = document.getElementById(`otp-${i - 1}`);
      prev?.focus();
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="hidden lg:block lg:w-[55%] relative bg-[#e8e6e0] overflow-hidden min-h-screen">
        <Image
          src="https://images.unsplash.com/photo-1765660996991-31f345c40247?w=1200&h=1600&fit=crop&auto=format"
          alt=""
          fill
          priority
          sizes="50vw"
          className="object-cover"
        />
        <div className="absolute top-10 left-10 flex items-center gap-3">
          <Image src={logoImg} alt="Better Memoire" style={{ height: 48, width: "auto" }} className="rounded-full bg-[#F8F2E5]/90 p-1" priority />
          <p className="text-white text-2xl font-bold tracking-tight">Better Memoire</p>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-6 bg-[#222] border-t-[3px] border-white/20">
          <p className="font-mono text-[10px] font-bold text-white/70 tracking-wider uppercase">
            31.06° N, 7.92° W — Toubkal, Morocco
          </p>
        </div>
      </div>

      <div className="flex flex-col px-4 sm:px-8 lg:px-14 py-8 sm:py-12 lg:w-[45%] bg-[#F8F2E5]">
        <p className="lg:hidden flex items-center gap-2 text-2xl font-bold mb-10">
          <Image src={logoImg} alt="Better Memoire" style={{ height: 36, width: "auto" }} />
          Better Memoire
        </p>

        <div className="flex gap-2 mb-8">
          {(["Sign In", "Create Account"] as const).map((label, i) => {
            const active = isSignUp === (i === 1);
            return (
              <button
                key={label}
                type="button"
                onClick={() => {
                  setIsSignUp(i === 1);
                  setError("");
                  setShowOtp(false);
                  setOtp(["", "", "", "", "", ""]);
                }}
                className={`${active ? neoBtnPrimary : neoBtn} ${labelSm} px-5 py-2`}
              >
                {label}
              </button>
            );
          })}
        </div>

        <h1 className="text-3xl lg:text-4xl font-bold mb-1 leading-tight">
          {isSignUp ? "Begin Your Archive." : "Welcome Back."}
        </h1>
        <p className="text-sm mb-8 text-[#666]">
          {isSignUp
            ? "Create an account to start designing your first travel journal."
            : "Sign in to continue building your journal."}
        </p>

        {isSignUp && showOtp ? (
          <div className="space-y-5 max-w-sm">
            <p className="text-sm font-bold">
              Enter the 6-digit code sent to <span className="text-[#222]">{email}</span>
            </p>
            <div className="flex gap-2 justify-center">
              {otp.map((d, i) => (
                <input
                  key={i}
                  id={`otp-${i}`}
                  type="text"
                  maxLength={1}
                  value={d}
                  onChange={(e) => handleOtpInput(i, e.target.value)}
                  onKeyDown={(e) => handleOtpKey(i, e)}
                  className="w-10 h-12 text-center text-lg font-bold bg-[#FFF7D6] rounded-lg border-2 border-[#222] shadow-[2px_2px_0_#222] focus:outline-none focus:translate-x-px focus:translate-y-px focus:shadow-[1px_1px_0_#222] transition-all"
                />
              ))}
            </div>
            {error && <p className="font-mono text-[10px] font-bold text-[#B54843]">{error}</p>}
            <button
              onClick={handleVerifyOtp}
              disabled={loading || otpValue.length !== 6}
              className={`${neoBtnPrimary} w-full py-3.5 disabled:opacity-50`}
            >
              {loading ? "Verifying..." : "Verify & Create Account"}
            </button>
            <button
              onClick={() => {
                setShowOtp(false);
                setOtp(["", "", "", "", "", ""]);
              }}
              type="button"
              className={`${neoBtn} ${labelSm} w-full py-3`}
            >
              Back
            </button>
          </div>
        ) : (
          <form
            onSubmit={
              isSignUp
                ? (e) => {
                    e.preventDefault();
                    handleSendOtp();
                  }
                : handleLogin
            }
            className="space-y-5 max-w-sm"
          >
            <div>
              <label className={`${labelSm} block mb-1.5 text-[#666]`}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={input}
              />
            </div>
            <div>
              <label className={`${labelSm} block mb-1.5 text-[#666]`}>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className={input}
              />
            </div>
            {isSignUp && (
              <div>
                <label className={`${labelSm} block mb-1.5 text-[#666]`}>Re-enter Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className={input}
                />
              </div>
            )}
            {error && <p className="font-mono text-[10px] font-bold text-[#B54843]">{error}</p>}
            <button type="submit" disabled={loading} className={`${neoBtnPrimary} w-full py-3.5 disabled:opacity-50`}>
              {loading ? "Please wait…" : isSignUp ? "Sign Up" : "Sign In"}
            </button>
          </form>
        )}

        {!showOtp && (
          <>
            <div className="flex items-center gap-4 my-5 max-w-sm">
              <div className="flex-1 h-[3px] bg-[#222]" />
              <span className="font-mono text-[10px] font-bold tracking-widest uppercase text-[#999]">or</span>
              <div className="flex-1 h-[3px] bg-[#222]" />
            </div>
            <div className="max-w-sm">
              {isSignUp ? (
                <button
                  onClick={() => {
                    setIsSignUp(false);
                    setError("");
                  }}
                  type="button"
                  className={`${neoBtn} ${labelSm} w-full py-3.5 flex items-center justify-center gap-2 text-[#222]`}
                >
                  Sign In
                </button>
              ) : (
                <button
                  onClick={() => signIn("google")}
                  type="button"
                  className={`${neoBtn} ${labelSm} w-full py-3.5 flex items-center justify-center gap-2 text-[#222]`}
                >
                  <svg className="shrink-0" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Continue with Google
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
