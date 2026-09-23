import React, { useState } from "react";
import { Lock, Mail, AlertCircle, ArrowRight, Sparkles, RefreshCw } from "lucide-react";
import { User } from "../types.ts";
import { googleSignIn } from "../lib/firebase.ts";
import { authenticate } from "../services/authService.ts";

interface LoginModalProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberSession, setRememberSession] = useState(true);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleGoogleAuth = async () => {
    setErrorMsg("");
    setGoogleLoading(true);
    try {
      const result = await googleSignIn();
      if (result) {
        const appUser: User = {
          id: result.user.uid,
          email: result.user.email || "user@google.com",
          name: result.user.displayName || "Google User",
          role: "admin",
          position: "Project Engineer",
          department: "Fiber & Telecommunication",
          avatarUrl: result.user.photoURL || undefined
        };
        if (rememberSession) {
          localStorage.setItem("rfs_session_token", result.accessToken);
          localStorage.setItem("rfs_user_data", JSON.stringify(appUser));
        }
        onLoginSuccess(appUser, result.accessToken);
      }
    } catch (err: any) {
      setErrorMsg("Gagal masuk dengan Google: " + (err.message || "Unknown error"));
    } finally {
      setGoogleLoading(false);
    }
  };

  const handleLogin = async (loginEmail?: string, loginPassword?: string) => {
    setErrorMsg("");
    setLoading(true);

    const targetEmail = loginEmail || email;
    const targetPassword = loginPassword || password;

    try {
      const result = await authenticate(targetEmail, targetPassword);
      if (result.success && result.user && result.token) {
        if (rememberSession) {
          localStorage.setItem("rfs_session_token", result.token);
          localStorage.setItem("rfs_user_data", JSON.stringify(result.user));
        }
        onLoginSuccess(result.user, result.token);
      } else {
        setErrorMsg(result.message || "Email atau kata sandi tidak sesuai.");
      }
    } catch (err: any) {
      setErrorMsg("Gagal melakukan login: " + (err.message || "Terjadi kesalahan"));
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    handleLogin(demoEmail, demoPass);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="surface-card w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden">
        {/* Card Header */}
        <div className="p-6 text-center border-b border-subtle surface-elevated relative">
          <div className="w-12 h-12 rounded-2xl accent-bg text-white mx-auto flex items-center justify-center shadow-lg mb-3">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-extrabold text-main">Masuk BA Integrasi RFS</h2>
          <p className="text-xs text-muted mt-1">
            PT. Fajar Mitra Krida Abadi • Terintegrasi Cloud &amp; Google Workspace
          </p>
        </div>

        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-500 text-xs flex items-center gap-2 animate-shake">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Primary: Sign in with Google (Firebase + Workspace) */}
          <button
            type="button"
            onClick={handleGoogleAuth}
            disabled={googleLoading}
            className="w-full py-2.5 px-4 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-700/80 transition-all flex items-center justify-center gap-3 font-semibold text-xs shadow-sm"
          >
            {googleLoading ? (
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span>Masuk dengan Google (Firebase &amp; Workspace)</span>
          </button>

          <div className="flex items-center gap-2 text-muted text-[11px]">
            <div className="h-px bg-subtle flex-1"></div>
            <span>atau masuk dengan akun lokal</span>
            <div className="h-px bg-subtle flex-1"></div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleLogin();
            }}
            className="space-y-3"
          >
            <div>
              <label className="block text-xs font-semibold text-main mb-1">
                Email Pengguna
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@rfs.telco.id"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border surface-elevated text-main focus:outline-none focus:ring-1 focus:ring-emerald-500 font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-main mb-1">Kata Sandi</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs pl-9 pr-3 py-2.5 rounded-xl border surface-elevated text-main focus:outline-none focus:ring-1 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-muted select-none">
                <input
                  type="checkbox"
                  checked={rememberSession}
                  onChange={(e) => setRememberSession(e.target.checked)}
                  className="rounded accent-emerald-500"
                />
                <span>Simpan sesi aktif otomatis</span>
              </label>
              <span className="text-[11px] text-dim">Sesi aman</span>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl accent-bg text-white font-bold text-xs hover:opacity-90 active:scale-95 transition-all flex items-center justify-center gap-2 shadow-lg mt-2"
            >
              {loading ? (
                <span>Memvalidasi sesi...</span>
              ) : (
                <>
                  <span>Masuk ke Portal</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* 1-Click Demo Logins for Instant Access */}
          <div className="pt-3 border-t border-subtle">
            <p className="text-[11px] font-bold text-muted uppercase tracking-wider mb-2 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              Akses Cepat Pengujian:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemo("admin@rfs.telco.id", "admin123")}
                className="p-2.5 rounded-xl border surface-elevated text-left hover:border-amber-500/50 transition-all flex items-center gap-2 group"
              >
                <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-500 flex items-center justify-center font-bold text-xs">
                  A
                </div>
                <div>
                  <p className="text-xs font-bold text-main group-hover:text-amber-500">Super Admin (NOC)</p>
                  <p className="text-[10px] text-muted">admin@rfs.telco.id</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickDemo("teknisi@rfs.telco.id", "teknisi123")}
                className="p-2.5 rounded-xl border surface-elevated text-left hover:border-emerald-500/50 transition-all flex items-center gap-2 group"
              >
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-500 flex items-center justify-center font-bold text-xs">
                  T
                </div>
                <div>
                  <p className="text-xs font-bold text-main group-hover:text-emerald-500">Teknisi Lapangan</p>
                  <p className="text-[10px] text-muted">teknisi@rfs.telco.id</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

